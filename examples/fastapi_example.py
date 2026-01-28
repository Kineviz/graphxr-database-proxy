import os
from fastapi import FastAPI

# Completely disable OpenTelemetry SDK to prevent metrics export errors
os.environ["OTEL_SDK_DISABLED"] = "true"
os.environ["OTEL_METRICS_EXPORTER"] = "none"
os.environ["SPANNER_ENABLE_BUILT_IN_METRICS"] = "false"
os.environ["GOOGLE_CLOUD_DISABLE_METRICS"] = "true"

from google.cloud import spanner

app = FastAPI()

client = spanner.Client()

instance = client.instance('your-instance-id')

database = instance.database('your-database-id')

@app.post("/query")

async def run_query(query: dict):

    gql = query.get("gql")

    

    with database.snapshot() as snapshot:

        results = snapshot.execute_sql(gql)

        return {"results": [dict(row) for row in results]}