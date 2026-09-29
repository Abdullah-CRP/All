import random
import uuid
import datetime
from typing import List, Dict, Any, Tuple
from app.models.schemas import GenerationConfig

DOCUMENT_VENDORS = [
    {"name": "Apex Cloud Technologies Inc.", "address": "100 Innovation Way, Suite 400, San Francisco, CA 94105", "tax_id": "US-EIN-94-3829104"},
    {"name": "Vortex Systems Global", "address": "250 King St West, Toronto, ON M5V 1J5", "tax_id": "CA-BN-839210984"},
    {"name": "Quantum Data Labs GmbH", "address": "Friedrichstraße 140, 10117 Berlin, Germany", "tax_id": "DE-VAT-920194821"},
    {"name": "Horizon Logistics & Supply Corp", "address": "88 Marina Bay Blvd, Singapore 018981", "tax_id": "SG-UEN-202319480M"}
]

ITEM_CATALOG = [
    {"desc": "Enterprise Cloud Compute Instance (c6i.8xlarge, Monthly)", "unit_price": 624.50},
    {"desc": "Managed PostgreSQL High-Availability Cluster", "unit_price": 450.00},
    {"desc": "Dedicated AI Inference Cluster (NVIDIA H100 80GB)", "unit_price": 2850.00},
    {"desc": "Data Ingestion & Pipeline Orchestration Gateway", "unit_price": 180.00},
    {"desc": "Differential Privacy & Synthetic Data Engine License", "unit_price": 1200.00},
    {"desc": "24/7 Enterprise Tier SRE & Technical Support SLA", "unit_price": 950.00},
    {"desc": "Global Low-Latency Edge CDN (10TB Bandwidth)", "unit_price": 320.00}
]

class DocumentEngine:
    """
    Step 2, 3, 4, 5: Document Synthesis with exact mathematical reconciliation.
    Generates Invoices, Statements, and Reports with structured JSON and printable Markdown/HTML.
    """

    @classmethod
    def generate_invoice(cls, doc_idx: int, config: GenerationConfig) -> Dict[str, Any]:
        vendor = random.choice(DOCUMENT_VENDORS)
        inv_number = f"INV-2026-{10000 + doc_idx + random.randint(100, 999)}"
        issue_date = (datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")
        due_date = (datetime.datetime.now() + datetime.timedelta(days=random.randint(15, 45))).strftime("%Y-%m-%d")
        
        num_items = random.randint(2, 5)
        selected_items = random.sample(ITEM_CATALOG, num_items)
        
        line_items = []
        calculated_subtotal = 0.0

        for idx, item in enumerate(selected_items):
            qty = random.randint(1, 4)
            unit_price = item["unit_price"]
            line_total = round(qty * unit_price, 2)
            calculated_subtotal += line_total
            
            line_items.append({
                "item_number": idx + 1,
                "description": item["desc"],
                "quantity": qty,
                "unit_price": unit_price,
                "line_total": line_total
            })

        calculated_subtotal = round(calculated_subtotal, 2)
        tax_rate = config.locale_settings.tax_rate
        calculated_tax = round(calculated_subtotal * tax_rate, 2)
        discount_amount = round(calculated_subtotal * 0.05, 2) if random.random() > 0.6 else 0.0
        calculated_grand_total = round(calculated_subtotal - discount_amount + calculated_tax, 2)

        # Markdown layout mapping
        md_lines = [
            f"# INVOICE: {inv_number}",
            f"**Vendor:** {vendor['name']}  ",
            f"**Address:** {vendor['address']} | **Tax ID:** {vendor['tax_id']}  ",
            f"**Date:** {issue_date} | **Due Date:** {due_date}  ",
            f"**Currency:** {config.locale_settings.currency} ({config.locale_settings.currency_symbol})",
            "",
            "| # | Description | Qty | Unit Price | Total |",
            "|---|-------------|-----|------------|-------|"
        ]
        for it in line_items:
            md_lines.append(f"| {it['item_number']} | {it['description']} | {it['quantity']} | {config.locale_settings.currency_symbol}{it['unit_price']:.2f} | {config.locale_settings.currency_symbol}{it['line_total']:.2f} |")
        
        md_lines.append("")
        md_lines.append(f"- **Subtotal:** {config.locale_settings.currency_symbol}{calculated_subtotal:.2f}")
        if discount_amount > 0:
            md_lines.append(f"- **Discount (5%):** -{config.locale_settings.currency_symbol}{discount_amount:.2f}")
        md_lines.append(f"- **Tax ({tax_rate * 100:.2f}%):** {config.locale_settings.currency_symbol}{calculated_tax:.2f}")
        md_lines.append(f"- **Grand Total Due:** {config.locale_settings.currency_symbol}{calculated_grand_total:.2f}")

        # HTML layout preview
        html_rows = "".join([
            f"<tr><td>{it['item_number']}</td><td>{it['description']}</td><td>{it['quantity']}</td><td>{config.locale_settings.currency_symbol}{it['unit_price']:.2f}</td><td>{config.locale_settings.currency_symbol}{it['line_total']:.2f}</td></tr>"
            for it in line_items
        ])
        html_preview = f"""
        <div class="invoice-container">
            <div class="inv-header">
                <div><h2>{vendor['name']}</h2><p>{vendor['address']}<br>Tax ID: {vendor['tax_id']}</p></div>
                <div class="inv-meta"><h3>INVOICE</h3><p><strong>{inv_number}</strong><br>Date: {issue_date}<br>Due: {due_date}</p></div>
            </div>
            <table class="inv-table">
                <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>{html_rows}</tbody>
            </table>
            <div class="inv-summary">
                <p>Subtotal: <strong>{config.locale_settings.currency_symbol}{calculated_subtotal:.2f}</strong></p>
                <p>Tax ({tax_rate * 100:.1f}%): <strong>{config.locale_settings.currency_symbol}{calculated_tax:.2f}</strong></p>
                <p class="grand-total">Total: <strong>{config.locale_settings.currency_symbol}{calculated_grand_total:.2f}</strong></p>
            </div>
        </div>
        """

        return {
            "document_id": str(uuid.uuid4()),
            "document_type": "invoice",
            "invoice_number": inv_number,
            "issue_date": issue_date,
            "due_date": due_date,
            "currency": config.locale_settings.currency,
            "currency_symbol": config.locale_settings.currency_symbol,
            "vendor": vendor,
            "line_items": line_items,
            "subtotal": calculated_subtotal,
            "discount_amount": discount_amount,
            "tax_rate": tax_rate,
            "tax_amount": calculated_tax,
            "grand_total": calculated_grand_total,
            "rendered_markdown": "\n".join(md_lines),
            "rendered_html": html_preview
        }

    @classmethod
    def generate_bank_statement(cls, doc_idx: int, config: GenerationConfig) -> Dict[str, Any]:
        account_num = f"ACCT-4091-{random.randint(1000, 9999)}"
        opening_balance = round(random.uniform(5000.0, 25000.0), 2)
        current_balance = opening_balance
        
        tx_types = ["DEBIT", "CREDIT"]
        tx_descriptions = [
            "AWS Cloud Infrastructure Monthly", "Stripe Settlement Payout", "Payroll Direct Deposit",
            "Office Lease Payment", "Enterprise Software Subscription", "Wire Transfer Incoming", "Google Cloud API Usage"
        ]
        
        transactions = []
        base_date = datetime.datetime.now() - datetime.timedelta(days=30)
        
        for i in range(random.randint(4, 8)):
            tx_date = (base_date + datetime.timedelta(days=i * 3)).strftime("%Y-%m-%d")
            tx_type = random.choice(tx_types)
            amount = round(random.uniform(100.0, 3500.0), 2)
            
            if tx_type == "CREDIT":
                current_balance = round(current_balance + amount, 2)
            else:
                current_balance = round(current_balance - amount, 2)
                
            transactions.append({
                "tx_id": f"TXN-{10000 + i}",
                "date": tx_date,
                "description": random.choice(tx_descriptions),
                "type": tx_type,
                "amount": amount,
                "running_balance": current_balance
            })
            
        return {
            "document_id": str(uuid.uuid4()),
            "document_type": "bank_statement",
            "account_number": account_num,
            "statement_period": f"{base_date.strftime('%Y-%m-%d')} to {datetime.datetime.now().strftime('%Y-%m-%d')}",
            "opening_balance": opening_balance,
            "closing_balance": current_balance,
            "currency": config.locale_settings.currency,
            "transactions": transactions
        }

    @classmethod
    def reconcile_documents(cls, documents: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
        """
        Step 4: Document Check
        Mathematically reconciles line items with subtotals, tax, and totals,
        or bank transactions with running and closing balances.
        """
        reconciled = True
        logs = []

        for doc in documents:
            dtype = doc.get("document_type")
            if dtype == "invoice":
                inv_no = doc.get("invoice_number", "Unknown")
                items = doc.get("line_items", [])
                
                # Verify line totals
                sum_lines = 0.0
                for it in items:
                    expected_line = round(it["quantity"] * it["unit_price"], 2)
                    if abs(it["line_total"] - expected_line) > 0.01:
                        reconciled = False
                        logs.append(f"Math mismatch in {inv_no}: Line {it['item_number']} total {it['line_total']} != qty*price ({expected_line})")
                    sum_lines += it["line_total"]
                    
                sum_lines = round(sum_lines, 2)
                if abs(doc["subtotal"] - sum_lines) > 0.01:
                    reconciled = False
                    logs.append(f"Subtotal mismatch in {inv_no}: Stated {doc['subtotal']} != sum of lines {sum_lines}")

                expected_total = round(doc["subtotal"] - doc.get("discount_amount", 0.0) + doc["tax_amount"], 2)
                if abs(doc["grand_total"] - expected_total) > 0.01:
                    reconciled = False
                    logs.append(f"Grand total mismatch in {inv_no}: Stated {doc['grand_total']} != expected {expected_total}")

                if reconciled:
                    logs.append(f"Mathematical reconciliation verified for {inv_no}: Sum of line items ({doc['subtotal']}) + Tax ({doc['tax_amount']}) - Discount = Grand Total ({doc['grand_total']}) EXACT MATCH.")

            elif dtype == "bank_statement":
                acct = doc.get("account_number")
                bal = doc["opening_balance"]
                for tx in doc.get("transactions", []):
                    if tx["type"] == "CREDIT":
                        bal = round(bal + tx["amount"], 2)
                    else:
                        bal = round(bal - tx["amount"], 2)
                    if abs(tx["running_balance"] - bal) > 0.01:
                        reconciled = False
                        logs.append(f"Statement running balance mismatch for {acct} at {tx['tx_id']}")
                if abs(doc["closing_balance"] - bal) > 0.01:
                    reconciled = False
                    logs.append(f"Closing balance mismatch for {acct}")
                if reconciled:
                    logs.append(f"Statement {acct} reconciled: Opening ({doc['opening_balance']}) through all {len(doc.get('transactions', []))} transactions matches closing balance ({doc['closing_balance']}) EXACT MATCH.")

        return reconciled, logs

    @classmethod
    def generate_documents(cls, template: str, volume: int, config: GenerationConfig) -> Tuple[List[Dict[str, Any]], Dict[str, Any], bool, List[str]]:
        docs = []
        for i in range(volume):
            if template == "bank_statement":
                docs.append(cls.generate_bank_statement(i, config))
            else:
                docs.append(cls.generate_invoice(i, config))

        math_valid, logs = cls.reconcile_documents(docs)
        meta = {
            "document_count": len(docs),
            "template": template,
            "mathematical_reconciliation": "passed" if math_valid else "failed"
        }
        return docs, meta, math_valid, logs
