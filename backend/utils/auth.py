from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, APIKeyQuery
from typing import Optional
import secrets

ADMIN_TOKEN = secrets.token_urlsafe(16)

api_key_header = APIKeyHeader(name="X-Admin-Token", auto_error=False)
api_key_query = APIKeyQuery(name="admin_token", auto_error=False)

def get_admin_token(
    header_token: Optional[str] = Depends(api_key_header),
    query_token: Optional[str] = Depends(api_key_query)
):
    if header_token == ADMIN_TOKEN:
        return header_token
    if query_token == ADMIN_TOKEN:
        return query_token
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Admin Token",
    )
