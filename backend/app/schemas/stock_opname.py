from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class StockOpnameLineCreate(BaseModel):
    item_id: int
    physical_quantity: int = Field(ge=0, description="Physical quantity must be greater than or equal to 0")

class StockOpnameCreate(BaseModel):
    branch_id: int
    category_id: int
    status: str = Field(default="draft", description="Status must be draft or completed")
    notes: Optional[str] = None
    lines: list[StockOpnameLineCreate] = Field(min_length=1, description="At least one item line is required")

class StockOpnameLineUpdate(BaseModel):
    line_id: Optional[int] = None
    item_id: int
    physical_quantity: int = Field(ge=0, description="Physical quantity must be greater than or equal to 0")

class StockOpnameUpdate(BaseModel):
    notes: Optional[str] = None
    lines: Optional[list[StockOpnameLineUpdate]] = None

class StockOpnameLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    line_id: int
    session_id: int
    item_id: int
    system_quantity: int
    physical_quantity: int
    variance: int
    created_at: datetime

    # UI helper properties
    item_code: Optional[str] = None
    item_name: Optional[str] = None

class StockOpnameResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: int
    branch_id: int
    category_id: int
    status: str
    notes: Optional[str]
    created_by: int
    created_at: datetime
    updated_at: datetime
    lines: list[StockOpnameLineResponse]

class PaginatedStockOpnameResponse(BaseModel):
    data: list[StockOpnameResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
