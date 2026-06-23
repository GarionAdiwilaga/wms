from fastapi import APIRouter
from app.api.v1.endpoints import auth, branch, category, supplier, uom, user, item, inventory, branch_stocks, stock_in, outbound

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(branch.router, prefix="/branches", tags=["branches"])
api_router.include_router(category.router, prefix="/categories", tags=["categories"])
api_router.include_router(supplier.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(uom.router, prefix="/uoms", tags=["uoms"])
api_router.include_router(user.router, prefix="/users", tags=["users"])
api_router.include_router(item.router, prefix="/items", tags=["items"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(branch_stocks.router, prefix="/branch-stocks", tags=["branch_stocks"])
api_router.include_router(stock_in.router, prefix="/stock-in", tags=["stock-in"])
api_router.include_router(outbound.router, prefix="/outbound", tags=["outbound"])


@api_router.get("/health")
def health_check():
    return {"status": "ok"}
