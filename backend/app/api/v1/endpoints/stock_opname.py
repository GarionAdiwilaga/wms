from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import math

from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.models.stock_opname import StockOpnameSession
from app.schemas.stock_opname import (
    StockOpnameCreate,
    StockOpnameUpdate,
    StockOpnameResponse,
    PaginatedStockOpnameResponse
)
from app.repositories.stock_opname import StockOpnameRepository
from app.services.opname_service import OpnameService

router = APIRouter()

def get_opname_service(db: Session = Depends(get_db)) -> OpnameService:
    repo = StockOpnameRepository(db)
    return OpnameService(repository=repo, db=db)

def format_opname(session: StockOpnameSession) -> dict[str, Any]:
    lines_data = []
    for line in session.lines:
        line_dict = {
            "line_id": line.line_id,
            "session_id": line.session_id,
            "item_id": line.item_id,
            "system_quantity": line.system_quantity,
            "physical_quantity": line.physical_quantity,
            "variance": line.variance,
            "created_at": line.created_at,
            "item_code": line.item.item_code if line.item else None,
            "item_name": line.item.name if line.item else None,
            "image_url": line.item.image_path if line.item else None
        }
        lines_data.append(line_dict)
        
    return {
        "session_id": session.session_id,
        "branch_id": session.branch_id,
        "category_id": session.category_id,
        "status": session.status,
        "notes": session.notes,
        "created_by": session.created_by,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "lines": lines_data
    }

@router.post("/", response_model=StockOpnameResponse, status_code=status.HTTP_201_CREATED)
def create_opname(
    opname_in: StockOpnameCreate,
    current_user: User = Depends(get_current_active_user),
    service: OpnameService = Depends(get_opname_service)
) -> Any:
    # RBAC check: non-super_admin can only perform opname for own branch
    if current_user.role != "super_admin":
        if opname_in.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat melakukan opname di cabang Anda sendiri"
            )
            
    session = service.create(obj_in=opname_in, current_user=current_user)
    return format_opname(session)

@router.get("/", response_model=PaginatedStockOpnameResponse)
def read_opname_sessions(
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
                detail="Anda hanya dapat melihat data opname dari cabang Anda sendiri"
            )
        branch_id = current_user.branch_id

    repo = StockOpnameRepository(db)
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
    
    formatted_data = [format_opname(s) for s in sessions]
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return {
        "data": formatted_data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/{id}", response_model=StockOpnameResponse)
def read_opname_session(
    id: int,
    current_user: User = Depends(get_current_active_user),
    service: OpnameService = Depends(get_opname_service)
) -> Any:
    session = service.get(id)
    
    # RBAC check: non-super_admin is restricted to their own branch
    if current_user.role != "super_admin":
        if session.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki akses ke data opname ini"
            )
            
    return format_opname(session)

@router.put("/{id}", response_model=StockOpnameResponse)
def update_opname(
    id: int,
    opname_in: StockOpnameUpdate,
    current_user: User = Depends(get_current_active_user),
    service: OpnameService = Depends(get_opname_service)
) -> Any:
    session = service.get(id)
    
    # RBAC check
    if current_user.role != "super_admin":
        if session.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat mengubah data opname untuk cabang Anda sendiri"
            )
            
    updated_session = service.update(id=id, obj_in=opname_in, current_user=current_user)
    return format_opname(updated_session)

@router.post("/{id}/complete", response_model=StockOpnameResponse)
def complete_opname(
    id: int,
    current_user: User = Depends(get_current_active_user),
    service: OpnameService = Depends(get_opname_service)
) -> Any:
    session = service.get(id)
    
    # RBAC check
    if current_user.role != "super_admin":
        if session.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat menyelesaikan opname untuk cabang Anda sendiri"
            )
            
    completed_session = service.complete(id=id, current_user=current_user)
    return format_opname(completed_session)

@router.post("/{id}/cancel", response_model=StockOpnameResponse)
def cancel_opname(
    id: int,
    current_user: User = Depends(get_current_active_user),
    service: OpnameService = Depends(get_opname_service)
) -> Any:
    session = service.get(id)
    
    # RBAC check
    if current_user.role != "super_admin":
        if session.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda hanya dapat membatalkan opname untuk cabang Anda sendiri"
            )
    cancelled_session = service.cancel(id=id, current_user=current_user)
    return format_opname(cancelled_session)

@router.get("/{id}/pdf")
def get_opname_pdf(
    id: int,
    current_user: User = Depends(get_current_active_user),
    service: OpnameService = Depends(get_opname_service)
) -> Any:
    from app.services.pdf_service import PdfService
    from fastapi import Response
    from datetime import datetime

    session = service.get(id)
    
    # RBAC check: non-super_admin is restricted to their own branch
    if current_user.role != "super_admin":
        if session.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki akses ke data opname ini"
            )

    context = {
        "session": session,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "generated_by": current_user.username
    }

    pdf_bytes = PdfService.render_to_pdf("transactions/stock_opname.html", context)
    
    filename = f"stock_opname_OPN-{session.session_id:06d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

