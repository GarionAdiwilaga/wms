from pydantic import BaseModel

from app.schemas.user import UserResponse

class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CurrentUserResponse(UserResponse):
    pass
