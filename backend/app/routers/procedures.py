from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date

from ..database import get_db
from ..models.procedure import ProcedureSummary
from ..models.transaction import Transaction
from ..schemas.procedure import (
    ProcedureSummaryResponse,
    ProcedureListResponse,
    ProcedureDetailResponse,
    TransactionResponse,
)

router = APIRouter()


@router.get("/", response_model=ProcedureListResponse)
async def get_procedures(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    patient_id: Optional[int] = Query(None, description="Filter by chart_number"),
    type_code: Optional[str] = Query(None),
    carrier: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("date_of_service", description="Field to sort by"),
    sort_order: str = Query("desc", description="asc or desc"),
    db: Session = Depends(get_db),
):
    """Get list of procedures with filters and pagination."""
    query = db.query(ProcedureSummary)

    # Apply filters
    if date_from:
        query = query.filter(ProcedureSummary.date_of_service >= date_from)
    if date_to:
        query = query.filter(ProcedureSummary.date_of_service <= date_to)
    if patient_id:
        query = query.filter(ProcedureSummary.chart_number == patient_id)
    if type_code:
        query = query.filter(ProcedureSummary.type_code == type_code)
    if carrier:
        query = query.filter(ProcedureSummary.primary_carrier == carrier)
    if status:
        query = query.filter(ProcedureSummary.status == status)

    # Get total count
    total = query.count()

    # Sort
    sort_column = getattr(ProcedureSummary, sort_by, ProcedureSummary.date_of_service)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Paginate
    offset = (page - 1) * limit
    procedures = query.offset(offset).limit(limit).all()

    total_pages = (total + limit - 1) // limit

    return ProcedureListResponse(
        procedures=procedures,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/{procedure_id}")
async def get_procedure(
    procedure_id: str,
    db: Session = Depends(get_db),
):
    """Get procedure details with all transactions."""
    procedure = db.query(ProcedureSummary).filter(
        ProcedureSummary.procedure_id == procedure_id
    ).first()

    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")

    # Get all transactions for this procedure
    transactions = db.query(Transaction).filter(
        Transaction.procedure_id == procedure_id
    ).order_by(Transaction.date_of_entry).all()

    return {
        "procedure": {
            "id": procedure.id,
            "procedure_id": procedure.procedure_id,
            "chart_number": procedure.chart_number,
            "date_of_service": procedure.date_of_service,
            "surgery_type": procedure.surgery_type,
            "type_code": procedure.type_code,
            "primary_carrier": procedure.primary_carrier,
            "secondary_carrier": procedure.secondary_carrier,
            "facility_name": procedure.facility_name,
            "provider_profile": procedure.provider_profile,
            "total_charges": float(procedure.total_charges or 0),
            "total_payments": float(procedure.total_payments or 0),
            "total_adjustments": float(procedure.total_adjustments or 0),
            "patient_payments": float(procedure.patient_payments or 0),
            "insurance_payments": float(procedure.insurance_payments or 0),
            "pro_fee_charges": float(procedure.pro_fee_charges or 0),
            "pro_fee_payments": float(procedure.pro_fee_payments or 0),
            "facility_fee_charges": float(procedure.facility_fee_charges or 0),
            "facility_fee_payments": float(procedure.facility_fee_payments or 0),
            "first_charge_date": procedure.first_charge_date,
            "first_payment_date": procedure.first_payment_date,
            "last_payment_date": procedure.last_payment_date,
            "days_to_first_payment": procedure.days_to_first_payment,
            "collection_rate": float(procedure.collection_rate or 0),
            "status": procedure.status,
        },
        "transactions": [
            {
                "id": t.id,
                "transaction_type": t.transaction_type,
                "date_of_service": t.date_of_service,
                "date_of_entry": t.date_of_entry,
                "date_of_deposit": t.date_of_deposit,
                "charge_code": t.charge_code,
                "charges": float(t.charges or 0),
                "total_payments": float(t.total_payments or 0),
                "adjustments": float(t.adjustments or 0),
                "billing_category": t.billing_category,
                "billing_subcategory": t.billing_subcategory,
                "visit_primary_carrier": t.visit_primary_carrier,
                "payment_method": t.payment_method,
                "check_number": t.check_number,
            }
            for t in transactions
        ],
    }


@router.get("/{procedure_id}/timeline")
async def get_procedure_timeline(
    procedure_id: str,
    db: Session = Depends(get_db),
):
    """Get payment timeline for a procedure."""
    transactions = db.query(Transaction).filter(
        Transaction.procedure_id == procedure_id
    ).order_by(Transaction.date_of_entry).all()

    if not transactions:
        raise HTTPException(status_code=404, detail="Procedure not found")

    # Build timeline
    timeline = []
    cumulative_charges = 0
    cumulative_payments = 0

    for t in transactions:
        charges = float(t.charges or 0)
        payments = float(t.total_payments or 0)
        cumulative_charges += charges
        cumulative_payments += payments

        timeline.append({
            "date": t.date_of_entry or t.date_of_deposit or t.date_of_service,
            "type": t.transaction_type,
            "charges": charges,
            "payments": payments,
            "cumulative_charges": cumulative_charges,
            "cumulative_payments": cumulative_payments,
            "billing_category": t.billing_category,
            "description": t.transaction_code_desc,
        })

    return timeline


@router.get("/stats/summary")
async def get_procedure_stats(
    db: Session = Depends(get_db),
):
    """Get overall procedure statistics."""
    from sqlalchemy import func

    total = db.query(func.count(ProcedureSummary.id)).scalar()

    status_counts = db.query(
        ProcedureSummary.status,
        func.count(ProcedureSummary.id),
    ).group_by(ProcedureSummary.status).all()

    return {
        "total_procedures": total,
        "by_status": {s: c for s, c in status_counts},
    }
