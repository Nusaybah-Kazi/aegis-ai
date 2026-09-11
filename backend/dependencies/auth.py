# backend/dependencies/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional
from fastapi import Request
from backend.database.db import get_connection
from backend.services.auth_service import decode_token

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    conn = get_connection()
    user = conn.execute(
        "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
        (payload["sub"],),
    ).fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return dict(user)


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

async def get_current_user_optional(request: Request) -> Optional[dict]:
    """Like get_current_user but returns None instead of 401 if no token."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        return None
    conn = get_connection()
    user = conn.execute(
        "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
        (payload["sub"],),
    ).fetchone()
    conn.close()
    return dict(user) if user else None
