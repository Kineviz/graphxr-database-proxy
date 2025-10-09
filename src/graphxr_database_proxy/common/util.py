import os
import sys
import json
from fastapi import HTTPException

# Add project root directory to Python path for importing proxy modules
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.join(current_dir, '..', '..', '..')
sys.path.insert(0, project_root)

def read_json_file(file_path):
    """Read JSON file with error handling"""
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Config file not found: {file_path}")

        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in config file: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading config file: {e}")
    
def get_default_oauth_config():
    """Get default OAuth config from config/default.google.localhost.auth.json"""
    try:
        # Get the project root directory (assuming this file is in src/graphxr_database_proxy/api/)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.join(current_dir, '..', '..', '..')
        config_path = os.path.join(project_root, 'config', 'default.google.localhost.auth.json')
        default_oauth = read_json_file(config_path).get("web", {})
        client_id = default_oauth.get("client_id")
        client_secret = default_oauth.get("client_secret")
        if not client_id or not client_secret:
            raise HTTPException(status_code=500, detail="client_id or client_secret not found in config file")
        return default_oauth
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth configuration error: {e}")