from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import math
from app.core.dependencies import get_db, get_current_user
from app.schemas.inventory import BranchStockResponse
from app.models.inventory import BranchStock
from app.models.item import Item
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.uom import UOM
from pydantic import BaseModel

router = APIRouter()

class PaginatedBranchStockResponse(BaseModel):
    data: List[BranchStockResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

@router.get("/", response_model=PaginatedBranchStockResponse)
def get_branch_stocks(
    branch_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    supplier_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    low_stock_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Enforce RBAC
    if current_user.role != "super_admin":
        if branch_id and branch_id != current_user.branch_id:
            raise HTTPException(status_code=403, detail="You can only view stock for your own branch")
        branch_id = current_user.branch_id

    if not branch_id and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Branch ID is required")

    query = db.query(BranchStock, Item, Category, Supplier, UOM).join(
        Item, BranchStock.item_id == Item.item_id
    ).join(
        Category, Item.category_id == Category.category_id
    ).join(
        Supplier, Item.supplier_id == Supplier.supplier_id
    ).join(
        UOM, Item.uom_id == UOM.uom_id
    )

    if branch_id:
        query = query.filter(BranchStock.branch_id == branch_id)
        
    if category_id:
        query = query.filter(Item.category_id == category_id)
        
    if supplier_id:
        query = query.filter(Item.supplier_id == supplier_id)

    if low_stock_only:
        query = query.filter(BranchStock.quantity <= Item.minimum_stock)

    if search:
        query = query.filter(
            or_(
                Item.item_code.ilike(f"%{search}%"),
                Item.manual_code.ilike(f"%{search}%"),
                Item.name.ilike(f"%{search}%")
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    results = query.offset(offset).limit(page_size).all()

    formatted_results = []
    for branch_stock, item, category, supplier, uom in results:
        data = BranchStockResponse.model_validate(branch_stock)
        data.item_code = item.item_code
        data.item_name = item.name
        data.category_name = category.name
        data.supplier_name = supplier.name
        data.uom_name = uom.name
        data.minimum_stock = item.minimum_stock
        formatted_results.append(data)

    return PaginatedBranchStockResponse(
        data=formatted_results,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1
    )
