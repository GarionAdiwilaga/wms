from app.repositories.base import CRUDBase
from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchUpdate
from sqlalchemy.orm import Session

class BranchRepository(CRUDBase[Branch, BranchCreate, BranchUpdate]):
    def __init__(self, db: Session):
        super().__init__(Branch, db)
