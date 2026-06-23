import csv
import io
from typing import Optional, Any, Iterator
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from openpyxl import Workbook

from app.core.dependencies import get_db, require_role
from app.models.user import User
from app.services.report_service import ReportService
from app.schemas.report import (
    StockReportResponse,
    LowStockReportResponse,
    ItemHistoryReportResponse,
    InventoryMovementReportResponse,
    TransferVarianceReportResponse,
    AuditLogReportResponse
)

router = APIRouter()

def generate_csv(headers: list[str], rows: list[list[Any]]) -> Iterator[str]:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    for row in rows:
        writer.writerow(row)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

def stream_csv_response(filename: str, headers: list[str], rows: list[list[Any]]) -> StreamingResponse:
    generator = generate_csv(headers, rows)
    headers_dict = {
        "Content-Disposition": f"attachment; filename={filename}.csv"
    }
    return StreamingResponse(generator, media_type="text/csv", headers=headers_dict)

def generate_xlsx(headers: list[str], rows: list[list[Any]]) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Laporan"

    ws.append(headers)

    for row in rows:
        formatted_row = []
        for cell in row:
            if isinstance(cell, datetime):
                # Format datetime as string for spreadsheet compatibility
                formatted_row.append(cell.strftime("%Y-%m-%d %H:%M:%S"))
            else:
                formatted_row.append(cell)
        ws.append(formatted_row)

    # Auto-fit column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 2, 10)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer

def stream_xlsx_response(filename: str, headers: list[str], rows: list[list[Any]]) -> StreamingResponse:
    buffer = generate_xlsx(headers, rows)
    headers_dict = {
        "Content-Disposition": f"attachment; filename={filename}.xlsx"
    }
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers_dict)

@router.get("/stock", response_model=StockReportResponse)
def get_stock_report(
    branch_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    supplier_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    export: Optional[str] = Query(None),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    # RBAC check: non-super_admin is restricted to their own branch
    if current_user.role != "super_admin":
        if branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat melihat data laporan dari cabang Anda sendiri"
            )
        branch_id = current_user.branch_id

    is_export = export in ("csv", "xlsx")
    limit = page_size
    offset = (page - 1) * page_size

    results, total = ReportService.get_stock_report(
        db=db,
        branch_id=branch_id,
        category_id=category_id,
        supplier_id=supplier_id,
        search=search,
        limit=limit,
        offset=offset,
        is_export=is_export
    )

    if export == "csv":
        headers = ["Cabang", "Kode Barang", "Nama Barang", "Kategori", "Supplier", "Stok", "Min Stok"]
        rows = [[r.branch_name, r.item_code, r.item_name, r.category_name, r.supplier_name, r.quantity, r.minimum_stock] for r in results]
        return stream_csv_response("laporan_stok", headers, rows)
    elif export == "xlsx":
        headers = ["Cabang", "Kode Barang", "Nama Barang", "Kategori", "Supplier", "Stok", "Min Stok"]
        rows = [[r.branch_name, r.item_code, r.item_name, r.category_name, r.supplier_name, r.quantity, r.minimum_stock] for r in results]
        return stream_xlsx_response("laporan_stok", headers, rows)

    return {
        "items": [
            {
                "branch_name": r.branch_name,
                "item_code": r.item_code,
                "item_name": r.item_name,
                "category_name": r.category_name,
                "supplier_name": r.supplier_name,
                "quantity": r.quantity,
                "minimum_stock": r.minimum_stock
            }
            for r in results
        ],
        "total": total
    }

@router.get("/low-stock", response_model=LowStockReportResponse)
def get_low_stock_report(
    branch_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    supplier_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    export: Optional[str] = Query(None),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    # RBAC check: non-super_admin is restricted to their own branch
    if current_user.role != "super_admin":
        if branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat melihat data laporan dari cabang Anda sendiri"
            )
        branch_id = current_user.branch_id

    is_export = export in ("csv", "xlsx")
    limit = page_size
    offset = (page - 1) * page_size

    results, total = ReportService.get_low_stock_report(
        db=db,
        branch_id=branch_id,
        category_id=category_id,
        supplier_id=supplier_id,
        search=search,
        limit=limit,
        offset=offset,
        is_export=is_export
    )

    if export == "csv":
        headers = ["Cabang", "Kode Barang", "Nama Barang", "Kategori", "Supplier", "Stok", "Min Stok", "Kekurangan"]
        rows = [[r.branch_name, r.item_code, r.item_name, r.category_name, r.supplier_name, r.quantity, r.minimum_stock, r.shortage] for r in results]
        return stream_csv_response("laporan_stok_rendah", headers, rows)
    elif export == "xlsx":
        headers = ["Cabang", "Kode Barang", "Nama Barang", "Kategori", "Supplier", "Stok", "Min Stok", "Kekurangan"]
        rows = [[r.branch_name, r.item_code, r.item_name, r.category_name, r.supplier_name, r.quantity, r.minimum_stock, r.shortage] for r in results]
        return stream_xlsx_response("laporan_stok_rendah", headers, rows)

    return {
        "items": [
            {
                "branch_name": r.branch_name,
                "item_code": r.item_code,
                "item_name": r.item_name,
                "category_name": r.category_name,
                "supplier_name": r.supplier_name,
                "quantity": r.quantity,
                "minimum_stock": r.minimum_stock,
                "shortage": r.shortage
            }
            for r in results
        ],
        "total": total
    }

@router.get("/item-history/{item_id}", response_model=ItemHistoryReportResponse)
def get_item_history_report(
    item_id: int,
    branch_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    export: Optional[str] = Query(None),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    # RBAC check: non-super_admin is restricted to their own branch
    if current_user.role != "super_admin":
        if branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat melihat data laporan dari cabang Anda sendiri"
            )
        branch_id = current_user.branch_id

    is_export = export in ("csv", "xlsx")
    limit = page_size
    offset = (page - 1) * page_size

    results, total = ReportService.get_item_history_report(
        db=db,
        item_id=item_id,
        branch_id=branch_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
        is_export=is_export
    )

    if export == "csv":
        headers = ["ID Transaksi", "Waktu", "Cabang", "Tipe Transaksi", "Jumlah", "Tipe Referensi", "ID Referensi", "No Dokumen", "Catatan", "Operator"]
        rows = [[r.transaction_id, r.created_at, r.branch_name, r.transaction_type, r.quantity, r.reference_type, r.reference_id, r.document_no, r.notes, r.operator_name] for r in results]
        return stream_csv_response(f"riwayat_barang_{item_id}", headers, rows)
    elif export == "xlsx":
        headers = ["ID Transaksi", "Waktu", "Cabang", "Tipe Transaksi", "Jumlah", "Tipe Referensi", "ID Referensi", "No Dokumen", "Catatan", "Operator"]
        rows = [[r.transaction_id, r.created_at, r.branch_name, r.transaction_type, r.quantity, r.reference_type, r.reference_id, r.document_no, r.notes, r.operator_name] for r in results]
        return stream_xlsx_response(f"riwayat_barang_{item_id}", headers, rows)

    return {
        "items": [
            {
                "transaction_id": r.transaction_id,
                "created_at": r.created_at,
                "branch_name": r.branch_name,
                "transaction_type": r.transaction_type,
                "quantity": r.quantity,
                "reference_type": r.reference_type,
                "reference_id": r.reference_id,
                "document_no": r.document_no,
                "notes": r.notes,
                "operator_name": r.operator_name
            }
            for r in results
        ],
        "total": total
    }

@router.get("/movements", response_model=InventoryMovementReportResponse)
def get_inventory_movement_report(
    branch_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    supplier_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    export: Optional[str] = Query(None),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    # RBAC check: non-super_admin is restricted to their own branch
    if current_user.role != "super_admin":
        if branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat melihat data laporan dari cabang Anda sendiri"
            )
        branch_id = current_user.branch_id

    is_export = export in ("csv", "xlsx")
    limit = page_size
    offset = (page - 1) * page_size

    results, total = ReportService.get_inventory_movement_report(
        db=db,
        branch_id=branch_id,
        category_id=category_id,
        supplier_id=supplier_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        limit=limit,
        offset=offset,
        is_export=is_export
    )

    if export == "csv":
        headers = ["ID Transaksi", "Waktu", "Cabang", "Kode Barang", "Nama Barang", "Tipe Transaksi", "Jumlah", "Stok Setelahnya", "Tipe Referensi", "ID Referensi", "No Dokumen", "Catatan", "Operator"]
        rows = [[r.transaction_id, r.created_at, r.branch_name, r.item_code, r.item_name, r.transaction_type, r.quantity, r.balance_after, r.reference_type, r.reference_id, r.document_no, r.notes, r.operator_name] for r in results]
        return stream_csv_response("laporan_pergerakan_stok", headers, rows)
    elif export == "xlsx":
        headers = ["ID Transaksi", "Waktu", "Cabang", "Kode Barang", "Nama Barang", "Tipe Transaksi", "Jumlah", "Stok Setelahnya", "Tipe Referensi", "ID Referensi", "No Dokumen", "Catatan", "Operator"]
        rows = [[r.transaction_id, r.created_at, r.branch_name, r.item_code, r.item_name, r.transaction_type, r.quantity, r.balance_after, r.reference_type, r.reference_id, r.document_no, r.notes, r.operator_name] for r in results]
        return stream_xlsx_response("laporan_pergerakan_stok", headers, rows)

    return {
        "items": [
            {
                "transaction_id": r.transaction_id,
                "created_at": r.created_at,
                "branch_name": r.branch_name,
                "item_code": r.item_code,
                "item_name": r.item_name,
                "transaction_type": r.transaction_type,
                "quantity": r.quantity,
                "balance_after": r.balance_after,
                "reference_type": r.reference_type,
                "reference_id": r.reference_id,
                "document_no": r.document_no,
                "notes": r.notes,
                "operator_name": r.operator_name
            }
            for r in results
        ],
        "total": total
    }

@router.get("/transfer-variance", response_model=TransferVarianceReportResponse)
def get_transfer_variance_report(
    branch_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    export: Optional[str] = Query(None),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    # RBAC check: non-super_admin is restricted to their own branch
    if current_user.role != "super_admin":
        if branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat melihat data laporan dari cabang Anda sendiri"
            )
        branch_id = current_user.branch_id

    is_export = export in ("csv", "xlsx")
    limit = page_size
    offset = (page - 1) * page_size

    results, total, summary = ReportService.get_transfer_variance_report(
        db=db,
        branch_id=branch_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        limit=limit,
        offset=offset,
        is_export=is_export
    )

    if export == "csv":
        headers = ["No Transfer", "Cabang Asal", "Cabang Tujuan", "Waktu Diterima", "Kode Barang", "Nama Barang", "Jumlah Dikirim", "Jumlah Diterima", "Selisih", "Alasan Selisih", "Catatan Selisih", "Penerima"]
        rows = [[r.transfer_number, r.source_branch_name, r.dest_branch_name, r.received_at, r.item_code, r.item_name, r.sent_quantity, r.received_quantity, r.variance, r.variance_reason, r.variance_notes, r.receiver_name] for r in results]
        return stream_csv_response("laporan_selisih_transfer", headers, rows)
    elif export == "xlsx":
        headers = ["No Transfer", "Cabang Asal", "Cabang Tujuan", "Waktu Diterima", "Kode Barang", "Nama Barang", "Jumlah Dikirim", "Jumlah Diterima", "Selisih", "Alasan Selisih", "Catatan Selisih", "Penerima"]
        rows = [[r.transfer_number, r.source_branch_name, r.dest_branch_name, r.received_at, r.item_code, r.item_name, r.sent_quantity, r.received_quantity, r.variance, r.variance_reason, r.variance_notes, r.receiver_name] for r in results]
        return stream_xlsx_response("laporan_selisih_transfer", headers, rows)

    return {
        "items": [
            {
                "transfer_number": r.transfer_number,
                "source_branch_name": r.source_branch_name,
                "dest_branch_name": r.dest_branch_name,
                "received_at": r.received_at,
                "item_code": r.item_code,
                "item_name": r.item_name,
                "sent_quantity": r.sent_quantity,
                "received_quantity": r.received_quantity,
                "variance": r.variance,
                "variance_reason": r.variance_reason,
                "variance_notes": r.variance_notes,
                "receiver_name": r.receiver_name
            }
            for r in results
        ],
        "total": total,
        "summary": summary
    }

@router.get("/audit-logs", response_model=AuditLogReportResponse)
def get_audit_log_report(
    branch_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    export: Optional[str] = Query(None),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    # RBAC check: non-super_admin is restricted to their own branch
    if current_user.role != "super_admin":
        if branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat melihat data audit log dari cabang Anda sendiri"
            )
        branch_id = current_user.branch_id

    is_export = export in ("csv", "xlsx")
    limit = page_size
    offset = (page - 1) * page_size

    results, total = ReportService.get_audit_log_report(
        db=db,
        branch_id=branch_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
        is_export=is_export
    )

    if export == "csv":
        headers = ["ID Log", "Waktu", "Operator", "Aksi", "Tipe Entitas", "ID Entitas", "Nilai Lama", "Nilai Baru", "IP Address"]
        rows = [[r.log_id, r.created_at, r.operator_name, r.action, r.entity_type, r.entity_id, str(r.old_values or ''), str(r.new_values or ''), r.ip_address] for r in results]
        return stream_csv_response("laporan_audit_log", headers, rows)
    elif export == "xlsx":
        headers = ["ID Log", "Waktu", "Operator", "Aksi", "Tipe Entitas", "ID Entitas", "Nilai Lama", "Nilai Baru", "IP Address"]
        rows = [[r.log_id, r.created_at, r.operator_name, r.action, r.entity_type, r.entity_id, str(r.old_values or ''), str(r.new_values or ''), r.ip_address] for r in results]
        return stream_xlsx_response("laporan_audit_log", headers, rows)

    return {
        "items": [
            {
                "log_id": r.log_id,
                "created_at": r.created_at,
                "operator_name": r.operator_name,
                "action": r.action,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "old_values": r.old_values,
                "new_values": r.new_values,
                "ip_address": r.ip_address
            }
            for r in results
        ],
        "total": total
    }
