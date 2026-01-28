# GraphXR Database Proxy API Reference

> Comprehensive API documentation for Google Cloud Spanner integration

## Table of Contents
- [1. API Info](#1-api-info-required)
- [2. Query](#2-query-required)
- [3. Graph Schema](#3-graph-schema-required)
- [4. Table Schema](#4-table-schema-optional)
- [Data Type Definitions](#data-type-definitions)

---

## 1. API Info (Required)

Returns metadata about the database proxy API endpoints for a specific project.

**Endpoint:** `GET /api/spanner/{project_id}`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Unique project identifier (project name) |

**Request Headers:**
```
Accept: application/json
```

**Response Type:** `APIInfo`

**Response Schema:**
```typescript
{
  type: DatabaseType,           // Enum: "spanner" | "postgresql" | "mysql" | "mongodb"
  api_urls: {
    info: string,               // URL to this endpoint
    query: string,              // URL to query endpoint
    graphSchema: string,        // URL to graph schema endpoint
    schema: string              // URL to table schema endpoint
  },
  version?: string              // API version (optional)
}
```

**Response Example:**
```json
{
  "type": "spanner",
  "api_urls": {
    "info": "/api/spanner/spanner_demo",
    "query": "/api/spanner/spanner_demo/query",
    "graphSchema": "/api/spanner/spanner_demo/graphSchema",
    "schema": "/api/spanner/spanner_demo/schema"
  },
  "version": "1.0"
}
```

---

## 2. Query (Required)

Execute Cypher queries against the Spanner graph database.

**Endpoint:** `POST /api/spanner/{project_id}/query`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Unique project identifier (project name) |

**Request Headers:**
```
Content-Type: application/json
Accept: application/json
```

**Request Type:** `QueryRequest`

**Request Body Schema:**
```typescript
{
  query: string,                           // Cypher query string (required)
  parameters?: Record<string, any>         // Query parameters (optional, default: {})
}
```

**Request Body Example:**
```json
{
  "query": "MATCH (n)-[r]->(m) RETURN * LIMIT 1",
  "parameters": {}
}
```

**Response Type:** `QueryResponse`

**Response Schema:**
```typescript
{
  success: boolean,                        // Query execution status
  data?: QueryData,                        // Query results (null if error)
  error?: string,                          // Error message (null if success)
  execution_time?: number                  // Execution time in seconds
}

// QueryData structure
QueryData = {
  type: "TABLE" | "GRAPH",                 // Result type
  data: GraphData | Array<Record<string, any>>,  // Results based on type
  summary: {
    version: string                        // Query engine version
  }
}

// GraphData structure (when type is "GRAPH")
GraphData = {
  nodes: Array<{
    id: string,                            // Unique node identifier
    labels: string[],                      // Node labels/categories
    properties: Record<string, any>        // Node properties
  }>,
  relationships: Array<{
    id: string,                            // Unique relationship identifier
    type: string,                          // Relationship type/name
    startNodeId: string,                   // Source node ID
    endNodeId: string,                     // Target node ID
    properties: Record<string, any>        // Relationship properties
  }>
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "type": "GRAPH",
    "data": {
      "nodes": [
        {
          "id": "mWdyYXBoX3ZpZXcuQ2xpZW50AHiZNDAwMDI2MjI5ODE1ODgyMwB4",
          "labels": ["Client"],
          "properties": {
            "id": "4000262298158823",
            "is_fraud": false,
            "name": "xxx xxx"
          }
        },
        {
          "id": "mWdyYXBoX3ZpZXcuVHJhbnNhY3Rpb24AeJkxMDAzNTcAeA==",
          "labels": ["Transaction"],
          "properties": {
            "action": "CASH_IN",
            "amount": 190730.98,
            "global_step": 100357.0,
            "id": "100357",
            "is_flagged_fraud": false,
            "is_fraud": false,
            "timestamp": "2024-01-19T01:09:09",
            "type_dest": "MERCHANT",
            "type_orig": "CLIENT"
          }
        }
      ],
      "relationships": [
        {
          "id": "mWdyYXBoX3ZpZXcuQ2xpZW50X1BlcmZvcm1fVHJhbnNhY3Rpb24AeJk0MDAwMjYyMjk4MTU4ODIzAHiZMTAwMzU3AHiZZ3JhcGhfdmlldy5DbGllbnQAeJk0MDAwMjYyMjk4MTU4ODIzAHiZZ3JhcGhfdmlldy5UcmFuc2FjdGlvbgB4mTEwMDM1NwB4",
          "type": "PERFORMS",
          "startNodeId": "mWdyYXBoX3ZpZXcuQ2xpZW50AHiZNDAwMDI2MjI5ODE1ODgyMwB4",
          "endNodeId": "mWdyYXBoX3ZpZXcuVHJhbnNhY3Rpb24AeJkxMDAzNTcAeA==",
          "properties": {
            "client_id": "4000262298158823",
            "timestamp": "2024-01-19T01:09:09",
            "transaction_id": "100357"
          }
        }
      ]
    },
    "summary": {
      "version": "4.0.1"
    }
  },
  "error": null,
  "execution_time": 3.5043985843658447
}
```

---

## 3. Graph Schema (Required)

Retrieve the graph schema including node categories and relationship types.

**Endpoint:** `GET /api/spanner/{project_id}/graphSchema`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Unique project identifier (project name) |

**Request Headers:**
```
Accept: application/json
```

**Response Type:** `GraphSchemaResponse`

**Response Schema:**
```typescript
{
  success: boolean,                        // Request status
  data: GraphSchema,                       // Schema data
  error?: string                           // Error message (null if success)
}

// GraphSchema structure
GraphSchema = {
  categories: Category[],                  // Array of node categories
  relationships: Relationship[]            // Array of relationship types
}

// Category structure
Category = {
  name: string,                            // Category/label name
  props?: string[],                        // List of property names
  keys?: string[],                         // List of key property names
  keysTypes?: Record<string, SpannerType>, // Data types for key properties
  propsTypes?: Record<string, SpannerType> // Data types for all properties
}

// Relationship structure
Relationship = {
  name: string,                            // Relationship type name
  props?: string[],                        // List of property names
  keys?: string[],                         // List of key property names
  keysTypes?: Record<string, SpannerType>, // Data types for key properties
  propsTypes?: Record<string, SpannerType>,// Data types for all properties
  startCategory: string,                   // Source node category
  endCategory: string                      // Target node category
}

// SpannerType: "STRING" | "INT64" | "FLOAT64" | "BOOL" | "BYTES" | "DATE" | "TIMESTAMP" | "ARRAY" | "STRUCT" | "JSON"
```

**Response Example:**
**Response Example:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "Email",
        "props": ["id", "name"],
        "keys": ["id"],
        "keysTypes": {
          "id": "STRING"
        },
        "propsTypes": {
          "id": "STRING",
          "name": "STRING"
        }
      },
      {
        "name": "Client",
        "props": ["id", "is_fraud", "name"],
        "keys": ["id"],
        "keysTypes": {
          "id": "STRING"
        },
        "propsTypes": {
          "id": "STRING",
          "is_fraud": "BOOL",
          "name": "STRING"
        }
      }
    ],
    "relationships": [
      {
        "name": "HAS_EMAIL",
        "props": ["client_id", "email_id"],
        "keys": ["client_id", "email_id"],
        "keysTypes": {
          "client_id": "STRING",
          "email_id": "STRING"
        },
        "propsTypes": {
          "client_id": "STRING",
          "email_id": "STRING"
        },
        "startCategory": "Client",
        "endCategory": "Email"
      }
    ]
  },
  "error": null
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Project not found
- `400 Bad Request` - Invalid project type
- `500 Internal Server Error` - Server error

---

## 4. Table Schema (Optional)

Retrieve the underlying Spanner table schema information.

**Endpoint:** `GET /api/spanner/{project_id}/schema`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Unique project identifier (project name) |

**Request Headers:**
```
Accept: application/json
```

**Response Type:** `SchemaResponse`

**Response Schema:**
```typescript
{
  success: boolean,                        // Request status
  data?: Record<string, Record<string, string>>,  // Table schemas (null if error)
  error?: string                           // Error message (null if success)
}

// Data structure: Map of table names to column definitions
// Key: Table name
// Value: Map of column names to Spanner type definitions
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "Bank": {
      "id": "STRING(36)",
      "name": "STRING(255)"
    },
    "Client": {
      "id": "STRING(36)",
      "email": "STRING(255)",
      "is_fraud": "BOOL",
      "name": "STRING(255)",
      "phone_number": "STRING(255)",
      "ssn": "STRING(255)"
    }
  },
  "error": null
}
```

---

## Data Type Definitions

### DatabaseType Enum
```typescript
type DatabaseType = "spanner" | "postgresql" | "mysql" | "mongodb";
```

### AuthType Enum
```typescript
type AuthType = "oauth2" | "service_account" | "username_password";
```

### Spanner Data Types
Common Spanner data types you'll encounter in schemas:

| Type | Description | Example |
|------|-------------|---------|
| `STRING(n)` | Variable-length string with max length n | `"STRING(255)"` |
| `INT64` | 64-bit signed integer | `42` |
| `FLOAT64` | 64-bit floating point | `3.14159` |
| `BOOL` | Boolean value | `true` or `false` |
| `BYTES(n)` | Variable-length byte array | `b"data"` |
| `DATE` | Calendar date | `"2024-01-19"` |
| `TIMESTAMP` | Timestamp with timezone | `"2024-01-19T01:09:09Z"` |
| `ARRAY<T>` | Array of type T | `[1, 2, 3]` |
| `JSON` | JSON document | `{"key": "value"}` |

---

## Error Handling

All endpoints follow a consistent error response format:

**Error Response Schema:**
```typescript
{
  success: false,
  data?: null,
  error: string                            // Error description
}
```

**Common Error Responses:**

**404 Not Found:**
```json
{
  "detail": "Project not found"
}
```

**400 Bad Request:**
```json
{
  "detail": "Project database type spanner does not match requested type postgresql"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Failed to connect to database: [error details]"
}
```

---

## Usage Examples

### Example 1: Get API Info
```bash
curl -X GET "http://localhost:9080/api/spanner/my_project" \
  -H "Accept: application/json"
```

### Example 2: Execute Query
```bash
curl -X POST "http://localhost:9080/api/spanner/my_project/query" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "query": "MATCH (c:Client) RETURN c LIMIT 10"
  }'
```

### Example 3: Get Graph Schema
```bash
curl -X GET "http://localhost:9080/api/spanner/my_project/graphSchema" \
  -H "Accept: application/json"
```

### Example 4: Get Table Schema
```bash
curl -X GET "http://localhost:9080/api/spanner/my_project/schema" \
  -H "Accept: application/json"
```

---

## Best Practices

1. **Query Performance**
   - Use `LIMIT` clauses to restrict result set size
   - Monitor `execution_time` field for query optimization
   - Use query parameters to prevent injection attacks

2. **Error Handling**
   - Always check the `success` field before processing `data`
   - Log `execution_time` for performance monitoring
   - Handle network timeouts gracefully

3. **Schema Caching**
   - Cache `graphSchema` and `schema` responses to reduce API calls
   - Refresh schema cache when database structure changes

4. **Authentication**
   - Ensure OAuth tokens are refreshed before expiration
   - Store credentials securely
   - Use service accounts for server-to-server communication

---

## Notes

- Replace `{project_id}` with your actual project name (e.g., `spanner_demo`)
- All timestamps are in ISO 8601 format with UTC timezone
- Node and relationship IDs are base64-encoded compound keys
- The `parameters` field in query requests supports parameterized queries
- Graph queries return results in Neo4j-compatible format