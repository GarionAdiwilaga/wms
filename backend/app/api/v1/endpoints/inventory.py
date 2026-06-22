from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, require_role
from app.schemas.inventory import InitialLoadRequest, InventoryTransactionResponse
from app.services.inventory_service import inventory_service, InsufficientStockError
from typing import List

router = APIRouter()

@router.post("/initial-load", response_model=List[InventoryTransactionResponse])
def initial_load(
    request: InitialLoadRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["super_admin"]))
):
    try:
        transactions = inventory_service.execute_stock_changes(
            db=db,
            branch_id=request.branch_id,
            transaction_type="IN",
            reference_type="initial_load",
            reference_id=None,
            document_no=None,
            lines=request.lines,
            notes=request.notes,
            created_by=current_user.user_id
        )
        return transactions
    except InsufficientStockError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
