# RocketGraph RestAPI — User Guide

This guide describes how to use the RocketGraph REST API: the calling sequence, the available endpoints, and the structures they return.

## 1 Overview

The RestAPI is a FastAPI service that exposes XGT (graph database) operations over HTTP. It is a pure data-plane API: it provides CRUD over graphs, frames (vertex, edge, and table), Cypher/GQL query execution, data ingest, and job tracking.

**Deployment modes**

The API ships in two deployment configurations. **Which one you are connecting to determines your base URL and how you authenticate.**

**Standalone**

The API runs as its own service — a Docker container or a direct uvicorn process. Use this when you are connecting directly to xgtrest without an intermediary.

| **Property** | **Value** |
| --- | --- |
| Default port | 4368 |
| Base URL | http://<host>:4368/api/v1 |
| Authentication | JWT issued by this API — call /auth/xgt/basic (or /auth/xgt/pki) to get a token, then pass it as Authorization: Bearer <token> on every request |
| TLS | Optional — port 4368 becomes HTTPS when certificates are mounted (no separate HTTPS port) |

All path examples in this guide use the standalone prefix. Prepend http://<host>:4368 to each path to form the full URL.

**Plugin (embedded in MC backend)**

The API runs as a plugin inside the Mission Control (MC) backend process. The MC backend mounts it at a fixed sub-path and owns authentication. Use this when your deployment is a running MC instance.

| **Property** | **Value** |
| --- | --- |
| Default port | 8080 (MC's port) |
| Base URL | http://<mc-host>:8080/api/xgt/v1 |
| Authentication | MC's session auth — you are already authenticated through MC; the plugin reuses your MC session. Do not call the /auth/* endpoints — they are not used in this mode. |

When using the plugin, replace the standalone prefix in every path example with http://<mc-host>:8080/api/xgt/v1.

**Interactive API docs**

When docs are enabled, Swagger UI and ReDoc are available at the same prefix as the API:

| **Mode** | **Swagger UI** | **ReDoc** |
| --- | --- | --- |
| Standalone (non-production) | http://<host>:4368/api/v1/docs | http://<host>:4368/api/v1/redoc |
| Plugin | http://<mc-host>:8080/api/xgt/v1/docs | http://<mc-host>:8080/api/xgt/v1/redoc |

Standalone docs are disabled when ENVIRONMENT=production is set. Plugin docs are always enabled (MC controls external exposure).

## 2 Authentication

The API uses **XGT pass-through JWT authentication**: you authenticate with XGT credentials, the API encrypts those credentials into a JWT, and every subsequent request uses that JWT as a Bearer token. When a request reaches XGT, the embedded credentials are decrypted and used to run operations as your XGT user.

### 2.1 Login endpoints

All login endpoints live under /auth/ and are defined in xgtrest/api/v1/auth/passthrough_auth.py.

| **Method** | **Path** | **Purpose** |
| --- | --- | --- |
| POST | /auth/xgt/basic | Username/password login (JSON body) |
| POST | /auth/xgt/token | OAuth2 password flow (form-encoded, Swagger) |
| POST | /auth/xgt/pki | X.509 certificate login |
| POST | /auth/xgt/proxy-pki | Proxy-mediated PKI login |
| POST | /auth/validate | Check whether a token is still valid |
| GET | /auth/me | Return info about the current user |
| POST | /auth/test-connection | Verify XGT connectivity with current token |
| POST | /auth/logout | Invalidate the server-side session |

### 2.2 Basic authentication (most common)

**Request**

```http
POST /api/v1/auth/xgt/basic
Content-Type: application/json

{
  "username": "analyst1",
  "password": "secret"
}
```

**Response (200)**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user_info": {
    "username": "analyst1",
    "namespace": "analyst1",
    "authenticated_at": "2026-04-21T10:30:00Z",
    "user_labels": ["analyst", "viewer"],
    "is_admin": false
  }
}
```

### 2.3 Using the token

Include the token in the Authorization header on every subsequent request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

There is **no refresh endpoint** — when expires_in elapses, call a login endpoint again to get a new token. Tokens default to 1 hour (JWT_EXPIRY_SECONDS).

### 2.4 PKI authentication

For certificate-based environments, POST base64-encoded PEM material to /auth/xgt/pki:

```json
{
  "client_cert": "LS0tLS1CRUdJTi...",
  "client_key":  "LS0tLS1CRUdJTi...",
  "ca_chain":    "LS0tLS1CRUdJTi...",
  "ssl_server_cert": "/path/to/cert",
  "ssl_server_cn":   "xgt.example.com"
}
```

Response shape is the same XGTAuthResponse as basic auth.

## 3 Typical calling sequence

The canonical workflow is:

```text
  ┌─────────────────────────────────────────────────────────────┐
  │ 1. POST /auth/xgt/basic              → access_token         │
  │ 2. GET  /graphs                      → list of graph names  │
  │ 3. GET  /graphs/{name}/schema        → node/edge types      │
  │ 4. POST /graphs/{name}/ingest/nodes/{type}   (load data)    │
  │    POST /graphs/{name}/ingest/edges/{type}                  │
  │ 5. POST /graphs/{name}/query         → synchronous results  │
  │    or                                                       │
  │    POST /graphs/{name}/query/submit  → { job_id }           │
  │    GET  /jobs/{job_id}/status        → poll until completed │
  │    GET  /jobs/{job_id}/results       → paginated rows       │
  │ 6. POST /auth/logout                 (optional)             │
  └─────────────────────────────────────────────────────────────┘
```

Each step is described in the sections below.

## 4 Health and version

Defined in xgtrest/api/v1/health.py. Most endpoints are **public** (no token required) except /version and /server/config.

| **Method** | **Path** | **Auth** | **Purpose** |
| --- | --- | --- | --- |
| GET | /health | no | Deep health (API + XGT reachability) |
| GET | /ready | no | Kubernetes readiness probe |
| GET | /live | no | Kubernetes liveness probe |
| GET | /version | yes | API / XGT / Python versions |
| GET | /server/metrics | no | XGT memory, threads, license |
| GET | /server/config | yes | XGT config values (query with ?keys=a,b) |

GET /version response (requires auth):

```json
{
  "api": {
    "name":            "RocketGraph REST API",
    "version":         "1.0.0",
    "environment":     "production",
    "uptime_seconds":  12345.6,
    "build_timestamp": "2026-04-21T10:45:00Z"
  },
  "xgt": {
    "server_version":      "2.6.1",
    "xgt_version":         "2.6.1",
    "connection_status":   "connected"
  },
  "system": {
    "python_version": "3.11.9",
    "platform":       "linux"
  }
}
```

## 5 Graphs

Defined in xgtrest/api/v1/graphs.py. A "graph" is an XGT namespace containing vertex and edge frames.

| **Method** | **Path** | **Purpose** |
| --- | --- | --- |
| GET | /graphs | List graph names |
| GET | /graphs/default | Get the caller's default graph |
| PUT | /graphs/default | Set (or clear) the caller's default graph |
| POST | /graphs | Create a new graph from a schema |
| GET | /graphs/{graph_name} | Graph info (vertices, edges, row counts) |
| GET | /graphs/{graph_name}/schema | Full schema (node and edge type definitions) |
| DELETE | /graphs/{graph_name} | Drop the graph and all contained frames |

### 5.1 List graphs

```http
GET /api/v1/graphs?include_empty=true
```

**Response**

```json
{
  "graphs":      ["social", "fintrans", "healthcare"],
  "total_count": 3
}
```

### 5.2 Get graph schema

```http
GET /api/v1/graphs/social/schema?fully_qualified=true&add_missing_edge_nodes=false
```

**Response (`SchemaResponse`)**

```json
{
  "graph_name": "social",
  "graph_schema": {
    "node_types": [
      {
        "type": "Person",
        "key": "id",
        "properties": [
          {"name": "id",   "type": "TEXT"},
          {"name": "name", "type": "TEXT"},
          {"name": "age",  "type": "INT"}
        ],
        "indexes": ["name"],
        "label_universe": [["pii"], ["public"]],
        "security_labels": {
          "create": ["writer"], "read": [], "update": ["writer"], "delete": ["admin"]
        }
      }
    ],
    "edge_types": [
      {
        "type": "KNOWS",
        "source": "Person", "target": "Person",
        "source_key": "id", "target_key": "id",
        "properties": [{"name": "since", "type": "DATE"}]
      }
    ]
  },
  "counts": null
}
```

### 5.3 Create a graph

```http
POST /api/v1/graphs
Content-Type: application/json

{
  "graph": {
    "name":        "social",
    "description": "Social network graph",
    "version":     "1.0"
  },
  "nodes": [
    {
      "type": "Person",
      "key":  "id",
      "properties": [
        {"name": "id",   "type": "TEXT"},
        {"name": "name", "type": "TEXT"},
        {"name": "age",  "type": "INT"}
      ]
    }
  ],
  "edges": [
    {
      "type":       "KNOWS",
      "source":     "Person",
      "target":     "Person",
      "source_key": "id",
      "target_key": "id",
      "properties": [{"name": "since", "type": "DATE"}]
    }
  ]
}
```

The top-level fields are graph (metadata), nodes (list of vertex type definitions), and edges (list of edge type definitions). Response echoes the created graph name and confirms creation.

### 5.4 Delete a graph

```http
DELETE /api/v1/graphs/social?attempts=10
```

attempts controls retry on concurrent-access conflicts (1–100, default 10).

## 6 Frames

Defined in xgtrest/api/v1/frames.py. A frame is the physical storage for a single vertex type, edge type, or standalone table.

| **Method** | **Path** | **Purpose** |
| --- | --- | --- |
| GET | /frames | List all frames across all graphs |
| GET | /frames/{frame_name}/data | Read rows (paginated) |
| GET | /frames/{frame_name}/labels | Frame CRUD labels and row label universe |
| POST | /frames/{frame_name}/columns | Append new columns |
| PATCH | /frames/{frame_name}/columns | Change existing column types |
| DELETE | /frames/{frame_name}/columns | Remove columns |
| POST | /frames/{frame_name}/transfer | Pull a frame from a remote XGT server |
| POST | /frames/{frame_name}/flight-ingest | Ingest data from an Arrow Flight server |
| DELETE | /frames/{frame_name} | Drop one frame |
| DELETE | /frames | Drop many frames (atomic) |

### 6.1 List frames

```http
GET /api/v1/frames?graph_name=social&frame_type=vertex
```

frame_type is vertex, edge, or table. Omit graph_name to list across all graphs. System frames under the xgt__ namespace are excluded.

### 6.2 Read frame data

```http
GET /api/v1/frames/social__Person/data?offset=0&limit=100&row_labels=false
```

**Response (`FrameDataResponse`)**

```json
{
  "frame_name": "social__Person",
  "frame_type": "vertex",
  "namespace":  "social",
  "columns":    ["id", "name", "age"],
  "rows": [
    ["1", "Alice", 30],
    ["2", "Bob",   25]
  ],
  "total_rows":    1234,
  "offset":        0,
  "limit":         100,
  "returned_rows": 100
}
```

Rows are returned as **arrays of values** (same order as columns), not as objects — this keeps payloads compact for wide tables.

### 6.3 Ingest from Arrow Flight

Pull data from an Arrow Flight server directly into an existing xGT frame. The target frame must already exist; create it via POST /graphs or the frames endpoints first.

```http
POST /api/v1/frames/social__Person/flight-ingest
Content-Type: application/json

{
  "host":     "flight-server.example.com",
  "port":     8815,
  "path":     ["my_table"],
  "username": "reader",
  "password": "secret",
  "tls":      false
}
```

**Response (`FlightIngestResponse`)**

```json
{
  "frame_name":        "social__Person",
  "host":              "flight-server.example.com",
  "port":              8815,
  "rows_inserted":     50000,
  "execution_time_ms": 1234,
  "message":           "Frame 'social__Person' ingested 50000 rows from flight-server.example.com:8815"
}
```

### 6.4 Drop one or many frames

**Single:**

```http
DELETE /api/v1/frames/social__Person
```

**Bulk** (atomic — either all succeed or none):

```http
DELETE /api/v1/frames
Content-Type: application/json

{ "frames": ["social__Person", "social__KNOWS"] }
```

## 7 Querying (Cypher / GQL)

Defined in xgtrest/api/v1/query.py.

| **Method** | **Path** | **Purpose** |
| --- | --- | --- |
| POST | /graphs/{graph_name}/query | Execute synchronously; return results |
| POST | /graphs/{graph_name}/query/submit | Submit asynchronously; return job_id |
| POST | /graphs/{graph_name}/query/compile | Validate query without executing |

### 7.1 Request body (`QueryRequest`)

```json
{
  "query":          "MATCH (p:Person) WHERE p.age > $min RETURN p.name, p.age",
  "language":       "cypher",
  "parameters":     {"min": 25},
  "format":         "json",
  "limit":          1000,
  "flatten_paths":  true
}
```

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| query | string | Required. |
| language | "cypher" \| "gql" | Default cypher. |
| parameters | object \| null | Named parameters substituted into the query. |
| format | json \| csv \| parquet | Output format. Default json. |
| limit | int (1–1 000 000) | Hard cap on rows returned. |
| flatten_paths | bool | Expand variable-length paths into rows. |

### 7.2 Synchronous execution

```http
POST /api/v1/graphs/social/query
```

**Response (`QueryResponse`)**

```json
{
  "job_id":            42,
  "status":            "completed",
  "query":             "MATCH ...",
  "graph_name":        "social",
  "submitted_at":      1745000000.0,
  "columns":           ["p.name", "p.age"],
  "data":              [["Alice", 30], ["Bob", 25]],
  "returned_rows":     2,
  "execution_time_ms": 42
}
```

job_id is an integer assigned by xGT. submitted_at is a Unix timestamp (seconds since epoch, float).

### 7.3 Asynchronous submission

```http
POST /api/v1/graphs/social/query/submit
```

**Response (`QuerySubmitResponse`)**

```json
{
  "job_id":       42,
  "status":       "scheduled",
  "query":        "MATCH ...",
  "graph_name":   "social",
  "submitted_at": 1745000000.0
}
```

job_id is an integer. submitted_at is a Unix timestamp (float). Poll GET /jobs/42/status and fetch GET /jobs/42/results once the status is completed. See §9.

### 7.4 Compile a query (validate without executing)

Use this to check whether a query is syntactically and semantically valid before running it.

```http
POST /api/v1/graphs/social/query/compile
Content-Type: application/json

{
  "query":         "MATCH (p:Person) WHERE p.age > $min RETURN p.name",
  "parameters":    {"min": 25},
  "generate_json": true
}
```

| **Field** | **Type** | **Default** | **Description** |
| --- | --- | --- | --- |
| query | string | required | Cypher query to compile. |
| parameters | object \| null | null | Parameters for substitution. |
| generate_json | bool | true | Return the query plan as a JSON string in query_json. |

**Response (`CompileQueryResponseModel`) — HTTP 200 on success, 400 on compile error**

```json
{
  "query":           "MATCH (p:Person) WHERE p.age > $min RETURN p.name",
  "graph_name":      "social",
  "compiled":        true,
  "query_json":      "{\"plan\": \"...\"}",
  "compile_time_ms": 7
}
```

query_json is null when generate_json is false. On compile failure the response is 400 with error code QUERY_COMPILE_ERROR.

## 8 Ingest

Defined in xgtrest/api/v1/ingest.py. The router is mounted with prefix /graphs, so full paths include /graphs/{graph_name}.

| **Method** | **Path** | **Purpose** |
| --- | --- | --- |
| POST | /graphs/{graph_name}/ingest/nodes/{node_type} | Insert/upsert/replace node rows (JSON) |
| POST | /graphs/{graph_name}/ingest/edges/{edge_type} | Insert/upsert/replace edge rows (JSON) |
| POST | /graphs/{graph_name}/ingest/bulk | Ingest many frames in one request |
| POST | /graphs/{graph_name}/ingest/nodes/{node_type}/parquet | Ingest nodes from raw Parquet bytes (async 202) |
| POST | /graphs/{graph_name}/ingest/edges/{edge_type}/parquet | Ingest edges from raw Parquet bytes (async 202) |
| POST | /graphs/{graph_name}/ingest/nodes/{node_type}/load | Ingest nodes by reference (S3/HTTPS/FTP/xgtd) |
| POST | /graphs/{graph_name}/ingest/edges/{edge_type}/load | Ingest edges by reference (S3/HTTPS/FTP/xgtd) |

### 8.1 Ingest nodes (JSON)

```http
POST /api/v1/graphs/social/ingest/nodes/Person
Content-Type: application/json

{
  "data": [
    {"id": "1", "name": "Alice", "age": 30},
    {"id": "2", "name": "Bob",   "age": 25}
  ],
  "options": {
    "mode":            "upsert",
    "validate_schema": true,
    "batch_size":      500
  }
}
```

**Ingest modes** (IngestMode in xgtrest/models/ingest.py):

- insert — fails on duplicate keys
- upsert — insert if missing, update if present
- replace — truncate the frame, then insert

**Response (`IngestResponse`)**

```json
{
  "job_id":            null,
  "status":            "completed",
  "submitted_at":      "2026-04-21T10:50:00Z",
  "completed_at":      "2026-04-21T10:50:01Z",
  "rows_submitted":    2,
  "rows_inserted":     2,
  "rows_updated":      0,
  "rows_failed":       0,
  "execution_time_ms": 234,
  "validation_errors": []
}
```

The synchronous JSON endpoints always return job_id: null — they run to completion before responding. To ingest large datasets asynchronously, use the /parquet or /load endpoints (§8.2–8.3), which return a separate IngestJobAccepted body with an ingest_job_id.

### 8.2 Ingest from Parquet (Async)

Send raw Parquet bytes as the request body. The file's column names must match the target frame's schema. The server enqueues the work on a background thread and returns 202 Accepted immediately. **Query parameter:** ?mode=insert (default) | upsert | replace

```http
POST /api/v1/graphs/social/ingest/nodes/Person/parquet?mode=upsert
Content-Type: application/vnd.apache.parquet
```

```text
<raw parquet bytes>
```

**Response headers — HTTP 202**

```http
Location:    /api/v1/ingest/jobs/ing-7f4ab2c3.../status
Retry-After: 2
```

**Response body (`IngestJobAccepted`)**

```json
{
  "ingest_job_id": "ing-7f4ab2c3...",
  "state":         "queued",
  "submitted_at":  "2026-04-21T10:50:00Z",
  "links": {
    "self":    "/api/v1/ingest/jobs/ing-7f4ab2c3.../status",
    "status":  "/api/v1/ingest/jobs/ing-7f4ab2c3.../status",
    "results": "/api/v1/ingest/jobs/ing-7f4ab2c3.../results",
    "events":  "/api/v1/ingest/jobs/ing-7f4ab2c3.../events",
    "cancel":  "/api/v1/ingest/jobs/ing-7f4ab2c3.../cancel"
  }
}
```

Poll links.status until state is completed, failed, or canceled, then fetch row counts from links.results. Alternatively, open links.events as a Server-Sent Events stream for push-based notification (see §9.2). Ingest job IDs are prefixed ing- to distinguish them from xGT-native query job IDs under /jobs/{int_id}.

### 8.3 Ingest by Reference

For data already accessible to the xGT server (S3 bucket, HTTPS URL, FTP server, or xGT daemon path), use the /load endpoint. xGT fetches the data directly — the bytes never pass through the REST API — making this the preferred approach for large files. Paths must use one of the accepted URI schemes (s3://, https://, http://, ftp://, ftps://, xgtd://); bare paths and xgt:// are rejected with 422.

```http
POST /api/v1/graphs/social/ingest/edges/KNOWS/load
Content-Type: application/json

{
  "paths": "s3://my-bucket/edges/knows.parquet",
  "mode":  "insert"
}
```

Returns 202 Accepted with the same IngestJobAccepted body as the parquet endpoints (§8.2), including the links dict.

**`LoadRequest` fields**

| **Field** | **Type** | **Default** | **Description** |
| --- | --- | --- | --- |
| paths | string or array | required | URI(s) xGT should fetch. Single string is coerced to a one-element list. |
| mode | insert \| upsert \| replace | insert | Ingestion strategy. |
| header_mode | NONE \| IGNORE \| NORMAL \| STRICT | NONE | CSV header handling. |
| delimiter | single char | , | CSV field delimiter. |
| column_mapping | {frame_col: file_col_or_index} | null | Map frame columns to file columns by name or zero-based index. |
| row_filter | string | null | OpenCypher fragment to filter or transform rows during load (xGT ≥ 1.15). |
| suppress_errors | bool | false | Continue on row errors; first 1000 errors are stored in xGT job history. |
| record_history | bool | true | Record this operation in xGT's job history. |
| row_labels | array of strings | null | Security labels to attach to every loaded row. |
| row_label_columns | array of int or string | null | File columns that supply per-row security labels. |
| chunk_size | int | null | Arrow row-batch size for the gRPC stream (xGT ≥ 1.16). |

## 9 Jobs

There are two separate job namespaces. **xGT-native jobs** (/jobs/{int_id}) — these are jobs managed by the xGT engine itself. Defined in xgtrest/api/v1/jobs.py.

| **Method** | **Path** | **Purpose** |
| --- | --- | --- |
| GET | /jobs | List job history (paginated) |
| GET | /jobs/{job_id}/status | Current status, progress, timing |
| GET | /jobs/{job_id}/results | Paginated result rows |
| GET | /jobs/{job_id}/errors | Per-row ingest errors (up to 1000 stored) |
| DELETE | /jobs/{job_id} | Cancel a pending or running job |

**Ingest jobs** (/ingest/jobs/{ingest_job_id}) — plugin-side async jobs created by the parquet and /load endpoints. IDs are prefixed ing-. Defined in xgtrest/api/v1/ingest_jobs.py.

| **Method** | **Path** | **Purpose** |
| --- | --- | --- |
| GET | /ingest/jobs/{ingest_job_id}/status | State (queued, running, completed, failed, canceled) and timing |
| GET | /ingest/jobs/{ingest_job_id}/results | Row counts after completion |
| POST | /ingest/jobs/{ingest_job_id}/cancel | Cancel a queued or running ingest job (record preserved) |
| GET | /ingest/jobs/{ingest_job_id}/events | SSE stream of state-change events |

### 9.1 xGT Job Status Lifecycle

```text
  queued → running → completed
                  ↘ failed
                  ↘ canceled
```

```http
GET /jobs/{job_id}/status
```

**Response (`JobStatusResponse`)**

```json
{
  "job_id":             42,
  "job_type":           "query",
  "status":             "running",
  "progress":           0.42,
  "start_time":         1745000000.0,
  "end_time":           null,
  "processing_time_ms": null,
  "error_message":      null
}
```

job_id is an integer assigned by xGT. start_time and end_time are Unix timestamps (float), or null when not yet reached.

### 9.2 Ingest Job Status

```http
GET /ingest/jobs/{ingest_job_id}/status
```

**Response (`IngestJobStatusModel`)**

```json
{
  "ingest_job_id": "ing-7f4ab2c3...",
  "state":         "completed",
  "submitted_at":  "2026-04-21T10:50:00Z",
  "started_at":    "2026-04-21T10:50:00Z",
  "completed_at":  "2026-04-21T10:50:02Z",
  "graph_name":    "social",
  "target_type":   "Person",
  "operation":     "parquet_bytes_ingest",
  "xgt_job_id":    42,
  "error_message": null
}
```

operation is "parquet_bytes_ingest" for the /parquet endpoints and "load_by_reference" for the /load endpoints. xgt_job_id is the underlying xGT engine job ID (an integer), available once the operation completes. It can be used to fetch per-row ingest errors from GET /jobs/{xgt_job_id}/errors. Ingest job IDs are valid only for the lifetime of the plugin process. A process restart invalidates all IDs; subsequent requests return 404.

### 9.3 Streaming Ingest Job Events (SSE)

As an alternative to polling status, connect to the events stream:

```http
GET /api/v1/ingest/jobs/ing-7f4ab2c3.../events
Accept: text/event-stream
```

The server sends newline-delimited SSE frames and closes the stream after the first terminal event.

| **Event** | **When emitted** | **`data` payload** |
| --- | --- | --- |
| status | Every state transition | {"state": "<new-state>"} |
| heartbeat | Every ~10 s while running | {"ts": <monotonic float>} |
| completed | Job succeeded | Row-count dict (same fields as /results) |
| error | Job failed, or ID not found | {"error_message": "..."} |
| canceled | Job was canceled | {} |

**Example stream for a successful job**

```text
event: status
data: {"state": "queued"}

event: status
data: {"state": "running"}

event: heartbeat
data: {"ts": 1745000012.4}

event: completed
data: {"rows_submitted": 50000, "rows_inserted": 50000, "rows_updated": 0, "rows_failed": 0, "execution_time_ms": 3421}
```

**Example stream for a failed job**

```text
event: status
data: {"state": "queued"}

event: status
data: {"state": "running"}

event: error
data: {"error_message": "Column 'foo' not found in frame 'Person'"}
```

The heartbeat event exists to keep idle-timeout reverse proxies alive; clients should ignore it or use it to detect stalled connections.

```http
GET /ingest/jobs/{ingest_job_id}/results
```

Returns 409 Conflict if the job has not yet reached a terminal state (completed, failed, or canceled).

**Response (`IngestJobResultsModel`)**

```json
{
  "ingest_job_id":     "ing-7f4ab2c3...",
  "rows_submitted":    50000,
  "rows_inserted":     50000,
  "rows_updated":      0,
  "rows_failed":       0,
  "execution_time_ms": 3421,
  "xgt_job_id":        42,
  "error_message":     null
}
```

### 9.3 Fetch xGT Job Results

```http
GET /api/v1/jobs/42/results?offset=0&limit=1000
```

**Response (`JobResultsResponse`)**

```json
{
  "job_id":        42,
  "job_type":      "query",
  "status":        "completed",
  "rows":          [ {"p.name": "Alice", "p.age": 30} ],
  "offset":        0,
  "limit":         1000,
  "returned_rows": 1,
  "total_rows":    1,
  "result_metadata": { "columns": ["p.name", "p.age"] }
}
```

### 9.4 List xGT Job History

```http
GET /api/v1/jobs?page=1&per_page=50&status=completed&job_type=query
```

Returns a paginated `JobHistoryResponse`. `job_id` values in the history records are integers. Returns a paginated JobHistoryResponse with summary records.

## 10 Tables

Defined in xgtrest/api/v1/tables.py. Tables are standalone (non-graph) frames — useful for staging data, dimension tables, and export.

| **Method** | **Path** | **Purpose** |
| --- | --- | --- |
| GET | /tables | List table frames |
| POST | /tables | Create a new table |
| GET | /tables/{table_name}/data | Paginated read of table contents |
| POST | /tables/{table_name}/ingest | Insert or replace rows |

**Create table**

```json
{
  "name": "events",
  "columns": [
    {"name": "event_id",  "type": "TEXT"},
    {"name": "timestamp", "type": "DATETIME"},
    {"name": "value",     "type": "FLOAT"}
  ],
  "namespace": "analytics"
}
```

## 11 Namespaces

Defined in xgtrest/api/v1/namespaces.py. Namespaces are XGT's access-control scopes; every frame lives inside a namespace.

| **Method** | **Path** | **Purpose** |
| --- | --- | --- |
| GET | /namespaces | List accessible namespaces |
| POST | /namespaces | Create a namespace |
| GET | /namespaces/default | Get caller's default namespace |
| PUT | /namespaces/default | Set caller's default namespace |
| GET | /namespaces/{namespace_name}/frames | Frames in a namespace |
| DELETE | /namespaces/{namespace_name} | Drop an empty namespace |

## 12 Response and error formats

### 12.1 Success responses

Responses are typed response_model=<PydanticModel> on each route. The model names in this guide (QueryResponse, IngestResponse, IngestJobAccepted, IngestJobStatusModel, FrameDataResponse, etc.) match the generated OpenAPI schema at /docs. Common response conventions:

- Timestamps are ISO 8601 UTC strings ("2026-04-21T10:45:00Z").
- Row data is returned either as **arrays** (frame data, sync queries) or as **objects** (job results) — noted per endpoint above.
- Pagination uses offset + limit query parameters, and responses include offset, limit, returned_rows, and (where known) total_rows.

### 12.2 Error response shape

All errors are normalized by the exception handler in xgtrest/app_factory.py to:

```json
{
  "error": {
    "code":    "ERROR_CODE",
    "message": "Human-readable description",
    "details": "Extra context (string or array, may be empty)"
  }
}
```

### 12.3 Status codes

| **Code** | **When** | **Typical error code** |
| --- | --- | --- |
| 200 | Success | — |
| 201 | Resource created | — |
| 204 | Resource deleted | — |
| 400 | Bad request / invalid query | VALIDATION_ERROR, INVALID_QUERY |
| 401 | Missing/invalid/expired token | AUTHENTICATION_FAILED |
| 403 | Token valid but user lacks permission | PERMISSION_DENIED |
| 404 | Graph/frame/job not found | GRAPH_NOT_FOUND, FRAME_NOT_FOUND, JOB_NOT_FOUND |
| 409 | Conflict (already exists, has deps) | GRAPH_ALREADY_EXISTS, FRAME_DEPENDENCY_ERROR |
| 422 | Request body failed schema validation | VALIDATION_ERROR |
| 500 | XGT or server-side failure | XGT_OPERATION_ERROR, INTERNAL_SERVER_ERROR |
| 503 | XGT unreachable | XGT_CONNECTION_ERROR |

### 12.4 Validation error example

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "type": "string_type",
        "loc":  ["body", "query"],
        "msg":  "Input should be a valid string"
      }
    ]
  }
}
```

Sensitive fields (e.g. password) are scrubbed from validation-error responses and server logs.

## 13 End-to-end example

A complete session: authenticate, create a graph, load data, run a query, retrieve results asynchronously.

```bash
# 1. Log in
TOKEN=$(curl -s -X POST http://localhost:4368/api/v1/auth/xgt/basic \
  -H "Content-Type: application/json" \
  -d '{"username":"analyst1","password":"secret"}' \
  | jq -r .access_token)

AUTH="Authorization: Bearer $TOKEN"
BASE="http://localhost:4368/api/v1"

# 2. Create a graph
curl -X POST "$BASE/graphs" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "social",
  "node_types": [{
    "type": "Person", "key": "id",
    "properties": [
      {"name":"id","type":"TEXT"},
      {"name":"name","type":"TEXT"},
      {"name":"age","type":"INT"}
    ]
  }],
  "edge_types": [{
    "type": "KNOWS",
    "source":"Person","target":"Person",
    "source_key":"id","target_key":"id",
    "properties": [{"name":"since","type":"DATE"}]
  }]
}'

# 3. Ingest nodes
curl -X POST "$BASE/graphs/social/ingest/nodes/Person" \
  -H "$AUTH" -H "Content-Type: application/json" -d '{
    "data": [
      {"id":"1","name":"Alice","age":30},
      {"id":"2","name":"Bob","age":25}
    ],
    "options": {"mode":"upsert","validate_schema":true}
  }'

# 4. Submit an async query
JOB=$(curl -s -X POST "$BASE/graphs/social/query/submit" \
  -H "$AUTH" -H "Content-Type: application/json" -d '{
    "query": "MATCH (p:Person) WHERE p.age > $min RETURN p.name, p.age",
    "parameters": {"min": 24}
  }' | jq .job_id)   # job_id is an integer

# 5. Poll for completion
until [ "$(curl -s "$BASE/jobs/$JOB/status" -H "$AUTH" | jq -r .status)" = "completed" ]; do
  sleep 1
done

# 6. Fetch results
curl -s "$BASE/jobs/$JOB/results?limit=100" -H "$AUTH"
```

## 14 Reference

- App factory and middleware: xgtrest/app_factory.py
- Authentication: xgtrest/api/v1/auth/passthrough_auth.py, xgtrest/auth/passthrough_models.py
- Models: xgtrest/models/schema.py, xgtrest/models/ingest.py, xgtrest/models/dataset.py
- Routers: xgtrest/api/v1/
- Configuration: xgtrest/config/app_config.py
- Existing design docs: docs/design/, docs/quick-start-guide.md
