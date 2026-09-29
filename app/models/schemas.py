from typing import List, Dict, Any, Optional, Union, Literal
from pydantic import BaseModel, Field

PipelineRoute = Literal["tabular", "relational", "document", "auto"]

class PrivacyRule(BaseModel):
    column: str
    action: Literal["mask", "hash", "differential_noise", "tokenize", "pseudonymize"] = "mask"
    noise_epsilon: Optional[float] = 0.5
    mask_char: Optional[str] = "*"

class LocaleSettings(BaseModel):
    locale: str = "en_US"
    currency: str = "USD"
    currency_symbol: str = "$"
    date_format: str = "%Y-%m-%d"
    tax_rate: float = 0.0825  # default 8.25%

class ColumnDefinition(BaseModel):
    name: str
    type: str = "string"  # string, integer, float, boolean, datetime, email, uuid, currency, address, phone
    nullable: bool = False
    is_primary_key: bool = False
    foreign_key_target: Optional[str] = None  # e.g., "customers.customer_id"
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    allowed_values: Optional[List[Any]] = None
    description: Optional[str] = None

class RelationMapping(BaseModel):
    parent_table: str
    child_table: str
    parent_key: str
    child_key: str
    cardinality: Literal["1:1", "1:N", "N:M"] = "1:N"
    min_children_per_parent: int = 1
    max_children_per_parent: int = 5

class TableSchema(BaseModel):
    table_name: str
    row_count: int = 20
    columns: List[ColumnDefinition] = []

class GenerationConfig(BaseModel):
    row_count: int = 25
    document_volume: int = 3
    edge_case_rate: float = Field(0.05, ge=0.0, le=0.5, description="Percentage of injected nulls, outliers, anomalies (0.0 to 0.5)")
    privacy_controls: List[PrivacyRule] = []
    locale_settings: LocaleSettings = LocaleSettings()

class SynthesisRequest(BaseModel):
    route: PipelineRoute = "auto"
    business_context: Optional[str] = "Enterprise business operations and transactional dataset"
    schemas: Optional[List[TableSchema]] = None
    relations: Optional[List[RelationMapping]] = None
    sample_data: Optional[Dict[str, List[Dict[str, Any]]]] = None
    document_template: Optional[Literal["invoice", "bank_statement", "medical_record", "employment_letter"]] = "invoice"
    config: GenerationConfig = GenerationConfig()

class ValidationReport(BaseModel):
    validation_status: Literal["passed", "failed", "warning"] = "passed"
    referential_integrity: bool = True
    mathematical_integrity: bool = True
    edge_cases_injected: int = 0
    privacy_rules_applied: int = 0
    details: List[str] = []

class SynthesisResponse(BaseModel):
    success: bool = True
    route_executed: str
    validation_status: Literal["passed", "failed", "warning"] = "passed"
    metadata: Dict[str, Any]
    validation_report: ValidationReport
    data: Dict[str, Any]  # tables or documents
