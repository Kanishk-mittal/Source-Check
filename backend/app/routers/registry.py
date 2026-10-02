import os
import uuid
import io
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from bson import ObjectId
from PIL import Image

from app.db import get_database, db_manager
from app.config import settings
from app.models.image import (
    ImageRegistryInDB,
    ImageRegistryResponse,
    Dimensions,
)
from app.services.crypto_service import CryptoService
from app.services.quadtree_service import QuadtreeService

router = APIRouter(prefix="/registry", tags=["Image Registry & Provenance"])


@router.post(
    "/register-image",
    response_model=ImageRegistryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new image with Quadtree pHash & RSA digital signature"
)
async def register_image(
    file: UploadFile = File(..., description="Image file to register (JPEG, PNG, WEBP)"),
    owner_id: str = Form(..., description="User ID of the image owner"),
    private_key_pem: Optional[str] = Form(None, description="User's RSA Private Key PEM text"),
    private_key_file: Optional[UploadFile] = File(None, description="Optional RSA Private Key PEM file"),
    quadtree_depth: int = Form(settings.DEFAULT_QUADTREE_DEPTH, ge=1, le=5, description="Quadtree recursion depth (default 3)")
):
    if not ObjectId.is_valid(owner_id):
        raise HTTPException(status_code=400, detail="Invalid owner_id format")

    db = await get_database()
    owner_doc = await db["users"].find_one({"_id": ObjectId(owner_id)})
    if not owner_doc:
        raise HTTPException(status_code=404, detail="Owner not found in user registry")

    # Resolve private key
    resolved_pem = private_key_pem
    if not resolved_pem and private_key_file:
        file_bytes = await private_key_file.read()
        resolved_pem = file_bytes.decode("utf-8", errors="replace")

    if not resolved_pem or not resolved_pem.strip():
        raise HTTPException(
            status_code=400,
            detail="RSA Private Key is required to digitally sign the image Quadtree."
        )

    resolved_pem = resolved_pem.strip()

    # Validate that private key matches registered user's public key
    public_pem = owner_doc["public_key_pem"]
    if not CryptoService.validate_key_match(resolved_pem, public_pem):
        raise HTTPException(
            status_code=403,
            detail="Provided RSA Private Key does not correspond to the owner's registered Public Key."
        )

    # Read and validate image
    image_bytes = await file.read()
    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        pil_image.verify()  # verify integrity
        pil_image = Image.open(io.BytesIO(image_bytes))  # re-open after verify
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

    orig_format = (pil_image.format or "PNG").lower()
    ext = "jpg" if orig_format in ("jpeg", "jpg") else ("webp" if orig_format == "webp" else "png")
    unique_filename = f"{uuid.uuid4().hex}_{file.filename.replace(' ', '_')}"
    if not unique_filename.endswith(f".{ext}"):
        unique_filename = f"{unique_filename}.{ext}"

    storage_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    try:
        # Save image copy to disk
        pil_image.save(storage_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist image: {str(e)}")

    # Quadtree decomposition & pHash calculation
    nodes, dims = QuadtreeService.decompose_image(pil_image, max_depth=quadtree_depth)
    root_node = next((n for n in nodes if n.quadrant_path == "root"), None)
    if not root_node:
        raise HTTPException(status_code=500, detail="Failed to compute root pHash node")

    # Canonicalize Quadtree
    canonical_json = CryptoService.canonicalize_quadtree(nodes)
    tree_hash = CryptoService.compute_tree_hash(canonical_json)

    # Sign canonical Quadtree JSON using user's private key
    try:
        signature_b64 = CryptoService.sign_tree(canonical_json, resolved_pem)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to sign Quadtree with private key: {str(e)}")

    # Verify signature before inserting into DB
    if not CryptoService.verify_tree_signature(canonical_json, signature_b64, public_pem):
        raise HTTPException(status_code=500, detail="Signature self-verification failed")

    # Insert document to MongoDB
    image_record = ImageRegistryInDB(
        owner_id=str(owner_doc["_id"]),
        owner_username=owner_doc["username"],
        filename=file.filename or unique_filename,
        mime_type=file.content_type or f"image/{ext}",
        dimensions=dims,
        level_0_phash=root_node.phash,
        quadtree_depth=quadtree_depth,
        quadtree_nodes=nodes,
        serialized_tree_hash=tree_hash,
        rsa_signature_base64=signature_b64,
        file_path=storage_path,
        created_at=datetime.utcnow()
    )

    doc_data = image_record.model_dump(by_alias=True, exclude=["id"])
    result = await db["image_registry"].insert_one(doc_data)
    new_id = str(result.inserted_id)

    # Update BK-Tree index
    db_manager.bktree.insert(
        item_id=new_id,
        phash=root_node.phash,
        metadata={
            "owner_username": owner_doc["username"],
            "filename": image_record.filename
        }
    )

    return ImageRegistryResponse(
        id=new_id,
        owner_id=image_record.owner_id,
        owner_username=image_record.owner_username,
        filename=image_record.filename,
        mime_type=image_record.mime_type,
        dimensions=image_record.dimensions,
        level_0_phash=image_record.level_0_phash,
        quadtree_depth=image_record.quadtree_depth,
        serialized_tree_hash=image_record.serialized_tree_hash,
        rsa_signature_base64=image_record.rsa_signature_base64,
        total_nodes=len(image_record.quadtree_nodes),
        created_at=image_record.created_at,
    )


@router.get(
    "/images",
    response_model=List[ImageRegistryResponse],
    summary="List all registered images"
)
async def list_images():
    db = await get_database()
    cursor = db["image_registry"].find().sort("created_at", -1)
    images: List[ImageRegistryResponse] = []
    async for doc in cursor:
        images.append(
            ImageRegistryResponse(
                id=str(doc["_id"]),
                owner_id=str(doc["owner_id"]),
                owner_username=doc.get("owner_username", "Unknown"),
                filename=doc.get("filename", ""),
                mime_type=doc.get("mime_type", "image/jpeg"),
                dimensions=Dimensions(**doc.get("dimensions", {"width": 0, "height": 0})),
                level_0_phash=doc.get("level_0_phash", ""),
                quadtree_depth=doc.get("quadtree_depth", settings.DEFAULT_QUADTREE_DEPTH),
                serialized_tree_hash=doc.get("serialized_tree_hash", ""),
                rsa_signature_base64=doc.get("rsa_signature_base64", ""),
                total_nodes=len(doc.get("quadtree_nodes", [])),
                created_at=doc.get("created_at", datetime.utcnow()),
            )
        )
    return images


@router.get(
    "/images/{image_id}",
    summary="Get full metadata of a registered image including quadtree nodes"
)
async def get_image_details(image_id: str):
    if not ObjectId.is_valid(image_id):
        raise HTTPException(status_code=400, detail="Invalid image_id format")
    db = await get_database()
    doc = await db["image_registry"].find_one({"_id": ObjectId(image_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Image not found in registry")
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get(
    "/images/{image_id}/file",
    summary="Serve the registered image file"
)
async def get_image_file(image_id: str):
    if not ObjectId.is_valid(image_id):
        raise HTTPException(status_code=400, detail="Invalid image_id format")
    db = await get_database()
    doc = await db["image_registry"].find_one({"_id": ObjectId(image_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Image not found in registry")
    
    file_path = doc.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    return FileResponse(
        file_path,
        media_type=doc.get("mime_type", "image/jpeg"),
        filename=doc.get("filename", "image.jpg")
    )
