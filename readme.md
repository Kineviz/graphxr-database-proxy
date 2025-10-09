# GraphXR Database Proxy

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)

> **Language**: [English](README.md) | [中文](README.zh.md)

A secure middleware that connects [GraphXR](https://www.kineviz.com/graphxr) to various backend databases with zero trust architecture.

## Features

- **Zero Trust Security**: Strict authentication and authorization at the proxy layer
- **Direct Browser Connectivity**: REST/GraphQL APIs for efficient data access
- **Multi-Database Support**: Spanner Graph, Neo4j, and more
- **Open Source**: Fully auditable and customizable
- **Pure Python**: Easy to deploy and maintain

## ⚡ Quick Start for Spanner Graph

1. Run the following commands to start graphxr-database-proxy (requires [uv](https://docs.astral.sh/uv/), [node.js](https://nodejs.org/en/download/))

    ```
    git clone https://github.com/Kineviz/graphxr-database-proxy.git
    cd graphxr-database-proxy
    uv venv
    source .venv/bin/activate # or .venv/bin/activate on Windows
    uv pip install -e ".[ui]"
    uv pip install -r requirements.txt
    cd frontend && npm install && npm run build && cd -
    graphxr-proxy --ui 
    ```

2. Visit http://localhost:9080/
3. Click "Create New Project"
4. Project Name: "Test"
5. Database Type: "Google Cloud Spanner"
6. Authentication Type: "Service Account"
7. Upload the credential file you exported from GCP Console or gcloud CLI.
8. Select "Instance ID" e.g. "demo"
9. Select "Database ID" e.g. "cymbal"
10. Select "Property Graph" e.g. "ECommerceGraph"
11. Click "Create"
12. For the new project, copy the API URL. e.g. "http://localhost:9080/api/spanner/Test"
13. Paste the API URL into GraphXR for a project with a "Database Proxy" database type.

## Other ways to start graphxr-database-proxy

### Install

```bash
# Install from PyPI
pip install graphxr-database-proxy[ui]

# Or from source
git clone https://github.com/Kineviz/graphxr-database-proxy.git
cd graphxr-database-proxy
pip install -e .[ui]
```

### Configure & Run

**Option 1: Web UI (Recommended)**
```bash
graphxr-proxy --ui
# Open http://localhost:8080/admin for configuration
```

**Option 2: Environment Variables**
```bash
export GRAPHXR_SPANNER_PROJECT_ID=your-project-id
export GRAPHXR_SPANNER_INSTANCE_ID=your-instance
export GOOGLE_OAUTH_CLIENT_ID=your-client-id
graphxr-proxy
```

**Option 3: Python Code**
```python
from graphxr_database_proxy import DatabaseProxy

proxy = DatabaseProxy()
proxy.add_database(
    name="spanner_main",
    type="spanner",
    project_id="your-project-id",
    auth_type="oauth2"
)
proxy.start(port=3002)
```

## 🐳 Docker

```bash
docker run -d -p 3002:3002 \
  -e GRAPHXR_SPANNER_PROJECT_ID=your-project-id \
  kineviz/graphxr-database-proxy:latest
```




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