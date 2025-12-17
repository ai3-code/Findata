from pydantic import BaseModel
from datetime import date
from typing import Optional, List


class DateRangeFilter(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    patient_id: Optional[int] = None  # chart_number
    type_code: Optional[str] = None
    carrier: Optional[str] = None
    billing_category: Optional[str] = None


class DashboardMetrics(BaseModel):
    total_charges: float
    total_payments: float
    total_adjustments: float
    collection_rate: float
    procedure_count: int
    patient_count: int
    avg_days_to_payment: Optional[float]


class SurgeryTypeMetrics(BaseModel):
    type_code: str
    surgery_type: Optional[str]
    procedure_count: int
    total_charges: float
    total_payments: float
    collection_rate: float
    avg_days_to_payment: Optional[float]


class InsuranceMetrics(BaseModel):
    carrier: str
    procedure_count: int
    total_charges: float
    total_payments: float
    collection_rate: float
    avg_days_to_payment: Optional[float]


class BillingCategoryMetrics(BaseModel):
    billing_category: str
    billing_subcategory: Optional[str]
    total_charges: float
    total_payments: float
    collection_rate: float


class RecoveryRate(BaseModel):
    percent: float
    amount: float
    procedures: int


class RecoveryAnalysis(BaseModel):
    recovery_1_month: RecoveryRate
    recovery_3_month: RecoveryRate
    recovery_6_month: RecoveryRate
    recovery_12_month: RecoveryRate


class TrendDataPoint(BaseModel):
    period: str
    charges: float
    payments: float
    adjustments: float
    procedure_count: int
    collection_rate: float


class DaysToPaymentDistribution(BaseModel):
    range: str
    count: int
    percent: float


class AgingBucket(BaseModel):
    age_bucket: str
    procedure_count: int
    total_outstanding: float
    percent: float
