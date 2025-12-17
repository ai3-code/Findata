from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date

from ..database import get_db
from ..services.analytics_engine import AnalyticsEngine
from ..services.payment_recovery import PaymentRecoveryService
from ..schemas.analytics import (
    DashboardMetrics,
    SurgeryTypeMetrics,
    InsuranceMetrics,
    BillingCategoryMetrics,
    RecoveryAnalysis,
    TrendDataPoint,
    AgingBucket,
)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    patient_id: Optional[int] = Query(None, description="Filter by patient (chart_number)"),
    type_code: Optional[str] = Query(None, description="Filter by surgery type"),
    carrier: Optional[str] = Query(None, description="Filter by insurance carrier"),
    db: Session = Depends(get_db),
):
    """Get main dashboard metrics."""
    engine = AnalyticsEngine(db)
    return engine.get_dashboard_metrics(
        date_from=date_from,
        date_to=date_to,
        patient_id=patient_id,
        type_code=type_code,
        carrier=carrier,
    )


@router.get("/by-surgery-type", response_model=List[SurgeryTypeMetrics])
async def get_by_surgery_type(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    patient_id: Optional[int] = Query(None),
    carrier: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get metrics grouped by surgery type."""
    engine = AnalyticsEngine(db)
    return engine.get_by_surgery_type(
        date_from=date_from,
        date_to=date_to,
        patient_id=patient_id,
        carrier=carrier,
    )


@router.get("/by-insurance", response_model=List[InsuranceMetrics])
async def get_by_insurance(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    patient_id: Optional[int] = Query(None),
    type_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get metrics grouped by insurance carrier."""
    engine = AnalyticsEngine(db)
    return engine.get_by_insurance(
        date_from=date_from,
        date_to=date_to,
        patient_id=patient_id,
        type_code=type_code,
    )


@router.get("/by-billing-category", response_model=List[BillingCategoryMetrics])
async def get_by_billing_category(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    patient_id: Optional[int] = Query(None),
    type_code: Optional[str] = Query(None),
    carrier: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get metrics grouped by billing category."""
    engine = AnalyticsEngine(db)
    return engine.get_by_billing_category(
        date_from=date_from,
        date_to=date_to,
        patient_id=patient_id,
        type_code=type_code,
        carrier=carrier,
    )


@router.get("/recovery")
async def get_recovery_analysis(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    patient_id: Optional[int] = Query(None),
    type_code: Optional[str] = Query(None),
    carrier: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get payment recovery analysis.

    Returns recovery rates at 1, 3, 6, and 12 month intervals from date of service.
    """
    service = PaymentRecoveryService(db)
    recovery = service.calculate_recovery_rates(
        date_from=date_from,
        date_to=date_to,
        patient_id=patient_id,
        type_code=type_code,
        carrier=carrier,
    )

    # Also get breakdown by type and carrier
    breakdown_by_type = service.get_recovery_by_surgery_type(
        date_from=date_from,
        date_to=date_to,
        carrier=carrier,
    )

    breakdown_by_carrier = service.get_recovery_by_insurance(
        date_from=date_from,
        date_to=date_to,
        type_code=type_code,
    )

    return {
        **recovery,
        "breakdown_by_type": breakdown_by_type,
        "breakdown_by_carrier": breakdown_by_carrier,
    }


@router.get("/expected-recovery")
async def get_expected_recovery(
    type_code: Optional[str] = Query(None),
    carrier: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get expected recovery rates for planning purposes.

    Based on historical data, predict what % of charges will be recovered
    at different time intervals.
    """
    service = PaymentRecoveryService(db)
    return service.get_expected_recovery(
        type_code=type_code,
        carrier=carrier,
    )


@router.get("/trends", response_model=List[TrendDataPoint])
async def get_trends(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    patient_id: Optional[int] = Query(None),
    type_code: Optional[str] = Query(None),
    carrier: Optional[str] = Query(None),
    granularity: str = Query("month", description="day, week, or month"),
    db: Session = Depends(get_db),
):
    """Get time-series trend data."""
    engine = AnalyticsEngine(db)
    return engine.get_trends(
        date_from=date_from,
        date_to=date_to,
        patient_id=patient_id,
        type_code=type_code,
        carrier=carrier,
        granularity=granularity,
    )


@router.get("/days-to-payment")
async def get_days_to_payment(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    patient_id: Optional[int] = Query(None),
    type_code: Optional[str] = Query(None),
    carrier: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get days to payment distribution analysis."""
    engine = AnalyticsEngine(db)
    return engine.get_days_to_payment_distribution(
        date_from=date_from,
        date_to=date_to,
        patient_id=patient_id,
        type_code=type_code,
        carrier=carrier,
    )


@router.get("/aging", response_model=List[AgingBucket])
async def get_aging_report(
    type_code: Optional[str] = Query(None),
    carrier: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get aging report for outstanding balances."""
    engine = AnalyticsEngine(db)
    return engine.get_aging_report(
        type_code=type_code,
        carrier=carrier,
    )


@router.get("/surgery-insurance-matrix")
async def get_surgery_insurance_matrix(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get metrics grouped by surgery type with breakdown by insurance carrier.

    Returns hierarchical data: surgery_type -> [carriers with metrics]
    """
    engine = AnalyticsEngine(db)
    return engine.get_surgery_insurance_matrix(
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/patient-surgery-insurance-matrix")
async def get_patient_surgery_insurance_matrix(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get metrics grouped by patient with breakdown by surgery type and insurance carrier.

    Returns hierarchical data: patient -> surgery_type -> [carriers with metrics]
    """
    engine = AnalyticsEngine(db)
    return engine.get_patient_surgery_insurance_matrix(
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/insurance-surgery-patient-matrix")
async def get_insurance_surgery_patient_matrix(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get metrics grouped by insurance carrier with breakdown by surgery type and patient.

    Returns hierarchical data: carrier -> surgery_type -> [patients with metrics]
    """
    engine = AnalyticsEngine(db)
    return engine.get_insurance_surgery_patient_matrix(
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/dynamic-matrix")
async def get_dynamic_matrix(
    group1: str = Query(..., description="First grouping dimension"),
    group2: Optional[str] = Query(None, description="Second grouping dimension"),
    group3: Optional[str] = Query(None, description="Third grouping dimension"),
    group4: Optional[str] = Query(None, description="Fourth grouping dimension"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get metrics with dynamic grouping hierarchy.

    Valid dimensions: surgery_type, carrier, billing_category, patient

    Example: ?group1=surgery_type&group2=carrier&group3=patient
    Returns: Surgery Type -> Carrier -> Patient hierarchy
    """
    group_by = [group1]
    if group2:
        group_by.append(group2)
    if group3:
        group_by.append(group3)
    if group4:
        group_by.append(group4)

    engine = AnalyticsEngine(db)
    return engine.get_dynamic_matrix(
        group_by=group_by,
        date_from=date_from,
        date_to=date_to,
    )
