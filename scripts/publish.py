#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GraphXR Database Proxy 自动化发布脚本

用法:
    python scripts/publish.py test    # 发布到 TestPyPI
    python scripts/publish.py prod    # 发布到 PyPI
    python scripts/publish.py build   # 仅构建验证
    python scripts/publish.py         # 交互式选择
"""

import subprocess
import sys
import os
import argparse
from pathlib import Path

# Windows 编码修复
if sys.platform == "win32":
    import codecs
    import locale
    
    # 设置环境变量解决 rich/twine 编码问题
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PYTHONUTF8'] = '1'
    
    # 修复控制台输出编码
    try:
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
    except:
        pass

def get_python_executable():
    """获取当前使用的 Python 解释器路径"""
    return sys.executable

def run_command(command, description):
    """运行命令并检查结果"""
    print(f"🔄 {description}...")
    
    # 如果命令包含 python，替换为当前的 Python 解释器
    if command.startswith("python "):
        command = command.replace("python ", f"{get_python_executable()} ", 1)
    elif command == "python -m build":
        command = f"{get_python_executable()} -m build"
    
    try:
        result = subprocess.run(
            command, 
            shell=True, 
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
    if result.stdout and result.stdout.strip():
        print(f"   输出: {result.stdout.strip()}")
    return True

def check_and_install_dependencies():
    """检查并安装发布依赖"""
    print("🔍 检查发布依赖...")
    
    # 检查并安装必要的 Python 包
    required_packages = ["build", "twine"]
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} 已安装")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ 缺少包: {package}")
    
    if missing_packages:
        print(f"\n📦 安装缺少的包: {', '.join(missing_packages)}")
        install_command = f"pip install {' '.join(missing_packages)}"
        
        # 询问是否自动安装
        auto_install = input("🤔 是否自动安装缺少的包? (y/n): ").lower().strip()
        if auto_install in ['y', 'yes', '是']:
            if not run_command(install_command, f"安装 {', '.join(missing_packages)}"):
                print("❌ 依赖安装失败，请手动安装:")
                print(f"   {install_command}")
                return False
        else:
            print("❌ 请手动安装缺少的包:")
            print(f"   {install_command}")
            return False
    
    print("✅ 所有依赖检查通过")
    return True

def check_requirements():
    """检查发布要求"""
    print("🔍 检查发布要求...")
    
    # 检查是否在正确的目录
    if not Path("pyproject.toml").exists():
        print("❌ 请在项目根目录运行此脚本")
        return False
    
    # 检查必要文件
    required_files = ["README.md", "LICENSE", "pyproject.toml"]
    for file in required_files:
        if not Path(file).exists():
            print(f"❌ 缺少文件: {file}")
            return False
    
    print("✅ 所有要求检查通过")
    return True

def get_version():
    """从 pyproject.toml 获取版本号"""
    try:
        with open("pyproject.toml", "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("version ="):
                    version = line.split("=")[1].strip().strip('"')
                    return version
    except Exception as e:
        print(f"❌ 无法读取版本号: {e}")
        return None

def clean_build():
    """清理构建文件"""
    import shutil
    
    dirs_to_clean = ["dist", "build"]
    for dir_name in dirs_to_clean:
        if Path(dir_name).exists():
            shutil.rmtree(dir_name)
            print(f"🗑️  删除目录: {dir_name}")
    
    # 清理 egg-info 目录
    for egg_info in Path(".").glob("*.egg-info"):
        shutil.rmtree(egg_info)
        print(f"🗑️  删除目录: {egg_info}")

def build_frontend():
    """构建前端并复制静态文件"""
    print("🏗️  构建前端...")
    
    # 运行前端构建脚本
    build_script = Path("scripts/build_frontend.py")
    if build_script.exists():
        return run_command(f"{get_python_executable()} scripts/build_frontend.py", "构建前端")
    else:
        print("⚠️  前端构建脚本不存在，跳过前端构建")
        return True

def build_package():
    """构建发布包"""
    return run_command("python -m build", "构建发布包")

def check_package():
    """检查包内容"""
    return run_command("twine check dist/*", "验证包内容")

def list_dist_files():
    """列出构建的文件"""
    print("\n📦 构建的文件:")
    dist_path = Path("dist")
    if dist_path.exists():
        for file in dist_path.iterdir():
            size = file.stat().st_size / 1024  # KB
            print(f"   📄 {file.name} ({size:.1f} KB)")

def upload_to_testpypi():
    """上传到 TestPyPI"""
    print("\n🧪 上传到 TestPyPI...")
    
    # 设置环境变量避免编码问题
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    env['PYTHONUTF8'] = '1'
    
    try:
        result = subprocess.run(
            f"{get_python_executable()} -m twine upload --repository testpypi dist/*",
            shell=True,
            env=env,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        return result.returncode == 0
    except Exception as e:
        print(f"❌ 上传失败: {e}")
        return False

def upload_to_pypi():
    """上传到 PyPI"""
    print("\n🚀 上传到 PyPI...")
    
    # 设置环境变量避免编码问题
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    env['PYTHONUTF8'] = '1'
    
    try:
        result = subprocess.run(
            f"{get_python_executable()} -m twine upload dist/*",
            shell=True,
            env=env,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        return result.returncode == 0
    except Exception as e:
        print(f"❌ 上传失败: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="发布 GraphXR Database Proxy 到 PyPI")
    parser.add_argument("target", nargs="?", choices=["test", "prod", "build"], 
                       help="发布目标: test (TestPyPI)、prod (PyPI) 或 build (仅构建验证)")
    args = parser.parse_args()
    
    print("🚀 GraphXR Database Proxy 发布工具")
    print("=" * 50)
    
    # 检查并安装依赖
    if not check_and_install_dependencies():
        sys.exit(1)
    
    # 检查要求
    if not check_requirements():
        sys.exit(1)
    
    # 显示当前版本
    version = get_version()
    if version:
        print(f"📋 当前版本: {version}")
    else:
        print("❌ 无法获取版本号")
        sys.exit(1)
    
    # 清理构建文件
    print("\n🧹 清理构建文件...")
    clean_build()
    
    # 构建前端
    if not build_frontend():
        sys.exit(1)
    
    # 构建包
    if not build_package():
        sys.exit(1)
    
    # 检查包
    if not check_package():
        sys.exit(1)
    
    # 列出构建的文件
    list_dist_files()
    
    # 确定发布目标
    target = args.target
    if not target:
        print("\n📋 选择操作:")
        print("   1. build - 仅构建和验证包")
        print("   2. test  - TestPyPI (测试)")
        print("   3. prod  - PyPI (正式)")
        choice = input("请选择 (1/2/3): ").strip()
        if choice == "1":
            target = "build"
        elif choice == "2":
            target = "test"
        elif choice == "3":
            target = "prod"
        else:
            target = None
    
    if target == "build":
        print(f"\n✅ 包构建和验证完成!")
        print(f"📦 构建文件位于 dist/ 目录")
        print(f"🔍 你可以检查以下文件:")
        for file in Path("dist").iterdir():
            print(f"   📄 {file.name}")
        print(f"\n💡 下一步:")
        print(f"   - 运行 'python scripts/publish.py test' 发布到 TestPyPI")
        print(f"   - 运行 'python scripts/publish.py prod' 发布到 PyPI")
        
    elif target == "test":
        print(f"\n🧪 准备发布到 TestPyPI...")
        if upload_to_testpypi():
            print(f"\n🎉 成功发布到 TestPyPI!")
            print(f"📦 测试安装:")
            print(f"   pip install --index-url https://test.pypi.org/simple/ graphxr-database-proxy=={version}")
            print(f"🔗 查看: https://test.pypi.org/project/graphxr-database-proxy/{version}/")
        else:
            sys.exit(1)
            
    elif target == "prod":
        print(f"\n⚠️  准备发布到正式 PyPI (版本 {version})")
        print("   这将使包对所有用户可用!")
        confirm = input("   确认发布? (yes/no): ").lower()
        
        if confirm == "yes":
            if upload_to_pypi():
                print(f"\n🎉 成功发布到 PyPI!")
                print(f"📦 安装:")
                print(f"   pip install graphxr-database-proxy=={version}")
                print(f"🔗 查看: https://pypi.org/project/graphxr-database-proxy/{version}/")
            else:
                sys.exit(1)
        else:
            print("❌ 发布已取消")
            
    else:
        print("❌ 无效的选择")
        sys.exit(1)
    
    print(f"\n✨ 操作完成!")

if __name__ == "__main__":
    main()