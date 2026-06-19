from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: str | None = None
    role: str | None = None
    token_version: int | None = None

class Login(BaseModel):
    username: str
    password: str
    remember_me: bool = False
