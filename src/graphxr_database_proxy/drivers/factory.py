"""
Driver factory for creating database drivers
"""

from typing import Dict, Type
from .base import BaseDatabaseDriver
from .spanner import SpannerDriver
from ..models.project import Project, DatabaseConfig, DatabaseType


class DriverFactory:
    """Factory for creating database drivers"""
    
    _drivers: Dict[DatabaseType, Type[BaseDatabaseDriver]] = {
        DatabaseType.SPANNER: SpannerDriver,
    }
    
    @classmethod
    def create_driver(cls, project: Project) -> BaseDatabaseDriver:
        """Create a driver instance for the given database type"""
        config = project.database_config
        driver_class = cls._drivers.get(config.type)
        if not driver_class:
            raise ValueError(f"Unsupported database type: {config.type}")

        return driver_class(project)
    
    @classmethod
    def register_driver(cls, db_type: DatabaseType, driver_class: Type[BaseDatabaseDriver]) -> None:
        """Register a new driver type"""
        cls._drivers[db_type] = driver_class
    
    @classmethod
    def get_supported_types(cls) -> list[DatabaseType]:
        """Get list of supported database types"""
        return list(cls._drivers.keys())