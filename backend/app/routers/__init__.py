from app.routers.auth import router as auth_router
from app.routers.registry import router as registry_router
from app.routers.verification import router as verification_router

__all__ = ["auth_router", "registry_router", "verification_router"]
