from app.repositories.base import CRUDBase
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from sqlalchemy.orm import Session

class SupplierRepository(CRUDBase[Supplier, SupplierCreate, SupplierUpdate]):
    def __init__(self, db: Session):
        super().__init__(Supplier, db)
