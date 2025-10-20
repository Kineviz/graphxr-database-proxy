# -*- coding: utf-8 -*-
"""
启动脚本，确保正确的编码环境
"""

import sys
import os
import locale

def setup_encoding():
    """设置正确的编码环境"""
    
    # 设置环境变量
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PYTHONUTF8'] = '1'
    
    # Windows 特殊处理
    if sys.platform == "win32":
        try:
            # 设置控制台编码页为 UTF-8
            os.system('chcp 65001 > nul')
            
            # 设置 locale
            locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
        except:
            try:
                locale.setlocale(locale.LC_ALL, 'C.UTF-8')
            except:
                pass
        
        # 重定向标准输出以支持 UTF-8
        try:
            import codecs
            sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
            sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
        except:
            pass

def main():
    """主启动函数"""
    setup_encoding()
    
    # 导入并运行主应用
    try:
        from .main import main as app_main
        app_main()
    except ImportError:
        # 如果是直接运行此文件
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from src.graphxr_database_proxy.main import main as app_main
        app_main()

if __name__ == "__main__":
    main()