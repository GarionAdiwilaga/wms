from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field

class MovementVelocityEntry(BaseModel):
    item_id: int
    item_code: str
    item_name: str
    category_name: str
    supplier_name: str
    total_outbound: int
    velocity: float

class MovementVelocityResponse(BaseModel):
    generated_at: datetime
    data: List[MovementVelocityEntry]

class ActivityTrendEntry(BaseModel):
    date: str
    inbound: int
    outbound: int
    transfers: int

class ActivityTrendResponse(BaseModel):
    generated_at: datetime
    data: List[ActivityTrendEntry]

class CategoryDistributionEntry(BaseModel):
    category_id: int
    category_name: str
    total_quantity: int
    item_count: int

class BranchDistributionEntry(BaseModel):
    branch_id: int
    branch_name: str
    total_quantity: int
    item_count: int

class DistributionsResponse(BaseModel):
    generated_at: datetime
    categories: List[CategoryDistributionEntry]
    branches: Optional[List[BranchDistributionEntry]] = None

class TopOperatorEntry(BaseModel):
    user_id: int
    operator_name: str
    total_transactions: int
    total_units: int

class TopOperatorsResponse(BaseModel):
    generated_at: datetime
    data: List[TopOperatorEntry]

class MovementClassificationEntry(BaseModel):
    item_id: int
    item_code: str
    item_name: str
    category_name: str
    supplier_name: str
    last_movement_date: Optional[datetime] = None
    days_since_last_movement: Optional[int] = None

class MovementClassificationResponse(BaseModel):
    generated_at: datetime
    data: List[MovementClassificationEntry]
    total: int
