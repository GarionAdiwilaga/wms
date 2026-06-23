from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class TransferLineCreate(BaseModel):
    item_id: int
    sent_quantity: int = Field(gt=0, description="Sent quantity must be greater than 0")

class TransferCreate(BaseModel):
    source_branch_id: int
    dest_branch_id: int
    notes: Optional[str] = None
    lines: list[TransferLineCreate] = Field(min_length=1, description="At least one item line is required")

class TransferLineUpdate(BaseModel):
    line_id: Optional[int] = None
    item_id: int
    sent_quantity: int = Field(gt=0, description="Sent quantity must be greater than 0")

class TransferUpdate(BaseModel):
    dest_branch_id: Optional[int] = None
    notes: Optional[str] = None
    lines: Optional[list[TransferLineUpdate]] = None

class TransferLineReceive(BaseModel):
    line_id: int
    received_quantity: int = Field(ge=0, description="Received quantity must be greater than or equal to 0")
    variance_notes: Optional[str] = None
    variance_reason: Optional[str] = None

class TransferReceive(BaseModel):
    received_notes: Optional[str] = None
    lines: list[TransferLineReceive] = Field(min_length=1, description="At least one item line is required for receiving")

class TransferCancel(BaseModel):
    cancellation_reason: str = Field(min_length=1, description="Cancellation reason is required")

class TransferLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    line_id: int
    transfer_id: int
    item_id: int
    sent_quantity: int
    received_quantity: Optional[int]
    variance_notes: Optional[str]
    variance_reason: Optional[str]
    created_at: datetime

    # UI helper properties
    item_code: Optional[str] = None
    item_name: Optional[str] = None

class TransferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transfer_id: int
    transfer_number: str
    source_branch_id: int
    dest_branch_id: int
    status: str
    notes: Optional[str]
    received_notes: Optional[str]
    created_by: int
    shipped_at: Optional[datetime]
    shipped_by: Optional[int]
    received_at: Optional[datetime]
    received_by: Optional[int]
    cancelled_at: Optional[datetime]
    cancelled_by: Optional[int]
    cancellation_reason: Optional[str]
    created_at: datetime
    updated_at: datetime
    lines: list[TransferLineResponse]

class PaginatedTransferResponse(BaseModel):
    data: list[TransferResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
