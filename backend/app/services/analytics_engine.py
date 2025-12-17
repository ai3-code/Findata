from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, extract
from typing import Dict, List, Any, Optional
from datetime import date, timedelta
import logging

from ..models.transaction import Transaction
from ..models.procedure import ProcedureSummary

logger = logging.getLogger(__name__)


class AnalyticsEngine:
    """Central analytics calculation engine."""

    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_metrics(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        patient_id: Optional[int] = None,
        type_code: Optional[str] = None,
        carrier: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get main dashboard metrics."""
        query = self.db.query(ProcedureSummary)
        query = self._apply_filters(query, date_from, date_to, patient_id, type_code, carrier)

        procedures = query.all()

        if not procedures:
            return {
                "total_charges": 0,
                "total_payments": 0,
                "total_adjustments": 0,
                "collection_rate": 0,
                "procedure_count": 0,
                "patient_count": 0,
                "avg_days_to_payment": None,
            }

        total_charges = sum(float(p.total_charges or 0) for p in procedures)
        total_payments = sum(float(p.total_payments or 0) for p in procedures)
        total_adjustments = sum(float(p.total_adjustments or 0) for p in procedures)

        # Unique patients
        patient_ids = set(p.chart_number for p in procedures if p.chart_number)

        # Average days to payment
        days_list = [p.days_to_first_payment for p in procedures if p.days_to_first_payment is not None]
        avg_days = sum(days_list) / len(days_list) if days_list else None

        collection_rate = (total_payments / total_charges * 100) if total_charges > 0 else 0

        return {
            "total_charges": round(total_charges, 2),
            "total_payments": round(total_payments, 2),
            "total_adjustments": round(total_adjustments, 2),
            "collection_rate": round(collection_rate, 2),
            "procedure_count": len(procedures),
            "patient_count": len(patient_ids),
            "avg_days_to_payment": round(avg_days, 1) if avg_days else None,
        }

    def get_by_surgery_type(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        patient_id: Optional[int] = None,
        carrier: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get metrics grouped by surgery type."""
        query = self.db.query(
            ProcedureSummary.type_code,
            ProcedureSummary.surgery_type,
            func.count(ProcedureSummary.id).label("procedure_count"),
            func.sum(ProcedureSummary.total_charges).label("total_charges"),
            func.sum(ProcedureSummary.total_payments).label("total_payments"),
            func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
        ).group_by(
            ProcedureSummary.type_code,
            ProcedureSummary.surgery_type,
        )

        # Apply filters
        if date_from:
            query = query.filter(ProcedureSummary.date_of_service >= date_from)
        if date_to:
            query = query.filter(ProcedureSummary.date_of_service <= date_to)
        if patient_id:
            query = query.filter(ProcedureSummary.chart_number == patient_id)
        if carrier:
            query = query.filter(ProcedureSummary.primary_carrier == carrier)

        results = []
        for r in query.all():
            total_charges = float(r.total_charges or 0)
            total_payments = float(r.total_payments or 0)
            collection_rate = (total_payments / total_charges * 100) if total_charges > 0 else 0

            results.append({
                "type_code": r.type_code,
                "surgery_type": r.surgery_type,
                "procedure_count": r.procedure_count,
                "total_charges": round(total_charges, 2),
                "total_payments": round(total_payments, 2),
                "collection_rate": round(collection_rate, 2),
                "avg_days_to_payment": round(float(r.avg_days), 1) if r.avg_days else None,
            })

        return results

    def get_by_insurance(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        patient_id: Optional[int] = None,
        type_code: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get metrics grouped by insurance carrier."""
        query = self.db.query(
            ProcedureSummary.primary_carrier,
            func.count(ProcedureSummary.id).label("procedure_count"),
            func.sum(ProcedureSummary.total_charges).label("total_charges"),
            func.sum(ProcedureSummary.total_payments).label("total_payments"),
            func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
        ).filter(
            ProcedureSummary.primary_carrier.isnot(None)
        ).group_by(
            ProcedureSummary.primary_carrier,
        )

        # Apply filters
        if date_from:
            query = query.filter(ProcedureSummary.date_of_service >= date_from)
        if date_to:
            query = query.filter(ProcedureSummary.date_of_service <= date_to)
        if patient_id:
            query = query.filter(ProcedureSummary.chart_number == patient_id)
        if type_code:
            query = query.filter(ProcedureSummary.type_code == type_code)

        results = []
        for r in query.all():
            total_charges = float(r.total_charges or 0)
            total_payments = float(r.total_payments or 0)
            collection_rate = (total_payments / total_charges * 100) if total_charges > 0 else 0

            results.append({
                "carrier": r.primary_carrier,
                "procedure_count": r.procedure_count,
                "total_charges": round(total_charges, 2),
                "total_payments": round(total_payments, 2),
                "collection_rate": round(collection_rate, 2),
                "avg_days_to_payment": round(float(r.avg_days), 1) if r.avg_days else None,
            })

        return sorted(results, key=lambda x: x["total_charges"], reverse=True)

    def get_by_billing_category(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        patient_id: Optional[int] = None,
        type_code: Optional[str] = None,
        carrier: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get metrics grouped by billing category."""
        query = self.db.query(
            Transaction.billing_category,
            Transaction.billing_subcategory,
            func.sum(Transaction.charges).label("total_charges"),
            func.sum(Transaction.total_payments).label("total_payments"),
        ).filter(
            Transaction.billing_category.isnot(None)
        ).group_by(
            Transaction.billing_category,
            Transaction.billing_subcategory,
        )

        # Apply filters
        if date_from:
            query = query.filter(Transaction.date_of_service >= date_from)
        if date_to:
            query = query.filter(Transaction.date_of_service <= date_to)
        if patient_id:
            query = query.filter(Transaction.chart_number == patient_id)
        if type_code:
            query = query.filter(Transaction.type_code == type_code)
        if carrier:
            query = query.filter(Transaction.visit_primary_carrier == carrier)

        results = []
        for r in query.all():
            total_charges = float(r.total_charges or 0)
            total_payments = float(r.total_payments or 0)
            collection_rate = (total_payments / total_charges * 100) if total_charges > 0 else 0

            results.append({
                "billing_category": r.billing_category,
                "billing_subcategory": r.billing_subcategory,
                "total_charges": round(total_charges, 2),
                "total_payments": round(total_payments, 2),
                "collection_rate": round(collection_rate, 2),
            })

        return results

    def get_trends(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        patient_id: Optional[int] = None,
        type_code: Optional[str] = None,
        carrier: Optional[str] = None,
        granularity: str = "month",
    ) -> List[Dict[str, Any]]:
        """Get time-series trend data."""
        query = self.db.query(ProcedureSummary)
        query = self._apply_filters(query, date_from, date_to, patient_id, type_code, carrier)

        procedures = query.order_by(ProcedureSummary.date_of_service).all()

        # Group by period
        from collections import defaultdict
        periods = defaultdict(lambda: {"charges": 0, "payments": 0, "adjustments": 0, "count": 0})

        for p in procedures:
            if p.date_of_service:
                if granularity == "day":
                    period = p.date_of_service.strftime("%Y-%m-%d")
                elif granularity == "week":
                    period = p.date_of_service.strftime("%Y-W%W")
                else:  # month
                    period = p.date_of_service.strftime("%Y-%m")

                periods[period]["charges"] += float(p.total_charges or 0)
                periods[period]["payments"] += float(p.total_payments or 0)
                periods[period]["adjustments"] += float(p.total_adjustments or 0)
                periods[period]["count"] += 1

        results = []
        for period in sorted(periods.keys()):
            data = periods[period]
            collection_rate = (data["payments"] / data["charges"] * 100) if data["charges"] > 0 else 0
            results.append({
                "period": period,
                "charges": round(data["charges"], 2),
                "payments": round(data["payments"], 2),
                "adjustments": round(data["adjustments"], 2),
                "procedure_count": data["count"],
                "collection_rate": round(collection_rate, 2),
            })

        return results

    def get_days_to_payment_distribution(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        patient_id: Optional[int] = None,
        type_code: Optional[str] = None,
        carrier: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get distribution of days to payment."""
        query = self.db.query(ProcedureSummary).filter(
            ProcedureSummary.days_to_first_payment.isnot(None)
        )
        query = self._apply_filters(query, date_from, date_to, patient_id, type_code, carrier)

        procedures = query.all()

        if not procedures:
            return {
                "avg_days": None,
                "median_days": None,
                "distribution": [],
            }

        days_list = [p.days_to_first_payment for p in procedures]
        days_list.sort()

        # Buckets
        buckets = [
            (0, 30, "0-30 days"),
            (31, 60, "31-60 days"),
            (61, 90, "61-90 days"),
            (91, 120, "91-120 days"),
            (121, 180, "121-180 days"),
            (181, 365, "181-365 days"),
            (366, 99999, "365+ days"),
        ]

        distribution = []
        total = len(days_list)
        for min_days, max_days, label in buckets:
            count = sum(1 for d in days_list if min_days <= d <= max_days)
            distribution.append({
                "range": label,
                "count": count,
                "percent": round(count / total * 100, 1) if total > 0 else 0,
            })

        return {
            "avg_days": round(sum(days_list) / len(days_list), 1),
            "median_days": days_list[len(days_list) // 2],
            "min_days": min(days_list),
            "max_days": max(days_list),
            "distribution": distribution,
        }

    def get_aging_report(
        self,
        type_code: Optional[str] = None,
        carrier: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get aging report for outstanding balances."""
        today = date.today()

        query = self.db.query(ProcedureSummary).filter(
            ProcedureSummary.status.in_(["pending", "partial"])
        )

        if type_code:
            query = query.filter(ProcedureSummary.type_code == type_code)
        if carrier:
            query = query.filter(ProcedureSummary.primary_carrier == carrier)

        procedures = query.all()

        buckets = [
            (0, 30, "0-30 days"),
            (31, 60, "31-60 days"),
            (61, 90, "61-90 days"),
            (91, 120, "91-120 days"),
            (121, 99999, "120+ days"),
        ]

        results = []
        total_outstanding = 0

        for min_days, max_days, label in buckets:
            bucket_procs = [
                p for p in procedures
                if p.date_of_service and min_days <= (today - p.date_of_service).days <= max_days
            ]
            outstanding = sum(
                float(p.total_charges or 0) - float(p.total_payments or 0)
                for p in bucket_procs
            )
            total_outstanding += outstanding
            results.append({
                "age_bucket": label,
                "procedure_count": len(bucket_procs),
                "total_outstanding": round(outstanding, 2),
                "percent": 0,  # Calculate after
            })

        # Calculate percentages
        for r in results:
            r["percent"] = round(r["total_outstanding"] / total_outstanding * 100, 1) if total_outstanding > 0 else 0

        return results

    def get_surgery_insurance_matrix(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get metrics grouped by surgery type with breakdown by insurance carrier.
        Returns a hierarchical structure showing for each surgery type,
        all insurance carriers and their metrics.
        """
        # First, get all surgery types with their names
        surgery_types = self.db.query(
            ProcedureSummary.type_code,
            ProcedureSummary.surgery_type
        ).distinct().all()

        # Build a map of type_code to surgery_type name
        type_name_map = {}
        for tc, st in surgery_types:
            if tc and st:
                type_name_map[tc] = st

        results = []

        # Get unique type codes
        unique_type_codes = set(tc for tc, _ in surgery_types if tc)

        for type_code in unique_type_codes:
            # Get totals for this surgery type
            type_query = self.db.query(
                func.count(ProcedureSummary.id).label("procedure_count"),
                func.sum(ProcedureSummary.total_charges).label("total_charges"),
                func.sum(ProcedureSummary.total_payments).label("total_payments"),
                func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
            ).filter(ProcedureSummary.type_code == type_code)

            if date_from:
                type_query = type_query.filter(ProcedureSummary.date_of_service >= date_from)
            if date_to:
                type_query = type_query.filter(ProcedureSummary.date_of_service <= date_to)

            type_totals = type_query.first()

            type_charges = float(type_totals.total_charges or 0)
            type_payments = float(type_totals.total_payments or 0)
            type_collection = (type_payments / type_charges * 100) if type_charges > 0 else 0

            # Get breakdown by carrier for this surgery type
            carrier_query = self.db.query(
                ProcedureSummary.primary_carrier,
                func.count(ProcedureSummary.id).label("procedure_count"),
                func.sum(ProcedureSummary.total_charges).label("total_charges"),
                func.sum(ProcedureSummary.total_payments).label("total_payments"),
                func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
            ).filter(
                ProcedureSummary.type_code == type_code,
                ProcedureSummary.primary_carrier.isnot(None),
            ).group_by(ProcedureSummary.primary_carrier)

            if date_from:
                carrier_query = carrier_query.filter(ProcedureSummary.date_of_service >= date_from)
            if date_to:
                carrier_query = carrier_query.filter(ProcedureSummary.date_of_service <= date_to)

            carriers = []
            for c in carrier_query.all():
                c_charges = float(c.total_charges or 0)
                c_payments = float(c.total_payments or 0)
                c_collection = (c_payments / c_charges * 100) if c_charges > 0 else 0

                # Get billing subcategory breakdown for this carrier and surgery type
                billing_query = self.db.query(
                    Transaction.billing_subcategory,
                    func.sum(Transaction.charges).label("charges"),
                    func.sum(Transaction.total_payments).label("payments"),
                ).filter(
                    Transaction.type_code == type_code,
                    Transaction.visit_primary_carrier == c.primary_carrier,
                    Transaction.billing_subcategory.isnot(None),
                ).group_by(Transaction.billing_subcategory)

                if date_from:
                    billing_query = billing_query.filter(Transaction.date_of_service >= date_from)
                if date_to:
                    billing_query = billing_query.filter(Transaction.date_of_service <= date_to)

                billing_categories = []
                for bc in billing_query.all():
                    bc_charges = float(bc.charges or 0)
                    bc_payments = float(bc.payments or 0)
                    bc_collection = (bc_payments / bc_charges * 100) if bc_charges > 0 else 0

                    billing_categories.append({
                        "category": bc.billing_subcategory,
                        "charges": round(bc_charges, 2),
                        "payments": round(bc_payments, 2),
                        "collection_rate": round(bc_collection, 2),
                    })

                # Sort billing categories by charges descending
                billing_categories.sort(key=lambda x: x["charges"], reverse=True)

                carriers.append({
                    "carrier": c.primary_carrier,
                    "procedure_count": c.procedure_count,
                    "total_charges": round(c_charges, 2),
                    "total_payments": round(c_payments, 2),
                    "collection_rate": round(c_collection, 2),
                    "avg_days_to_payment": round(float(c.avg_days), 1) if c.avg_days else None,
                    "billing_categories": billing_categories,
                })

            # Sort carriers by charges descending
            carriers.sort(key=lambda x: x["total_charges"], reverse=True)

            results.append({
                "type_code": type_code,
                "surgery_type": type_name_map.get(type_code),
                "procedure_count": type_totals.procedure_count or 0,
                "total_charges": round(type_charges, 2),
                "total_payments": round(type_payments, 2),
                "collection_rate": round(type_collection, 2),
                "avg_days_to_payment": round(float(type_totals.avg_days), 1) if type_totals.avg_days else None,
                "carriers": carriers,
            })

        # Sort by charges descending
        results.sort(key=lambda x: x["total_charges"], reverse=True)

        return results

    def get_patient_surgery_insurance_matrix(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get metrics grouped by patient with breakdown by surgery type and insurance carrier.
        Returns: Patient -> Surgery Type -> Insurance Carrier
        """
        # Get all unique patients with procedures
        patient_query = self.db.query(
            ProcedureSummary.chart_number,
            func.count(ProcedureSummary.id).label("procedure_count"),
            func.sum(ProcedureSummary.total_charges).label("total_charges"),
            func.sum(ProcedureSummary.total_payments).label("total_payments"),
            func.min(ProcedureSummary.date_of_service).label("first_visit"),
            func.max(ProcedureSummary.date_of_service).label("last_visit"),
        ).filter(
            ProcedureSummary.chart_number.isnot(None)
        ).group_by(ProcedureSummary.chart_number)

        if date_from:
            patient_query = patient_query.filter(ProcedureSummary.date_of_service >= date_from)
        if date_to:
            patient_query = patient_query.filter(ProcedureSummary.date_of_service <= date_to)

        # Get surgery type name mapping
        surgery_types = self.db.query(
            ProcedureSummary.type_code,
            ProcedureSummary.surgery_type
        ).distinct().all()
        type_name_map = {tc: st for tc, st in surgery_types if tc and st}

        results = []
        for p in patient_query.all():
            p_charges = float(p.total_charges or 0)
            p_payments = float(p.total_payments or 0)
            p_collection = (p_payments / p_charges * 100) if p_charges > 0 else 0

            # Get breakdown by surgery type for this patient
            type_query = self.db.query(
                ProcedureSummary.type_code,
                func.count(ProcedureSummary.id).label("procedure_count"),
                func.sum(ProcedureSummary.total_charges).label("total_charges"),
                func.sum(ProcedureSummary.total_payments).label("total_payments"),
                func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
            ).filter(
                ProcedureSummary.chart_number == p.chart_number,
                ProcedureSummary.type_code.isnot(None),
            ).group_by(ProcedureSummary.type_code)

            if date_from:
                type_query = type_query.filter(ProcedureSummary.date_of_service >= date_from)
            if date_to:
                type_query = type_query.filter(ProcedureSummary.date_of_service <= date_to)

            surgery_types_list = []
            for t in type_query.all():
                t_charges = float(t.total_charges or 0)
                t_payments = float(t.total_payments or 0)
                t_collection = (t_payments / t_charges * 100) if t_charges > 0 else 0

                # Get carriers for this patient + surgery type
                carrier_query = self.db.query(
                    ProcedureSummary.primary_carrier,
                    func.count(ProcedureSummary.id).label("procedure_count"),
                    func.sum(ProcedureSummary.total_charges).label("total_charges"),
                    func.sum(ProcedureSummary.total_payments).label("total_payments"),
                    func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
                ).filter(
                    ProcedureSummary.chart_number == p.chart_number,
                    ProcedureSummary.type_code == t.type_code,
                    ProcedureSummary.primary_carrier.isnot(None),
                ).group_by(ProcedureSummary.primary_carrier)

                if date_from:
                    carrier_query = carrier_query.filter(ProcedureSummary.date_of_service >= date_from)
                if date_to:
                    carrier_query = carrier_query.filter(ProcedureSummary.date_of_service <= date_to)

                carriers = []
                for c in carrier_query.all():
                    c_charges = float(c.total_charges or 0)
                    c_payments = float(c.total_payments or 0)
                    c_collection = (c_payments / c_charges * 100) if c_charges > 0 else 0
                    carriers.append({
                        "carrier": c.primary_carrier,
                        "procedure_count": c.procedure_count,
                        "total_charges": round(c_charges, 2),
                        "total_payments": round(c_payments, 2),
                        "collection_rate": round(c_collection, 2),
                        "avg_days_to_payment": round(float(c.avg_days), 1) if c.avg_days else None,
                    })
                carriers.sort(key=lambda x: x["total_charges"], reverse=True)

                surgery_types_list.append({
                    "type_code": t.type_code,
                    "surgery_type": type_name_map.get(t.type_code),
                    "procedure_count": t.procedure_count,
                    "total_charges": round(t_charges, 2),
                    "total_payments": round(t_payments, 2),
                    "collection_rate": round(t_collection, 2),
                    "avg_days_to_payment": round(float(t.avg_days), 1) if t.avg_days else None,
                    "carriers": carriers,
                })
            surgery_types_list.sort(key=lambda x: x["total_charges"], reverse=True)

            results.append({
                "chart_number": p.chart_number,
                "procedure_count": p.procedure_count,
                "total_charges": round(p_charges, 2),
                "total_payments": round(p_payments, 2),
                "collection_rate": round(p_collection, 2),
                "first_visit": p.first_visit.isoformat() if p.first_visit else None,
                "last_visit": p.last_visit.isoformat() if p.last_visit else None,
                "surgery_types": surgery_types_list,
            })

        results.sort(key=lambda x: x["total_charges"], reverse=True)
        return results

    def get_insurance_surgery_patient_matrix(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get metrics grouped by insurance carrier with breakdown by surgery type and patient.
        Returns: Insurance Carrier -> Surgery Type -> Patient
        """
        # Get all unique carriers
        carrier_query = self.db.query(
            ProcedureSummary.primary_carrier,
            func.count(ProcedureSummary.id).label("procedure_count"),
            func.sum(ProcedureSummary.total_charges).label("total_charges"),
            func.sum(ProcedureSummary.total_payments).label("total_payments"),
            func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
        ).filter(
            ProcedureSummary.primary_carrier.isnot(None)
        ).group_by(ProcedureSummary.primary_carrier)

        if date_from:
            carrier_query = carrier_query.filter(ProcedureSummary.date_of_service >= date_from)
        if date_to:
            carrier_query = carrier_query.filter(ProcedureSummary.date_of_service <= date_to)

        # Get surgery type name mapping
        surgery_types = self.db.query(
            ProcedureSummary.type_code,
            ProcedureSummary.surgery_type
        ).distinct().all()
        type_name_map = {tc: st for tc, st in surgery_types if tc and st}

        results = []
        for carrier in carrier_query.all():
            c_charges = float(carrier.total_charges or 0)
            c_payments = float(carrier.total_payments or 0)
            c_collection = (c_payments / c_charges * 100) if c_charges > 0 else 0

            # Get breakdown by surgery type for this carrier
            type_query = self.db.query(
                ProcedureSummary.type_code,
                func.count(ProcedureSummary.id).label("procedure_count"),
                func.sum(ProcedureSummary.total_charges).label("total_charges"),
                func.sum(ProcedureSummary.total_payments).label("total_payments"),
                func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
            ).filter(
                ProcedureSummary.primary_carrier == carrier.primary_carrier,
                ProcedureSummary.type_code.isnot(None),
            ).group_by(ProcedureSummary.type_code)

            if date_from:
                type_query = type_query.filter(ProcedureSummary.date_of_service >= date_from)
            if date_to:
                type_query = type_query.filter(ProcedureSummary.date_of_service <= date_to)

            surgery_types_list = []
            for t in type_query.all():
                t_charges = float(t.total_charges or 0)
                t_payments = float(t.total_payments or 0)
                t_collection = (t_payments / t_charges * 100) if t_charges > 0 else 0

                # Get patients for this carrier + surgery type
                patient_query = self.db.query(
                    ProcedureSummary.chart_number,
                    func.count(ProcedureSummary.id).label("procedure_count"),
                    func.sum(ProcedureSummary.total_charges).label("total_charges"),
                    func.sum(ProcedureSummary.total_payments).label("total_payments"),
                    func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
                ).filter(
                    ProcedureSummary.primary_carrier == carrier.primary_carrier,
                    ProcedureSummary.type_code == t.type_code,
                    ProcedureSummary.chart_number.isnot(None),
                ).group_by(ProcedureSummary.chart_number)

                if date_from:
                    patient_query = patient_query.filter(ProcedureSummary.date_of_service >= date_from)
                if date_to:
                    patient_query = patient_query.filter(ProcedureSummary.date_of_service <= date_to)

                patients = []
                for p in patient_query.all():
                    p_charges = float(p.total_charges or 0)
                    p_payments = float(p.total_payments or 0)
                    p_collection = (p_payments / p_charges * 100) if p_charges > 0 else 0
                    patients.append({
                        "chart_number": p.chart_number,
                        "procedure_count": p.procedure_count,
                        "total_charges": round(p_charges, 2),
                        "total_payments": round(p_payments, 2),
                        "collection_rate": round(p_collection, 2),
                        "avg_days_to_payment": round(float(p.avg_days), 1) if p.avg_days else None,
                    })
                patients.sort(key=lambda x: x["total_charges"], reverse=True)

                surgery_types_list.append({
                    "type_code": t.type_code,
                    "surgery_type": type_name_map.get(t.type_code),
                    "procedure_count": t.procedure_count,
                    "total_charges": round(t_charges, 2),
                    "total_payments": round(t_payments, 2),
                    "collection_rate": round(t_collection, 2),
                    "avg_days_to_payment": round(float(t.avg_days), 1) if t.avg_days else None,
                    "patients": patients,
                })
            surgery_types_list.sort(key=lambda x: x["total_charges"], reverse=True)

            results.append({
                "carrier": carrier.primary_carrier,
                "procedure_count": carrier.procedure_count,
                "total_charges": round(c_charges, 2),
                "total_payments": round(c_payments, 2),
                "collection_rate": round(c_collection, 2),
                "avg_days_to_payment": round(float(carrier.avg_days), 1) if carrier.avg_days else None,
                "surgery_types": surgery_types_list,
            })

        results.sort(key=lambda x: x["total_charges"], reverse=True)
        return results

    def get_dynamic_matrix(
        self,
        group_by: List[str],
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get metrics with dynamic grouping hierarchy.

        group_by: List of dimensions to group by, in order.
        Valid dimensions: 'surgery_type', 'carrier', 'billing_subcategory', 'patient'

        Example: group_by=['surgery_type', 'carrier', 'patient']
        Returns: Surgery Type -> Carrier -> Patient hierarchy
        """
        from ..models.transaction import Transaction

        if not group_by or len(group_by) == 0:
            return []

        # Check if billing_subcategory is in group_by - if so, use Transaction table
        use_transaction_table = 'billing_subcategory' in group_by

        if use_transaction_table:
            # Use Transaction table for billing_subcategory support
            dimension_config = {
                'surgery_type': {
                    'column': Transaction.type_code,
                    'name_column': Transaction.surgery_type,
                    'key': 'type_code',
                    'name_key': 'type_name',
                },
                'carrier': {
                    'column': Transaction.visit_primary_carrier,
                    'name_column': None,
                    'key': 'carrier',
                    'name_key': None,
                },
                'billing_subcategory': {
                    'column': Transaction.billing_subcategory,
                    'name_column': None,
                    'key': 'billing_subcategory',
                    'name_key': None,
                },
                'patient': {
                    'column': Transaction.chart_number,
                    'name_column': None,
                    'key': 'chart_number',
                    'name_key': None,
                },
                'procedure_id': {
                    'column': Transaction.procedure_id,
                    'name_column': None,
                    'key': 'procedure_id',
                    'name_key': None,
                },
            }
            date_column = Transaction.date_of_service
            model = Transaction
            charges_column = Transaction.charges
            payments_column = Transaction.total_payments
        else:
            # Use ProcedureSummary table (original behavior)
            dimension_config = {
                'surgery_type': {
                    'column': ProcedureSummary.type_code,
                    'name_column': ProcedureSummary.surgery_type,
                    'key': 'type_code',
                    'name_key': 'type_name',
                },
                'carrier': {
                    'column': ProcedureSummary.primary_carrier,
                    'name_column': None,
                    'key': 'carrier',
                    'name_key': None,
                },
                'billing_subcategory': {
                    'column': None,  # Not available in ProcedureSummary
                    'name_column': None,
                    'key': 'billing_subcategory',
                    'name_key': None,
                },
                'patient': {
                    'column': ProcedureSummary.chart_number,
                    'name_column': None,
                    'key': 'chart_number',
                    'name_key': None,
                },
                'procedure_id': {
                    'column': ProcedureSummary.procedure_id,
                    'name_column': None,
                    'key': 'procedure_id',
                    'name_key': None,
                },
            }
            date_column = ProcedureSummary.date_of_service
            model = ProcedureSummary
            charges_column = ProcedureSummary.total_charges
            payments_column = ProcedureSummary.total_payments

        # Validate dimensions
        for dim in group_by:
            if dim not in dimension_config:
                raise ValueError(f"Invalid dimension: {dim}. Valid: {list(dimension_config.keys())}")

        # Get surgery type name mapping if needed
        type_name_map = {}
        if 'surgery_type' in group_by:
            if use_transaction_table:
                surgery_types = self.db.query(
                    Transaction.type_code,
                    Transaction.surgery_type
                ).distinct().all()
            else:
                surgery_types = self.db.query(
                    ProcedureSummary.type_code,
                    ProcedureSummary.surgery_type
                ).distinct().all()
            type_name_map = {tc: st for tc, st in surgery_types if tc and st}

        def build_level(parent_filters: Dict, dimensions: List[str], depth: int = 0) -> List[Dict]:
            """Recursively build hierarchical data."""
            if not dimensions:
                return []

            current_dim = dimensions[0]
            remaining_dims = dimensions[1:]
            config = dimension_config[current_dim]

            # Build query for this level
            if use_transaction_table:
                # For Transaction table, count DISTINCT procedures and sum charges/payments
                query_columns = [
                    config['column'],
                    func.count(func.distinct(Transaction.procedure_id)).label("procedure_count"),
                    func.sum(charges_column).label("total_charges"),
                    func.sum(payments_column).label("total_payments"),
                ]
            else:
                # For ProcedureSummary, count procedures
                query_columns = [
                    config['column'],
                    func.count(model.id).label("procedure_count"),
                    func.sum(charges_column).label("total_charges"),
                    func.sum(payments_column).label("total_payments"),
                    func.avg(ProcedureSummary.days_to_first_payment).label("avg_days"),
                ]

            # Add name column if exists
            if config['name_column'] is not None:
                query_columns.insert(1, config['name_column'])

            # Add date columns for patient
            if current_dim == 'patient':
                query_columns.extend([
                    func.min(date_column).label("first_visit"),
                    func.max(date_column).label("last_visit"),
                ])

            query = self.db.query(*query_columns).filter(
                config['column'].isnot(None)
            ).group_by(config['column'])

            if config['name_column'] is not None:
                query = query.group_by(config['name_column'])

            # Apply date filters
            if date_from:
                query = query.filter(date_column >= date_from)
            if date_to:
                query = query.filter(date_column <= date_to)

            # Apply parent filters
            for dim_name, dim_value in parent_filters.items():
                dim_config = dimension_config[dim_name]
                query = query.filter(dim_config['column'] == dim_value)

            results = []
            for row in query.all():
                row_value = getattr(row, config['column'].key)
                charges = float(row.total_charges or 0)
                payments = float(row.total_payments or 0)
                collection = (payments / charges * 100) if charges > 0 else 0

                item = {
                    config['key']: row_value,
                    'procedure_count': row.procedure_count,
                    'total_charges': round(charges, 2),
                    'total_payments': round(payments, 2),
                    'collection_rate': round(collection, 2),
                }

                # Add avg_days if available (only for ProcedureSummary)
                if not use_transaction_table:
                    item['avg_days_to_payment'] = round(float(row.avg_days), 1) if row.avg_days else None
                else:
                    item['avg_days_to_payment'] = None

                # Add name if applicable
                if current_dim == 'surgery_type':
                    item['type_name'] = type_name_map.get(row_value) or getattr(row, 'surgery_type', None)

                # Add date info for patient
                if current_dim == 'patient':
                    item['first_visit'] = row.first_visit.isoformat() if row.first_visit else None
                    item['last_visit'] = row.last_visit.isoformat() if row.last_visit else None

                # Recursively get children
                if remaining_dims:
                    child_key = remaining_dims[0] + 's'  # Pluralize
                    if remaining_dims[0] == 'surgery_type':
                        child_key = 'surgery_types'
                    elif remaining_dims[0] == 'billing_subcategory':
                        child_key = 'billing_subcategories'
                    elif remaining_dims[0] == 'procedure_id':
                        child_key = 'procedures'

                    new_filters = {**parent_filters, current_dim: row_value}
                    item[child_key] = build_level(new_filters, remaining_dims, depth + 1)

                results.append(item)

            # Sort by charges descending
            results.sort(key=lambda x: x['total_charges'], reverse=True)
            return results

        # Build the grouped data
        grouped_data = build_level({}, group_by)

        # Calculate true summary totals (not affected by grouping)
        if use_transaction_table:
            # Get totals from Transaction table
            summary_query = self.db.query(
                func.count(func.distinct(Transaction.procedure_id)).label("total_procedures"),
                func.sum(Transaction.charges).label("total_charges"),
                func.sum(Transaction.total_payments).label("total_payments"),
            )
            if date_from:
                summary_query = summary_query.filter(Transaction.date_of_service >= date_from)
            if date_to:
                summary_query = summary_query.filter(Transaction.date_of_service <= date_to)
        else:
            # Get totals from ProcedureSummary table
            summary_query = self.db.query(
                func.count(ProcedureSummary.id).label("total_procedures"),
                func.sum(ProcedureSummary.total_charges).label("total_charges"),
                func.sum(ProcedureSummary.total_payments).label("total_payments"),
            )
            if date_from:
                summary_query = summary_query.filter(ProcedureSummary.date_of_service >= date_from)
            if date_to:
                summary_query = summary_query.filter(ProcedureSummary.date_of_service <= date_to)

        summary_row = summary_query.first()
        total_charges = float(summary_row.total_charges or 0)
        total_payments = float(summary_row.total_payments or 0)
        collection_rate = (total_payments / total_charges * 100) if total_charges > 0 else 0

        return {
            "data": grouped_data,
            "summary": {
                "total_procedures": summary_row.total_procedures or 0,
                "total_charges": round(total_charges, 2),
                "total_payments": round(total_payments, 2),
                "collection_rate": round(collection_rate, 2),
            }
        }

    def _apply_filters(
        self,
        query,
        date_from: Optional[date],
        date_to: Optional[date],
        patient_id: Optional[int],
        type_code: Optional[str],
        carrier: Optional[str],
    ):
        """Apply common filters to query."""
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
        return query
