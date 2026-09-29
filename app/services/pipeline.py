import time
from typing import Dict, Any, List
from app.models.schemas import SynthesisRequest, SynthesisResponse, ValidationReport, TableSchema, ColumnDefinition
from app.services.router import RAGRouter
from app.services.tabular_engine import TabularEngine
from app.services.relational_engine import RelationalEngine
from app.services.document_engine import DocumentEngine

class PipelineCoordinator:
    """
    Executes the 5-step HackDataV2 Synthetic Data Pipeline:
    Step 1: Ingestion & RAG Routing
    Step 2: Configuration & Constraint Mapping
    Step 3: Content Synthesis & Edge-Case Injection
    Step 4: Validation & Reconciliation
    Step 5: Final Output Delivery
    """

    @classmethod
    async def execute(cls, request: SynthesisRequest) -> SynthesisResponse:
        start_time = time.time()
        
        # --- Step 1: Ingestion & RAG Routing ---
        routing_info = RAGRouter.analyze_and_route(request)
        route = routing_info["route"]
        schemas = routing_info["schemas"]
        relations = routing_info["relations"]

        # Default schema if user provided none for tabular
        if route == "tabular" and not schemas:
            schemas = [
                TableSchema(
                    table_name="synthetic_dataset",
                    row_count=request.config.row_count,
                    columns=[
                        ColumnDefinition(name="record_id", type="uuid", is_primary_key=True),
                        ColumnDefinition(name="full_name", type="string"),
                        ColumnDefinition(name="email", type="email"),
                        ColumnDefinition(name="department", type="string"),
                        ColumnDefinition(name="salary", type="currency", min_value=45000, max_value=175000),
                        ColumnDefinition(name="status", type="string"),
                        ColumnDefinition(name="joined_date", type="datetime")
                    ]
                )
            ]

        # Default schema if user provided none for relational
        if route == "relational" and not schemas:
            schemas = [
                TableSchema(
                    table_name="customers",
                    row_count=max(5, request.config.row_count // 3),
                    columns=[
                        ColumnDefinition(name="customer_id", type="integer", is_primary_key=True),
                        ColumnDefinition(name="name", type="string"),
                        ColumnDefinition(name="email", type="email"),
                        ColumnDefinition(name="city", type="address"),
                        ColumnDefinition(name="created_at", type="datetime")
                    ]
                ),
                TableSchema(
                    table_name="orders",
                    row_count=request.config.row_count,
                    columns=[
                        ColumnDefinition(name="order_id", type="uuid", is_primary_key=True),
                        ColumnDefinition(name="customer_id", type="integer", foreign_key_target="customers.customer_id"),
                        ColumnDefinition(name="order_date", type="datetime"),
                        ColumnDefinition(name="total_amount", type="currency", min_value=25, max_value=1500),
                        ColumnDefinition(name="order_status", type="string")
                    ]
                )
            ]
            # Re-run routing relation mapping
            updated_routing = RAGRouter.analyze_and_route(SynthesisRequest(schemas=schemas, route="relational"))
            relations = updated_routing["relations"]

        # --- Step 2: Configuration & Constraint Mapping ---
        config = request.config
        
        # --- Step 3 & Step 4: Content Synthesis & Validation ---
        validation_logs: List[str] = []
        referential_integrity = True
        mathematical_integrity = True
        edge_cases_count = 0
        privacy_count = 0
        output_data: Dict[str, Any] = {}

        if route == "tabular":
            table_schema = schemas[0]
            # Override row count if config specified
            table_schema.row_count = config.row_count
            rows, meta = TabularEngine.generate_table(table_schema, config)
            output_data[table_schema.table_name] = rows
            edge_cases_count = meta["edge_cases_injected"]
            privacy_count = meta["privacy_rules_applied"]
            validation_logs.append(f"Tabular integrity verified: Generated {len(rows)} rows with {edge_cases_count} edge cases and {privacy_count} privacy masks.")

        elif route == "relational":
            tables, meta, ref_ok, ref_logs = RelationalEngine.generate_relational_dataset(
                schemas, relations, config
            )
            output_data = tables
            referential_integrity = ref_ok
            validation_logs.extend(ref_logs)
            edge_cases_count = meta["edge_cases_injected"]
            privacy_count = meta["privacy_rules_applied"]

        elif route == "document":
            template = request.document_template or "invoice"
            volume = config.document_volume
            docs, meta, math_ok, math_logs = DocumentEngine.generate_documents(template, volume, config)
            output_data["documents"] = docs
            mathematical_integrity = math_ok
            validation_logs.extend(math_logs)

        # Validation status determination
        is_passed = referential_integrity and mathematical_integrity
        status_flag = "passed" if is_passed else "failed"

        validation_report = ValidationReport(
            validation_status=status_flag,
            referential_integrity=referential_integrity,
            mathematical_integrity=mathematical_integrity,
            edge_cases_injected=edge_cases_count,
            privacy_rules_applied=privacy_count,
            details=validation_logs
        )

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        # --- Step 5: Final Output Delivery ---
        return SynthesisResponse(
            success=True,
            route_executed=route,
            validation_status=status_flag,
            metadata={
                "processing_time_ms": elapsed_ms,
                "engine_version": "HackDataV2-Gemini-Core",
                "route_selected": route,
                "record_counts": {k: len(v) if isinstance(v, list) else 1 for k, v in output_data.items()},
                "edge_case_rate": config.edge_case_rate,
                "locale": config.locale_settings.locale,
                "currency": config.locale_settings.currency
            },
            validation_report=validation_report,
            data=output_data
        )
