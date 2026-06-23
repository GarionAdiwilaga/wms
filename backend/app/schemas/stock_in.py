from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class StockInLineCreate(BaseModel):
    item_id: int
    quantity: int = Field(gt=0, description="Quantity must be greater than 0")

class StockInCreate(BaseModel):
    branch_id: int
    status: str = Field(default="completed", description="Status must be draft, completed, or cancelled")
    reference_no: Optional[str] = None
    supplier_invoice_no: Optional[str] = None
    transaction_date: Optional[datetime] = None
    notes: Optional[str] = None
    received_by: Optional[int] = None
    lines: list[StockInLineCreate] = Field(min_length=1, description="At least one item is required")

class StockInLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    line_id: int
    session_id: int
    item_id: int
    quantity: int
    created_at: datetime
    
    # Extra fields populated for UI convenience
    item_code: Optional[str] = None
    item_name: Optional[str] = None

class StockInResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: int
    branch_id: int
    status: str
    reference_no: Optional[str]
    supplier_invoice_no: Optional[str]
    transaction_date: datetime
    notes: Optional[str]
    created_by: int
    received_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    lines: list[StockInLineResponse]

class PaginatedStockInResponse(BaseModel):
    data: list[StockInResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
