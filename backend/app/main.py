from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import connect_to_mongo, close_mongo_connection
from app.routers.auth import router as auth_router
from app.routers.registry import router as registry_router
from app.routers.verification import router as verification_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="Cryptographic Multimedia Forensics & Provenance Registry",
    description=(
        "Hierarchical Perceptual Hash (pHash) Quadtree with RSA-2048 Digital Signatures "
        "and BK-Tree / Hamming Distance metric forensic verification."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite & clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(registry_router, prefix=settings.API_V1_STR)
app.include_router(verification_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health & Status"])
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "api_docs": "/docs",
        "endpoints": {
            "auth": f"{settings.API_V1_STR}/auth",
            "registry": f"{settings.API_V1_STR}/registry",
            "verification": f"{settings.API_V1_STR}/verification"
        }
    }
