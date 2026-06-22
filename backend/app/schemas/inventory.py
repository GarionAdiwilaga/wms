from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class StockChangeLine(BaseModel):
    item_id: int
    quantity: int = Field(gt=0, description="Quantity must be greater than 0")

class InitialLoadRequest(BaseModel):
    branch_id: int
    lines: list[StockChangeLine] = Field(min_length=1, description="At least one item line is required")
    notes: Optional[str] = None

class InventoryTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: int
    item_id: int
    branch_id: int
    transaction_type: str
    quantity: int
    reference_type: str
    reference_id: Optional[int]
    document_no: Optional[str]
    notes: Optional[str]
    created_by: int
    created_at: datetime

class BranchStockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    branch_id: int
    item_id: int
    quantity: int
    updated_at: datetime

    # Additional fields to return item details
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    category_name: Optional[str] = None
    supplier_name: Optional[str] = None
    uom_name: Optional[str] = None
    minimum_stock: Optional[int] = None
