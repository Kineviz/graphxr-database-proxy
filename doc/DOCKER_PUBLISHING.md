# Docker Image Publishing Guide
This document describes how to build and publish Docker images to Docker Hub.

> **Language**: [English](DOCKER_PUBLISHING.md) | [中文](DOCKER_PUBLISHING.zh.md)

[Back to Development Guide](DEV_GUIDE.md)

## Prerequisites
- Docker is installed.
- Docker Hub account has been created.
- Logged in to Docker Hub: `docker login`

## Build and Publish Docker Image

```bash
# Automated script that includes source code build, docker image build and publish
./docker/publish release
```
