from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler=None):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return str(v)
        raise ValueError("Invalid ObjectId")

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.str_schema(),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="User email address")


class UserInDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    username: str
    email: str
    public_key_pem: str
    private_key_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    public_key_pem: str
    created_at: datetime


class UserLoginRequest(BaseModel):
    username: str = Field(..., description="User's unique username")
    private_key_pem: str = Field(..., description="User's RSA Private Key in PEM format")


class UserLoginResponse(BaseModel):
    user: UserResponse
    message: str = "Login successful. Author identity authenticated."


class UserRegisterResponse(BaseModel):
    user: UserResponse
    private_key_pem: str
    security_warning: str = (
        "CRITICAL: The private key is generated client-destined and is NEVER stored on the server. "
        "Save your private key immediately to a secure location (e.g., .pem file). "
        "If you lose this key, you will not be able to sign or prove authorship of your images."
    )
