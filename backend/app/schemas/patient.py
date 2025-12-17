from pydantic import BaseModel
from datetime import date
from typing import Optional, List


class PatientSummary(BaseModel):
    chart_number: int
    procedure_count: int
    total_charges: float
    total_payments: float
    collection_rate: float
    first_visit: Optional[date]
    last_visit: Optional[date]


class PatientListResponse(BaseModel):
    patients: List[PatientSummary]
    total: int
    page: int
    limit: int


class PatientDetail(PatientSummary):
    surgery_types: List[str]
    primary_carriers: List[str]
    avg_days_to_payment: Optional[float]


class FilterOption(BaseModel):
    value: str
    label: str
    count: Optional[int] = None


class FilterOptions(BaseModel):
    patients: List[FilterOption]
    surgery_types: List[FilterOption]
    carriers: List[FilterOption]
    billing_categories: List[FilterOption]
    date_range: dict  # {min_date, max_date}
