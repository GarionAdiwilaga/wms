import os
import shutil
import uuid
from typing import Any, Optional
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.services.base import ServiceBase
from app.repositories.item import ItemRepository
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate
from app.models.user import User
from app.repositories.category import CategoryRepository
from app.repositories.supplier import SupplierRepository

class ItemService(ServiceBase[ItemRepository, Item, ItemCreate, ItemUpdate]):
    def __init__(self, repository: ItemRepository, db: Session):
        super().__init__(repository=repository)
        self.db = db

    def create(self, obj_in: ItemCreate, current_user: User) -> Item:
        cat_repo = CategoryRepository(self.db)
        sup_repo = SupplierRepository(self.db)
        
        category = cat_repo.get(obj_in.category_id)
        if not category:
            raise HTTPException(status_code=400, detail="Invalid category_id")
            
        supplier = sup_repo.get(obj_in.supplier_id)
        if not supplier:
            raise HTTPException(status_code=400, detail="Invalid supplier_id")
            
        # FORMAT: CATEGORY-SUPPLIER-MANUAL
        item_code = f"{category.code}-{supplier.code}-{obj_in.manual_code}".upper()
        
        self.check_uniqueness("item_code", item_code)
        
        create_data = obj_in.model_dump()
        create_data["item_code"] = item_code
        
        # Bypass ServiceBase.create to pass dictionary with item_code included
        obj = self.repository.create(create_data)
        
        self.audit_service.log_create(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=obj.item_id,
            new_values=create_data
        )
        self.db.commit()
        return obj

    def delete(self, id: Any, current_user: User) -> Item:
        raise HTTPException(
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            detail="Hard delete is not allowed for items. Update is_active to false instead."
        )

    def upload_image(self, id: int, file: UploadFile, current_user: User) -> Item:
        item = self.get(id)
        
        upload_dir = "uploads/items"
        os.makedirs(upload_dir, exist_ok=True)
        
        ext = os.path.splitext(file.filename)[1] if file.filename else ""
        filename = f"{item.item_code}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        old_path = item.image_path
        new_path = f"/uploads/items/{filename}"
        
        item.image_path = new_path
        
        self.audit_service.log_update(
            db=self.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=item.item_id,
            old_values={"image_path": old_path},
            new_values={"image_path": new_path}
        )
        self.db.commit()
        return item
