# 开发环境指南

> **Language**: [English](https://github.com/Kineviz/graphxr-database-proxy/blob/main/doc/DEV_GUIDE.md) | [中文](https://github.com/Kineviz/graphxr-database-proxy/blob/main/doc/DEV_GUIDE.zh.md)

## Prerequisites

- **Node.js** >= 22.x — [点击这里下载](https://nodejs.org/en/download/)
- **Python** >= 3.9.x — [点击这里下载](https://www.python.org/downloads/)
- **uv** >= 0.9.x — [安装指南](https://docs.astral.sh/uv/)


## 🚀 快速开始

### 一键启动开发环境

```bash
git clone https://github.com/Kineviz/graphxr-database-proxy.git
cd graphxr-database-proxy
uv venv
uv pip install -r requirements.txt
npm run dev            # 同时启动前后端 (推荐)
```

这个命令会同时启动：

- **后端服务器** (Python FastAPI): http://localhost:9080
- **前端开发服务器** (React): http://localhost:3002

### 分别启动服务

```bash
npm run dev:backend    # 只启动后端
npm run dev:frontend   # 只启动前端
```


## 🔧 开发环境特性

### 热重载 (Hot Reload)
- **Python 代码修改**: 后端服务器自动重启
- **React 组件修改**: 浏览器自动刷新，保持状态
- **配置文件修改**: 自动检测并重启相应服务

### 监控的文件类型
- **后端**: `.py`, `.json`, `.toml`, `.txt` 文件
- **前端**: `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.scss` 文件

### 端口配置
- **后端 API**: 9080
- **前端开发服务器**: 3002 (自动代理API到9080)
- **API 文档**: http://localhost:9080/docs

## 🐛 开发调试

### 查看日志
开发环境会显示详细的日志信息：
- **后端日志**: uvicorn + FastAPI 请求日志
- **前端日志**: webpack 构建和热重载日志

### 重启服务
在nodemon控制台输入 `rs` 可以手动重启后端服务。

### 常见问题
1. **端口占用**: 确保9080和3002端口没有被其他程序占用
2. **虚拟环境**: 确保`.venv`目录存在且包含正确的Python环境
3. **依赖安装**: 运行`npm install`确保所有依赖已安装

## 📁 项目结构
```
├── src/                    # Python 后端源码
├── frontend/               # React 前端源码
├── config/                 # 配置文件
├── nodemon.json           # nodemon 配置
└── package.json           # npm 脚本和依赖
```