import pytest
import io
from PIL import Image, ImageDraw
from app.services.crypto_service import CryptoService
from app.services.quadtree_service import QuadtreeService
from app.services.search_service import BKTree, SearchService


def test_rsa_keygen_and_signature():
    # 1. Keygen
    priv_pem, pub_pem = CryptoService.generate_rsa_keypair()
    assert "BEGIN PRIVATE KEY" in priv_pem
    assert "BEGIN PUBLIC KEY" in pub_pem

    # 2. Key matching
    assert CryptoService.validate_key_match(priv_pem, pub_pem) is True

    # 3. Create dummy Quadtree nodes & canonicalize
    img = Image.new("RGB", (200, 200), color=(128, 128, 128))
    nodes, dims = QuadtreeService.decompose_image(img, max_depth=2)
    assert len(nodes) == 1 + 4 + 16  # 21 nodes for depth 2
    
    canonical_json = CryptoService.canonicalize_quadtree(nodes)
    tree_hash = CryptoService.compute_tree_hash(canonical_json)
    assert len(tree_hash) == 64

    # 4. Sign and verify
    sig_b64 = CryptoService.sign_tree(canonical_json, priv_pem)
    assert len(sig_b64) > 50

    is_valid = CryptoService.verify_tree_signature(canonical_json, sig_b64, pub_pem)
    assert is_valid is True

    # 5. Tampered json check
    tampered_json = canonical_json.replace("root", "hacked")
    assert CryptoService.verify_tree_signature(tampered_json, sig_b64, pub_pem) is False

    # 6. Private key hash check
    key_hash = CryptoService.compute_private_key_hash(priv_pem)
    assert len(key_hash) == 64
    assert key_hash == CryptoService.compute_private_key_hash(priv_pem)


def test_quadtree_decomposition_and_tampering():
    # Create base image with distinct quadrant colors
    base_img = Image.new("RGB", (256, 256), color=(255, 255, 255))
    draw = ImageDraw.Draw(base_img)
    draw.rectangle([0, 0, 128, 128], fill=(200, 50, 50))
    draw.rectangle([128, 0, 256, 128], fill=(50, 200, 50))
    draw.rectangle([0, 128, 128, 256], fill=(50, 50, 200))
    draw.rectangle([128, 128, 256, 256], fill=(200, 200, 50))

    # Decompose base image
    nodes, dims = QuadtreeService.decompose_image(base_img, max_depth=3)
    assert len(nodes) == 1 + 4 + 16 + 64  # 85 nodes for depth 3
    assert dims.width == 256
    assert dims.height == 256

    # 1. Test identical image drill-down: should prune everything and have 0 tampered boxes
    tampered_boxes, trace, tampered_pct = QuadtreeService.drilldown_compare(base_img, nodes, max_depth=3)
    assert len(tampered_boxes) == 0
    assert tampered_pct == 0.0

    # 2. Tamper the Top-Left quadrant only
    tampered_img = base_img.copy()
    tamper_draw = ImageDraw.Draw(tampered_img)
    # Draw dark black patch in top-left
    tamper_draw.rectangle([20, 20, 80, 80], fill=(0, 0, 0))

    tampered_boxes, trace, tampered_pct = QuadtreeService.drilldown_compare(tampered_img, nodes, max_depth=3)
    assert len(tampered_boxes) > 0
    assert tampered_pct > 0.0
    # Check that tampered boxes belong to root.TL hierarchy
    for box in tampered_boxes:
        assert "root.TL" in box.quadrant_path


def test_bktree_hamming_distance_search():
    bktree = BKTree()
    hash1 = "0000000000000000"
    hash2 = "000000000000000f"  # Hamming distance 4 (0xf has 4 bits set)
    hash3 = "00000000000000ff"  # Hamming distance 8
    hash4 = "ffffffffffffffff"  # Hamming distance 64

    bktree.insert("img1", hash1, {"name": "orig"})
    bktree.insert("img2", hash2, {"name": "variant"})
    bktree.insert("img3", hash3, {"name": "edit"})
    bktree.insert("img4", hash4, {"name": "distant"})

    assert bktree.size() == 4

    # Search nearest to hash1
    nearest = bktree.find_nearest(hash1, max_radius=15)
    assert nearest is not None
    assert nearest[0] == "img1"
    assert nearest[1] == 0

    # Query with distance 2 from hash1 (e.g. 0x0000000000000003)
    q_hash = "0000000000000003"
    results = bktree.search_range(q_hash, max_radius=4)
    # hash1 has dist 2, hash2 has dist 2 (0x0f ^ 0x03 = 0x0c which is 2 bits)
    result_ids = [r[0] for r in results]
    assert "img1" in result_ids
    assert "img2" in result_ids
    assert "img4" not in result_ids


def test_search_service_classification():
    assert SearchService.classify_distance(0) == "exact_match"
    assert SearchService.classify_distance(3) == "natural_variant"
    assert SearchService.classify_distance(8) == "moderate_edit"
    assert SearchService.classify_distance(14) == "borderline_edit"
    assert SearchService.classify_distance(18) == "rejected"
