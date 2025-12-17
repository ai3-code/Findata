from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models.procedure import ProcedureSummary
from ..models.transaction import Transaction

router = APIRouter()


@router.get("/patients")
async def get_patient_options(
    db: Session = Depends(get_db),
):
    """Get list of patients for filter dropdown."""
    results = db.query(
        ProcedureSummary.chart_number,
        func.count(ProcedureSummary.id).label("procedure_count"),
    ).filter(
        ProcedureSummary.chart_number.isnot(None)
    ).group_by(
        ProcedureSummary.chart_number
    ).order_by(
        ProcedureSummary.chart_number
    ).all()

    return [
        {
            "value": str(r.chart_number),
            "label": f"Patient {r.chart_number}",
            "count": r.procedure_count,
        }
        for r in results
    ]


@router.get("/surgery-types")
async def get_surgery_type_options(
    db: Session = Depends(get_db),
):
    """Get list of surgery types for filter dropdown."""
    results = db.query(
        ProcedureSummary.type_code,
        ProcedureSummary.surgery_type,
        func.count(ProcedureSummary.id).label("procedure_count"),
    ).filter(
        ProcedureSummary.type_code.isnot(None)
    ).group_by(
        ProcedureSummary.type_code,
        ProcedureSummary.surgery_type,
    ).order_by(
        ProcedureSummary.type_code
    ).all()

    return [
        {
            "value": r.type_code,
            "label": r.surgery_type or r.type_code,
            "count": r.procedure_count,
        }
        for r in results
    ]


@router.get("/carriers")
async def get_carrier_options(
    db: Session = Depends(get_db),
):
    """Get list of insurance carriers for filter dropdown."""
    results = db.query(
        ProcedureSummary.primary_carrier,
        func.count(ProcedureSummary.id).label("procedure_count"),
    ).filter(
        ProcedureSummary.primary_carrier.isnot(None)
    ).group_by(
        ProcedureSummary.primary_carrier
    ).order_by(
        func.count(ProcedureSummary.id).desc()
    ).all()

    return [
        {
            "value": r.primary_carrier,
            "label": r.primary_carrier,
            "count": r.procedure_count,
        }
        for r in results
    ]


@router.get("/billing-categories")
async def get_billing_category_options(
    db: Session = Depends(get_db),
):
    """Get list of billing categories for filter dropdown."""
    results = db.query(
        Transaction.billing_category,
        Transaction.billing_subcategory,
    ).filter(
        Transaction.billing_category.isnot(None)
    ).distinct().all()

    # Group by category
    categories = {}
    for r in results:
        if r.billing_category not in categories:
            categories[r.billing_category] = []
        if r.billing_subcategory:
            categories[r.billing_category].append(r.billing_subcategory)

    return [
        {
            "value": cat,
            "label": cat,
            "subcategories": sorted(set(subs)),
        }
        for cat, subs in categories.items()
    ]


@router.get("/date-range")
async def get_date_range(
    db: Session = Depends(get_db),
):
    """Get min and max dates in the data."""
    result = db.query(
        func.min(ProcedureSummary.date_of_service).label("min_date"),
        func.max(ProcedureSummary.date_of_service).label("max_date"),
    ).first()

    return {
        "min_date": result.min_date.isoformat() if result.min_date else None,
        "max_date": result.max_date.isoformat() if result.max_date else None,
    }


@router.get("/all")
async def get_all_filter_options(
    db: Session = Depends(get_db),
):
    """Get all filter options in a single request."""
    return {
        "patients": await get_patient_options(db),
        "surgery_types": await get_surgery_type_options(db),
        "carriers": await get_carrier_options(db),
        "billing_categories": await get_billing_category_options(db),
        "date_range": await get_date_range(db),
    }
