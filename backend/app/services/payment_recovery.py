from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Dict, List, Any, Optional
from datetime import date, timedelta
import logging

from ..models.transaction import Transaction
from ..models.procedure import ProcedureSummary

logger = logging.getLogger(__name__)


class PaymentRecoveryService:
    """Calculate payment recovery rates at different time intervals."""

    def __init__(self, db: Session):
        self.db = db

    def calculate_recovery_rates(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        patient_id: Optional[int] = None,
        type_code: Optional[str] = None,
        carrier: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculate recovery metrics including:
        - Overall collection rate (total payments / total charges)
        - Payment velocity (% of payments received within N days of DOS)
        """
        # Get all procedures matching filters
        query = self.db.query(ProcedureSummary)

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

        procedures = query.all()

        if not procedures:
            return {
                "recovery_1_month": {"percent": 0, "amount": 0, "procedures": 0},
                "recovery_3_month": {"percent": 0, "amount": 0, "procedures": 0},
                "recovery_6_month": {"percent": 0, "amount": 0, "procedures": 0},
                "recovery_12_month": {"percent": 0, "amount": 0, "procedures": 0},
                "overall_collection_rate": 0,
                "total_charges": 0,
                "total_payments": 0,
            }

        # Calculate overall metrics from ProcedureSummary
        total_charges = sum(float(p.total_charges or 0) for p in procedures)
        total_payments = sum(float(p.total_payments or 0) for p in procedures)
        overall_rate = (total_payments / total_charges * 100) if total_charges > 0 else 0

        # Calculate payment velocity at each time window
        # This shows what % of TOTAL CHARGES were paid within N days
        recovery_1m = self._calc_payment_velocity(procedures, 30, total_charges)
        recovery_3m = self._calc_payment_velocity(procedures, 90, total_charges)
        recovery_6m = self._calc_payment_velocity(procedures, 180, total_charges)
        recovery_12m = self._calc_payment_velocity(procedures, 365, total_charges)

        return {
            "recovery_1_month": recovery_1m,
            "recovery_3_month": recovery_3m,
            "recovery_6_month": recovery_6m,
            "recovery_12_month": recovery_12m,
            "overall_collection_rate": round(overall_rate, 2),
            "total_charges": round(total_charges, 2),
            "total_payments": round(total_payments, 2),
        }

    def _calc_payment_velocity(
        self,
        procedures: List[ProcedureSummary],
        days: int,
        total_charges: float,
    ) -> Dict[str, Any]:
        """
        Calculate what % of total charges were paid within N days of DOS.

        For each procedure:
        - Get payments received within N days of its date_of_service
        - Sum all these payments
        - Divide by total charges
        """
        payments_in_window = 0

        for proc in procedures:
            if not proc.date_of_service:
                continue
            window_payments = self._get_payments_within_days(
                proc.procedure_id,
                proc.date_of_service,
                days
            )
            payments_in_window += window_payments

        # Calculate percentage - cap at overall collection rate (can't recover more than total)
        percent = (payments_in_window / total_charges * 100) if total_charges > 0 else 0

        return {
            "percent": round(min(percent, 100.0), 2),
            "amount": round(payments_in_window, 2),
            "procedures": len(procedures),
        }

    def _get_payments_within_days(self, procedure_id: str, dos: date, days: int) -> float:
        """Get total payments received within N days of date of service."""
        if not dos:
            return 0

        window_end = dos + timedelta(days=days)
        today = date.today()

        # Don't look beyond today
        if window_end > today:
            window_end = today

        # Query payments for this procedure within the window
        result = self.db.query(
            func.sum(Transaction.total_payments)
        ).filter(
            Transaction.procedure_id == procedure_id,
            Transaction.date_of_deposit.isnot(None),
            Transaction.date_of_deposit <= window_end,
            Transaction.total_payments > 0,
        ).scalar()

        return float(result or 0)

    def get_recovery_by_surgery_type(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        carrier: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get recovery rates broken down by surgery type."""
        types = self.db.query(ProcedureSummary.type_code).distinct().all()

        results = []
        for (type_code,) in types:
            if not type_code:
                continue

            recovery = self.calculate_recovery_rates(
                date_from=date_from,
                date_to=date_to,
                type_code=type_code,
                carrier=carrier,
            )

            results.append({
                "type_code": type_code,
                "recovery_1_month": recovery["recovery_1_month"]["percent"],
                "recovery_3_month": recovery["recovery_3_month"]["percent"],
                "recovery_6_month": recovery["recovery_6_month"]["percent"],
                "recovery_12_month": recovery["recovery_12_month"]["percent"],
                "overall_collection_rate": recovery["overall_collection_rate"],
                "total_charges": recovery["total_charges"],
                "total_payments": recovery["total_payments"],
            })

        return results

    def get_recovery_by_insurance(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        type_code: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get recovery rates broken down by insurance carrier."""
        carriers = self.db.query(ProcedureSummary.primary_carrier).filter(
            ProcedureSummary.primary_carrier.isnot(None)
        ).distinct().all()

        results = []
        for (carrier,) in carriers:
            if not carrier:
                continue

            recovery = self.calculate_recovery_rates(
                date_from=date_from,
                date_to=date_to,
                type_code=type_code,
                carrier=carrier,
            )

            results.append({
                "carrier": carrier,
                "recovery_1_month": recovery["recovery_1_month"]["percent"],
                "recovery_3_month": recovery["recovery_3_month"]["percent"],
                "recovery_6_month": recovery["recovery_6_month"]["percent"],
                "recovery_12_month": recovery["recovery_12_month"]["percent"],
                "overall_collection_rate": recovery["overall_collection_rate"],
                "total_charges": recovery["total_charges"],
                "total_payments": recovery["total_payments"],
            })

        return results

    def get_expected_recovery(
        self,
        type_code: Optional[str] = None,
        carrier: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get expected recovery rates based on historical data.
        """
        recovery = self.calculate_recovery_rates(
            type_code=type_code,
            carrier=carrier,
        )

        return {
            "expected_1_month_percent": recovery["recovery_1_month"]["percent"],
            "expected_3_month_percent": recovery["recovery_3_month"]["percent"],
            "expected_6_month_percent": recovery["recovery_6_month"]["percent"],
            "expected_12_month_percent": recovery["recovery_12_month"]["percent"],
            "overall_collection_rate": recovery["overall_collection_rate"],
            "based_on_procedures": recovery["recovery_12_month"]["procedures"],
            "type_code": type_code,
            "carrier": carrier,
        }
