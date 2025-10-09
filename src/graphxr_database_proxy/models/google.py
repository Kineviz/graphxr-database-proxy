"""
Google Cloud API models
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class GoogleAuthInfo(BaseModel):
    """Google authentication information"""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    project_id: Optional[str] = None
    instance_id: Optional[str] = None
    database_id: Optional[str] = None
    graph_name: Optional[str] = None
    
     
class GoogleProject(BaseModel):
    """Google Cloud project information"""
    name: str
    id: str
    instances:  List[Any] = []

class GraphDatabase(BaseModel):
    """Graph database information"""
    id: str
    name: str


class SpannerDatabase(BaseModel):
    """Spanner database information"""
    id: str
    name: str
    graphDBs: List[GraphDatabase] = []


class SpannerInstance(BaseModel):
    """Spanner instance information"""
    id: str
    name: str
    databases: List[SpannerDatabase] = []


class ProjectDetails(BaseModel):
    """Project details with instances and databases"""
    # Key is instance_id, value is instance details
    instances: List[SpannerInstance] = []