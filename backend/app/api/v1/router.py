from fastapi import APIRouter
from app.api.v1.endpoints import auth, branch, category, supplier, uom, user

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(branch.router, prefix="/branches", tags=["branches"])
api_router.include_router(category.router, prefix="/categories", tags=["categories"])
api_router.include_router(supplier.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(uom.router, prefix="/uoms", tags=["uoms"])
api_router.include_router(user.router, prefix="/users", tags=["users"])


@api_router.get("/health")
def health_check():
    return {"status": "ok"}
