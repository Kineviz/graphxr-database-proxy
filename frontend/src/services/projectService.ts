import axios, { InternalAxiosRequestConfig } from 'axios';
import { Project, ProjectCreate, ProjectUpdate, APIInfo, QueryRequest, QueryResponse, SchemaResponse, GraphSchemaResponse, SampleDataResponse } from '../types/project';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:9080';

// Cached tokens for authenticated requests
let cachedApiKey: string | null = null;
// Initialize admin token from localStorage (handles page refresh and HMR)
let cachedAdminToken: string | null = localStorage.getItem('adminToken');

// Promise that resolves when API key initialization is complete
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - waits for initialization and adds auth headers
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Don't wait for initialization when fetching settings (avoid deadlock)
    const isSettingsRequest = config.url?.includes('/api/settings');
    const isAdminRequest = config.url?.includes('/api/admin');
    
    // Wait for initialization to complete before making other requests
    if (!isSettingsRequest && !isAdminRequest && initializationPromise && !isInitialized) {
      await initializationPromise;
    }
    
    // Add admin token for management endpoints
    // Always check localStorage as fallback (handles HMR reloads in dev)
    const adminToken = cachedAdminToken || localStorage.getItem('adminToken');
    if (adminToken) {
      config.headers['X-Admin-Token'] = adminToken;
      // Update cache if it was stale
      if (!cachedAdminToken) {
        cachedAdminToken = adminToken;
      }
    }
    
    // Add API key for database endpoints
    if (cachedApiKey) {
      config.headers['X-API-Key'] = cachedApiKey;
    }
    
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

/**
 * Initialize the API key from settings.
 * Call this on app startup to enable authenticated requests.
 * All other requests will wait for this to complete.
 */
export function initializeApiKey(): Promise<void> {
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = (async () => {
    try {
      const response = await api.get('/api/settings');
      const settings = response.data;
      if (settings.api_key_enabled && settings.api_key) {
        cachedApiKey = settings.api_key;
      } else {
        cachedApiKey = null;
      }
    } catch (error) {
      console.warn('Failed to load API key from settings:', error);
      cachedApiKey = null;
    } finally {
      isInitialized = true;
    }
  })();
  
  return initializationPromise;
}

/**
 * Update the cached API key (called after settings changes)
 */
export function setApiKey(apiKey: string | null): void {
  cachedApiKey = apiKey;
}

/**
 * Set the admin token for management API requests
 */
export function setAdminToken(token: string | null): void {
  cachedAdminToken = token;
  if (token) {
    localStorage.setItem('adminToken', token);
  } else {
    localStorage.removeItem('adminToken');
  }
}

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

  // Settings API methods
  async getSettings(): Promise<{ api_key: string | null; api_key_enabled: boolean; api_key_env_configured: boolean }> {
    const response = await api.get('/api/settings');
    return response.data;
  }

  async updateSettings(settings: { api_key_enabled: boolean }): Promise<{ api_key: string | null; api_key_enabled: boolean; api_key_env_configured: boolean }> {
    const response = await api.put('/api/settings', settings);
    return response.data;
  }

  async generateAndSaveApiKey(): Promise<{ api_key: string | null; api_key_enabled: boolean; api_key_env_configured: boolean }> {
    const response = await api.post('/api/settings/generate-key');
    return response.data;
  }

  // Google Cloud API methods
  async listGoogleProjects(auth: any, authType: string): Promise<any[]> {
    const response = await api.post('/api/google/spanner/list_projects', {
      auth,
      auth_type: authType,
    });
    return response.data;
  }

  async listGoogleDatabases(auth: any, authType: string): Promise<any[]> {
    const response = await api.post('/api/google/spanner/list_databases', {
      auth,
      auth_type: authType,
    });
    return response.data;
  }

  async refreshGoogleToken(refreshToken: string): Promise<any> {
    const response = await api.post('/api/google/refresh-token', {
      refresh_token: refreshToken,
    });
    return response.data;
  }
}

export const projectService = new ProjectService();