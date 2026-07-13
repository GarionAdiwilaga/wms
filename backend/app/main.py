import secrets
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from app.api.v1.router import api_router
from fastapi.staticfiles import StaticFiles
import os
from app.core.logging import logger
from app.core.config import settings
from app.core.dependencies import get_db
from sqlalchemy.orm import Session
from app.models.user import User
from passlib.context import CryptContext

app = FastAPI(
    title="Gudang Piala Kaltim WMS API",
    version="0.1.0",
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
    openapi_url=None if settings.ENVIRONMENT == "production" else "/openapi.json"
)

security = HTTPBasic()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_super_admin(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not user.is_active or user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password, or insufficient permissions",
            headers={"WWW-Authenticate": "Basic"},
        )
    if not pwd_context.verify(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

if settings.ENVIRONMENT == "production":
    @app.get("/docs", include_in_schema=False)
    async def get_documentation(username: str = Depends(verify_super_admin)):
        return get_swagger_ui_html(openapi_url="/openapi.json", title="Gudang Piala Kaltim WMS API - Swagger UI")

    @app.get("/redoc", include_in_schema=False)
    async def get_redocumentation(username: str = Depends(verify_super_admin)):
        return get_redoc_html(openapi_url="/openapi.json", title="Gudang Piala Kaltim WMS API - ReDoc")

    @app.get("/openapi.json", include_in_schema=False)
    async def openapi(username: str = Depends(verify_super_admin)):
        return get_openapi(title=app.title, version=app.version, routes=app.routes)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def exception_logging_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled Exception: {str(e)}", exc_info=True, extra={
            "method": request.method,
            "url": str(request.url),
            "client_ip": request.client.host if request.client else None
        })
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"}
        )

app.include_router(api_router, prefix="/api/v1")

os.makedirs("uploads/items", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
