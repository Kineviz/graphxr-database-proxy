export type DatabaseType =
  | 'spanner'
  | 'bigquery'
  | 'rocketgraph'
  | 'neo4j'
  | 'memgraph'
  | 'kuzu'
  | 'ladybug'
  | 'latticedb'
  | 'postgresql'
  | 'mysql'
  | 'mongodb';

/**
 * The engines whose store is a local file rather than a server.
 *
 * A store's first bytes name the engine that wrote it, so this is also the set of
 * answers `/api/embedded/stores` can give for `engine`. Keep it in step with
 * `ENGINES` in `drivers/embedded/store_probe.py`.
 */
export type EmbeddedEngine = 'kuzu' | 'ladybug' | 'latticedb';

export type AuthType = 'oauth2' | 'service_account' | 'google_ADC' | 'username_password' | 'bearer_token';

export interface OAuthConfig {
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  scopes?: string[];
  token?: string;
  refresh_token?: string;
  expires_in?: number;
  last_refreshed?: number;
}

export interface DatabaseConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  // BigQuery reads database_id as the dataset and graph_name as the property
  // graph; Neo4j reads database_id as the database to open.
  project_id?: string;
  instance_id?: string;
  database_id?: string;
  graph_name?: string;
  // BigQuery only: the dataset's processing location, e.g. "US" or "EU".
  location?: string;
  auth_type: AuthType;
  username?: string;
  password?: string;
  oauth_config?: OAuthConfig;
  service_account_path?: string;
  // Kuzu, Ladybug and LatticeDB (embedded): a store is a local path, not a server.
  // database_path is the store file, or the directory Kuzu 0.10 and older wrote;
  // engine_version pins a release ("0.19" means the newest 0.19.x) and is normally
  // left empty so the file's own header decides; read_only defaults true.
  database_path?: string;
  engine_version?: string;
  read_only?: boolean;
  // RocketGraph, Neo4j and Memgraph
  use_tls?: boolean;
  deployment_mode?: 'standalone' | 'plugin';
  api_base_path?: string;
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
/** One engine build the proxy knows about, as reported by /api/embedded/engines. */
export interface EngineStatus {
  engine: string;
  version: string;
  status: 'absent' | 'installing' | 'ready' | 'failed';
  detail: string;
  error?: string | null;
  installed: boolean;
}

/**
 * What a path turned out to be.
 *
 * `success` is false for a path that is not a store — the user is probably still
 * typing — while a `success: true` body with no `resolved_version` means the file
 * is a store whose storage format no known release can read.
 */
export interface EmbeddedInspectResponse {
  success: boolean;
  path?: string | null;
  engine?: EmbeddedEngine | null;
  storage_version?: number | null;
  layout?: 'file' | 'directory' | null;
  description?: string | null;
  candidates: string[];
  resolved_version?: string | null;
  engine_status?: EngineStatus | null;
  error?: string | null;
}

/**
 * One file in the store library — the databases the proxy keeps on its own disk,
 * under `config/databases`.
 *
 * `kind` is what the first bytes say it is, which is not the same question as
 * whether the proxy can serve it: a SQLite file is listed as `sqlite` with
 * `servable: false` rather than hidden, because it really is sitting there.
 */
export interface StoreEntry {
  /** Library-relative, forward slashes. The id the delete route takes back. */
  relative_path: string;
  path: string;
  folder: string;
  name: string;
  size: number;
  /** Unix seconds. */
  modified: number;
  layout: 'file' | 'directory';
  kind: EmbeddedEngine | 'sqlite' | 'duckdb' | 'unknown';
  engine?: EmbeddedEngine | null;
  storage_version?: number | null;
  description: string;
  servable: boolean;
  /** Resolved from the map the proxy already holds, never over the network. */
  resolved_version?: string | null;
  engine_installed: boolean;
  /** Projects pointing at this file. Empty means deleting it breaks nothing. */
  used_by: string[];
}

/** A store a project names that lives outside the library. */
export interface ExternalStore {
  path: string;
  database_type: string;
  used_by: string[];
}

export interface StoreListResponse {
  root: string;
  items: StoreEntry[];
  total: number;
  offset: number;
  limit: number;
  folders: string[];
  external: ExternalStore[];
}
