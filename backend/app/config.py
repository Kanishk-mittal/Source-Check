from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cryptographic Multimedia Forensics & Image Provenance Registry"
    API_V1_STR: str = "/api/v1"
    
    # MongoDB Config
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "multimedia_provenance")
    
    # Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/provenance_uploads" if os.name != "nt" else "./uploads")
    
    # Forensics Config
    DEFAULT_QUADTREE_DEPTH: int = 3
    REJECTION_THRESHOLD: int = 15
    NATURAL_VARIANT_MAX: int = 4
    MODERATE_EDIT_MAX: int = 12
    DRILLDOWN_BRANCH_THRESHOLD: int = 3

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
