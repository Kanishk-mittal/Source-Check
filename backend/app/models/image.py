from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId


class Dimensions(BaseModel):
    width: int
    height: int


class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class QuadtreeNode(BaseModel):
    level: int
    quadrant_path: str  # e.g., "root", "root.TL", "root.TL.BR"
    bounds: BoundingBox
    phash: str


class ImageRegistryInDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    owner_id: str
    owner_username: str
    filename: str
    mime_type: str
    dimensions: Dimensions
    level_0_phash: str
    quadtree_depth: int
    quadtree_nodes: List[QuadtreeNode]
    serialized_tree_hash: str
    rsa_signature_base64: str
    file_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }


class ImageRegistryResponse(BaseModel):
    id: str
    owner_id: str
    owner_username: str
    filename: str
    mime_type: str
    dimensions: Dimensions
    level_0_phash: str
    quadtree_depth: int
    serialized_tree_hash: str
    rsa_signature_base64: str
    total_nodes: int
    created_at: datetime


class TamperBoundingBox(BaseModel):
    quadrant_path: str
    level: int
    bounds: BoundingBox
    hamming_distance: int
    status: str  # "tampered", "moderate_edit"


class QuadtreeComparisonNode(BaseModel):
    level: int
    quadrant_path: str
    bounds: BoundingBox
    stored_phash: str
    query_phash: str
    hamming_distance: int
    is_tampered: bool
    pruned: bool = False


class VerificationResponse(BaseModel):
    is_registered: bool
    match_status: str  # "authentic_variant", "moderate_edit", "rejected", "tampered", "exact_match"
    root_hamming_distance: Optional[int] = None
    rejection_reason: Optional[str] = None
    owner_id: Optional[str] = None
    owner_username: Optional[str] = None
    registered_image_id: Optional[str] = None
    registered_filename: Optional[str] = None
    dimensions: Optional[Dimensions] = None
    signature_valid: bool = False
    signature_details: Optional[str] = None
    tampered_percentage: float = 0.0
    tampered_bounding_boxes: List[TamperBoundingBox] = []
    drilldown_nodes: List[QuadtreeComparisonNode] = []
    message: str
