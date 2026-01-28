export type DatabaseType = 'spanner' | 'postgresql' | 'mysql' | 'mongodb';

export type AuthType = 'oauth2' | 'service_account' | 'google_ADC' | 'username_password';

export interface OAuthConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
}

export interface DatabaseConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  project_id?: string;
  instance_id?: string;
  database_id?: string;
  auth_type: AuthType;
  username?: string;
  password?: string;
  oauth_config?: OAuthConfig;
  service_account_path?: string;
  options: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  database_type: DatabaseType;
  database_config: DatabaseConfig;
  create_time: string;
  update_time: string;
}

export interface ProjectCreate {
  name: string;
  database_type: DatabaseType;
  database_config: DatabaseConfig;
}

export interface ProjectUpdate {
  name?: string;
  database_config?: DatabaseConfig;
}

export interface APIInfo {
  type: DatabaseType;
  api_urls: Record<string, string>;
  version?: string;
}

export interface QueryRequest {
  query: string;
  parameters: Record<string, any>;
}

export interface QueryResponse {
  success: boolean;
  data?: any;
  error?: string;
  execution_time?: number;
}

export interface Category {
  name: string;
  props?: string[];
  keys?: string[];
  propsTypes?: Record<string, string>;
}
export interface Relationship {
  name: string;
  props?: string[];
  keys?: string[];
  propsTypes?: Record<string, string>;
  startCategory: string;
  endCategory: string;
}

export interface SchemaResponse {
  success: boolean;
  data?: Record<string, Record<string, string>>;
  error?: string;
}

export interface GraphSchemaResponse {
  success: boolean;
  data?: {
    categories: Category[];
    relationships: Relationship[];
  };
  error?: string;
}

export interface SampleDataResponse {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}