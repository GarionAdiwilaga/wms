from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import math

from app.core.dependencies import get_db, get_current_active_user, require_role
from app.models.user import User
from app.models.transfer import Transfer
from app.schemas.transfer import (
    TransferCreate,
    TransferUpdate,
    TransferReceive,
    TransferCancel,
    TransferResponse,
    PaginatedTransferResponse
)
from app.repositories.transfer import TransferRepository
from app.services.transfer_service import TransferService

router = APIRouter()

def get_transfer_service(db: Session = Depends(get_db)) -> TransferService:
    repo = TransferRepository(db)
    return TransferService(repository=repo, db=db)

def format_transfer(transfer: Transfer) -> dict[str, Any]:
    lines_data = []
    for line in transfer.lines:
        line_dict = {
            "line_id": line.line_id,
            "transfer_id": line.transfer_id,
            "item_id": line.item_id,
            "sent_quantity": line.sent_quantity,
            "received_quantity": line.received_quantity,
            "variance_notes": line.variance_notes,
            "variance_reason": line.variance_reason,
            "created_at": line.created_at,
            "item_code": line.item.item_code if line.item else None,
            "item_name": line.item.name if line.item else None
        }
        lines_data.append(line_dict)
        
    return {
        "transfer_id": transfer.transfer_id,
        "transfer_number": transfer.transfer_number,
        "source_branch_id": transfer.source_branch_id,
        "dest_branch_id": transfer.dest_branch_id,
        "status": transfer.status,
        "notes": transfer.notes,
        "received_notes": transfer.received_notes,
        "created_by": transfer.created_by,
        "shipped_at": transfer.shipped_at,
        "shipped_by": transfer.shipped_by,
        "received_at": transfer.received_at,
        "received_by": transfer.received_by,
        "cancelled_at": transfer.cancelled_at,
        "cancelled_by": transfer.cancelled_by,
        "cancellation_reason": transfer.cancellation_reason,
        "created_at": transfer.created_at,
        "updated_at": transfer.updated_at,
        "lines": lines_data
    }

@router.post("/", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
def create_transfer(
    transfer_in: TransferCreate,
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    service: TransferService = Depends(get_transfer_service)
) -> Any:
    # RBAC check: non-super_admin can only create from own branch
    if current_user.role != "super_admin":
        if transfer_in.source_branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat membuat transfer dari cabang Anda sendiri"
            )
            
    transfer = service.create(obj_in=transfer_in, current_user=current_user)
    return format_transfer(transfer)

@router.get("/", response_model=PaginatedTransferResponse)
def read_transfers(
    branch_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    # RBAC check: non-super_admin is restricted to their own branch
    if current_user.role != "super_admin":
        if branch_id and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat melihat data transfer dari cabang Anda sendiri"
            )
        branch_id = current_user.branch_id

    repo = TransferRepository(db)
    skip = (page - 1) * page_size
    
    transfers = repo.list_transfers(
        branch_id=branch_id,
        status=status,
        skip=skip,
        limit=page_size
    )
    total = repo.count_transfers(
        branch_id=branch_id,
        status=status
    )
    
    formatted_data = [format_transfer(t) for t in transfers]
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return {
        "data": formatted_data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/{id}", response_model=TransferResponse)
def read_transfer(
    id: int,
    current_user: User = Depends(get_current_active_user),
    service: TransferService = Depends(get_transfer_service)
) -> Any:
    transfer = service.get(id)
    
    # RBAC check: non-super_admin must belong to source or destination branch
    if current_user.role != "super_admin":
        if transfer.source_branch_id != current_user.branch_id and transfer.dest_branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki akses ke data transfer ini"
            )
            
    return format_transfer(transfer)

@router.put("/{id}", response_model=TransferResponse)
def update_transfer(
    id: int,
    transfer_in: TransferUpdate,
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    service: TransferService = Depends(get_transfer_service)
) -> Any:
    transfer = service.get(id)
    
    # RBAC check
    if current_user.role != "super_admin":
        if transfer.source_branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat mengubah transfer dari cabang Anda sendiri"
            )
            
    updated_transfer = service.update(id=id, obj_in=transfer_in, current_user=current_user)
    return format_transfer(updated_transfer)

@router.post("/{id}/ship", response_model=TransferResponse)
def ship_transfer(
    id: int,
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    service: TransferService = Depends(get_transfer_service)
) -> Any:
    transfer = service.get(id)
    
    # RBAC check
    if current_user.role != "super_admin":
        if transfer.source_branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat mengirim transfer dari cabang Anda sendiri"
            )
            
    shipped_transfer = service.ship(id=id, current_user=current_user)
    return format_transfer(shipped_transfer)

@router.post("/{id}/receive", response_model=TransferResponse)
def receive_transfer(
    id: int,
    receive_in: TransferReceive,
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    service: TransferService = Depends(get_transfer_service)
) -> Any:
    transfer = service.get(id)
    
    # RBAC check: must be receiver branch head
    if current_user.role != "super_admin":
        if transfer.dest_branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat menerima transfer di cabang tujuan Anda sendiri"
            )
            
    received_transfer = service.receive(id=id, obj_in=receive_in, current_user=current_user)
    return format_transfer(received_transfer)

@router.post("/{id}/cancel", response_model=TransferResponse)
def cancel_transfer(
    id: int,
    cancel_in: TransferCancel,
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    service: TransferService = Depends(get_transfer_service)
) -> Any:
    transfer = service.get(id)
    
    # RBAC check: can cancel if own branch head on either source or dest side
    if current_user.role != "super_admin":
        if transfer.source_branch_id != current_user.branch_id and transfer.dest_branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat membatalkan transfer yang melibatkan cabang Anda sendiri"
            )
            
    cancelled_transfer = service.cancel(id=id, obj_in=cancel_in, current_user=current_user)
    return format_transfer(cancelled_transfer)
