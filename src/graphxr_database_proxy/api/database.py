"""
Database API endpoints
"""

from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Depends, Path
from ..models.project import DatabaseType, QueryRequest, QueryResponse, SchemaResponse, GraphSchemaResponse, SampleDataResponse, APIInfo
from ..services.project_service import ProjectService
from ..drivers.factory import DriverFactory

router = APIRouter(prefix="/api", tags=["database"])

def get_project_service() -> ProjectService:
    return ProjectService()


@router.get("/{database_type}/{project_name}", response_model=APIInfo)
async def get_database_info(
    database_type: DatabaseType = Path(..., description="Database type"),
    project_name: str = Path(..., description="Project name"),
    service: ProjectService = Depends(get_project_service)
):
    """Get database API information"""
    try:
        # Find project by name
        project = await service.get_project_by_name(project_name)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.database_type != database_type:
            raise HTTPException(
                status_code=400, 
                detail=f"Project database type {project.database_type} does not match requested type {database_type}"
            )
        
        # Create driver and get API info
        driver = DriverFactory.create_driver(project)
        api_info = driver.get_api_info(project.name)
        
        return APIInfo(
            type=database_type,
            api_urls=api_info["api_urls"],
            version=api_info.get("version")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{database_type}/{project_name}/query", response_model=QueryResponse)
async def execute_query(
    database_type: DatabaseType = Path(..., description="Database type"),
    project_name: str = Path(..., description="Project name"),
    query_request: QueryRequest = ...,
    service: ProjectService = Depends(get_project_service)
):
    """Execute a database query"""
    try:
        # Find project by name
        project = await service.get_project_by_name(project_name)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.database_type != database_type:
            raise HTTPException(
                status_code=400,
                detail=f"Project database type {project.database_type} does not match requested type {database_type}"
            )
        
        # Create driver and execute query
        driver = DriverFactory.create_driver(project)
        await driver.connect()
        
        try:
            result = await driver.execute_query(
                query_request.query,
                query_request.parameters
            )
            return result
        finally:
            await driver.disconnect()
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{database_type}/{project_name}/schema", response_model=SchemaResponse)
async def get_schema(
    database_type: DatabaseType = Path(..., description="Database type"),
    project_name: str = Path(..., description="Project name"),
    service: ProjectService = Depends(get_project_service)
):
    """Get database schema"""
    try:
        # Find project by name
        project = await service.get_project_by_name(project_name)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.database_type != database_type:
            raise HTTPException(
                status_code=400,
                detail=f"Project database type {project.database_type} does not match requested type {database_type}"
            )
        
        # Create driver and get schema
        driver = DriverFactory.create_driver(project)
        await driver.connect()
        
        try:
            result = await driver.get_schema()
            return result
        finally:
            await driver.disconnect()
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{database_type}/{project_name}/token-status")
async def get_token_status(
    database_type: DatabaseType = Path(..., description="Database type"),
    project_name: str = Path(..., description="Project name"),
    service: ProjectService = Depends(get_project_service)
):
    """Get OAuth token status information"""
    try:
        # Find project by name
        project = await service.get_project_by_name(project_name)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.database_type != database_type:
            raise HTTPException(
                status_code=400,
                detail=f"Project database type {project.database_type} does not match requested type {database_type}"
            )
        
        # Create driver and get token status
        driver = DriverFactory.create_driver(project)
        if hasattr(driver, 'get_token_status'):
            token_status = driver.get_token_status()
            return {
                "success": True,
                "data": token_status
            }
        else:
            return {
                "success": False,
                "error": "Token status not available for this database type"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{database_type}/{project_name}/test")
async def test_connection(
    database_type: DatabaseType = Path(..., description="Database type"),
    project_name: str = Path(..., description="Project name"),
    service: ProjectService = Depends(get_project_service)
):
    """Test database connection"""
    try:
        # Find project by name
        project = await service.get_project_by_name(project_name)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.database_type != database_type:
            raise HTTPException(
                status_code=400,
                detail=f"Project database type {project.database_type} does not match requested type {database_type}"
            )
        
        # Create driver and test connection
        driver = DriverFactory.create_driver(project)
        is_connected = await driver.test_connection()
        
        return {
            "success": is_connected,
            "message": "Connection successful" if is_connected else "Connection failed"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{database_type}/{project_name}/graphSchema", response_model=GraphSchemaResponse)
async def get_graph_schema(
    database_type: DatabaseType = Path(..., description="Database type"),
    project_name: str = Path(..., description="Project name"),
    service: ProjectService = Depends(get_project_service)
):
    """Get graph database schema"""
    try:
        # Find project by name
        project = await service.get_project_by_name(project_name)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.database_type != database_type:
            raise HTTPException(
                status_code=400,
                detail=f"Project database type {project.database_type} does not match requested type {database_type}"
            )
        
        # Create driver and get graph schema
        driver = DriverFactory.create_driver(project)
        await driver.connect()
        
        try:
            result = await driver.get_graph_schema()
            return result
        finally:
            await driver.disconnect()
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{database_type}/{project_name}/sampleData", response_model=SampleDataResponse)
async def get_sample_data(
    database_type: DatabaseType = Path(..., description="Database type"),
    project_name: str = Path(..., description="Project name"),
    service: ProjectService = Depends(get_project_service),
):
    """Get sample data from database"""
    try:
        # Find project by name
        project = await service.get_project_by_name(project_name)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.database_type != database_type:
            raise HTTPException(
                status_code=400,
                detail=f"Project database type {project.database_type} does not match requested type {database_type}"
            )
        
        # Create driver and get sample data
        driver = DriverFactory.create_driver(project)
        await driver.connect()
        
        try:
            result = await driver.get_sample_data()
            return result
        finally:
            await driver.disconnect()
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))