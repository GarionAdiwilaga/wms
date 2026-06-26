from typing import Any, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.models.item import Item
from app.models.inventory import InventoryTransaction
from app.schemas.item import (
    ItemCreate, ItemUpdate, ItemResponse, PaginatedItemResponse,
    FrequentItemEntry, FrequentItemsResponse,
)
from app.repositories.item import ItemRepository
import math
from app.services.item import ItemService

router = APIRouter()

def get_item_service(db: Session = Depends(get_db)) -> ItemService:
    repo = ItemRepository(db)
    return ItemService(repository=repo, db=db)

def format_item(request: Request, item: Item) -> dict[str, Any]:
    data = ItemResponse.model_validate(item).model_dump()
    # image_url is the relative path served via the /uploads static mount.
    # Using a relative URL ensures it works through the Vite dev proxy
    # (/uploads -> backend:8000/uploads) and any production reverse proxy,
    # instead of embedding the container-internal hostname (backend:8000).
    if item.image_path:
        data["image_url"] = item.image_path  # e.g. /uploads/items/ITEM_abc123.png
    return data

@router.get("/", response_model=PaginatedItemResponse)
def read_items(
    request: Request,
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 10,
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    q: Optional[str] = None
) -> Any:
    """
    Retrieve items with optional search query and pagination.
    """
    repo = ItemRepository(db)
    skip = (page - 1) * page_size
    items = repo.search(
        q=q, 
        category_id=category_id,
        supplier_id=supplier_id,
        is_active=is_active,
        skip=skip, 
        limit=page_size
    )
    total = repo.count(
        q=q,
        category_id=category_id,
        supplier_id=supplier_id,
        is_active=is_active
    )
    
    formatted_items = [format_item(request, item) for item in items]
    total_pages = math.ceil(total / page_size) if page_size > 0 else 0
    
    return {
        "data": formatted_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/lookup", response_model=ItemResponse)
def lookup_item(
    request: Request,
    item_code: str,
    db: Session = Depends(get_db)
) -> Any:
    """
    Lookup an item by exact item_code (e.g. for scanners).
    """
    repo = ItemRepository(db)
    item = repo.get_by(item_code=item_code)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return format_item(request, item)


# ---------------------------------------------------------------------------
# Phase 6 — Frequent Items Carousel (read-only, no ledger writes)
# NOTE: This route MUST stay before /{id} so FastAPI does not try to cast
#       the literal string "frequent" as an integer path parameter.
# ---------------------------------------------------------------------------

# Operational reference types that reflect real warehouse work.
# Excludes: 'initial_load', 'opname', 'manual', 'system' (admin/adjustments).
_OPERATIONAL_REF_TYPES = ('stock_in', 'outbound', 'transfer')

@router.get("/frequent", response_model=FrequentItemsResponse)
def get_frequent_items(
    request: Request,
    branch_id: Optional[int] = None,
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Phase 6 — Read-only analytics endpoint.

    Returns the current user's most frequently handled items for the given
    branch over the past 30 days, ranked by:
      1. COUNT(*) DESC  — number of transactions (primary signal)
      2. SUM(quantity) DESC — total quantity moved (tie-breaker)

    Filters applied:
      - created_by = current authenticated user
      - branch_id  = provided branch_id query param (required; returns empty list if None)
      - reference_type IN ('stock_in', 'outbound', 'transfer')
      - created_at  >= NOW() - 30 days

    No ledger writes. No database migrations. No new tables.
    """
    # Per approved spec: hide carousel when no branch is selected.
    # Return an empty result set rather than a 400 so the frontend can
    # render a graceful empty state without error handling.
    if branch_id is None:
        return FrequentItemsResponse(data=[], branch_id=None)

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    # Aggregate directly from the immutable inventory_transactions ledger.
    # We join Item inline so we can hydrate category/supplier relationships
    # in a single round-trip via SQLAlchemy.
    stmt = (
        select(
            InventoryTransaction.item_id,
            func.count(InventoryTransaction.transaction_id).label("transaction_count"),
            func.sum(InventoryTransaction.quantity).label("total_quantity"),
        )
        .where(
            InventoryTransaction.created_by == current_user.user_id,
            InventoryTransaction.branch_id == branch_id,
            InventoryTransaction.reference_type.in_(_OPERATIONAL_REF_TYPES),
            InventoryTransaction.created_at >= cutoff,
        )
        .group_by(InventoryTransaction.item_id)
        .order_by(
            func.count(InventoryTransaction.transaction_id).desc(),
            func.sum(InventoryTransaction.quantity).desc(),
        )
        .limit(limit)
    )

    rows = db.execute(stmt).all()

    if not rows:
        return FrequentItemsResponse(data=[], branch_id=branch_id)

    # Bulk-fetch the Item ORM objects (with eager category/supplier) in one query.
    item_ids = [row.item_id for row in rows]
    items_by_id: dict[int, Item] = {
        item.item_id: item
        for item in db.execute(
            select(Item).where(Item.item_id.in_(item_ids))
        ).scalars().all()
    }

    # Build the response, preserving the aggregation rank order.
    entries: list[FrequentItemEntry] = []
    for row in rows:
        item = items_by_id.get(row.item_id)
        if item is None or not item.is_active:
            # Skip items that were deactivated since the transactions occurred.
            continue

        # Resolve image_url using the same relative-path convention as
        # format_item() so it works through Vite proxy and production reverse proxy.
        image_url: Optional[str] = item.image_path if item.image_path else None

        entries.append(
            FrequentItemEntry(
                item_id=item.item_id,
                item_code=item.item_code,
                name=item.name,
                image_url=image_url,
                transaction_count=row.transaction_count,
                total_quantity=row.total_quantity,
                category=item.category,
                supplier=item.supplier,
            )
        )

    return FrequentItemsResponse(data=entries, branch_id=branch_id)


@router.get("/{id}", response_model=ItemResponse)
def read_item(
    request: Request,
    id: int,
    service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Get item by ID.
    """
    item = service.get(id)
    return format_item(request, item)

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    request: Request,
    item_in: ItemCreate,
    current_user: User = Depends(get_current_active_user),
    service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Create new item.
    """
    item = service.create(obj_in=item_in, current_user=current_user)
    return format_item(request, item)

@router.put("/{id}", response_model=ItemResponse)
def update_item(
    request: Request,
    id: int,
    item_in: ItemUpdate,
    current_user: User = Depends(get_current_active_user),
    service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Update an item. Identity fields are immutable.
    """
    item = service.update(id=id, obj_in=item_in, current_user=current_user)
    return format_item(request, item)

@router.post("/{id}/image", response_model=ItemResponse)
def upload_item_image(
    request: Request,
    id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Upload an image for an item.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    item = service.upload_image(id=id, file=file, current_user=current_user)
    return format_item(request, item)
