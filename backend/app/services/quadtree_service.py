from typing import List, Dict, Tuple, Optional
import io
from PIL import Image
import imagehash
from app.models.image import (
    BoundingBox,
    QuadtreeNode,
    TamperBoundingBox,
    QuadtreeComparisonNode,
    Dimensions,
)
from app.config import settings


class QuadtreeService:
    @staticmethod
    def compute_phash_hex(image: Image.Image) -> str:
        """
        Computes 64-bit perceptual hash (pHash) of a PIL Image and returns hex string.
        """
        # Ensure image is in RGB or L
        if image.mode not in ("RGB", "L"):
            img = image.convert("RGB")
        else:
            img = image
        h = imagehash.phash(img, hash_size=8)
        return str(h)

    @staticmethod
    def hamming_distance(hex1: str, hex2: str) -> int:
        """
        Computes Hamming distance between two hex-encoded pHashes using XOR bit_count.
        """
        try:
            val1 = int(hex1, 16)
            val2 = int(hex2, 16)
            return (val1 ^ val2).bit_count()
        except Exception:
            return 64

    @classmethod
    def decompose_image(
        cls,
        image: Image.Image,
        max_depth: int = settings.DEFAULT_QUADTREE_DEPTH
    ) -> Tuple[List[QuadtreeNode], Dimensions]:
        """
        Recursively partitions image into spatial quadrants up to max_depth.
        Returns list of QuadtreeNode and the image Dimensions.
        """
        width, height = image.size
        dimensions = Dimensions(width=width, height=height)
        nodes: List[QuadtreeNode] = []

        def _partition(
            box: BoundingBox,
            path: str,
            current_level: int
        ):
            # Crop image to quadrant bounds (x, y, x + w, y + h)
            crop_box = (box.x, box.y, box.x + box.w, box.y + box.h)
            quadrant_img = image.crop(crop_box)
            phash_val = cls.compute_phash_hex(quadrant_img)

            node = QuadtreeNode(
                level=current_level,
                quadrant_path=path,
                bounds=box,
                phash=phash_val
            )
            nodes.append(node)

            if current_level >= max_depth:
                return

            # Compute quadrant subdivisions
            half_w = box.w // 2
            half_h = box.h // 2
            rem_w = box.w - half_w
            rem_h = box.h - half_h

            sub_quadrants = [
                ("TL", BoundingBox(x=box.x, y=box.y, w=half_w, h=half_h)),
                ("TR", BoundingBox(x=box.x + half_w, y=box.y, w=rem_w, h=half_h)),
                ("BL", BoundingBox(x=box.x, y=box.y + half_h, w=half_w, h=rem_h)),
                ("BR", BoundingBox(x=box.x + half_w, y=box.y + half_h, w=rem_w, h=rem_h)),
            ]

            for suffix, sub_box in sub_quadrants:
                sub_path = f"{path}.{suffix}"
                _partition(sub_box, sub_path, current_level + 1)

        root_box = BoundingBox(x=0, y=0, w=width, h=height)
        _partition(root_box, "root", 0)

        return nodes, dimensions

    @classmethod
    def drilldown_compare(
        cls,
        query_image: Image.Image,
        registered_nodes: List[QuadtreeNode],
        max_depth: int = settings.DEFAULT_QUADTREE_DEPTH,
        branch_threshold: int = settings.DRILLDOWN_BRANCH_THRESHOLD
    ) -> Tuple[List[TamperBoundingBox], List[QuadtreeComparisonNode], float]:
        """
        Executes top-down Quadtree comparison with O(log N) pruning.
        If distance <= branch_threshold (3), prunes branch.
        If distance > branch_threshold, drills down to children.
        Leaf nodes with distance > branch_threshold are marked as tampered.
        Calculates tampered percentage based on image area.
        """
        # Index registered nodes by quadrant_path
        stored_dict: Dict[str, QuadtreeNode] = {n.quadrant_path: n for n in registered_nodes}
        root_node = stored_dict.get("root")
        if not root_node:
            raise ValueError("Registered nodes must include a root node.")

        query_w, query_h = query_image.size
        orig_w = root_node.bounds.w
        orig_h = root_node.bounds.h

        # If query dimensions differ from registered dimensions, resize query image
        # for consistent spatial quadrant extraction
        if (query_w, query_h) != (orig_w, orig_h):
            query_proc_img = query_image.resize((orig_w, orig_h), Image.Resampling.LANCZOS)
        else:
            query_proc_img = query_image

        drilldown_results: List[QuadtreeComparisonNode] = []
        tampered_boxes: List[TamperBoundingBox] = []
        tampered_area = 0
        total_area = orig_w * orig_h

        def _traverse(node_path: str):
            nonlocal tampered_area
            stored_node = stored_dict.get(node_path)
            if not stored_node:
                return

            box = stored_node.bounds
            crop_box = (box.x, box.y, box.x + box.w, box.y + box.h)
            q_crop = query_proc_img.crop(crop_box)
            q_phash = cls.compute_phash_hex(q_crop)
            dist = cls.hamming_distance(stored_node.phash, q_phash)
            is_tampered = dist > branch_threshold

            comp_node = QuadtreeComparisonNode(
                level=stored_node.level,
                quadrant_path=node_path,
                bounds=box,
                stored_phash=stored_node.phash,
                query_phash=q_phash,
                hamming_distance=dist,
                is_tampered=is_tampered,
                pruned=not is_tampered and stored_node.level > 0
            )
            drilldown_results.append(comp_node)

            if not is_tampered and stored_node.level > 0:
                # Authentic: prune subtree!
                return

            if stored_node.level < max_depth:
                # Recurse down to the 4 sub-quadrants
                suffixes = ["TL", "TR", "BL", "BR"]
                child_paths = [f"{node_path}.{s}" for s in suffixes]
                # Check if all child nodes exist in stored_dict
                if any(cp in stored_dict for cp in child_paths):
                    for cp in child_paths:
                        if cp in stored_dict:
                            _traverse(cp)
                    return

            # Leaf reached and distance > branch_threshold
            if is_tampered:
                tampered_boxes.append(
                    TamperBoundingBox(
                        quadrant_path=node_path,
                        level=stored_node.level,
                        bounds=box,
                        hamming_distance=dist,
                        status="tampered" if dist > 6 else "moderate_edit"
                    )
                )
                tampered_area += (box.w * box.h)

        _traverse("root")

        tampered_pct = round(min(100.0, (tampered_area / max(total_area, 1)) * 100.0), 2)
        return tampered_boxes, drilldown_results, tampered_pct
