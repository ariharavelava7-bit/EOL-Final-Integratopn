"""
Authentication Module for L&T CORe
JWT-based authentication with password hashing
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import os

from database import get_db, User, UserStatus, UserRole

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "ltcore-super-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
# Use pbkdf2_sha256 to avoid bcrypt backend issues on Windows
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Bearer token security
security = HTTPBearer()


# Pydantic models for auth
class TokenData(BaseModel):
    user_id: int
    email: str
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    department: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    status: str
    department: Optional[str]
    phone: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# Utility functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        email: str = payload.get("email")
        role: str = payload.get("role")
        if user_id is None or email is None:
            return None
        return TokenData(user_id=user_id, email=email, role=role)
    except JWTError:
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    token_data = decode_token(token)
    
    if token_data is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == token_data.user_id).first()
    
    if user is None:
        raise credentials_exception
    
    if user.status != UserStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status}. Please wait for admin approval."
        )
    
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure user is active/approved"""
    if current_user.status != UserStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not approved"
        )
    return current_user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure user is an admin"""
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# Authentication functions
def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user by email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def register_user(db: Session, user_data: UserCreate) -> User:
    """Register a new user (pending approval)"""
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        department=user_data.department,
        phone=user_data.phone,
        role=UserRole.USER.value,
        status=UserStatus.PENDING.value
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

