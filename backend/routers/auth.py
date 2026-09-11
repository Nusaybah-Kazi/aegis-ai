# backend/routers/auth.py
import os

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, status

from backend.database.db import get_connection
from backend.dependencies.auth import get_current_user
from backend.models.user import TokenResponse, UserCreate, UserLogin, UserResponse
from backend.services.auth_service import (
    create_access_token,
    hash_password,
    verify_password,
)
from fastapi import Depends

load_dotenv()

ADMIN_INVITE_CODE = os.getenv("ADMIN_INVITE_CODE", "")

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: UserCreate):
    conn = get_connection()

    # Check duplicate email
    existing = conn.execute(
        "SELECT id FROM users WHERE email = ?", (body.email,)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="Email already registered")

    # Determine role
    role = "employee"
    if body.invite_code and ADMIN_INVITE_CODE and body.invite_code == ADMIN_INVITE_CODE:
        role = "admin"

    password_hash = hash_password(body.password)

    cursor = conn.execute(
        """
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
        """,
        (body.name, body.email, password_hash, role),
    )
    conn.commit()
    user_id = cursor.lastrowid

    user_row = conn.execute(
        "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()

    user = UserResponse(**dict(user_row))
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin):
    conn = get_connection()
    row = conn.execute(
        "SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?",
        (body.email,),
    ).fetchone()
    conn.close()

    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user = UserResponse(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        role=row["role"],
        created_at=row["created_at"],
    )
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserResponse)
def me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)