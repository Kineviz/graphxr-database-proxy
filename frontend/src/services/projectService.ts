import axios from 'axios';
import { Project, ProjectCreate, ProjectUpdate, APIInfo, QueryRequest, QueryResponse, SchemaResponse, GraphSchemaResponse, SampleDataResponse } from '../types/project';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:9080';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export class ProjectService {
  async getProjects(): Promise<Project[]> {
    const response = await api.get('/api/project/list');
    return response.data;
  }

  async getProject(id: string): Promise<Project> {
    const response = await api.get(`/api/project/${id}`);
    return response.data;
  }

  async createProject(project: ProjectCreate): Promise<Project> {
    const response = await api.post('/api/project/create', project);
    return response.data;
  }

  async updateProject(id: string, project: ProjectUpdate): Promise<Project> {
    const response = await api.put(`/api/project/update?project_id=${id}`, project);
    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/api/project/delete?project_id=${id}`);
  }

  async getDatabaseInfo(databaseType: string, projectName: string): Promise<APIInfo> {
    const response = await api.get(`/api/${databaseType}/${projectName}`);
    return response.data;
  }

  async executeQuery(
    databaseType: string,
    projectName: string,
    queryRequest: QueryRequest
  ): Promise<QueryResponse> {
    const response = await api.post(`/api/${databaseType}/${projectName}/query`, queryRequest);
    return response.data;
  }

  async getSchema(databaseType: string, projectName: string): Promise<SchemaResponse> {
    const response = await api.get(`/api/${databaseType}/${projectName}/schema`);
    return response.data;
  }

  async getGraphSchema(databaseType: string, projectName: string): Promise<GraphSchemaResponse> {
    const response = await api.get(`/api/${databaseType}/${projectName}/graphSchema`);
    return response.data;
  }

  async getSampleData(databaseType: string, projectName: string): Promise<SampleDataResponse> {
    const response = await api.get(`/api/${databaseType}/${projectName}/sampleData`);
    return response.data;
  }

  async testConnection(databaseType: string, projectName: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/api/${databaseType}/${projectName}/test`);
    return response.data;
  }
}

export const projectService = new ProjectService();