# GraphXR Database Proxy - User Guide

> **Language**: [English](https://github.com/Kineviz/graphxr-database-proxy/blob/main/doc/USAGE.md) | [中文](https://github.com/Kineviz/graphxr-database-proxy/blob/main/doc/USAGE.zh.md)

## 🚀 Quick Start

### Installation and Startup
1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   cd frontend && npm install
   ```

2. **Start the Service**:
   ```bash
   # Start backend service
   python -m uvicorn src.graphxr_database_proxy.main:app --reload --port 9080

   # Start frontend development server
   cd frontend && npm start
   ```

3. **Access the Application**:
   Open your browser and navigate to `http://localhost:3002`

## 📋 Project Management

### Creating a New Project
1. Click the "Add Project" button
2. Fill in basic information:
   - **Project Name**: Display name for the project
   - **Database Type**: Currently supports `spanner`
   - **Database Configuration**: Connection parameters

### Project Configuration Options

#### Google Cloud Spanner
**Basic Configuration**:
- **Project ID**: Google Cloud project ID
- **Instance ID**: Spanner instance name
- **Database ID**: Target database name

**Authentication Methods**:
- **OAuth2**: User-based authentication
- **Service Account**: Machine-to-machine authentication

### Editing Projects
1. Click the edit icon next to the project name
2. Modify configuration parameters
3. Save changes - the system will validate connectivity

### Deleting Projects
1. Select the project to delete
2. Click the delete button
3. Confirm the deletion


## 🎯 GraphXR Integration

### Data Schema Mapping
The proxy service automatically converts database schemas to GraphXR-compatible formats:

**Nodes**: Represent database tables
**Edges**: Represent foreign key relationships
**Properties**: Represent table columns

### Sample Data Export
The system provides sample data in formats compatible with GraphXR:
- **JSON format**: Direct import into GraphXR
- **Relationship mapping**: Automatic edge creation based on foreign keys
- **Type conversion**: Database types mapped to GraphXR property types

## 🔐 Security Configuration

### API Key Authentication (Optional)

The proxy supports optional API key authentication to protect all API endpoints. When enabled, clients must include a valid API key in their requests.

#### Enabling API Key Authentication

Set the `API_KEY` environment variable to enable authentication:

```bash
# Set API key via environment variable
export API_KEY=your-secure-api-key-here

# Start the server
python -m uvicorn src.graphxr_database_proxy.main:app --port 9080
```

Or in a `.env` file:
```
API_KEY=your-secure-api-key-here
```

#### Making Authenticated Requests

When API key authentication is enabled, include the `X-API-Key` header in all API requests:

```bash
# Example: List projects
curl -H "X-API-Key: your-secure-api-key-here" \
  http://localhost:9080/api/project/list

# Example: Execute a query
curl -X POST \
  -H "X-API-Key: your-secure-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM table"}' \
  http://localhost:9080/api/spanner/my-project/query
```

#### Protected vs Public Endpoints

| Endpoint | Protected | Description |
|----------|-----------|-------------|
| `/api/project/*` | Yes | Project management |
| `/api/{db_type}/{project}/*` | Yes | Database operations |
| `/api/google/*` | Yes | Google Cloud operations |
| `/google/spanner/login` | No | OAuth login flow |
| `/google/spanner/callback` | No | OAuth callback |
| `/health` | No | Health check |
| `/docs`, `/redoc` | No | API documentation |

#### Disabling Authentication

To disable API key authentication, simply leave the `API_KEY` environment variable unset or empty. All endpoints will be accessible without authentication.

### Database Authentication Setup

#### Using Google Credentials File
1. **Create OAuth2 Client in Google Cloud Console**:
   - Visit [Google Cloud Console](https://console.cloud.google.com)
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Select "Desktop application"
   - Download the credentials file

2. **Create Project with Credentials File**:
   - Click "From Google Credentials" button in the web interface
   - Upload the downloaded `credentials.json` file
   - System will automatically populate `client_id`, `client_secret`, `project_id` fields
   - Fill in Spanner instance and database information

3. **Example Credentials File Format**:
   ```json
   {
     "installed": {
       "client_id": "your-client-id.apps.googleusercontent.com",
       "project_id": "your-gcp-project",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
       "client_secret": "your-client-secret",
       "redirect_uris": ["http://localhost"]
     }
   }
   ```

### Manual OAuth2 Setup
1. Create OAuth2 client in Google Cloud Console
2. Add redirect URI: `http://localhost:9080/google/spanner/callback`
3. Configure scope: `https://www.googleapis.com/auth/spanner.data`

### Service Account Setup
1. Create service account
2. Grant Spanner access permissions
3. Download JSON key file
4. Specify file path in project configuration

## 🛠️ Development Guide

### Project Structure
```
graphxr-database-proxy/
├── src/
│   └── graphxr_database_proxy/
│       ├── main.py          # FastAPI application
│       ├── api/             # API routes
│       ├── drivers/         # Database drivers
│       └── models/          # Data models
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   └── types/           # TypeScript types
│   ├── webpack.config.js    # Webpack configuration
│   └── package.json         # Frontend dependencies
└── config
   └── projects.json         # Project configuration storage
```

### Adding New Database Types
1. Create new driver in `src/drivers/`
2. Inherit from `BaseDatabaseDriver` class
3. Implement required methods
4. Register new driver in `api/database.py`

### Frontend Development
- Use TypeScript for type-safe development
- Ant Design provides consistent UI experience
- Webpack hot reload speeds up development process
- API service layer manages backend interactions uniformly

## 📊 Monitoring and Logging

### Health Checks
- `GET /health` - Server health status

### API Documentation
- `GET /docs` - Swagger UI documentation
- `GET /redoc` - ReDoc documentation

## 🔄 Deployment Guide

### Production Deployment
1. Build frontend: `cd frontend && npm run build`
2. Start server: `python -m uvicorn src.graphxr_database_proxy.main:app --host 0.0.0.0 --port 9080`
3. Configure reverse proxy (e.g., Nginx)

### Docker Deployment
```bash
# Build image
docker build -t kineviz/graphxr-database-proxy .

# Run container
docker run -p 9080:9080 \
  -v $(pwd)/config:/app/config \
  kineviz/graphxr-database-proxy:latest
```

Or Script:
```bash
./docker/publish.sh release
``` 

## 🆘 Troubleshooting

### Common Issues
1. **Connection Failed**: Check database configuration and network connectivity
2. **Authentication Error**: Verify OAuth2 or service account configuration
3. **Frontend Access Issues**: Ensure backend server is running

### Log Viewing
```bash
# View server logs
python -m uvicorn src.graphxr_database_proxy.main:app --log-level debug
```