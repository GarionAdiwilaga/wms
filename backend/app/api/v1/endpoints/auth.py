from fastapi import APIRouter
from app.schemas.auth import LoginRequest, LoginResponse, CurrentUserResponse
from app.services.auth import AuthService
from app.core.dependencies import SessionDep, ActiveUserDep

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: SessionDep):
    """
    Authenticate a user and return a JWT access token.
    """
    auth_service = AuthService(db)
    return auth_service.authenticate_user(login_data)

@router.get("/me", response_model=CurrentUserResponse)
def get_current_user_info(current_user: ActiveUserDep):
    """
    Retrieve information about the currently authenticated user.
    """
    return current_user
