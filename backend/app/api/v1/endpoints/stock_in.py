from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import math

from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.models.stock_in import StockInSession
from app.schemas.stock_in import StockInCreate, StockInResponse, PaginatedStockInResponse
from app.repositories.stock_in import StockInRepository
from app.services.stock_in_service import StockInService

router = APIRouter()

def get_stock_in_service(db: Session = Depends(get_db)) -> StockInService:
    repo = StockInRepository(db)
    return StockInService(repository=repo, db=db)

def format_stock_in(session: StockInSession) -> dict[str, Any]:
    lines_data = []
    for line in session.lines:
        line_dict = {
            "line_id": line.line_id,
            "session_id": line.session_id,
            "item_id": line.item_id,
            "quantity": line.quantity,
            "created_at": line.created_at,
            "item_code": line.item.item_code if line.item else None,
            "item_name": line.item.name if line.item else None
        }
        lines_data.append(line_dict)
        
    return {
        "session_id": session.session_id,
        "branch_id": session.branch_id,
        "status": session.status,
        "reference_no": session.reference_no,
        "supplier_invoice_no": session.supplier_invoice_no,
        "transaction_date": session.transaction_date,
        "notes": session.notes,
        "created_by": session.created_by,
        "received_by": session.received_by,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "lines": lines_data
    }

@router.post("/", response_model=StockInResponse, status_code=status.HTTP_201_CREATED)
def create_stock_in(
    session_in: StockInCreate,
    current_user: User = Depends(get_current_active_user),
    service: StockInService = Depends(get_stock_in_service)
) -> Any:
    # Enforce branch restriction for non-super_admin
    if current_user.role != "super_admin":
        if session_in.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only perform Stock In for your own branch"
            )
    
    session = service.create(obj_in=session_in, current_user=current_user)
    return format_stock_in(session)

@router.get("/", response_model=PaginatedStockInResponse)
def read_stock_in_sessions(
    branch_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    # Enforce branch restriction for non-super_admin
    if current_user.role != "super_admin":
        if branch_id and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view Stock In sessions for your own branch"
            )
        branch_id = current_user.branch_id

    repo = StockInRepository(db)
    skip = (page - 1) * page_size
    
    sessions = repo.list_sessions(
        branch_id=branch_id,
        status=status,
        skip=skip,
        limit=page_size
    )
    total = repo.count_sessions(
        branch_id=branch_id,
        status=status
    )
    
    formatted_data = [format_stock_in(s) for s in sessions]
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return {
        "data": formatted_data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/{id}", response_model=StockInResponse)
def read_stock_in_session(
    id: int,
    current_user: User = Depends(get_current_active_user),
    service: StockInService = Depends(get_stock_in_service)
) -> Any:
    session = service.get(id)
    
    # Enforce branch restriction for non-super_admin
    if current_user.role != "super_admin":
        if session.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view Stock In sessions for your own branch"
            )
            
    return format_stock_in(session)
