from app.repositories.base import CRUDBase
from app.models.uom import UOM
from app.schemas.uom import UOMCreate, UOMUpdate
from sqlalchemy.orm import Session

class UOMRepository(CRUDBase[UOM, UOMCreate, UOMUpdate]):
    def __init__(self, db: Session):
        super().__init__(UOM, db)
