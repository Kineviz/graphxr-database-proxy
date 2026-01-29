

# Docker image 发布指南
本文档介绍了如何构建和发布 Docker 镜像到 Docker Hub。

> **语言**: [English](DOCKER_PUBLISHING.md) | [中文](DOCKER_PUBLISHING.zh.md)


[返回开发指南](DEV_GUIDE.zh.md)


## 前提条件
- 已安装 Docker。
- 已创建 Docker Hub 账号。
- 已登录 Docker Hub：`docker login`

## 构建 Docker 镜像并发布

```bash
# 包含了源代码构建，docker 镜像构建和发布的自动化脚本
./docker/publish release
```
