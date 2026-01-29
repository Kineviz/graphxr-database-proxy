"""
API Key Authentication module

Provides optional API key authentication for protecting endpoints.
When API_KEY environment variable is set, all protected endpoints
require a valid X-API-Key header. When not set, authentication is disabled.
"""

import os
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

# Define the API key header - auto_error=False allows us to handle missing keys ourselves
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str | None:
    """
    Verify API key if configured.
    
    If API_KEY environment variable is not set, authentication is disabled
    and all requests are allowed through.
    
    If API_KEY is set, requests must include a valid X-API-Key header
    matching the configured key.
    
    Args:
        api_key: The API key from the X-API-Key header
        
    Returns:
        The validated API key, or None if auth is disabled
        
    Raises:
        HTTPException: 401 Unauthorized if key is missing or invalid
    """
    configured_key = os.environ.get("API_KEY")
    
    # If no API key is configured, authentication is disabled
    if not configured_key:
        return None
    
    # API key is configured - validate the request
    if not api_key or api_key != configured_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"}
        )
    
    return api_key
