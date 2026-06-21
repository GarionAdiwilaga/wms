from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from app.schemas.category import CategoryResponse
from app.schemas.supplier import SupplierResponse
from app.schemas.uom import UOMResponse

class ItemBase(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    uom_id: int
    minimum_stock: int = 0
    is_active: bool = True

class ItemCreate(ItemBase):
    category_id: int
    supplier_id: int
    manual_code: str = Field(..., min_length=1)

class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    uom_id: Optional[int] = None
    minimum_stock: Optional[int] = None
    is_active: Optional[bool] = None

class ItemResponse(ItemBase):
    item_id: int
    item_code: str
    manual_code: str
    category_id: int
    supplier_id: int
    image_path: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    category: Optional[CategoryResponse] = None
    supplier: Optional[SupplierResponse] = None
    uom: Optional[UOMResponse] = None

    model_config = ConfigDict(from_attributes=True)

class PaginatedItemResponse(BaseModel):
    data: list[ItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
