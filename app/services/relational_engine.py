from typing import List, Dict, Any, Tuple
from app.models.schemas import TableSchema, RelationMapping, GenerationConfig
from app.services.tabular_engine import TabularEngine

class RelationalEngine:
    """
    Step 2, 3, & 4: Multi-Table Relational Generation with Strict Referential Integrity.
    """

    @classmethod
    def resolve_generation_order(
        cls, schemas: List[TableSchema], relations: List[RelationMapping]
    ) -> List[TableSchema]:
        """
        Topological order: Parent tables must be generated before child tables
        so that parent primary key pools exist for child foreign keys.
        """
        table_map = {s.table_name: s for s in schemas}
        # Find which tables are parents and which are children
        children_set = {r.child_table for r in relations}
        
        ordered: List[TableSchema] = []
        # First parents
        for s in schemas:
            if s.table_name not in children_set:
                ordered.append(s)
        # Then children
        for s in schemas:
            if s.table_name in children_set and s not in ordered:
                ordered.append(s)

        return ordered if ordered else schemas

    @classmethod
    def generate_relational_dataset(
        cls,
        schemas: List[TableSchema],
        relations: List[RelationMapping],
        config: GenerationConfig
    ) -> Tuple[Dict[str, List[Dict[str, Any]]], Dict[str, Any], bool, List[str]]:
        """
        Generates relational dataset and validates referential integrity.
        """
        ordered_schemas = cls.resolve_generation_order(schemas, relations)
        generated_tables: Dict[str, List[Dict[str, Any]]] = {}
        fk_pools: Dict[str, List[Any]] = {}  # e.g., "customers.customer_id" -> [1001, 1002, ...]
        
        total_edge_cases = 0
        total_privacy_applied = 0
        table_metrics = {}

        for schema in ordered_schemas:
            # Generate table using TabularEngine with available FK pools
            rows, meta = TabularEngine.generate_table(schema, config, fk_pools)
            generated_tables[schema.table_name] = rows
            total_edge_cases += meta["edge_cases_injected"]
            total_privacy_applied += meta["privacy_rules_applied"]
            table_metrics[schema.table_name] = meta["stats"]

            # Register primary keys into fk_pools for dependent children
            for col in schema.columns:
                if col.is_primary_key or col.name.lower() in ["id", f"{schema.table_name.rstrip('s').lower()}_id"]:
                    pool_key = f"{schema.table_name}.{col.name}"
                    pk_values = [r.get(col.name) for r in rows if r.get(col.name) is not None]
                    fk_pools[pool_key] = pk_values
                    # Also register simplified key
                    fk_pools[col.name] = pk_values

        # Step 4: Strict Referential Check
        referential_integrity = True
        validation_logs: List[str] = []

        for rel in relations:
            parent_rows = generated_tables.get(rel.parent_table, [])
            child_rows = generated_tables.get(rel.child_table, [])
            
            parent_pks = set(r.get(rel.parent_key) for r in parent_rows if r.get(rel.parent_key) is not None)
            
            # Check child foreign keys
            orphans = 0
            for child in child_rows:
                child_fk = child.get(rel.child_key)
                # Allow null foreign keys if edge cases were injected, but non-null must exist
                if child_fk is not None and child_fk not in parent_pks:
                    orphans += 1
                    referential_integrity = False

            if orphans == 0:
                validation_logs.append(
                    f"Referential integrity verified: {rel.parent_table}.{rel.parent_key} -> {rel.child_table}.{rel.child_key} ({rel.cardinality}) passed with 0 orphan records."
                )
            else:
                validation_logs.append(
                    f"Referential check failed: Found {orphans} orphan records in {rel.child_table}.{rel.child_key} referencing {rel.parent_table}.{rel.parent_key}."
                )

        metadata = {
            "table_count": len(generated_tables),
            "total_records": sum(len(r) for r in generated_tables.values()),
            "edge_cases_injected": total_edge_cases,
            "privacy_rules_applied": total_privacy_applied,
            "table_metrics": table_metrics
        }

        return generated_tables, metadata, referential_integrity, validation_logs
