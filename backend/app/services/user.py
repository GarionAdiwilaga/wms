from app.services.base import ServiceBase
from app.repositories.user import UserRepository
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from typing import Any
from sqlalchemy.orm import Session
from app.core.security import get_password_hash

class UserService(ServiceBase[UserRepository, User, UserCreate, UserUpdate]):
    def __init__(self, db: Session):
        super().__init__(UserRepository(db))

    def create(self, obj_in: UserCreate, current_user: User) -> User:
        self.check_uniqueness("username", obj_in.username)
        # Hash password before saving
        user_data = obj_in.model_dump()
        user_data["password_hash"] = get_password_hash(user_data.pop("password"))
        return super().create(user_data, current_user)

    def update(self, id: Any, obj_in: UserUpdate, current_user: User) -> User:
        user_data = obj_in.model_dump(exclude_unset=True)
        if "password" in user_data:
            user_data["password_hash"] = get_password_hash(user_data.pop("password"))
        return super().update(id, user_data, current_user)
