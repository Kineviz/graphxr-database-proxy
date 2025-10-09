"""
Base driver interface for database connections
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from ..models.project import Project ,DatabaseConfig, QueryResponse, SchemaResponse, GraphSchemaResponse, SampleDataResponse


class BaseDatabaseDriver(ABC):
    """Base class for database drivers"""

    def __init__(self, project: Project):
        self.project = project
        self.config = project.database_config
        self._connection = None
    
    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the database"""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to the database"""
        pass
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """Test if connection is working"""
        pass
    
    @abstractmethod
    async def execute_query(self, query: str, parameters: Dict[str, Any] = None) -> QueryResponse:
        """Execute a query"""
        pass
    
    @abstractmethod
    async def get_schema(self) -> SchemaResponse:
        """Get database schema"""
        pass
    
    @abstractmethod
    async def get_graph_schema(self) -> GraphSchemaResponse:
        """Get graph database schema"""
        pass
    
    @abstractmethod
    async def get_sample_data(self) -> SampleDataResponse:
        """Get sample data from database"""
        pass
    
    @abstractmethod
    def get_api_info(self, project_name: str) -> Dict[str, Any]:
        """Get API information for this database"""
        pass