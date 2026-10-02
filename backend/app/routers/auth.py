from typing import List
from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from app.db import get_database
from app.models.user import (
    UserCreate,
    UserInDB,
    UserResponse,
    UserRegisterResponse,
    UserLoginRequest,
    UserLoginResponse,
)
from app.services.crypto_service import CryptoService

router = APIRouter(prefix="/auth", tags=["Authentication & Key Management"])


@router.post(
    "/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user & generate RSA 2048-bit keypair"
)
async def register_user(payload: UserCreate):
    db = await get_database()
    users_col = db["users"]

    # Check for existing username or email
    existing = await users_col.find_one({
        "$or": [{"username": payload.username}, {"email": payload.email}]
    })
    if existing:
        if existing.get("username") == payload.username:
            raise HTTPException(status_code=400, detail="Username already registered")
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate RSA 2048-bit keypair
    private_pem, public_pem = CryptoService.generate_rsa_keypair()
    private_key_hash = CryptoService.compute_private_key_hash(private_pem)

    user_in_db = UserInDB(
        username=payload.username,
        email=payload.email,
        public_key_pem=public_pem,
        private_key_hash=private_key_hash,
    )

    doc = user_in_db.model_dump(by_alias=True, exclude=["id"])
    result = await users_col.insert_one(doc)

    user_resp = UserResponse(
        id=str(result.inserted_id),
        username=user_in_db.username,
        email=user_in_db.email,
        public_key_pem=user_in_db.public_key_pem,
        created_at=user_in_db.created_at,
    )

    return UserRegisterResponse(
        user=user_resp,
        private_key_pem=private_pem,
    )


@router.post(
    "/login",
    response_model=UserLoginResponse,
    summary="Authenticate author using username and RSA private key"
)
async def login_user(payload: UserLoginRequest):
    db = await get_database()
    users_col = db["users"]

    user_doc = await users_col.find_one({"username": payload.username})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or private key"
        )

    # 1. Validate that the provided private key matches the stored public key
    public_pem = user_doc.get("public_key_pem", "")
    if not CryptoService.validate_key_match(payload.private_key_pem, public_pem):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Provided private key does not match this author's registered public key"
        )

    # 2. Compute canonical hash of provided private key
    try:
        computed_hash = CryptoService.compute_private_key_hash(payload.private_key_pem)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid RSA private key: {str(e)}"
        )

    # 3. Check / update private_key_hash in DB
    stored_hash = user_doc.get("private_key_hash")
    if stored_hash:
        if stored_hash != computed_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Private key hash mismatch"
            )
    else:
        # Legacy record without stored hash: update now
        await users_col.update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"private_key_hash": computed_hash}}
        )

    user_resp = UserResponse(
        id=str(user_doc["_id"]),
        username=user_doc["username"],
        email=user_doc["email"],
        public_key_pem=user_doc["public_key_pem"],
        created_at=user_doc["created_at"]
    )
    return UserLoginResponse(
        user=user_resp,
        message=f"Welcome back, {user_doc['username']}. Author identity authenticated."
    )


@router.get(
    "/users",
    response_model=List[UserResponse],
    summary="List all registered users"
)
async def list_users():
    db = await get_database()
    cursor = db["users"].find().sort("created_at", -1)
    users: List[UserResponse] = []
    async for doc in cursor:
        users.append(
            UserResponse(
                id=str(doc["_id"]),
                username=doc["username"],
                email=doc["email"],
                public_key_pem=doc["public_key_pem"],
                created_at=doc["created_at"],
            )
        )
    return users


@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Get user details by ID"
)
async def get_user(user_id: str):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    db = await get_database()
    doc = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=str(doc["_id"]),
        username=doc["username"],
        email=doc["email"],
        public_key_pem=doc["public_key_pem"],
        created_at=doc["created_at"],
    )
