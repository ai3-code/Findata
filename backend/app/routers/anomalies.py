from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from ..database import get_db
from ..services.anomaly_detector import AnomalyDetectorService

router = APIRouter()


@router.get("/")
async def get_all_anomalies(
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """
    Get all detected anomalies in the billing data.

    Detects:
    - Payments exceeding charges (should never happen)
    - Missing payments for old procedures
    - Potential duplicate procedures
    """
    service = AnomalyDetectorService(db)
    return service.detect_all_anomalies(date_from=date_from, date_to=date_to)


@router.get("/payment-exceeds-charge")
async def get_payment_exceeds_charge(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get procedures where payments exceed charges.
    This is a data quality issue - payments should never exceed billed charges.
    """
    service = AnomalyDetectorService(db)
    return service.detect_payments_exceed_charges(date_from=date_from, date_to=date_to)


@router.get("/missing-payments")
async def get_missing_payments(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    days_threshold: int = Query(180, description="Days since DOS to consider missing"),
    db: Session = Depends(get_db),
):
    """
    Get old procedures with zero payments.
    """
    service = AnomalyDetectorService(db)
    return service.detect_missing_payments(
        date_from=date_from,
        date_to=date_to,
        days_threshold=days_threshold,
    )


@router.get("/duplicates")
async def get_duplicate_procedures(
    db: Session = Depends(get_db),
):
    """
    Get potential duplicate procedures (same patient, date, type).
    """
    service = AnomalyDetectorService(db)
    return service.detect_duplicate_procedures()


@router.get("/by-carrier")
async def get_anomalies_by_carrier(
    db: Session = Depends(get_db),
):
    """
    Get anomaly summary grouped by insurance carrier.
    Shows which carriers have the most payment > charge issues.
    """
    service = AnomalyDetectorService(db)
    return service.get_anomaly_summary_by_carrier()


@router.get("/by-patient")
async def get_anomalies_by_patient(
    limit: int = Query(20, description="Max patients to return"),
    db: Session = Depends(get_db),
):
    """
    Get patients with the most anomalies.
    """
    service = AnomalyDetectorService(db)
    return service.get_anomaly_summary_by_patient(limit=limit)
