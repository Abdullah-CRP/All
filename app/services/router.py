from typing import List, Dict, Any, Optional
from app.models.schemas import SynthesisRequest, TableSchema, ColumnDefinition, RelationMapping, PipelineRoute

class RAGRouter:
    """
    Step 1: Ingestion & RAG Routing
    - Parses user input payload
    - Infers schema types, formats, primary/foreign keys
    - Determines cardinalities (1:1, 1:N, N:M)
    - Routes to Tabular, Relational, or Document pipelines
    """
    
    @staticmethod
    def infer_type_from_name_and_sample(col_name: str, sample_val: Any = None) -> str:
        name_lower = col_name.lower()
        if any(k in name_lower for k in ["_id", "id", "uuid"]):
            return "uuid" if "uuid" in name_lower else "integer"
        if any(k in name_lower for k in ["email", "mail"]):
            return "email"
        if any(k in name_lower for k in ["phone", "mobile", "tel"]):
            return "phone"
        if any(k in name_lower for k in ["price", "amount", "salary", "balance", "total", "tax", "cost", "revenue"]):
            return "currency"
        if any(k in name_lower for k in ["date", "time", "created_at", "updated_at", "timestamp"]):
            return "datetime"
        if any(k in name_lower for k in ["address", "street", "city", "state", "zip", "country"]):
            return "address"
        if any(k in name_lower for k in ["is_", "has_", "active", "enabled", "verified"]):
            return "boolean"
        if any(k in name_lower for k in ["count", "quantity", "qty", "age", "num_"]):
            return "integer"
            
        if sample_val is not None:
            if isinstance(sample_val, bool):
                return "boolean"
            if isinstance(sample_val, int):
                return "integer"
            if isinstance(sample_val, float):
                return "float"
            if isinstance(sample_val, str):
                if "@" in sample_val:
                    return "email"
                return "string"
        return "string"

    @classmethod
    def analyze_and_route(cls, request: SynthesisRequest) -> Dict[str, Any]:
        """
        Executes Step 1 pipeline logic and returns inferred schema graph and selected route.
        """
        requested_route = request.route
        inferred_schemas: List[TableSchema] = []
        inferred_relations: List[RelationMapping] = []
        
        # 1. Inspect existing schemas or sample data
        if request.schemas and len(request.schemas) > 0:
            for s in request.schemas:
                # Enhance columns with inferred types if missing
                enhanced_cols = []
                for col in s.columns:
                    col_type = col.type
                    if not col_type or col_type == "string":
                        col_type = cls.infer_type_from_name_and_sample(col.name)
                    
                    is_pk = col.is_primary_key or (col.name.lower() in [f"{s.table_name.rstrip('s').lower()}_id", "id"])
                    enhanced_cols.append(
                        ColumnDefinition(
                            name=col.name,
                            type=col_type,
                            nullable=col.nullable,
                            is_primary_key=is_pk,
                            foreign_key_target=col.foreign_key_target,
                            min_value=col.min_value,
                            max_value=col.max_value,
                            allowed_values=col.allowed_values,
                            description=col.description
                        )
                    )
                inferred_schemas.append(TableSchema(
                    table_name=s.table_name,
                    row_count=s.row_count or request.config.row_count,
                    columns=enhanced_cols
                ))
        elif request.sample_data and len(request.sample_data) > 0:
            # Build schema from sample data rows
            for t_name, rows in request.sample_data.items():
                cols = []
                if rows and len(rows) > 0:
                    first_row = rows[0]
                    for c_name, val in first_row.items():
                        c_type = cls.infer_type_from_name_and_sample(c_name, val)
                        is_pk = c_name.lower() in [f"{t_name.rstrip('s').lower()}_id", "id"]
                        cols.append(ColumnDefinition(
                            name=c_name,
                            type=c_type,
                            is_primary_key=is_pk
                        ))
                inferred_schemas.append(TableSchema(
                    table_name=t_name,
                    row_count=request.config.row_count,
                    columns=cols
                ))
        elif request.route == "document":
            # Document route without explicit schema
            pass

        # 2. Determine Relational Mappings
        if request.relations:
            inferred_relations = request.relations
        elif len(inferred_schemas) > 1:
            # Auto-infer 1:N relations by checking foreign key names (e.g. customer_id in orders)
            for parent in inferred_schemas:
                pk_candidates = [c.name for c in parent.columns if c.is_primary_key or c.name.lower() in [f"{parent.table_name.rstrip('s').lower()}_id", "id"]]
                for child in inferred_schemas:
                    if parent.table_name == child.table_name:
                        continue
                    for pk in pk_candidates:
                        for child_col in child.columns:
                            # Avoid matching child's own primary key
                            if child_col.is_primary_key and child_col.name.lower() in [f"{child.table_name.rstrip('s').lower()}_id", "id"]:
                                continue
                            if child_col.name.lower() == pk.lower():
                                child_col.foreign_key_target = f"{parent.table_name}.{pk}"
                                inferred_relations.append(RelationMapping(
                                    parent_table=parent.table_name,
                                    child_table=child.table_name,
                                    parent_key=pk,
                                    child_key=child_col.name,
                                    cardinality="1:N",
                                    min_children_per_parent=1,
                                    max_children_per_parent=4
                                ))

        # 3. Route decision
        if requested_route != "auto":
            final_route = requested_route
        else:
            if len(inferred_schemas) > 1 or len(inferred_relations) > 0:
                final_route = "relational"
            elif request.document_template and any(k in (request.business_context or "").lower() for k in ["invoice", "statement", "receipt", "document", "bill"]):
                final_route = "document"
            else:
                final_route = "tabular"

        return {
            "route": final_route,
            "schemas": inferred_schemas,
            "relations": inferred_relations,
            "business_context": request.business_context
        }
