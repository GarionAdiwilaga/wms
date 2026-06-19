from typing import Annotated, Generator, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import decode_access_token
from app.models.user import User

# OAuth2 scheme extracts the Bearer token from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_db() -> Generator[Session, None, None]:
    """
    Provides a SQLAlchemy database session to endpoints.
    To be fully implemented when app.db.session engine is initialized.
    """
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Type aliases for clean FastAPI dependency injection
SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]

def get_current_user(db: SessionDep, token: TokenDep) -> User:
    """
    Validates the JWT token, extracts user info, and fetches the user from the database.
    Ensures that the token_version matches the current user's token_version.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        token_version: int | None = payload.get("token_version")
        if user_id_str is None or token_version is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise credentials_exception

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    
    # Token version check for invalidation support
    if user.token_version != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user

CurrentUserDep = Annotated[User, Depends(get_current_user)]

def get_current_active_user(current_user: CurrentUserDep) -> User:
    """Ensures the authenticated user's account is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    return current_user

ActiveUserDep = Annotated[User, Depends(get_current_active_user)]

def require_role(allowed_roles: list[str]) -> Callable[[User], User]:
    """
    Dependency generator for Role-Based Access Control (RBAC).
    Validates that the current active user possesses one of the allowed roles.
    Supported roles: 'super_admin', 'branch_head', 'warehouse_staff'
    """
    def role_checker(current_user: ActiveUserDep) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to access this resource"
            )
        return current_user
    return role_checker
