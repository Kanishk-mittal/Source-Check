from typing import List
from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from app.db import get_database
from app.models.user import (
    UserCreate,
    UserInDB,
    UserResponse,
    UserRegisterResponse,
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

    user_in_db = UserInDB(
        username=payload.username,
        email=payload.email,
        public_key_pem=public_pem,
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
