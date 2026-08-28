#!/usr/bin/env python3
"""
GraphXR Database Proxy - get_project_apis Enhanced Example

This example demonstrates the enhanced get_project_apis() method that supports
finding projects by both project_id and project_name.
"""

import os
from graphxr_database_proxy import DatabaseProxy


def demonstrate_get_project_apis():
    """Demonstrate enhanced get_project_apis functionality"""
    
    print("🔍 GraphXR Database Proxy - Enhanced get_project_apis Example")
    print("=" * 70)
    
    # Set environment variables for convenience
    os.environ['SPANNER_INSTANCE_ID'] = 'demo-instance'
    os.environ['SPANNER_DATABASE_ID'] = 'demo-database'
    os.environ['SPANNER_CREDENTIALS_PATH'] = './examples/service-account.json'
    
    proxy = DatabaseProxy()
    
    # Create multiple demo projects
    print("📝 Creating demo projects...")
    
    projects_info = []
    
    # Project 1: Customer Analytics
    project_id_1 = proxy.add_project(
        project_name="Customer Analytics",
        project_id="customer-analytics-gcp",
        graph_name="customer_graph"
    )
    projects_info.append({"id": project_id_1, "name": "Customer Analytics"})
    
    # Project 2: Supply Chain
    project_id_2 = proxy.add_project(
        project_name="Supply Chain Management",
        project_id="supply-chain-gcp",
        graph_name="supply_graph"
    )
    projects_info.append({"id": project_id_2, "name": "Supply Chain Management"})
    
    # Project 3: Social Network
    project_id_3 = proxy.add_project(
        project_name="Social Network Analysis",
        project_id="social-network-gcp",
        graph_name="social_graph"
    )
    projects_info.append({"id": project_id_3, "name": "Social Network Analysis"})
    
    print(f"✅ Created {len(projects_info)} demo projects\n")
    
    # Demonstrate different ways to use get_project_apis
    print("🚀 Demonstrating get_project_apis() functionality:")
    print("=" * 50)
    
    # Method 1: Get all projects
    print("1️⃣ Get API endpoints for ALL projects:")
    all_apis = proxy.get_project_apis()
    
    if "projects" in all_apis:
        for pid, project_info in all_apis["projects"].items():
            print(f"   📋 {project_info['name']} ({pid[:8]}...)")
            print(f"      Query: {project_info['endpoints']['query']}")
        print()
    
    # Method 2: Get by project ID
    print("2️⃣ Get API endpoints by PROJECT ID:")
    target_id = projects_info[0]["id"]
    api_by_id = proxy.get_project_apis(target_id)
    
    if "error" not in api_by_id:
        print(f"   ✅ Found project: {api_by_id['name']}")
        print(f"   🆔 Project ID: {api_by_id['project_id']}")
        print(f"   📡 Base endpoint: {api_by_id['endpoints']['base']}")
        print(f"   🔍 Query endpoint: {api_by_id['endpoints']['query']}")
        print(f"   📊 Schema endpoint: {api_by_id['endpoints']['schema']}")
        print(f"   💚 Health endpoint: {api_by_id['endpoints']['health']}")
    else:
        print(f"   ❌ {api_by_id['error']}")
    print()
    
    # Method 3: Get by project name
    print("3️⃣ Get API endpoints by PROJECT NAME:")
    target_name = projects_info[1]["name"]
    api_by_name = proxy.get_project_apis(target_name)
    
    if "error" not in api_by_name:
        print(f"   ✅ Found project: {api_by_name['name']}")
        print(f"   🆔 Project ID: {api_by_name['project_id']}")
        print(f"   📡 Base endpoint: {api_by_name['endpoints']['base']}")
        print(f"   🔍 Query endpoint: {api_by_name['endpoints']['query']}")
        print(f"   📊 Schema endpoint: {api_by_name['endpoints']['schema']}")
        print(f"   💚 Health endpoint: {api_by_name['endpoints']['health']}")
    else:
        print(f"   ❌ {api_by_name['error']}")
    print()
    
    # Method 4: Error handling - non-existent project
    print("4️⃣ Error handling - non-existent project:")
    non_existent = proxy.get_project_apis("Non-existent Project")
    if "error" in non_existent:
        print(f"   ✅ Expected error: {non_existent['error']}")
    else:
        print(f"   ❌ Unexpected success: {non_existent}")
    print()
    
    # Method 5: Demonstrate practical usage scenarios
    print("5️⃣ Practical usage scenarios:")
    print("   Scenario A: Find project by partial name match")
    
    # Find projects with "Network" in the name
    all_projects = proxy.get_project_apis()
    network_projects = []
    for pid, pinfo in all_projects.get("projects", {}).items():
        if "Network" in pinfo["name"]:
            network_projects.append(pinfo)
    
    if network_projects:
        for project in network_projects:
            print(f"      📡 Found: {project['name']}")
            print(f"         Query: {project['endpoints']['query']}")
    
    print("\n   Scenario B: Generate client-friendly API documentation")
    first_project = list(projects_info)[0]
    api_info = proxy.get_project_apis(first_project["id"])
    
    if "error" not in api_info:
        print(f"      📋 Project: {api_info['name']}")
        print(f"      🔗 Base URL: http://localhost:3002{api_info['endpoints']['base']}")
        print(f"      Available endpoints:")
        for name, path in api_info["endpoints"].items():
            print(f"         - {name.title()}: http://localhost:3002{path}")
    
    print("\n💡 Usage Tips:")
    tips = [
        "Use project_id for programmatic access (faster, unique)",
        "Use project_name for user-friendly interfaces",
        "Always check for 'error' key in response",
        "No parameter returns all projects for dashboard views",
        "Project names are case-sensitive for exact matches"
    ]
    
    for i, tip in enumerate(tips, 1):
        print(f"   {i}. {tip}")
    
    return projects_info


def code_examples():
    """Show code examples for different usage patterns"""
    
    print("\n💻 Code Examples:")
    print("=" * 50)
    
    examples = [
        {
            "title": "Get all projects for dashboard",
            "code": """
# Get all projects
all_apis = proxy.get_project_apis()
for pid, project in all_apis.get("projects", {}).items():
    print(f"{project['name']}: {project['endpoints']['query']}")
            """.strip()
        },
        {
            "title": "Get specific project by ID",
            "code": """
# Get project by ID (recommended for APIs)
project_id = "abc123-def456-ghi789"
api_info = proxy.get_project_apis(project_id)
if "error" not in api_info:
    query_url = api_info["endpoints"]["query"]
    print(f"Query endpoint: {query_url}")
            """.strip()
        },
        {
            "title": "Get specific project by name",
            "code": """
# Get project by name (user-friendly)
project_name = "Customer Analytics"
api_info = proxy.get_project_apis(project_name)
if "error" not in api_info:
    base_url = api_info["endpoints"]["base"]
    print(f"Project ID: {api_info['project_id']}")
    print(f"Base endpoint: {base_url}")
            """.strip()
        },
        {
            "title": "Error handling",
            "code": """
# Always check for errors
result = proxy.get_project_apis("Unknown Project")
if "error" in result:
    print(f"Project not found: {result['error']}")
else:
    print(f"Found project: {result['name']}")
            """.strip()
        }
    ]
    
    for example in examples:
        print(f"\n📌 {example['title']}:")
        print("```python")
        print(example['code'])
        print("```")


def main():
    """Main function"""
    
    try:
        # Demonstrate functionality
        projects_info = demonstrate_get_project_apis()
        
        # Show code examples
        code_examples()
        
        print(f"\n🎯 Summary:")
        print(f"   Created {len(projects_info)} demo projects")
        print(f"   ✅ get_project_apis() now supports:")
        print(f"      • No parameter → All projects")
        print(f"      • project_id → Find by internal ID")
        print(f"      • project_name → Find by display name")
        print(f"      • Error handling for missing projects")
        
        print(f"\n🚀 Ready to start server? Uncomment below:")
        print(f"   # proxy.start(port=3002)")
        
    except Exception as e:
        print(f"❌ Error during demo: {e}")


if __name__ == "__main__":
    main()