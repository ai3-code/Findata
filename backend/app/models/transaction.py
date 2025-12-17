from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, Boolean, Text
from sqlalchemy.sql import func
from ..database import Base


class Transaction(Base):
    """Raw transaction data from Excel file."""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, nullable=True)  # No longer linked to uploads

    # Identifiers
    office_key = Column(Integer, nullable=True)
    chart_number = Column(Integer, nullable=True, index=True)  # Patient UID
    visit_number = Column(Numeric(12, 2), nullable=True)
    procedure_id = Column(String(50), nullable=False, index=True)
    procedure_seq = Column(Integer, nullable=True)

    # Transaction info
    transaction_type = Column(String(20), nullable=True)  # Charge, Payment, Adjustment
    charge_code = Column(String(20), nullable=True)
    transaction_code = Column(String(20), nullable=True)
    transaction_code_desc = Column(String(255), nullable=True)
    modifiers = Column(String(50), nullable=True)

    # Dates
    date_of_service = Column(Date, nullable=False, index=True)
    date_of_entry = Column(Date, nullable=True)
    date_of_deposit = Column(Date, nullable=True)

    # Financial
    charges = Column(Numeric(12, 2), default=0)
    patient_payments = Column(Numeric(12, 2), default=0)
    insurance_payments = Column(Numeric(12, 2), default=0)
    total_payments = Column(Numeric(12, 2), default=0)
    adjustments = Column(Numeric(12, 2), default=0)
    units = Column(Numeric(10, 2), default=0)

    # Classifications
    surgery_type = Column(String(50), nullable=True)
    type_code = Column(String(20), nullable=True, index=True)
    billing_category = Column(String(50), nullable=True, index=True)
    billing_subcategory = Column(String(100), nullable=True)
    charge_code_norm = Column(String(20), nullable=True)

    # Carriers
    visit_primary_carrier = Column(String(100), nullable=True, index=True)
    visit_secondary_carrier = Column(String(100), nullable=True)
    transaction_carrier = Column(String(100), nullable=True)

    # Provider/Facility
    facility_name = Column(String(100), nullable=True)
    provider_profile = Column(String(100), nullable=True)
    financial_class = Column(String(20), nullable=True)

    # Diagnostics
    primary_dx_icd9 = Column(String(20), nullable=True)
    primary_dx_icd10 = Column(Text, nullable=True)

    # Payment info
    payment_method = Column(String(100), nullable=True)
    check_number = Column(String(50), nullable=True)

    # Flags
    void = Column(Boolean, default=False)
    flag_procedure_unknown = Column(Boolean, default=False)
    flag_billing_unknown = Column(Boolean, default=False)

    # DOS variants
    dos_str = Column(String(20), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
