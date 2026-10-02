from typing import List, Optional, Tuple, Dict, Any
from app.config import settings
from app.services.quadtree_service import QuadtreeService


class BKTreeNode:
    def __init__(self, item_id: str, phash: str, metadata: Optional[Dict[str, Any]] = None):
        self.item_id: str = item_id
        self.phash: str = phash
        self.metadata: Dict[str, Any] = metadata or {}
        self.children: Dict[int, 'BKTreeNode'] = {}  # distance -> child_node


class BKTree:
    """
    Burkhard-Keller Tree implementation for efficient nearest-neighbor
    and range queries on discrete metric spaces (Hamming distance).
    Satisfies triangle inequality: d(A, C) <= d(A, B) + d(B, C).
    """
    def __init__(self):
        self.root: Optional[BKTreeNode] = None
        self._size: int = 0

    def insert(self, item_id: str, phash: str, metadata: Optional[Dict[str, Any]] = None):
        if self.root is None:
            self.root = BKTreeNode(item_id, phash, metadata)
            self._size += 1
            return

        current = self.root
        while True:
            dist = QuadtreeService.hamming_distance(phash, current.phash)
            if dist == 0 and current.item_id == item_id:
                # Same item already present
                current.metadata = metadata or current.metadata
                return
            
            if dist in current.children:
                current = current.children[dist]
            else:
                current.children[dist] = BKTreeNode(item_id, phash, metadata)
                self._size += 1
                break

    def search_range(self, query_phash: str, max_radius: int) -> List[Tuple[str, int, Dict[str, Any]]]:
        """
        Searches all nodes within max_radius Hamming distance of query_phash.
        Returns list of (item_id, distance, metadata) sorted by distance.
        """
        results: List[Tuple[str, int, Dict[str, Any]]] = []
        if self.root is None:
            return results

        candidates = [self.root]
        while candidates:
            node = candidates.pop()
            d = QuadtreeService.hamming_distance(query_phash, node.phash)
            if d <= max_radius:
                results.append((node.item_id, d, node.metadata))

            # Pruning based on triangle inequality:
            # Only children with distance between [d - max_radius, d + max_radius] can contain matches
            low = max(0, d - max_radius)
            high = d + max_radius
            for dist, child in node.children.items():
                if low <= dist <= high:
                    candidates.append(child)

        results.sort(key=lambda x: x[1])
        return results

    def find_nearest(self, query_phash: str, max_radius: int = settings.REJECTION_THRESHOLD) -> Optional[Tuple[str, int, Dict[str, Any]]]:
        """
        Finds the single closest candidate within max_radius.
        """
        results = self.search_range(query_phash, max_radius)
        if results:
            return results[0]
        return None

    def size(self) -> int:
        return self._size


class SearchService:
    @staticmethod
    def classify_distance(dist: int) -> str:
        """
        Classifies match type based on Level-0 Hamming Distance thresholds:
        - dist == 0: Exact match
        - dist <= 4: Natural variant (compression/social media re-encode)
        - 5 <= dist <= 12: Moderate edit (requires Quadtree drill-down)
        - 13 <= dist <= 15: Heavy edit / Borderline match
        - dist > 15: Reject candidate (not registered)
        """
        if dist == 0:
            return "exact_match"
        elif dist <= settings.NATURAL_VARIANT_MAX:
            return "natural_variant"
        elif dist <= settings.MODERATE_EDIT_MAX:
            return "moderate_edit"
        elif dist <= settings.REJECTION_THRESHOLD:
            return "borderline_edit"
        else:
            return "rejected"
