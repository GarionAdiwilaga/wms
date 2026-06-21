from typing import Any, Generic, TypeVar
from fastapi import HTTPException, status
from app.services.audit_service import AuditService
from app.models.user import User

RepositoryType = TypeVar("RepositoryType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")
ModelType = TypeVar("ModelType")

class ServiceBase(Generic[RepositoryType, ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, repository: RepositoryType, audit_service: AuditService = None):
        self.repository = repository
        self.audit_service = audit_service or AuditService()
        self.entity_name = self.repository.model.__name__

    def get(self, id: Any) -> ModelType:
        obj = self.repository.get(id)
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{self.entity_name} not found")
        return obj

    def get_multi(self) -> list[ModelType]:
        return self.repository.get_multi()

    def check_uniqueness(self, field: str, value: str, exclude_id: Any = None):
        """Helper to enforce case-insensitive uniqueness on a string field."""
        from sqlalchemy import select, func
        model = self.repository.model
        column = getattr(model, field)
        stmt = select(model).where(func.lower(column) == value.lower())
        if exclude_id is not None:
            pk_name = f"{self.entity_name.lower()}_id"
            pk_col = getattr(model, pk_name, getattr(model, "id", None))
            if pk_col is not None:
                stmt = stmt.where(pk_col != exclude_id)
        
        existing = self.repository.db.scalars(stmt).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{self.entity_name} with {field} '{value}' already exists"
            )

    def create(self, obj_in: CreateSchemaType, current_user: User) -> ModelType:
        obj = self.repository.create(obj_in)
        
        # Determine Primary Key
        pk_name = f"{self.entity_name.lower()}_id"
        pk_value = getattr(obj, pk_name, getattr(obj, "id", None))
        
        self.audit_service.log_create(
            db=self.repository.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=pk_value,
            new_values=obj_in.model_dump()
        )
        self.repository.db.commit()
        return obj

    def update(self, id: Any, obj_in: UpdateSchemaType, current_user: User) -> ModelType:
        db_obj = self.get(id)
        
        # Serialize old values for audit
        old_values = {}
        update_data = obj_in.model_dump(exclude_unset=True)
        for field in update_data:
            if hasattr(db_obj, field):
                old_values[field] = getattr(db_obj, field)

        obj = self.repository.update(db_obj, obj_in)
        
        self.audit_service.log_update(
            db=self.repository.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=id,
            old_values=old_values,
            new_values=update_data
        )
        self.repository.db.commit()
        return obj

    def delete(self, id: Any, current_user: User) -> ModelType:
        db_obj = self.get(id)
        
        # Collect old values before deleting
        columns = [c.name for c in self.repository.model.__table__.columns]
        old_values = {col: getattr(db_obj, col) for col in columns}
        
        obj = self.repository.remove(id)
        
        self.audit_service.log_delete(
            db=self.repository.db,
            user_id=current_user.user_id,
            entity_type=self.entity_name,
            entity_id=id,
            old_values=old_values
        )
        self.repository.db.commit()
        return obj
