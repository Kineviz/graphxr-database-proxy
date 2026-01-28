# GraphXR 数据库代理

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)

> **语言**: [English](https://github.com/Kineviz/graphxr-database-proxy/blob/main/readme.md) | [中文](https://github.com/Kineviz/graphxr-database-proxy/blob/main/readme.zh.md)

一个安全的中间件，采用零信任架构将 [GraphXR 前端](https://www.kineviz.com/graphxr) 连接到各种后端数据库。

## 🚀 特性

- **零信任安全**: 在代理层进行严格的身份验证和授权
- **直接浏览器连接**: 通过 REST API 实现高效的数据访问
- **多数据库支持**: 目前支持 Spanner Graph，计划支持 Neo4j、Nebula、Gremlin 等更多图数据库
- **开源**: 完全可审计和可定制
- **纯 Python**: 易于部署和维护



## 🛠️ 快速开始

### 安装

从 PyPI 安装
```bash
pip install graphxr-database-proxy[ui]
```

或从源码安装
```bash
git clone https://github.com/Kineviz/graphxr-database-proxy.git
cd graphxr-database-proxy
uv venv
source .venv/bin/activate # or .venv/bin/activate on Windows
uv pip install -e ".[ui]"
uv pip install -r requirements.txt
cd frontend && npm install && npm run build && cd -
pip install -e .[ui]
```

### 配置和运行

**Web UI（推荐）** 

```bash
graphxr-proxy --ui
```

> 打开 http://localhost:8080/admin 进行配置 



## 📚 Python 使用指南

**方式 1：Web UI（推荐）**
```bash
graphxr-proxy --ui
```
> 打开 http://localhost:9080/admin 进行配置

**方式 2：使用服务账号 JSON 的 Python 代码**
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
    graph_name="graph_name"  # 可选
)

proxy.start(
    host="0.0.0.0",     
    port=9080,          
    show_apis=True     
)
```

**方式 3：使用 Google Cloud ADC 的 Python 代码**
> 您需要在运行代理的机器上设置 Google Application Default Credentials (ADC)。请参阅 [Google Cloud ADC 文档](https://cloud.google.com/docs/authentication/production#automatically)。

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
    graph_name="graph_name"  # 可选
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
> 你可以在启动容器后，访问 http://localhost:9080/admin 进行配置


## 🤝 贡献

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

- 🐛 [问题跟踪](https://github.com/Kineviz/graphxr-database-proxy/issues)
- 📧 邮箱: support@kineviz.com

---

**由 [Kineviz](https://www.kineviz.com) 用 ❤️ 构建**