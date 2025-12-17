from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


class ProcedureBase(BaseModel):
    procedure_id: str
    chart_number: Optional[int]
    date_of_service: date
    surgery_type: Optional[str]
    type_code: Optional[str]
    primary_carrier: Optional[str]
    secondary_carrier: Optional[str]
    facility_name: Optional[str]
    provider_profile: Optional[str]


class ProcedureSummaryResponse(ProcedureBase):
    id: int
    total_charges: float
    total_payments: float
    total_adjustments: float
    patient_payments: float
    insurance_payments: float
    pro_fee_charges: float
    pro_fee_payments: float
    facility_fee_charges: float
    facility_fee_payments: float
    first_charge_date: Optional[date]
    first_payment_date: Optional[date]
    last_payment_date: Optional[date]
    days_to_first_payment: Optional[int]
    collection_rate: Optional[float]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProcedureListResponse(BaseModel):
    procedures: List[ProcedureSummaryResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class TransactionResponse(BaseModel):
    id: int
    procedure_id: str
    transaction_type: Optional[str]
    date_of_service: date
    date_of_entry: Optional[date]
    date_of_deposit: Optional[date]
    charges: float
    total_payments: float
    adjustments: float
    type_code: Optional[str]
    billing_category: Optional[str]
    billing_subcategory: Optional[str]
    visit_primary_carrier: Optional[str]

    class Config:
        from_attributes = True


class ProcedureDetailResponse(ProcedureSummaryResponse):
    transactions: List[TransactionResponse]
