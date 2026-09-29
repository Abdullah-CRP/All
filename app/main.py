import io
import json
from typing import Dict, Any, Optional
from fastapi import FastAPI, Depends, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
import pandas as pd

from app.config import settings
from app.models.schemas import (
    SynthesisRequest, SynthesisResponse, TableSchema, ColumnDefinition, RelationMapping, GenerationConfig
)
from app.core.auth import verify_auth_token
from app.services.router import RAGRouter
from app.services.pipeline import PipelineCoordinator

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-Performance Synthetic Data Platform powered by Gemini AI, Pandas, and Supabase.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend and API consumers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static web UI assets
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse("app/static/index.html")

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "engine": "HackDataV2-Gemini-Core",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "gemini_integration": "active" if bool(settings.GEMINI_API_KEY) else "ready (fallback/local engine active)"
    }

@app.post("/api/v1/generate", response_model=SynthesisResponse)
async def generate_synthetic_data(
    request: SynthesisRequest,
    user: dict = Depends(verify_auth_token)
):
    """
    Executes the 5-step synthetic data generation pipeline:
    1. Ingestion & RAG Routing
    2. Configuration & Constraint Mapping
    3. Content Synthesis & Edge-Case Injection
    4. Validation & Reconciliation
    5. Final Output Delivery (with validation_status: "passed")
    """
    try:
        response = await PipelineCoordinator.execute(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline synthesis error: {str(e)}"
        )

@app.post("/api/v1/analyze-schema")
async def analyze_schema(
    request: SynthesisRequest,
    user: dict = Depends(verify_auth_token)
):
    """
    Executes Step 1: Ingestion & RAG Routing
    Infers missing column types, identifies primary and foreign keys,
    maps relational cardinalities, and determines optimal pipeline route.
    """
    try:
        analysis = RAGRouter.analyze_and_route(request)
        return {
            "success": True,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Schema analysis error: {str(e)}"
        )

@app.post("/api/v1/export/{export_format}")
async def export_data(
    export_format: str,
    payload: Dict[str, Any],
    user: dict = Depends(verify_auth_token)
):
    """
    Exports synthesized tabular/relational or document data into downloadable formats:
    csv, json, markdown.
    """
    fmt = export_format.lower()
    data = payload.get("data", {})
    
    if fmt == "json":
        json_str = json.dumps(data, indent=2)
        return StreamingResponse(
            io.BytesIO(json_str.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="synthetic_dataset.json"'}
        )
    elif fmt == "csv":
        # If multi-table, export first table or flatten
        output_io = io.StringIO()
        if "documents" in data:
            docs = data["documents"]
            df = pd.json_normalize(docs)
            df.to_csv(output_io, index=False)
        else:
            first_table = list(data.keys())[0] if data else "data"
            rows = data.get(first_table, [])
            df = pd.DataFrame(rows)
            df.to_csv(output_io, index=False)
            
        csv_bytes = output_io.getvalue().encode("utf-8")
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="synthetic_dataset.csv"'}
        )
    elif fmt in ["md", "markdown"]:
        docs = data.get("documents", [])
        if docs and "rendered_markdown" in docs[0]:
            content = "\n\n---\n\n".join([d.get("rendered_markdown", "") for d in docs])
        else:
            first_table = list(data.keys())[0] if data else "data"
            df = pd.DataFrame(data.get(first_table, []))
            content = df.to_markdown(index=False)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="text/markdown",
            headers={"Content-Disposition": 'attachment; filename="synthetic_document.md"'}
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format '{export_format}'. Supported: json, csv, markdown."
        )

@app.get("/api/v1/templates")
async def get_templates():
    """
    Returns curated enterprise template schemas for instant demonstration.
    """
    return {
        "templates": [
            {
                "id": "relational_ecommerce",
                "name": "E-Commerce Multi-Table Relational",
                "route": "relational",
                "description": "Customers, Orders, and Order Items with strict Foreign Key integrity and 1:N cardinalities.",
                "schemas": [
                    {
                        "table_name": "customers",
                        "row_count": 10,
                        "columns": [
                            {"name": "customer_id", "type": "integer", "is_primary_key": True},
                            {"name": "full_name", "type": "string"},
                            {"name": "email", "type": "email"},
                            {"name": "city", "type": "address"},
                            {"name": "signup_date", "type": "datetime"}
                        ]
                    },
                    {
                        "table_name": "orders",
                        "row_count": 25,
                        "columns": [
                            {"name": "order_id", "type": "uuid", "is_primary_key": True},
                            {"name": "customer_id", "type": "integer", "foreign_key_target": "customers.customer_id"},
                            {"name": "order_date", "type": "datetime"},
                            {"name": "order_total", "type": "currency", "min_value": 35.0, "max_value": 1800.0},
                            {"name": "status", "type": "string", "allowed_values": ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"]}
                        ]
                    }
                ],
                "relations": [
                    {
                        "parent_table": "customers",
                        "child_table": "orders",
                        "parent_key": "customer_id",
                        "child_key": "customer_id",
                        "cardinality": "1:N"
                    }
                ]
            },
            {
                "id": "document_invoice",
                "name": "B2B SaaS Corporate Invoices",
                "route": "document",
                "document_template": "invoice",
                "description": "Multi-line corporate cloud invoices with mathematically verified subtotals, tax rates, and grand totals."
            },
            {
                "id": "document_statement",
                "name": "Commercial Bank Statement",
                "route": "document",
                "document_template": "bank_statement",
                "description": "Reconciled ledger transactions with verified opening and running balances."
            },
            {
                "id": "tabular_fintech",
                "name": "Fintech Users & Risk Scoring (Privacy Protected)",
                "route": "tabular",
                "description": "Fintech records with column-level masking (email), hashing, and differential privacy noise on salary/balance.",
                "schemas": [
                    {
                        "table_name": "credit_applicants",
                        "row_count": 20,
                        "columns": [
                            {"name": "applicant_id", "type": "uuid", "is_primary_key": True},
                            {"name": "full_name", "type": "string"},
                            {"name": "email", "type": "email"},
                            {"name": "credit_score", "type": "integer", "min_value": 450, "max_value": 850},
                            {"name": "annual_income", "type": "currency", "min_value": 40000, "max_value": 250000},
                            {"name": "risk_tier", "type": "string", "allowed_values": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]}
                        ]
                    }
                ],
                "config": {
                    "privacy_controls": [
                        {"column": "email", "action": "mask"},
                        {"column": "annual_income", "action": "differential_noise", "noise_epsilon": 0.25}
                    ]
                }
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
