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

### DatabaseProxy 类方法

```python
from graphxr_database_proxy import DatabaseProxy

proxy = DatabaseProxy()

```
#### `add_project()` (推荐) 

```python
# 使用 JSON 字符串
service_account_json = 
{
    "type": "service_account",
    "project_id": "your-gcp-project-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
    "client_email": "your-service-account@your-gcp-project-id.iam.gserviceaccount.com",
    ...
}

project_id = proxy.add_project(
    project_name="项目名称",
    database_type="spanner",
    project_id="gcp-project-id", 
    instance_id="spanner-instance-id",
    database_id="spanner-database-id",
    credentials=service_account_json,  # JSON 字符串
    graph_name="图名称"  # 可选
)
```


#### `get_project_apis()` (增强版)
```python
# 获取所有项目的 API 端点
all_apis = proxy.get_project_apis()

# 通过项目名称获取特定项目的 API 端点 (新功能)
project_apis = proxy.get_project_apis("项目名称")
# 错误处理
result = proxy.get_project_apis("不存在的项目")
if "error" in result:
    print(f"项目未找到: {result['error']}")
else:
    print(f"找到项目: {result['name']}")
```

#### `start()`
```python
proxy.start(
    host="0.0.0.0",      # 绑定主机
    port=3002,           # 绑定端口
    dev=False,           # 开发模式（热重载）
    show_apis=True       # 显示 API 端点信息
)
```

### 示例文件

- `examples/quick_start.py` - 快速启动示例
- `examples/service-account-example.json` - Service Account JSON 文件模板

### 环境变量支持

支持以下环境变量来配置默认值：

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `PROJECT_NAME` | 默认项目名称 | `MySpannerProject` |
| `SPANNER_PROJECT_ID` | 默认 GCP 项目 ID | `your-gcp-project-id` |
| `SPANNER_INSTANCE_ID` | 默认 Spanner 实例 ID | `your-spanner-instance-id` |
| `SPANNER_DATABASE_ID` | 默认 Spanner 数据库 ID | `your-database-id` |
| `SPANNER_CREDENTIALS_PATH` | 默认服务账户 JSON 路径 | `./service-account.json` |
| `SPANNER_GRAPH_NAME` | 默认图名称 | `my_graph` |

```python
# 使用环境变量，无需任何参数
proxy = DatabaseProxy()
project_id = proxy.add_project()
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