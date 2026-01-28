"""
Google Application Default Credentials (ADC) Example

This example demonstrates how to configure and start the GraphXR Database Proxy
using Google Application Default Credentials (ADC) for authentication.

Configure ADC using one of these methods:
    - Local development: 
        - Install gcloud CLI: https://cloud.google.com/sdk/docs/install
        - Run `gcloud auth application-default login`
    - GCE/GKE: VM instance will use attached service account automatically
        - Ensure the VM with the scopes("--scopes=cloud-platform") has access to Spanner
    - Environment variable: Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON path

Installation:
    pip install graphxr-database-proxy google-auth

Usage:
    1. Update INSTANCE_ID, DATABASE_ID, and PROPERTY_GRAPH_NAME below
    2. Run: python examples/google_adc.py
    3. Connect GraphXR to: http://localhost:3002/api/spanner/{project_name}

For more information:
    - ADC documentation: https://cloud.google.com/docs/authentication/production
    - GraphXR documentation: https://kineviz.com/docs
"""

import google.auth
from graphxr_database_proxy import DatabaseProxy


# Configuration - Update these values for your Spanner instance
INSTANCE_ID = "demo-2025"           # Your Spanner instance ID
DATABASE_ID = "paysim"              # Your Spanner database ID
PROPERTY_GRAPH_NAME = "graph_view"  # Your property graph name (optional)


def quick_start_with_google_adc():
    """
    Start the GraphXR Database Proxy using Google ADC authentication.
    
    This function:
    1. Automatically detects the GCP project ID from ADC
    2. Configures the proxy with ADC credentials
    3. Starts the server on port 3002
    
    Returns:
        None
    
    Raises:
        google.auth.exceptions.DefaultCredentialsError: If ADC is not configured
    """
    # Create proxy instance
    proxy = DatabaseProxy()

    # Get default credentials and project ID from ADC
    # This will automatically use credentials from:
    # - GOOGLE_APPLICATION_CREDENTIALS env variable
    # - gcloud CLI default credentials
    # - GCE/GKE service account
    _, project_id = google.auth.default()
    
    # Use project_id as the project name
    project_name = project_id

    # Add project with ADC credentials
    proxy.add_project(
        project_name=project_name,      # Project name for the proxy
        database_type="spanner",        # Database type
        project_id=project_id,          # GCP project ID (auto-detected from ADC)
        instance_id=INSTANCE_ID,        # Spanner instance ID
        database_id=DATABASE_ID,        # Spanner database ID
        graph_name=PROPERTY_GRAPH_NAME, # Property graph name (optional)
        credentials={                   # ADC credentials configuration
            "type": "google_ADC"
        }
    )

    # Start the proxy server
    print(f"\n GraphXR Database Proxy Server Starting...")
    print(f"\n Server URL: http://localhost:3002")
    print(f" GraphXR API: http://localhost:3002/api/spanner/{project_name}")
    print(f"\n Copy the GraphXR API URL above into GraphXR using 'Database Proxy' connection type.\n")
    
    proxy.start(port=3002)


if __name__ == "__main__":
    try:
        quick_start_with_google_adc()
    except Exception as e:
        print(f"\n Error: {e}")
        print("\nTroubleshooting:")
        print("  1. Ensure ADC is configured: gcloud auth application-default login")
        print("  2. Verify your credentials have Spanner permissions")
        print("  3. Check that INSTANCE_ID and DATABASE_ID are correct")
        print("  4. See: https://cloud.google.com/docs/authentication/production\n")

