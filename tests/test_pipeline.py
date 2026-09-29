import asyncio
import unittest
from app.models.schemas import SynthesisRequest, TableSchema, ColumnDefinition, RelationMapping, GenerationConfig, PrivacyRule
from app.services.router import RAGRouter
from app.services.tabular_engine import TabularEngine
from app.services.relational_engine import RelationalEngine
from app.services.document_engine import DocumentEngine
from app.services.pipeline import PipelineCoordinator

class TestHackDataV2Pipeline(unittest.TestCase):

    def test_step1_rag_routing_inference(self):
        """Verify Step 1 type inference and relational detection."""
        req = SynthesisRequest(
            route="auto",
            schemas=[
                TableSchema(
                    table_name="users",
                    columns=[
                        ColumnDefinition(name="user_id", type="string"),
                        ColumnDefinition(name="email", type="string"),
                        ColumnDefinition(name="salary", type="string")
                    ]
                ),
                TableSchema(
                    table_name="orders",
                    columns=[
                        ColumnDefinition(name="order_id", type="string"),
                        ColumnDefinition(name="user_id", type="string")
                    ]
                )
            ]
        )
        res = RAGRouter.analyze_and_route(req)
        self.assertEqual(res["route"], "relational")
        self.assertEqual(len(res["relations"]), 1)
        self.assertEqual(res["relations"][0].parent_table, "users")
        self.assertEqual(res["relations"][0].child_table, "orders")

    def test_step2_and_3_tabular_edge_cases_and_privacy(self):
        """Verify Step 2 & 3 edge case injection and privacy masking."""
        schema = TableSchema(
            table_name="employees",
            row_count=50,
            columns=[
                ColumnDefinition(name="emp_id", type="uuid", is_primary_key=True),
                ColumnDefinition(name="name", type="string"),
                ColumnDefinition(name="email", type="email"),
                ColumnDefinition(name="salary", type="currency", min_value=50000, max_value=120000)
            ]
        )
        config = GenerationConfig(
            row_count=50,
            edge_case_rate=0.10,
            privacy_controls=[
                PrivacyRule(column="email", action="mask"),
                PrivacyRule(column="salary", action="differential_noise", noise_epsilon=0.5)
            ]
        )
        rows, meta = TabularEngine.generate_table(schema, config)
        self.assertEqual(len(rows), 50)
        self.assertGreater(meta["edge_cases_injected"], 0)
        self.assertGreater(meta["privacy_rules_applied"], 0)
        
        # Verify email masking
        masked_emails = [r["email"] for r in rows if r.get("email") and "@" in str(r.get("email"))]
        self.assertTrue(any("*" in str(e) for e in masked_emails))

    def test_step4_relational_referential_integrity(self):
        """Verify Step 4 strict referential integrity across parent and child tables."""
        schemas = [
            TableSchema(
                table_name="customers",
                row_count=5,
                columns=[
                    ColumnDefinition(name="customer_id", type="integer", is_primary_key=True),
                    ColumnDefinition(name="name", type="string")
                ]
            ),
            TableSchema(
                table_name="orders",
                row_count=20,
                columns=[
                    ColumnDefinition(name="order_id", type="uuid", is_primary_key=True),
                    ColumnDefinition(name="customer_id", type="integer", foreign_key_target="customers.customer_id"),
                    ColumnDefinition(name="total", type="currency")
                ]
            )
        ]
        relations = [
            RelationMapping(
                parent_table="customers",
                child_table="orders",
                parent_key="customer_id",
                child_key="customer_id",
                cardinality="1:N"
            )
        ]
        config = GenerationConfig(row_count=20, edge_case_rate=0.0)
        tables, meta, ref_ok, logs = RelationalEngine.generate_relational_dataset(schemas, relations, config)
        
        self.assertTrue(ref_ok)
        customer_pks = set(c["customer_id"] for c in tables["customers"])
        for o in tables["orders"]:
            self.assertIn(o["customer_id"], customer_pks)

    def test_step4_document_mathematical_reconciliation(self):
        """Verify Step 4 invoice mathematical line items and subtotals reconcile with 0 error."""
        config = GenerationConfig(document_volume=3, edge_case_rate=0.0)
        docs, meta, math_ok, logs = DocumentEngine.generate_documents("invoice", 3, config)
        self.assertTrue(math_ok)
        self.assertEqual(len(docs), 3)

        for doc in docs:
            calc_subtotal = round(sum(it["line_total"] for it in doc["line_items"]), 2)
            self.assertEqual(doc["subtotal"], calc_subtotal)
            calc_grand = round(doc["subtotal"] - doc["discount_amount"] + doc["tax_amount"], 2)
            self.assertEqual(doc["grand_total"], calc_grand)

    def test_full_pipeline_delivery(self):
        """Verify full 5-step pipeline execution delivers validation_status: 'passed'."""
        req = SynthesisRequest(
            route="document",
            document_template="invoice",
            config=GenerationConfig(document_volume=2)
        )
        response = asyncio.run(PipelineCoordinator.execute(req))
        self.assertTrue(response.success)
        self.assertEqual(response.validation_status, "passed")
        self.assertIn("documents", response.data)
        self.assertEqual(len(response.data["documents"]), 2)

if __name__ == "__main__":
    unittest.main()
