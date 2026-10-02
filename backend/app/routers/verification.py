import io
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from PIL import Image, ImageDraw, ImageFont
from bson import ObjectId

from app.db import get_database, db_manager
from app.config import settings
from app.models.image import (
    VerificationResponse,
    Dimensions,
    QuadtreeNode,
    TamperBoundingBox,
    QuadtreeComparisonNode,
)
from app.services.crypto_service import CryptoService
from app.services.quadtree_service import QuadtreeService
from app.services.search_service import SearchService

router = APIRouter(prefix="/verification", tags=["Forensic Verification & Tamper Localization"])


@router.post(
    "/verify-image",
    response_model=VerificationResponse,
    summary="Verify image provenance, validate RSA signature, and localize tampered quadrants"
)
async def verify_image(
    file: UploadFile = File(..., description="Query image file to inspect for provenance and tampering")
):
    image_bytes = await file.read()
    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        pil_image.verify()
        pil_image = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid query image: {str(e)}")

    # 1. Compute query Level-0 pHash
    query_root_phash = QuadtreeService.compute_phash_hex(pil_image)

    # 2. Fast candidate retrieval using BK-Tree and MongoDB
    nearest = db_manager.bktree.find_nearest(query_root_phash, max_radius=settings.REJECTION_THRESHOLD)

    db = await get_database()
    images_col = db["image_registry"]

    candidate_doc = None
    min_dist = 64

    if nearest:
        candidate_id, dist, meta = nearest
        candidate_doc = await images_col.find_one({"_id": ObjectId(candidate_id)})
        min_dist = dist
    else:
        # Fallback query across collection in case BKTree index is unpopulated or out of sync
        cursor = images_col.find({}, {"_id": 1, "level_0_phash": 1})
        best_id = None
        async for doc in cursor:
            d = QuadtreeService.hamming_distance(query_root_phash, doc.get("level_0_phash", ""))
            if d < min_dist:
                min_dist = d
                best_id = doc["_id"]

        if best_id and min_dist <= settings.REJECTION_THRESHOLD:
            candidate_doc = await images_col.find_one({"_id": best_id})
            if candidate_doc:
                # Synchronize BK-Tree
                db_manager.bktree.insert(
                    str(candidate_doc["_id"]),
                    candidate_doc["level_0_phash"],
                    {
                        "owner_username": candidate_doc.get("owner_username", ""),
                        "filename": candidate_doc.get("filename", "")
                    }
                )

    # 3. Check Rejection Threshold
    if not candidate_doc or min_dist > settings.REJECTION_THRESHOLD:
        return VerificationResponse(
            is_registered=False,
            match_status="rejected",
            root_hamming_distance=min_dist if min_dist < 64 else None,
            rejection_reason=f"Root Hamming distance ({min_dist}) exceeds rejection threshold ({settings.REJECTION_THRESHOLD}). Image is not registered in the registry.",
            signature_valid=False,
            tampered_percentage=0.0,
            tampered_bounding_boxes=[],
            drilldown_nodes=[],
            message="REJECTED: No authentic provenance record matched this image. It is either unregistered or severely modified beyond recognition."
        )

    # 4. Fetch Owner Public Key
    owner_id = candidate_doc.get("owner_id")
    owner_doc = None
    if ObjectId.is_valid(owner_id):
        owner_doc = await db["users"].find_one({"_id": ObjectId(owner_id)})

    public_key_pem = owner_doc.get("public_key_pem") if owner_doc else None

    # 5. Validate Cryptographic Signature
    stored_nodes_raw = candidate_doc.get("quadtree_nodes", [])
    stored_nodes = [QuadtreeNode(**n) for n in stored_nodes_raw]
    canonical_json = CryptoService.canonicalize_quadtree(stored_nodes)
    computed_tree_hash = CryptoService.compute_tree_hash(canonical_json)
    stored_tree_hash = candidate_doc.get("serialized_tree_hash")

    signature_valid = False
    signature_details = ""

    if not public_key_pem:
        signature_details = "Owner public key not found; signature verification skipped."
    elif computed_tree_hash != stored_tree_hash:
        signature_details = "Stored tree hash integrity check failed."
    else:
        sig_b64 = candidate_doc.get("rsa_signature_base64", "")
        signature_valid = CryptoService.verify_tree_signature(canonical_json, sig_b64, public_key_pem)
        if signature_valid:
            signature_details = "RSA 2048-bit digital signature VERIFIED against registered owner public key."
        else:
            signature_details = "RSA digital signature INVALID. Integrity compromise detected."

    # 6. Top-Down Quadtree Drill-Down (O(log N) Pruning)
    depth = candidate_doc.get("quadtree_depth", settings.DEFAULT_QUADTREE_DEPTH)
    tampered_boxes, drilldown_nodes, tampered_pct = QuadtreeService.drilldown_compare(
        query_image=pil_image,
        registered_nodes=stored_nodes,
        max_depth=depth,
        branch_threshold=settings.DRILLDOWN_BRANCH_THRESHOLD
    )

    # 7. Formulate Match Status & Forensics Verdict
    if tampered_pct > 0 or len(tampered_boxes) > 0:
        match_status = "tampered"
        status_msg = f"TAMPERING DETECTED: {len(tampered_boxes)} modified quadrant(s) localized ({tampered_pct}% of image surface altered)."
    elif min_dist == 0:
        match_status = "exact_match"
        status_msg = "EXACT MATCH: Cryptographically and perceptually identical to original registered image."
    elif min_dist <= settings.NATURAL_VARIANT_MAX:
        match_status = "natural_variant"
        status_msg = f"NATURAL VARIANT: Authentic match with minimal noise/re-encoding variance (Hamming distance = {min_dist} <= {settings.NATURAL_VARIANT_MAX})."
    else:
        match_status = "moderate_edit"
        status_msg = f"MODERATE EDIT: Perceptual match (Hamming distance = {min_dist}), sub-quadrants remain largely authentic."

    dims_raw = candidate_doc.get("dimensions", {"width": pil_image.width, "height": pil_image.height})
    dimensions = Dimensions(**dims_raw)

    return VerificationResponse(
        is_registered=True,
        match_status=match_status,
        root_hamming_distance=min_dist,
        owner_id=str(candidate_doc.get("owner_id")),
        owner_username=candidate_doc.get("owner_username"),
        registered_image_id=str(candidate_doc.get("_id")),
        registered_filename=candidate_doc.get("filename"),
        dimensions=dimensions,
        signature_valid=signature_valid,
        signature_details=signature_details,
        tampered_percentage=tampered_pct,
        tampered_bounding_boxes=tampered_boxes,
        drilldown_nodes=drilldown_nodes,
        message=status_msg
    )


@router.get(
    "/stats",
    summary="Get registry forensic stats"
)
async def get_forensic_stats():
    db = await get_database()
    images_count = await db["image_registry"].count_documents({})
    users_count = await db["users"].count_documents({})
    return {
        "registered_images_count": images_count,
        "registered_users_count": users_count,
        "bktree_indexed_nodes": db_manager.bktree.size(),
        "rejection_threshold": settings.REJECTION_THRESHOLD,
        "natural_variant_max": settings.NATURAL_VARIANT_MAX,
        "moderate_edit_max": settings.MODERATE_EDIT_MAX,
        "drilldown_threshold": settings.DRILLDOWN_BRANCH_THRESHOLD
    }
