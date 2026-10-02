import base64
import hashlib
import json
from typing import Tuple, List, Dict, Any
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature
from app.models.image import QuadtreeNode


class CryptoService:
    @staticmethod
    def generate_rsa_keypair() -> Tuple[str, str]:
        """
        Generates an RSA 2048-bit keypair.
        Returns:
            Tuple of (private_key_pem_str, public_key_pem_str)
        """
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode("utf-8")

        public_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode("utf-8")

        return private_pem, public_pem

    @staticmethod
    def canonicalize_quadtree(nodes: List[QuadtreeNode]) -> str:
        """
        Deterministically serializes the Quadtree into a canonical JSON string.
        Sorts the nodes by quadrant_path and ensures sorted keys with compact separators.
        """
        # Sort nodes deterministically by level then quadrant_path
        sorted_nodes = sorted(nodes, key=lambda n: (n.level, n.quadrant_path))
        raw_list = [
            {
                "level": n.level,
                "quadrant_path": n.quadrant_path,
                "bounds": {
                    "h": n.bounds.h,
                    "w": n.bounds.w,
                    "x": n.bounds.x,
                    "y": n.bounds.y
                },
                "phash": n.phash
            }
            for n in sorted_nodes
        ]
        return json.dumps(raw_list, sort_keys=True, separators=(',', ':'))

    @staticmethod
    def compute_tree_hash(canonical_json: str) -> str:
        """
        Computes SHA-256 digest of the canonical quadtree JSON.
        """
        return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()

    @staticmethod
    def sign_tree(canonical_json: str, private_key_pem: str) -> str:
        """
        Signs the canonical Quadtree JSON using the RSA Private Key.
        Uses PKCS#1 v1.5 with SHA-256.
        Returns:
            Base64-encoded signature string.
        """
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode('utf-8'),
            password=None
        )
        if not isinstance(private_key, rsa.RSAPrivateKey):
            raise ValueError("Provided key is not an RSA private key.")

        signature = private_key.sign(
            canonical_json.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return base64.b64encode(signature).decode('utf-8')

    @staticmethod
    def verify_tree_signature(canonical_json: str, signature_b64: str, public_key_pem: str) -> bool:
        """
        Verifies the RSA signature of the canonical Quadtree JSON using the RSA Public Key.
        Returns:
            True if signature is valid, False otherwise.
        """
        try:
            public_key = serialization.load_pem_public_key(
                public_key_pem.encode('utf-8')
            )
            if not isinstance(public_key, rsa.RSAPublicKey):
                return False

            signature = base64.b64decode(signature_b64.encode('utf-8'))
            public_key.verify(
                signature,
                canonical_json.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except (InvalidSignature, ValueError, Exception):
            return False

    @staticmethod
    def validate_key_match(private_key_pem: str, public_key_pem: str) -> bool:
        """
        Verifies that the provided RSA private key corresponds to the stored public key.
        """
        try:
            priv = serialization.load_pem_private_key(private_key_pem.encode('utf-8'), password=None)
            pub = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
            if not isinstance(priv, rsa.RSAPrivateKey) or not isinstance(pub, rsa.RSAPublicKey):
                return False
            
            priv_pub_numbers = priv.public_key().public_numbers()
            pub_numbers = pub.public_numbers()
            return (priv_pub_numbers.n == pub_numbers.n and priv_pub_numbers.e == pub_numbers.e)
        except Exception:
            return False
