from typing import Optional
from sqlalchemy import select, or_
from app.models.inventory import BranchStock
from app.models.item import Item
from app.models.branch import Branch
from app.models.category import Category
from app.models.supplier import Supplier

def build_stock_report_query(
    branch_id: Optional[int] = None,
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    search: Optional[str] = None
):
    """
    Constructs the base SQLAlchemy select query for the stock report.
    This query is shared by both ReportService (for report display and exports)
    and AnalyticsService (for category and branch distribution aggregations).
    """
    query = select(
        Branch.branch_id,
        Branch.name.label("branch_name"),
        Item.item_id,
        Item.item_code,
        Item.name.label("item_name"),
        Category.category_id,
        Category.name.label("category_name"),
        Supplier.supplier_id,
        Supplier.name.label("supplier_name"),
        BranchStock.quantity,
        Item.minimum_stock
    ).join(
        Branch, BranchStock.branch_id == Branch.branch_id
    ).join(
        Item, BranchStock.item_id == Item.item_id
    ).join(
        Category, Item.category_id == Category.category_id
    ).join(
        Supplier, Item.supplier_id == Supplier.supplier_id
    )

    if branch_id is not None:
        query = query.where(BranchStock.branch_id == branch_id)
    if category_id is not None:
        query = query.where(Item.category_id == category_id)
    if supplier_id is not None:
        query = query.where(Item.supplier_id == supplier_id)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Item.item_code.ilike(search_term),
                Item.name.ilike(search_term),
                Supplier.name.ilike(search_term),
                Category.name.ilike(search_term)
            )
        )

    return query
