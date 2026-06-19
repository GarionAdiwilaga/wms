from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from app.core.config import settings
from typing import Any

# CryptContext configured to use bcrypt for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against its hashed version."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a password using bcrypt."""
    return pwd_context.hash(password)

def create_access_token(user_id: int, role: str, token_version: int, remember_me: bool = False) -> str:
    """
    Creates a JWT access token containing the user's ID (sub), role, and token_version.
    Token_version is crucial for immediate invalidation upon password resets or deactivation.
    """
    expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER_ME if remember_me else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "token_version": token_version,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decodes and validates a JWT access token.
    Raises jwt.InvalidTokenError if the token is tampered with or expired.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload
