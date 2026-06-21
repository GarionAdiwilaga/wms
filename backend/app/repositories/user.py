from app.repositories.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from sqlalchemy.orm import Session

class UserRepository(CRUDBase[User, UserCreate, UserUpdate]):
    def __init__(self, db: Session):
        super().__init__(User, db)
