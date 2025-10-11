# Development Environment Guide

> **Language**: [English](https://github.com/Kineviz/graphxr-database-proxy/blob/main/doc/DEV_GUIDE.md) | [中文](https://github.com/Kineviz/graphxr-database-proxy/blob/main/doc/DEV_GUIDE.zh.md)

## 🚀 Quick Start

### One-Click Development Environment
```bash
npm run dev            # Start both frontend and backend (recommended)
```
This command will start:
- **Backend Server** (Python FastAPI): http://localhost:9080
- **Frontend Development Server** (React): http://localhost:3002

### Start Services Separately
```bash
npm run dev:backend    # Start backend only
npm run dev:frontend   # Start frontend only
```


## 🔧 Development Environment Features

### Hot Reload
- **Python Code Changes**: Backend server automatically restarts
- **React Component Changes**: Browser automatically refreshes, maintains state
- **Configuration File Changes**: Automatically detects and restarts appropriate services

### Monitored File Types
- **Backend**: `.py`, `.json`, `.toml`, `.txt` files
- **Frontend**: `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.scss` files

### Port Configuration
- **Backend API**: 9080
- **Frontend Development Server**: 3002 (automatically proxies API to 9080)
- **API Documentation**: http://localhost:9080/docs

## 🐛 Development Debugging

### View Logs
Development environment displays detailed log information:
- **Backend Logs**: uvicorn + FastAPI request logs
- **Frontend Logs**: webpack build and hot reload logs

### Restart Services
In the nodemon console, type `rs` to manually restart the backend service.

### Common Issues
1. **Port Conflict**: Ensure ports 9080 and 3002 are not occupied by other programs
2. **Virtual Environment**: Ensure `.venv` directory exists and contains correct Python environment
3. **Dependency Installation**: Run `npm install` to ensure all dependencies are installed

## 📁 Project Structure
```
├── src/                    # Python backend source code
├── frontend/               # React frontend source code
├── config/                 # Configuration files
├── nodemon.json           # nodemon configuration
└── package.json           # npm scripts and dependencies
```