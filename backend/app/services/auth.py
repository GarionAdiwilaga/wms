from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.auth import AuthRepository
from app.core.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest, LoginResponse

class AuthService:
    def __init__(self, db: Session):
        self.repository = AuthRepository(db)

    def authenticate_user(self, login_data: LoginRequest) -> LoginResponse:
        user = self.repository.get_user_by_username(login_data.username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user",
            )
        
        access_token = create_access_token(
            user_id=user.user_id,
            role=user.role,
            token_version=user.token_version,
            remember_me=login_data.remember_me
        )
        
        return LoginResponse(
            access_token=access_token,
            user=user
        )
