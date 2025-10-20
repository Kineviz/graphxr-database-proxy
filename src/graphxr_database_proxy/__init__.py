"""
GraphXR Database Proxy

A secure middleware for connecting GraphXR Frontend to various backend databases.
"""

__version__ = "1.0.1"
__author__ = "Kineviz"
__email__ = "support@kineviz.com"

from .main import app
from .proxy import DatabaseProxy
from .models.project import Project, DatabaseConfig
from .services.project_service import ProjectService

__all__ = ["app", "DatabaseProxy", "Project", "DatabaseConfig", "ProjectService"]