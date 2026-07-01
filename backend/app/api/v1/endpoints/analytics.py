from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import zoneinfo

from app.core.dependencies import get_db, require_role
from app.models.user import User
from app.services.analytics_service import AnalyticsService, JAKARTA_TZ
from app.schemas.analytics import (
    MovementVelocityResponse,
    ActivityTrendResponse,
    DistributionsResponse,
    TopOperatorsResponse,
    MovementClassificationResponse,
)

router = APIRouter()

def validate_branch_permission(current_user: User, branch_id: Optional[int]) -> Optional[int]:
    """
    Validates branch access: non-super_admins are restricted to their own branch.
    Returns the effective branch_id.
    """
    if current_user.role != "super_admin":
        if branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki wewenang untuk melihat data analitik dari cabang lain"
            )
        return current_user.branch_id
    return branch_id

@router.get("/velocity", response_model=MovementVelocityResponse)
def get_movement_velocity(
    branch_id: Optional[int] = Query(None, description="Filter by branch ID"),
    days: int = Query(30, ge=7, le=365, description="Number of days to aggregate"),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    effective_branch_id = validate_branch_permission(current_user, branch_id)
    data = AnalyticsService.get_movement_velocity(db, branch_id=effective_branch_id, days=days)
    return {
        "generated_at": datetime.now(JAKARTA_TZ),
        "data": data
    }

@router.get("/trends", response_model=ActivityTrendResponse)
def get_activity_trends(
    branch_id: Optional[int] = Query(None, description="Filter by branch ID"),
    days: int = Query(30, ge=7, le=365, description="Number of days to aggregate"),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    effective_branch_id = validate_branch_permission(current_user, branch_id)
    data = AnalyticsService.get_activity_trends(db, branch_id=effective_branch_id, days=days)
    return {
        "generated_at": datetime.now(JAKARTA_TZ),
        "data": data
    }

@router.get("/distributions", response_model=DistributionsResponse)
def get_distributions(
    branch_id: Optional[int] = Query(None, description="Filter by branch ID"),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    effective_branch_id = validate_branch_permission(current_user, branch_id)
    distributions = AnalyticsService.get_distributions(db, branch_id=effective_branch_id)
    return {
        "generated_at": datetime.now(JAKARTA_TZ),
        "categories": distributions["categories"],
        "branches": distributions["branches"]
    }

@router.get("/operators", response_model=TopOperatorsResponse)
def get_top_operators(
    branch_id: Optional[int] = Query(None, description="Filter by branch ID"),
    days: int = Query(30, ge=7, le=365, description="Number of days to aggregate"),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    effective_branch_id = validate_branch_permission(current_user, branch_id)
    data = AnalyticsService.get_top_operators(db, branch_id=effective_branch_id, days=days)
    return {
        "generated_at": datetime.now(JAKARTA_TZ),
        "data": data
    }

@router.get("/classification", response_model=MovementClassificationResponse)
def get_movement_classification(
    branch_id: Optional[int] = Query(None, description="Filter by branch ID"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    supplier_id: Optional[int] = Query(None, description="Filter by supplier ID"),
    search: Optional[str] = Query(None, description="Search keyword for item name or code"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(require_role(["super_admin", "branch_head"])),
    db: Session = Depends(get_db)
) -> Any:
    effective_branch_id = validate_branch_permission(current_user, branch_id)
    limit = page_size
    offset = (page - 1) * page_size
    
    data, total = AnalyticsService.get_movement_classification(
        db=db,
        branch_id=effective_branch_id,
        category_id=category_id,
        supplier_id=supplier_id,
        search=search,
        limit=limit,
        offset=offset
    )
    return {
        "generated_at": datetime.now(JAKARTA_TZ),
        "data": data,
        "total": total
    }
