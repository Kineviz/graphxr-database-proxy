"""
Data models for the GraphXR Database Proxy
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum


class DatabaseType(str, Enum):
    """Supported database types"""
    SPANNER = "spanner"
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    MONGODB = "mongodb"


class AuthType(str, Enum):
    """Authentication types"""
    OAUTH2 = "oauth2"
    SERVICE_ACCOUNT = "service_account"
    USERNAME_PASSWORD = "username_password"


class OAuthConfig(BaseModel):
    """OAuth2 configuration"""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_uri: str = "http://localhost:9080/google/spanner/callback"
    scopes: List[str] = Field(default_factory=list)
    
    # For OAuth2 token-based auth
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
    last_refreshed: Optional[float] = None  # Unix timestamp of last token refresh
    token_uri: Optional[str] = None

    # For Service Account JSON key
    type: Optional[str] = None
    project_id: Optional[str] = None
    private_key_id: Optional[str] = None
    private_key: Optional[str] = None
    client_email: Optional[str] = None
    client_x509_cert_url: Optional[str] = None
    auth_uri: Optional[str] = None
    auth_provider_x509_cert_url: Optional[str] = None
    
    # Allow additional fields for flexibility
    class Config:
        extra = "allow"


class DatabaseConfig(BaseModel):
    """Database connection configuration"""
    # Common fields
    type: DatabaseType
    host: Optional[str] = None
    port: Optional[int] = None
    
    # Spanner specific
    project_id: Optional[str] = None
    instance_id: Optional[str] = None
    database_id: Optional[str] = None
    graph_name: Optional[str] = None
    
    # Authentication
    auth_type: AuthType = AuthType.USERNAME_PASSWORD
    username: Optional[str] = None
    password: Optional[str] = None
    oauth_config: Optional[OAuthConfig] = None
    service_account_path: Optional[str] = None  # For backward compatibility
    # Additional options
    options: Dict[str, Any] = Field(default_factory=dict)


class Project(BaseModel):
    """Project model"""
    id: str = Field(..., description="Unique project identifier")
    name: str = Field(..., description="Project name")
    database_type: DatabaseType = Field(..., description="Database type")
    database_config: DatabaseConfig = Field(..., description="Database configuration")
    create_time: datetime = Field(default_factory=datetime.utcnow)
    update_time: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ProjectCreate(BaseModel):
    """Project creation request"""
    name: str = Field(..., description="Project name")
    database_type: DatabaseType = Field(..., description="Database type")
    database_config: DatabaseConfig = Field(..., description="Database configuration")


class ProjectUpdate(BaseModel):
    """Project update request"""
    name: Optional[str] = None
    database_config: Optional[DatabaseConfig] = None


class APIInfo(BaseModel):
    """Database API information"""
    type: DatabaseType
    api_urls: Dict[str, str]
    version: Optional[str] = None


class QueryRequest(BaseModel):
    """Database query request"""
    query: str = Field(..., description="Query string")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Query parameters")


class QueryResponse(BaseModel):
    """Database query response"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None


class SchemaResponse(BaseModel):
    """Database schema response"""
    success: bool
    data: Optional[Dict[str, Dict[str, str]]] = None
    error: Optional[str] = None

class Category(BaseModel):
    name: str
    props: Optional[List[str]] = None
    keys: Optional[List[str]] = None
    propsTypes: Optional[Dict[str, str]] = None

class Relationship(BaseModel):
    name: str
    props: Optional[List[str]] = None
    keys: Optional[List[str]] = None
    propsTypes: Optional[Dict[str, str]] = None
    startCategory: str
    endCategory: str

class GraphSchema(BaseModel):
    categories: List[Category] 
    relationships: List[Relationship]

class GraphSchemaResponse(BaseModel):
    """Graph database schema response"""
    success: bool
    data: GraphSchema = Field(default_factory=lambda: GraphSchema(categories=[], relationships=[]))
    error: Optional[str] = None

class SampleDataResponse(BaseModel):
    """Sample data response"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class GraphData(BaseModel):
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    relationships: List[Dict[str, Any]] = Field(default_factory=list)

class QueryData(BaseModel):
    type: Literal["TABLE", "GRAPH"]
    data:  List[Dict[str, Any]] | GraphData | None = None
    summary: Dict[str, str] = Field(default_factory=lambda: {"version": "4.0.1"})
