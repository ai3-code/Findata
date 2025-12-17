from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date

from ..database import get_db
from ..models.procedure import ProcedureSummary
from ..models.transaction import Transaction
from ..schemas.patient import PatientSummary, PatientListResponse, PatientDetail

router = APIRouter()


@router.get("/", response_model=PatientListResponse)
async def get_patients(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by chart number"),
    db: Session = Depends(get_db),
):
    """Get list of all patients with summary statistics."""
    # Base query - group by chart_number
    query = db.query(
        ProcedureSummary.chart_number,
        func.count(ProcedureSummary.id).label("procedure_count"),
        func.sum(ProcedureSummary.total_charges).label("total_charges"),
        func.sum(ProcedureSummary.total_payments).label("total_payments"),
        func.min(ProcedureSummary.date_of_service).label("first_visit"),
        func.max(ProcedureSummary.date_of_service).label("last_visit"),
    ).filter(
        ProcedureSummary.chart_number.isnot(None)
    ).group_by(
        ProcedureSummary.chart_number
    )

    # Search filter
    if search:
        query = query.filter(
            ProcedureSummary.chart_number.cast(str).contains(search)
        )

    # Get total count
    total = query.count()

    # Paginate
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()

    patients = []
    for r in results:
        total_charges = float(r.total_charges or 0)
        total_payments = float(r.total_payments or 0)
        collection_rate = (total_payments / total_charges * 100) if total_charges > 0 else 0

        patients.append(PatientSummary(
            chart_number=r.chart_number,
            procedure_count=r.procedure_count,
            total_charges=round(total_charges, 2),
            total_payments=round(total_payments, 2),
            collection_rate=round(collection_rate, 2),
            first_visit=r.first_visit,
            last_visit=r.last_visit,
        ))

    return PatientListResponse(
        patients=patients,
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{chart_number}", response_model=PatientDetail)
async def get_patient(
    chart_number: int,
    db: Session = Depends(get_db),
):
    """Get detailed patient information."""
    # Get all procedures for this patient
    procedures = db.query(ProcedureSummary).filter(
        ProcedureSummary.chart_number == chart_number
    ).all()

    if not procedures:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Calculate aggregates
    total_charges = sum(float(p.total_charges or 0) for p in procedures)
    total_payments = sum(float(p.total_payments or 0) for p in procedures)
    collection_rate = (total_payments / total_charges * 100) if total_charges > 0 else 0

    # Get unique surgery types and carriers
    surgery_types = list(set(p.type_code for p in procedures if p.type_code))
    carriers = list(set(p.primary_carrier for p in procedures if p.primary_carrier))

    # Average days to payment
    days_list = [p.days_to_first_payment for p in procedures if p.days_to_first_payment]
    avg_days = sum(days_list) / len(days_list) if days_list else None

    # Date range
    dates = [p.date_of_service for p in procedures if p.date_of_service]
    first_visit = min(dates) if dates else None
    last_visit = max(dates) if dates else None

    return PatientDetail(
        chart_number=chart_number,
        procedure_count=len(procedures),
        total_charges=round(total_charges, 2),
        total_payments=round(total_payments, 2),
        collection_rate=round(collection_rate, 2),
        first_visit=first_visit,
        last_visit=last_visit,
        surgery_types=surgery_types,
        primary_carriers=carriers,
        avg_days_to_payment=round(avg_days, 1) if avg_days else None,
    )


@router.get("/{chart_number}/procedures")
async def get_patient_procedures(
    chart_number: int,
    db: Session = Depends(get_db),
):
    """Get all procedures for a patient."""
    procedures = db.query(ProcedureSummary).filter(
        ProcedureSummary.chart_number == chart_number
    ).order_by(ProcedureSummary.date_of_service.desc()).all()

    if not procedures:
        raise HTTPException(status_code=404, detail="Patient not found")

    return [
        {
            "procedure_id": p.procedure_id,
            "date_of_service": p.date_of_service,
            "type_code": p.type_code,
            "surgery_type": p.surgery_type,
            "primary_carrier": p.primary_carrier,
            "total_charges": float(p.total_charges or 0),
            "total_payments": float(p.total_payments or 0),
            "collection_rate": float(p.collection_rate or 0),
            "status": p.status,
            "days_to_first_payment": p.days_to_first_payment,
        }
        for p in procedures
    ]


@router.get("/{chart_number}/timeline")
async def get_patient_timeline(
    chart_number: int,
    db: Session = Depends(get_db),
):
    """Get payment timeline for a patient."""
    # Get all transactions for this patient
    transactions = db.query(Transaction).filter(
        Transaction.chart_number == chart_number
    ).order_by(Transaction.date_of_service, Transaction.date_of_entry).all()

    if not transactions:
        raise HTTPException(status_code=404, detail="Patient not found")

    timeline = []
    for t in transactions:
        timeline.append({
            "procedure_id": t.procedure_id,
            "transaction_type": t.transaction_type,
            "date_of_service": t.date_of_service,
            "date_of_entry": t.date_of_entry,
            "date_of_deposit": t.date_of_deposit,
            "charges": float(t.charges or 0),
            "total_payments": float(t.total_payments or 0),
            "type_code": t.type_code,
            "billing_category": t.billing_category,
            "carrier": t.visit_primary_carrier,
        })

    return timeline
