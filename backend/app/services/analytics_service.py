from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Any
import zoneinfo
from sqlalchemy import select, func, and_, or_, case, Date, Float
from sqlalchemy.orm import Session
from app.models.inventory import InventoryTransaction, BranchStock
from app.models.item import Item
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.user import User
from app.services.report_queries import build_stock_report_query

JAKARTA_TZ = zoneinfo.ZoneInfo("Asia/Jakarta")

class AnalyticsService:
    @staticmethod
    def get_movement_velocity(
        db: Session,
        branch_id: Optional[int] = None,
        days: int = 30
    ) -> List[dict]:
        tz_now = datetime.now(JAKARTA_TZ)
        start_date = tz_now - timedelta(days=days)

        query = select(
            Item.item_id,
            Item.item_code,
            Item.name.label("item_name"),
            Category.name.label("category_name"),
            Supplier.name.label("supplier_name"),
            func.coalesce(func.sum(InventoryTransaction.quantity), 0).label("total_outbound")
        ).join(
            Item, InventoryTransaction.item_id == Item.item_id
        ).join(
            Category, Item.category_id == Category.category_id
        ).join(
            Supplier, Item.supplier_id == Supplier.supplier_id
        ).where(
            InventoryTransaction.transaction_type == "OUT",
            InventoryTransaction.reference_type.notin_(["initial_load", "opname"]),
            InventoryTransaction.created_at >= start_date
        )

        if branch_id is not None:
            query = query.where(InventoryTransaction.branch_id == branch_id)

        query = query.group_by(
            Item.item_id,
            Item.item_code,
            Item.name,
            Category.name,
            Supplier.name
        ).order_by(
            func.sum(InventoryTransaction.quantity).desc()
        ).limit(10)

        results = db.execute(query).all()
        
        data = []
        for r in results:
            total_out = int(r.total_outbound)
            data.append({
                "item_id": r.item_id,
                "item_code": r.item_code,
                "item_name": r.item_name,
                "category_name": r.category_name,
                "supplier_name": r.supplier_name,
                "total_outbound": total_out,
                "velocity": round(float(total_out) / days, 2)
            })
        return data

    @staticmethod
    def get_activity_trends(
        db: Session,
        branch_id: Optional[int] = None,
        days: int = 30
    ) -> List[dict]:
        tz_now = datetime.now(JAKARTA_TZ)
        start_date = tz_now - timedelta(days=days)

        # Cast local timezone date to SQL Date type
        local_date = func.cast(func.timezone("Asia/Jakarta", InventoryTransaction.created_at), Date).label("tx_date")
        
        query = select(
            local_date,
            func.coalesce(func.sum(case((InventoryTransaction.transaction_type == "IN", InventoryTransaction.quantity), else_=0)), 0).label("inbound"),
            func.coalesce(func.sum(case((InventoryTransaction.transaction_type == "OUT", InventoryTransaction.quantity), else_=0)), 0).label("outbound"),
            func.coalesce(func.sum(case((InventoryTransaction.transaction_type.in_(["TRANSFER_OUT", "TRANSFER_IN"]), InventoryTransaction.quantity), else_=0)), 0).label("transfers")
        ).where(
            InventoryTransaction.created_at >= start_date
        )

        if branch_id is not None:
            query = query.where(InventoryTransaction.branch_id == branch_id)

        query = query.group_by("tx_date").order_by("tx_date")
        results = db.execute(query).all()

        # Build list of dates for trend padding
        trends_dict = {}
        for i in range(days):
            d = (tz_now - timedelta(days=i)).date()
            trends_dict[d.isoformat()] = {
                "date": d.isoformat(),
                "inbound": 0,
                "outbound": 0,
                "transfers": 0
            }

        # Populate with actual database aggregates
        for r in results:
            d_str = r.tx_date.isoformat()
            if d_str in trends_dict:
                trends_dict[d_str]["inbound"] = int(r.inbound)
                trends_dict[d_str]["outbound"] = int(r.outbound)
                trends_dict[d_str]["transfers"] = int(r.transfers)

        # Sort chronologically ascending
        return sorted(trends_dict.values(), key=lambda x: x["date"])

    @staticmethod
    def get_distributions(db: Session, branch_id: Optional[int] = None) -> dict:
        query = build_stock_report_query(branch_id=branch_id)
        results = db.execute(query).all()

        category_data = {}
        branch_data = {}

        for r in results:
            # Aggregate by Category
            cat_id = r.category_id
            if cat_id not in category_data:
                category_data[cat_id] = {
                    "category_id": cat_id,
                    "category_name": r.category_name,
                    "total_quantity": 0,
                    "item_ids": set()
                }
            category_data[cat_id]["total_quantity"] += r.quantity
            category_data[cat_id]["item_ids"].add(r.item_id)

            # Aggregate by Branch (only if branch_id is None)
            if branch_id is None:
                br_id = r.branch_id
                if br_id not in branch_data:
                    branch_data[br_id] = {
                        "branch_id": br_id,
                        "branch_name": r.branch_name,
                        "total_quantity": 0,
                        "item_ids": set()
                    }
                branch_data[br_id]["total_quantity"] += r.quantity
                branch_data[br_id]["item_ids"].add(r.item_id)

        categories_list = [
            {
                "category_id": c["category_id"],
                "category_name": c["category_name"],
                "total_quantity": max(0, c["total_quantity"]),
                "item_count": len(c["item_ids"])
            }
            for c in category_data.values()
        ]
        categories_list.sort(key=lambda x: x["category_name"])

        branches_list = None
        if branch_id is None:
            branches_list = [
                {
                    "branch_id": b["branch_id"],
                    "branch_name": b["branch_name"],
                    "total_quantity": max(0, b["total_quantity"]),
                    "item_count": len(b["item_ids"])
                }
                for b in branch_data.values()
            ]
            branches_list.sort(key=lambda x: x["branch_name"])

        return {
            "categories": categories_list,
            "branches": branches_list
        }

    @staticmethod
    def get_top_operators(
        db: Session,
        branch_id: Optional[int] = None,
        days: int = 30
    ) -> List[dict]:
        tz_now = datetime.now(JAKARTA_TZ)
        start_date = tz_now - timedelta(days=days)

        query = select(
            User.user_id,
            User.full_name.label("operator_name"),
            func.count(InventoryTransaction.transaction_id).label("total_transactions"),
            func.coalesce(func.sum(InventoryTransaction.quantity), 0).label("total_units")
        ).join(
            User, InventoryTransaction.created_by == User.user_id
        ).where(
            InventoryTransaction.reference_type != "opname",
            InventoryTransaction.created_at >= start_date
        )

        if branch_id is not None:
            query = query.where(InventoryTransaction.branch_id == branch_id)

        query = query.group_by(
            User.user_id,
            User.full_name
        ).order_by(
            func.count(InventoryTransaction.transaction_id).desc()
        ).limit(10)

        results = db.execute(query).all()
        return [
            {
                "user_id": r.user_id,
                "operator_name": r.operator_name,
                "total_transactions": int(r.total_transactions),
                "total_units": int(r.total_units)
            }
            for r in results
        ]

    @staticmethod
    def get_movement_classification(
        db: Session,
        branch_id: Optional[int] = None,
        category_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[dict], int]:
        # Subquery to fetch maximum transaction date excluding admin loads and stock checks
        tx_sub = select(
            InventoryTransaction.item_id,
            func.max(InventoryTransaction.created_at).label("last_movement_date")
        ).where(
            InventoryTransaction.reference_type.notin_(["initial_load", "opname"])
        )
        if branch_id is not None:
            tx_sub = tx_sub.where(InventoryTransaction.branch_id == branch_id)
        
        tx_sub = tx_sub.group_by(InventoryTransaction.item_id).subquery()

        # Query all active items with left outer join
        query = select(
            Item.item_id,
            Item.item_code,
            Item.name.label("item_name"),
            Category.name.label("category_name"),
            Supplier.name.label("supplier_name"),
            func.coalesce(tx_sub.c.last_movement_date, Item.created_at).label("last_movement_date")
        ).join(
            Category, Item.category_id == Category.category_id
        ).join(
            Supplier, Item.supplier_id == Supplier.supplier_id
        ).outerjoin(
            tx_sub, Item.item_id == tx_sub.c.item_id
        ).where(
            Item.is_active == True
        )

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
                    Category.name.ilike(search_term),
                    Supplier.name.ilike(search_term)
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(count_query) or 0

        # Paginate results
        query = query.order_by(Item.item_code).limit(limit).offset(offset)
        results = db.execute(query).all()

        now_utc = datetime.now(timezone.utc)
        data = []
        for r in results:
            last_date = r.last_movement_date
            days = None
            if last_date:
                if last_date.tzinfo is None:
                    last_date = last_date.replace(tzinfo=timezone.utc)
                days = (now_utc - last_date).days
                days = max(0, days)

            data.append({
                "item_id": r.item_id,
                "item_code": r.item_code,
                "item_name": r.item_name,
                "category_name": r.category_name,
                "supplier_name": r.supplier_name,
                "last_movement_date": last_date,
                "days_since_last_movement": days
            })

        return data, total
