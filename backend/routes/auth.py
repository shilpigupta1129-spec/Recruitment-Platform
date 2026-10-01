from fastapi import APIRouter, Depends, HTTPException
import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database import get_db
from backend.models.user import User
from passlib.context import CryptContext
from jose import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests

router = APIRouter()

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

SECRET_KEY = "recruitment-platform-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer()

reset_tokens = {}

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


@router.post("/register")
def register(
    user_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    password = user_data.password

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long"
        )

    if not any(char.isupper() for char in password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter"
        )

    if not any(char.islower() for char in password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one lowercase letter"
        )

    if not any(char.isdigit() for char in password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one number"
        )

    if not any(
        not char.isalnum()
        for char in password
    ):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character"
        )

    hashed_password = pwd_context.hash(password)

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role
    }


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(
    user_data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not pwd_context.verify(
        user_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token_data = {
        "user_id": user.id,
        "email": user.email,
        "role": user.role
    }

    access_token = jwt.encode(
        token_data,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }


@router.get("/me")
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": "Authenticated user",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }

@router.post("/google")
def google_login(
    google_data: dict,
    db: Session = Depends(get_db)
):
    try:
        idinfo = id_token.verify_oauth2_token(
            google_data["credential"],
            requests.Request(),
            "545768782793-m34ctmi4a6ogkbpgho31ttj1mbm1kcim.apps.googleusercontent.com"
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google login."
        )

    email = idinfo.get("email")
    name = idinfo.get("name")

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Google account email not available."
        )

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        user = User(
            name=name or "Google Recruiter",
            email=email,
            password=pwd_context.hash(
                "GoogleOAuth@RecruitAI"
            ),
            role="recruiter"
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    token_data = {
        "user_id": user.id,
        "email": user.email,
        "role": user.role
    }

    access_token = jwt.encode(
        token_data,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "message": "Google login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }

class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
def forgot_password(
    user_data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Email not registered."
        )

    reset_token = secrets.token_urlsafe(32)

    reset_tokens[reset_token] = {
        "user_id": user.id,
        "expires_at": datetime.utcnow() + timedelta(minutes=15)
    }

    return {
        "message": "Password reset token generated.",
        "reset_token": reset_token
    }

class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str
    confirm_password: str


@router.post("/reset-password")
def reset_password(
    user_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    reset_data = reset_tokens.get(user_data.reset_token)

    if not reset_data:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token."
        )

    if datetime.utcnow() > reset_data["expires_at"]:
        del reset_tokens[user_data.reset_token]
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token."
        )

    password = user_data.new_password

    if password != user_data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match."
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long."
        )

    if not any(char.isupper() for char in password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter."
        )

    if not any(char.islower() for char in password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one lowercase letter."
        )

    if not any(char.isdigit() for char in password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one number."
        )

    if not any(
        not char.isalnum()
        for char in password
    ):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character."
        )

    user = db.query(User).filter(
        User.id == reset_data["user_id"]
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    user.password = pwd_context.hash(password)

    db.commit()

    del reset_tokens[user_data.reset_token]

    return {
        "message": "Password reset successfully."
    }