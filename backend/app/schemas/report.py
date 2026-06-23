from typing import Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class StockReportRow(BaseModel):
    branch_name: str
    item_code: str
    item_name: str
    category_name: str
    supplier_name: str
    quantity: int
    minimum_stock: int

    model_config = ConfigDict(from_attributes=True)

class StockReportResponse(BaseModel):
    items: list[StockReportRow]
    total: int

class LowStockReportRow(BaseModel):
    branch_name: str
    item_code: str
    item_name: str
    category_name: str
    supplier_name: str
    quantity: int
    minimum_stock: int
    shortage: int

    model_config = ConfigDict(from_attributes=True)

class LowStockReportResponse(BaseModel):
    items: list[LowStockReportRow]
    total: int

class ItemHistoryReportRow(BaseModel):
    transaction_id: int
    created_at: datetime
    branch_name: str
    transaction_type: str
    quantity: int
    reference_type: str
    reference_id: int | None = None
    document_no: str | None = None
    notes: str | None = None
    operator_name: str

    model_config = ConfigDict(from_attributes=True)

class ItemHistoryReportResponse(BaseModel):
    items: list[ItemHistoryReportRow]
    total: int

class InventoryMovementReportRow(BaseModel):
    transaction_id: int
    created_at: datetime
    branch_name: str
    item_code: str
    item_name: str
    transaction_type: str
    quantity: int
    balance_after: int
    reference_type: str
    reference_id: int | None = None
    document_no: str | None = None
    notes: str | None = None
    operator_name: str

    model_config = ConfigDict(from_attributes=True)

class InventoryMovementReportResponse(BaseModel):
    items: list[InventoryMovementReportRow]
    total: int

class TransferVarianceReportRow(BaseModel):
    transfer_number: str
    source_branch_name: str
    dest_branch_name: str
    received_at: datetime
    item_code: str
    item_name: str
    sent_quantity: int
    received_quantity: int
    variance: int
    variance_reason: str | None = None
    variance_notes: str | None = None
    receiver_name: str

    model_config = ConfigDict(from_attributes=True)

class TransferVarianceReportSummary(BaseModel):
    total_transfers: int
    transfers_with_variance: int
    total_lost_units: int

class TransferVarianceReportResponse(BaseModel):
    items: list[TransferVarianceReportRow]
    total: int
    summary: TransferVarianceReportSummary

class AuditLogReportRow(BaseModel):
    log_id: int
    created_at: datetime
    operator_name: str
    action: str
    entity_type: str
    entity_id: int
    old_values: dict[str, Any] | None = None
    new_values: dict[str, Any] | None = None
    ip_address: str | None = None

    model_config = ConfigDict(from_attributes=True)

class AuditLogReportResponse(BaseModel):
    items: list[AuditLogReportRow]
    total: int
