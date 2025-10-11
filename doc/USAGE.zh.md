# GraphXR Database Proxy - 使用指南

> **语言**: [English](https://github.com/Kineviz/graphxr-database-proxy/blob/main/doc/USAGE.md) | [中文](https://github.com/Kineviz/graphxr-database-proxy/blob/main/doc/USAGE.zh.md)

## 🚀 快速启动

### 1. 启动完整开发环境

#### 后端 API 服务器
```bash
# 在项目根目录
python -m uvicorn src.graphxr_database_proxy.main:app --reload --port 9080
```
服务器运行在: http://localhost:9080

#### 前端开发服务器 (可选，用于开发)
```bash
# 在 frontend 目录
cd frontend
npm install
npm run dev
```
开发服务器运行在: http://localhost:3002 (带热重载)

### 2. 访问 Web 界面

- **生产界面**: http://localhost:9080 (后端直接服务前端)
- **开发界面**: http://localhost:3002 (前端开发服务器，带热重载)

## 💼 项目管理功能

### 创建新项目
1. 点击 "Add Project" 按钮
2. 填写项目基本信息：
   - 项目名称
   - 描述
   - 数据库类型（目前支持 Google Cloud Spanner）

### 数据库配置
3. 选择认证方式：
   - **OAuth2**: 适用于开发和测试环境
   - **Service Account**: 适用于生产环境

4. OAuth2 配置：
   ```json
   {
     "client_id": "your-client-id.apps.googleusercontent.com",
     "client_secret": "your-client-secret",
     "redirect_uri": "http://localhost:9080/google/spanner/callback"
   }
   ```

5. Service Account 配置：
   - 上传服务账号 JSON 文件路径

### 连接测试
- 点击 "Test Connection" 验证数据库连接
- 查看连接状态和响应时间

### API URL 生成
- 点击 "API URLs" 获取 GraphXR 集成链接
- 一键复制到剪贴板


## 🎯 GraphXR 集成

### 配置 GraphXR 连接
1. 在 GraphXR 中添加新的数据源
2. 使用生成的 API URL: `http://localhost:9080/api/spanner/{project_id}`
3. 配置认证头（如果需要）

### 示例查询
```sql
-- Property Graph 查询
GRAPH example_graph
MATCH (n)-[r]->(m)
RETURN n, r, m
LIMIT 100

-- SQL 查询
SELECT * FROM users LIMIT 10
```

## 🔐 安全配置

### 使用 Google OAuth 凭据文件（推荐）

1. **在 Google Cloud Console 创建 OAuth2 客户端**：
   - 访问 [Google Cloud Console](https://console.cloud.google.com)
   - 进入 "APIs & Services" > "Credentials"
   - 点击 "Create Credentials" > "OAuth 2.0 Client IDs"
   - 选择 "Desktop application"
   - 下载凭据文件

2. **使用凭据文件创建项目**：
   - 在 Web 界面点击 "From Google Credentials" 按钮
   - 上传下载的 `credentials.json` 文件
   - 系统会自动填充 `client_id`, `client_secret`, `project_id` 等信息
   - 填写 Spanner 实例和数据库信息

3. **示例凭据文件格式**：
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

### OAuth2 手动设置
1. 在 Google Cloud Console 创建 OAuth2 客户端
2. 添加重定向 URI: `http://localhost:9080/google/spanner/callback`
3. 配置作用域: `https://www.googleapis.com/auth/spanner.data`

### Service Account 设置
1. 创建服务账号
2. 授予 Spanner 访问权限
3. 下载 JSON 密钥文件
4. 在项目配置中指定文件路径

## 🛠️ 开发说明

### 项目结构
```
graphxr-database-proxy/
├── src/
│   └── graphxr_database_proxy/
│       ├── main.py          # FastAPI 应用
│       ├── api/             # API 路由
│       ├── drivers/         # 数据库驱动
│       └── models/          # 数据模型
├── frontend/
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── services/        # API 服务
│   │   └── types/           # TypeScript 类型
│   ├── webpack.config.js    # Webpack 配置
│   └── package.json         # 前端依赖
└── config
   └── projects.json         #  项目配置存储
```

### 添加新数据库类型
1. 在 `src/drivers/` 创建新驱动
2. 继承 `BaseDatabaseDriver` 类
3. 实现必要的方法
4. 在 `api/database.py` 注册新驱动

### 前端开发
- 使用 TypeScript 进行类型安全开发
- Ant Design 提供一致的 UI 体验
- Webpack 热重载加速开发过程
- API 服务层统一管理后端交互

## 📊 监控和日志

### 健康检查
- `GET /health` - 服务器健康状态

### API 文档
- `GET /docs` - Swagger UI 文档
- `GET /redoc` - ReDoc 文档

## 🔄 部署说明

### 生产部署
1. 构建前端: `cd frontend && npm run build`
2. 启动服务器: `python -m uvicorn src.graphxr_database_proxy.main:app --host 0.0.0.0 --port 9080`
3. 配置反向代理（如 Nginx）

### Docker 部署
```bash
# 构建镜像
docker build -t kineviz/graphxr-database-proxy .

# 运行容器
docker run -p 9080:9080 \
  -v $(pwd)/config:/app/config \
  kineviz/graphxr-database-proxy:latest
```

或者脚本方式:
```bash
./docker/publish.sh release
```

## 🆘 故障排除

### 常见问题
1. **连接失败**: 检查数据库配置和网络连接
2. **认证错误**: 验证 OAuth2 或服务账号配置
3. **前端访问问题**: 确认后端服务器正在运行

### 日志查看
```bash
# 查看服务器日志
python -m uvicorn src.graphxr_database_proxy.main:app --log-level debug
```