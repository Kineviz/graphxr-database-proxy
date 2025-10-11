#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
构建前端并复制到 Python 包的静态文件目录
"""

import shutil
import subprocess
import sys
from pathlib import Path

# 设置控制台编码
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

def run_command(command, description, cwd=None):
    """运行命令并检查结果"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            cwd=cwd, 
            capture_output=True, 
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
    except Exception as e:
        print(f"❌ {description} 失败: {e}")
        return False
    
    if result.returncode != 0:
        print(f"❌ {description} 失败:")
        if result.stderr:
            print(result.stderr)
        return False
    
    print(f"✅ {description} 成功")
    return True

def build_frontend():
    """构建前端项目"""
    frontend_dir = Path("frontend")
    
    if not frontend_dir.exists():
        print("❌ frontend 目录不存在")
        return False
    
    # 检查是否有 node_modules
    if not (frontend_dir / "node_modules").exists():
        print("📦 安装前端依赖...")
        if not run_command("npm install", "安装前端依赖", cwd=frontend_dir):
            return False
    
    # 构建前端
    if not run_command("npm run build", "构建前端", cwd=frontend_dir):
        return False
    
    return True

def copy_frontend_dist():
    """复制前端构建文件到 Python 包目录"""
    frontend_dist = Path("frontend/dist")
    static_dir = Path("src/graphxr_database_proxy/static")
    
    if not frontend_dist.exists():
        print("❌ frontend/dist 目录不存在，请先构建前端")
        return False
    
    # 清理并创建静态文件目录
    if static_dir.exists():
        shutil.rmtree(static_dir)
        print("🗑️  清理旧的静态文件")
    
    static_dir.mkdir(parents=True, exist_ok=True)
    
    # 复制所有前端文件
    try:
        for item in frontend_dist.iterdir():
            if item.is_file():
                shutil.copy2(item, static_dir)
                print(f"📄 复制文件: {item.name}")
            elif item.is_dir():
                shutil.copytree(item, static_dir / item.name)
                print(f"📁 复制目录: {item.name}")
        
        print(f"✅ 前端文件已复制到 {static_dir}")
        return True
        
    except Exception as e:
        print(f"❌ 复制前端文件失败: {e}")
        return False

def list_static_files():
    """列出静态文件"""
    static_dir = Path("src/graphxr_database_proxy/static")
    
    if not static_dir.exists():
        print("❌ 静态文件目录不存在")
        return
    
    print("\n📁 静态文件列表:")
    for item in static_dir.rglob("*"):
        if item.is_file():
            size = item.stat().st_size / 1024  # KB
            relative_path = item.relative_to(static_dir)
            print(f"   📄 {relative_path} ({size:.1f} KB)")

def main():
    print("🏗️ GraphXR Database Proxy 前端构建工具")
    print("=" * 50)
    
    # 检查是否在项目根目录
    if not Path("pyproject.toml").exists():
        print("❌ 请在项目根目录运行此脚本")
        sys.exit(1)
    
    # 构建前端
    if not build_frontend():
        print("❌ 前端构建失败")
        sys.exit(1)
    
    # 复制前端文件
    if not copy_frontend_dist():
        print("❌ 复制前端文件失败")
        sys.exit(1)
    
    # 列出静态文件
    list_static_files()
    
    print("\n✨ 前端构建和复制完成!")
    print("💡 现在可以运行 'python scripts/publish.py build' 来构建包")

if __name__ == "__main__":
    main()