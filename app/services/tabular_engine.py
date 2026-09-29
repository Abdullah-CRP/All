import random
import uuid
import datetime
from typing import List, Dict, Any, Tuple
import numpy as np
import pandas as pd
from app.models.schemas import TableSchema, ColumnDefinition, GenerationConfig
from app.core.security import PrivacyEngine

FIRST_NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Sam", "Chris", "Pat", "Riley", "Casey", "Avery",
    "Elena", "Mateo", "Priya", "Chen", "Aisha", "Liam", "Sophia", "Kenji", "Fatima", "Dmitri"
]
LAST_NAMES = [
    "Vance", "Mercer", "Sterling", "Holloway", "Chen", "Patel", "Rodriguez", "Kim", "O'Connor", "Al-Mansoor",
    "Kowalski", "Takahashi", "Dubois", "Nakamura", "Becker", "Sinclair", "Novak", "Adeyemi", "Fontaine", "Larsson"
]
DOMAINS = ["synthcorp.io", "nexusdata.dev", "quantum-systems.com", "vortexcloud.net", "apexfin.ai", "globalreach.org"]
CITIES = ["San Francisco", "Austin", "New York", "London", "Tokyo", "Berlin", "Singapore", "Toronto", "Sydney", "Zurich"]
STREETS = ["Market St", "Silicon Way", "Horizon Blvd", "Innovation Ave", "Broadway", "Pinehurst Rd", "Kingsway", "Lombard St"]
STATUS_CODES = ["ACTIVE", "PENDING", "COMPLETED", "SUSPENDED", "ARCHIVED", "FLAGGED"]
DEPARTMENTS = ["Engineering", "FinOps", "Product", "Data Science", "Security", "Marketing", "Legal", "Executive"]
CATEGORIES = ["Electronics", "Enterprise SaaS", "Cloud Infrastructure", "Hardware", "Consulting", "Subscriptions"]

class TabularEngine:
    """
    Step 2 & Step 3: Tabular Synthesis with Edge-Case Injection and Statistical Smoothing.
    """

    @classmethod
    def synthesize_cell_value(cls, col: ColumnDefinition, index: int, config: GenerationConfig) -> Any:
        col_type = col.type.lower()
        name_lower = col.name.lower()
        
        # Check allowed values
        if col.allowed_values and len(col.allowed_values) > 0:
            return random.choice(col.allowed_values)

        if col.is_primary_key or "uuid" in col_type:
            if "uuid" in col_type or "uuid" in name_lower:
                return str(uuid.uuid4())
            return index + 1001

        if col_type == "email":
            fname = random.choice(FIRST_NAMES).lower()
            lname = random.choice(LAST_NAMES).lower()
            domain = random.choice(DOMAINS)
            return f"{fname}.{lname}{random.randint(10, 99)}@{domain}"

        if col_type == "phone":
            return f"+1 ({random.randint(200, 999)}) {random.randint(200, 999)}-{random.randint(1000, 9999)}"

        if col_type == "address":
            return f"{random.randint(100, 9999)} {random.choice(STREETS)}, {random.choice(CITIES)}"

        if "name" in name_lower:
            if "first" in name_lower:
                return random.choice(FIRST_NAMES)
            if "last" in name_lower:
                return random.choice(LAST_NAMES)
            if "company" in name_lower or "org" in name_lower:
                return f"{random.choice(LAST_NAMES)} {random.choice(['Technologies', 'Capital', 'Labs', 'Solutions', 'Logistics'])}"
            return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

        if col_type == "currency" or any(k in name_lower for k in ["price", "amount", "salary", "balance", "total", "cost"]):
            min_v = col.min_value if col.min_value is not None else 50.0
            max_v = col.max_value if col.max_value is not None else 10000.0
            val = round(random.uniform(min_v, max_v), 2)
            return val

        if col_type == "integer" or any(k in name_lower for k in ["quantity", "count", "age", "qty", "score"]):
            min_v = int(col.min_value) if col.min_value is not None else 18
            max_v = int(col.max_value) if col.max_value is not None else 75
            return random.randint(min_v, max_v)

        if col_type == "float":
            min_v = col.min_value if col.min_value is not None else 0.0
            max_v = col.max_value if col.max_value is not None else 1.0
            return round(random.uniform(min_v, max_v), 4)

        if col_type == "boolean":
            return random.choice([True, False])

        if col_type == "datetime":
            days_ago = random.randint(0, 365)
            dt = datetime.datetime.now() - datetime.timedelta(days=days_ago, seconds=random.randint(0, 86400))
            return dt.strftime("%Y-%m-%d %H:%M:%S")

        if any(k in name_lower for k in ["status", "state"]):
            return random.choice(STATUS_CODES)
            
        if any(k in name_lower for k in ["department", "team"]):
            return random.choice(DEPARTMENTS)
            
        if any(k in name_lower for k in ["category", "type"]):
            return random.choice(CATEGORIES)

        return f"Synth-{random.choice(LAST_NAMES)}-{random.randint(100, 999)}"

    @classmethod
    def inject_edge_cases(
        cls, 
        rows: List[Dict[str, Any]], 
        columns: List[ColumnDefinition], 
        edge_case_rate: float
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Deliberately injects nulls, statistical outliers, and formatting anomalies
        at the specified edge_case_rate.
        """
        if edge_case_rate <= 0.0 or not rows:
            return rows, 0

        edge_cases_count = 0
        total_cells = len(rows) * len(columns)
        target_edge_cases = int(total_cells * edge_case_rate)

        # Do not corrupt primary keys or non-nullable foreign keys
        corruptible_cols = [c for c in columns if not c.is_primary_key and not c.foreign_key_target]
        if not corruptible_cols:
            return rows, 0

        anomalies_pool = [
            None,                           # Explicit Null
            "",                             # Empty String
            "N/A",                          # Sentinel String
            "   MALFORMED_WHITESPACE   ",   # Whitespace padding anomaly
            "1970-00-00",                   # Invalid Date anomaly
            999999999.99,                   # Numeric Outlier (massive spike)
            -999.0,                         # Negative boundary violation
            "NaN",                          # Stringified NaN
            "O'Reilly; DROP TABLE test;--",  # Special character / SQL-like anomaly
            "\u200B\u200C\uFEFF",           # Zero-width unicode anomaly
        ]

        # Inject anomalies across random targets
        for _ in range(target_edge_cases):
            row_idx = random.randint(0, len(rows) - 1)
            col = random.choice(corruptible_cols)
            val = rows[row_idx].get(col.name)
            
            # Select anomaly appropriate for column
            anomaly_type = random.choice(["null", "outlier", "format"])
            if anomaly_type == "null":
                rows[row_idx][col.name] = None
            elif anomaly_type == "outlier" and col.type in ["integer", "float", "currency"]:
                rows[row_idx][col.name] = round(float(val or 100) * random.choice([15.5, -5.0]), 2)
            else:
                rows[row_idx][col.name] = random.choice(anomalies_pool)
                
            edge_cases_count += 1

        return rows, edge_cases_count

    @classmethod
    def generate_table(
        cls,
        schema: TableSchema,
        config: GenerationConfig,
        foreign_key_pools: Dict[str, List[Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Generates full table rows, applies edge cases, executes privacy controls,
        and computes Pandas statistics.
        """
        rows = []
        fk_pools = foreign_key_pools or {}
        
        # 1. Base generation
        for i in range(schema.row_count):
            row = {}
            for col in schema.columns:
                # Check if this column maps to a parent foreign key
                if col.foreign_key_target and col.foreign_key_target in fk_pools:
                    pool = fk_pools[col.foreign_key_target]
                    row[col.name] = random.choice(pool) if pool else cls.synthesize_cell_value(col, i, config)
                else:
                    row[col.name] = cls.synthesize_cell_value(col, i, config)
            rows.append(row)

        # 2. Inject edge cases
        rows, edge_cases_injected = cls.inject_edge_cases(rows, schema.columns, config.edge_case_rate)

        # 3. Apply privacy controls
        rows, privacy_applied = PrivacyEngine.apply_rules_to_table(rows, config.privacy_controls)

        # 4. Statistical analysis & Pandas DataFrame validation
        df = pd.DataFrame(rows)
        stats = {
            "total_rows": len(df),
            "column_count": len(df.columns),
            "null_count": int(df.isnull().sum().sum()),
            "memory_usage_bytes": int(df.memory_usage(deep=True).sum()),
            "dtypes": {str(k): str(v) for k, v in df.dtypes.to_dict().items()}
        }

        meta = {
            "edge_cases_injected": edge_cases_injected,
            "privacy_rules_applied": privacy_applied,
            "stats": stats
        }

        return rows, meta
