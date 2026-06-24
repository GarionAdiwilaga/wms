from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse, PaginatedItemResponse
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
