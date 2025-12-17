from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric
from sqlalchemy.sql import func
from ..database import Base


class ProcedureSummary(Base):
    """Aggregated procedure summary - one row per procedure."""

    __tablename__ = "procedure_summary"

    id = Column(Integer, primary_key=True, index=True)
    procedure_id = Column(String(50), unique=True, nullable=False, index=True)

    # Patient info
    chart_number = Column(Integer, nullable=True, index=True)  # Patient UID

    # Surgery info
    date_of_service = Column(Date, nullable=False, index=True)
    surgery_type = Column(String(50), nullable=True)
    type_code = Column(String(20), nullable=True, index=True)

    # Carriers
    primary_carrier = Column(String(100), nullable=True, index=True)
    secondary_carrier = Column(String(100), nullable=True)

    # Provider/Facility
    facility_name = Column(String(100), nullable=True)
    provider_profile = Column(String(100), nullable=True)

    # Aggregated financials - Total
    total_charges = Column(Numeric(12, 2), default=0)
    total_payments = Column(Numeric(12, 2), default=0)
    total_adjustments = Column(Numeric(12, 2), default=0)
    patient_payments = Column(Numeric(12, 2), default=0)
    insurance_payments = Column(Numeric(12, 2), default=0)

    # By billing category - Pro Fee
    pro_fee_charges = Column(Numeric(12, 2), default=0)
    pro_fee_payments = Column(Numeric(12, 2), default=0)

    # By billing category - Facility Fee
    facility_fee_charges = Column(Numeric(12, 2), default=0)
    facility_fee_payments = Column(Numeric(12, 2), default=0)

    # Timing
    first_charge_date = Column(Date, nullable=True)
    first_payment_date = Column(Date, nullable=True)
    last_payment_date = Column(Date, nullable=True)
    days_to_first_payment = Column(Integer, nullable=True)

    # Recovery metrics
    collection_rate = Column(Numeric(10, 2), nullable=True)  # (payments / charges) * 100

    # Status: pending, partial, collected, written_off
    status = Column(String(20), default="pending")

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
