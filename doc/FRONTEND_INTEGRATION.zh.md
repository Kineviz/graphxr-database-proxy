# 前端文件集成指南

GraphXR Database Proxy 支持将前端文件打包到 Python 包中，这样安装包后就能直接访问完整的 Web UI。

## 🏗️ 构建流程

### 1. 前端构建和打包

```bash
# 构建前端并复制到 Python 包
python scripts/build_frontend.py

# 构建完整包（包含前端）
python scripts/publish.py build
```

### 2. 自动化构建

发布脚本会自动处理前端构建：

```bash
# 发布到 TestPyPI（包含前端构建）
python scripts/publish.py test

# 发布到 PyPI（包含前端构建）
python scripts/publish.py prod
```

## 📁 文件结构

### 开发时
```
frontend/
├── src/           # 前端源码
├── dist/          # 前端构建输出
└── package.json

src/graphxr_database_proxy/
├── static/        # 复制的前端文件（构建时生成）
└── main.py        # FastAPI 应用
```

### 发布后
```
graphxr_database_proxy/
├── static/        # 打包的前端文件
│   ├── index.html
│   ├── main.js
│   ├── vendors.js
│   └── ...
└── main.py
```

## 🚀 使用方式

### 作为包使用

```python
from graphxr_database_proxy import DatabaseProxy
from graphxr_database_proxy.main import app

# 创建代理
proxy = DatabaseProxy()

# 启动服务（包含 Web UI）
proxy.start()
```

### 命令行使用

```bash
# 安装包
pip install graphxr-database-proxy

# 启动服务（包含 Web UI）
graphxr-proxy --host 0.0.0.0 --port 9080
```

访问 http://localhost:9080 查看 Web UI。

## 🔧 静态文件服务

FastAPI 应用会自动检测静态文件位置：

1. **生产环境**: 使用包内的 `static/` 目录
2. **开发环境**: 使用 `frontend/dist/` 目录
3. **回退**: 显示提示信息

### 代码示例

```python
# main.py 中的静态文件配置
static_dir = Path(__file__).parent / "static"
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"

# 优先使用打包的静态文件
if static_dir.exists() and any(static_dir.iterdir()):
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        index_file = static_dir / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
```

## 🧪 测试验证

```bash
# 测试包的完整性（包括静态文件）
python scripts/test_package.py
```

测试会验证：
- ✅ 静态文件是否正确包含
- ✅ FastAPI 应用是否正常工作
- ✅ 路由是否正确配置

## 📦 包配置

### pyproject.toml
```toml
[tool.setuptools.package-data]
"graphxr_database_proxy" = ["static/*", "static/**/*"]
```

### MANIFEST.in
```
# 包含静态文件
recursive-include src/graphxr_database_proxy/static *
```

## 🔄 开发工作流

1. **开发前端**
   ```bash
   cd frontend
   npm run dev  # 开发模式
   ```

2. **构建前端**
   ```bash
   python scripts/build_frontend.py
   ```

3. **测试完整包**
   ```bash
   python scripts/publish.py build
   python scripts/test_package.py
   ```

4. **发布**
   ```bash
   python scripts/publish.py test   # 测试发布
   python scripts/publish.py prod   # 正式发布
   ```

## 📝 注意事项

1. **文件大小**: 包含前端后，包大小会增加到约 1.7MB
2. **构建依赖**: 需要 Node.js 环境来构建前端
3. **版本同步**: 前端和后端版本需要保持同步
4. **缓存清理**: 构建前会自动清理旧的静态文件

## 🆘 故障排除

### 前端文件缺失
```bash
# 重新构建前端
python scripts/build_frontend.py
```

### 包大小异常
```bash
# 检查包内容
python -m zipfile -l dist/graphxr_database_proxy-*.whl | grep static
```

### 静态文件访问失败
```bash
# 测试包完整性
python scripts/test_package.py
```