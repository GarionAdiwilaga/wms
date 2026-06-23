from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class OutboundLineCreate(BaseModel):
    item_id: int
    quantity: int = Field(gt=0, description="Quantity must be greater than 0")

class OutboundCreate(BaseModel):
    branch_id: int
    status: str = Field(default="completed", description="Status must be draft, completed, or cancelled")
    reference_no: Optional[str] = None
    transaction_date: Optional[datetime] = None
    notes: Optional[str] = None
    fulfilled_by: Optional[int] = None
    lines: list[OutboundLineCreate] = Field(min_length=1, description="At least one item is required")

class OutboundLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    line_id: int
    session_id: int
    item_id: int
    quantity: int
    created_at: datetime
    
    # Extra fields populated for UI convenience
    item_code: Optional[str] = None
    item_name: Optional[str] = None

class OutboundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: int
    branch_id: int
    status: str
    reference_no: Optional[str]
    transaction_date: datetime
    notes: Optional[str]
    created_by: int
    fulfilled_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    lines: list[OutboundLineResponse]

class PaginatedOutboundResponse(BaseModel):
    data: list[OutboundResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
