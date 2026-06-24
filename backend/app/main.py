from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from fastapi.staticfiles import StaticFiles
import os
from app.core.logging import logger

app = FastAPI(
    title="Gudang Piala Kaltim WMS API",
    version="0.1.0"
)

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
