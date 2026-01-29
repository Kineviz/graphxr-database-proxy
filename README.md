# GraphXR Database Proxy

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)

> **Language**: [English](https://github.com/Kineviz/graphxr-database-proxy/blob/main/readme.md) | [中文](https://github.com/Kineviz/graphxr-database-proxy/blob/main/readme.zh.md)

A secure middleware that connects [GraphXR](https://www.kineviz.com/graphxr) to various backend databases with zero trust architecture.

## Features

- **Zero Trust Security**: Strict authentication and authorization at the proxy layer
- **Direct Browser Connectivity**: REST/GraphQL APIs for efficient data access
- **Multi-Database Support**: Spanner Graph, Neo4j, and more
- **Open Source**: Fully auditable and customizable
- **Pure Python**: Easy to deploy and maintain

## ⚡ Quick Start (Spanner Graph)

1. Run the following commands to start graphxr-database-proxy (requires [uv](https://docs.astral.sh/uv/), [node.js](https://nodejs.org/en/download/))

```
git clone https://github.com/Kineviz/graphxr-database-proxy.git
cd graphxr-database-proxy
uv venv
uv pip install -r requirements.txt
npm run dev
```

2. Web UI should open automatically in your browser. Or visit http://localhost:8080/.
3. Click "Create New Project"
4. Project Name: "Test"
5. Database Type: "Google Cloud Spanner"
6. Authentication Type: "Service Account"
7. Upload the credential file you exported from GCP Console or gcloud CLI. [Export Instructions](https://github.com/Kineviz/try-graphxr-spannergraph#)
8. Select "Instance ID" e.g. "demo"
9. Select "Database ID" e.g. "cymbal"
10. Select "Property Graph" e.g. "ECommerceGraph"
11. Click "Create"
12. For the new project, under Actions, copy the API URL. e.g. "http://localhost:8080/api/spanner/Test"
13. Go back to GraphXR's Create Project wizard and paste the API URL into GraphXR for a project with a "Database Proxy" database type.

### Adding authentication to the proxy

```
cp .env.example .env
```

Edit the .env file and add the following variables:

```
# Optional: Set a password for the admin interface
ADMIN_PASSWORD=your-admin-password-here

# Optional: Set a secure API key for the proxy API
# You can also generate an API key in the Web UI under Settings.
API_KEY=your-secure-api-key-here
```

## Other ways to start graphxr-database-proxy

### Install

```bash
# Install from PyPI
pip install graphxr-database-proxy[ui]

# Or from source
git clone https://github.com/Kineviz/graphxr-database-proxy.git
cd graphxr-database-proxy
uv venv
source .venv/bin/activate # or .venv/bin/activate on Windows
uv pip install -e ".[ui]"
uv pip install -r requirements.txt
cd frontend && npm install && npm run build && cd -
pip install -e .[ui]
```

### Configure & Run

**Option 1: Web UI (Recommended)**
```bash
graphxr-proxy --ui
```
> Open http://localhost:9080/admin for configuration

**Option 2: Python Code with Service Account JSON**
```python
from graphxr_database_proxy import DatabaseProxy

proxy = DatabaseProxy()

service_account_json = {
    "type": "service_account",
    "project_id": "your-gcp-project-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
    "client_email": "your-service-account@your-gcp-project-id.iam.gserviceaccount.com",
    ...
}

project_id = proxy.add_project(
    project_name="project_name",
    database_type="spanner",
    project_id="gcp-project-id", 
    instance_id="spanner-instance-id",
    database_id="spanner-database-id",
    credentials=service_account_json,  
    graph_name="graph_name"  # Optional
)

proxy.start(
    host="0.0.0.0",     
    port=9080,          
    show_apis=True     
)
```

**Option 3: Python Code with Google Cloud ADC**
> Your should have set up Google Application Default Credentials (ADC) on the machine running the proxy. See [Google Cloud ADC Documentation](https://cloud.google.com/docs/authentication/production#automatically).

```python
from graphxr_database_proxy import DatabaseProxy
proxy = DatabaseProxy()

google_adc_credentials={
    "type": "google_ADC"
},  
 
project_id = proxy.add_project(
    project_name="project_name",
    database_type="spanner",
    project_id="gcp-project-id", 
    instance_id="spanner-instance-id",
    database_id="spanner-database-id",
    credentials=google_adc_credentials,  
    graph_name="graph_name"  # Optional
)

proxy.start(
    host="0.0.0.0",     
    port=9080,          
    show_apis=True     
)
```

## 🐳 Docker

```bash
docker run -d -p 9080:9080 \
--name graphxr-database-proxy \
-v ${HOME}/graphxr-database-proxy/config:/app/config \
kineviz/graphxr-database-proxy:latest
```
> You can visit http://localhost:9080/admin for configuration after starting the container.



## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 🐛 [Issue Tracker](https://github.com/Kineviz/graphxr-database-proxy/issues)
- 📧 Email: support@kineviz.com

---

**Built with ❤️ by [Kineviz](https://www.kineviz.com)**