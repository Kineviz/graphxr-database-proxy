# GraphXR 数据库代理

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)

> **语言**: [English](README.md) | [中文](README.zh.md)

一个安全的中间件，采用零信任架构将 [GraphXR 前端](https://www.kineviz.com/graphxr) 连接到各种后端数据库。

## 🚀 特性

- **零信任安全**: 在代理层进行严格的身份验证和授权
- **直接浏览器连接**: 通过 REST/GraphQL API 实现高效的数据访问
- **多数据库支持**: 支持 Spanner、Neo4j、PostgreSQL、MongoDB 等
- **开源**: 完全可审计和可定制
- **纯 Python**: 易于部署和维护



## 🛠️ 快速开始

### 安装

```bash
# 从 PyPI 安装
pip install graphxr-database-proxy[ui]

# 或从源码安装
git clone https://github.com/Kineviz/graphxr-database-proxy.git
cd graphxr-database-proxy
pip install -e .[ui]
```

### 配置和运行

**方式 1: Web UI（推荐）**
```bash
graphxr-proxy --ui
# 打开 http://localhost:8080/admin 进行配置
```

**方式 2: 环境变量**
```bash
export GRAPHXR_SPANNER_PROJECT_ID=your-project-id
export GRAPHXR_SPANNER_INSTANCE_ID=your-instance
export GOOGLE_OAUTH_CLIENT_ID=your-client-id
graphxr-proxy
```

**方式 3: Python 代码**
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