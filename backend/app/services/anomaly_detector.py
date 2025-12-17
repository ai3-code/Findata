from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Dict, List, Any, Optional
from datetime import date
import logging

from ..models.transaction import Transaction
from ..models.procedure import ProcedureSummary

logger = logging.getLogger(__name__)


class AnomalyDetectorService:
    """Detect data anomalies in billing data."""

    def __init__(self, db: Session):
        self.db = db

    def detect_all_anomalies(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Run all anomaly detection checks and return results.
        """
        payment_exceeds_charge = self.detect_payments_exceed_charges(date_from, date_to)
        missing_payments = self.detect_missing_payments(date_from, date_to)
        duplicate_procedures = self.detect_duplicate_procedures()

        total_anomalies = (
            len(payment_exceeds_charge["procedures"]) +
            len(missing_payments["procedures"]) +
            len(duplicate_procedures["procedures"])
        )

        return {
            "total_anomalies": total_anomalies,
            "payment_exceeds_charge": payment_exceeds_charge,
            "missing_payments": missing_payments,
            "duplicate_procedures": duplicate_procedures,
        }

    def detect_payments_exceed_charges(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Detect procedures where total payments exceed total charges.
        This is an anomaly - you shouldn't collect more than you billed.
        """
        query = self.db.query(ProcedureSummary).filter(
            ProcedureSummary.total_payments > ProcedureSummary.total_charges,
            ProcedureSummary.total_charges > 0,  # Exclude zero-charge procedures
        )

        if date_from:
            query = query.filter(ProcedureSummary.date_of_service >= date_from)
        if date_to:
            query = query.filter(ProcedureSummary.date_of_service <= date_to)

        anomalies = query.all()

        procedures = []
        total_overpayment = 0

        for proc in anomalies:
            overpayment = float(proc.total_payments or 0) - float(proc.total_charges or 0)
            total_overpayment += overpayment

            procedures.append({
                "procedure_id": proc.procedure_id,
                "chart_number": proc.chart_number,
                "date_of_service": proc.date_of_service.isoformat() if proc.date_of_service else None,
                "type_code": proc.type_code,
                "primary_carrier": proc.primary_carrier,
                "total_charges": float(proc.total_charges or 0),
                "total_payments": float(proc.total_payments or 0),
                "overpayment": round(overpayment, 2),
                "overpayment_percent": round((overpayment / float(proc.total_charges)) * 100, 2) if proc.total_charges else 0,
            })

        # Sort by overpayment amount descending
        procedures.sort(key=lambda x: x["overpayment"], reverse=True)

        return {
            "anomaly_type": "payment_exceeds_charge",
            "description": "Procedures where total payments exceed total charges",
            "severity": "high",
            "count": len(procedures),
            "total_overpayment": round(total_overpayment, 2),
            "procedures": procedures,
        }

    def detect_missing_payments(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        days_threshold: int = 180,  # 6 months
    ) -> Dict[str, Any]:
        """
        Detect procedures with charges but zero payments after a threshold period.
        """
        cutoff_date = date.today()
        from datetime import timedelta
        old_enough_date = cutoff_date - timedelta(days=days_threshold)

        query = self.db.query(ProcedureSummary).filter(
            ProcedureSummary.date_of_service <= old_enough_date,
            ProcedureSummary.total_charges > 0,
            (ProcedureSummary.total_payments == 0) | (ProcedureSummary.total_payments.is_(None)),
        )

        if date_from:
            query = query.filter(ProcedureSummary.date_of_service >= date_from)
        if date_to:
            query = query.filter(ProcedureSummary.date_of_service <= date_to)

        anomalies = query.all()

        procedures = []
        total_uncollected = 0

        for proc in anomalies:
            total_uncollected += float(proc.total_charges or 0)
            days_since_dos = (date.today() - proc.date_of_service).days if proc.date_of_service else 0

            procedures.append({
                "procedure_id": proc.procedure_id,
                "chart_number": proc.chart_number,
                "date_of_service": proc.date_of_service.isoformat() if proc.date_of_service else None,
                "type_code": proc.type_code,
                "primary_carrier": proc.primary_carrier,
                "total_charges": float(proc.total_charges or 0),
                "total_payments": 0,
                "days_since_dos": days_since_dos,
            })

        # Sort by charges descending
        procedures.sort(key=lambda x: x["total_charges"], reverse=True)

        return {
            "anomaly_type": "missing_payments",
            "description": f"Procedures older than {days_threshold} days with zero payments",
            "severity": "medium",
            "count": len(procedures),
            "total_uncollected": round(total_uncollected, 2),
            "procedures": procedures,
        }

    def detect_duplicate_procedures(self) -> Dict[str, Any]:
        """
        Detect potential duplicate procedures (same patient, same date, same type).
        """
        # Find procedures with same chart_number, date_of_service, and type_code
        duplicates = self.db.query(
            ProcedureSummary.chart_number,
            ProcedureSummary.date_of_service,
            ProcedureSummary.type_code,
            func.count(ProcedureSummary.procedure_id).label("count"),
            func.group_concat(ProcedureSummary.procedure_id).label("procedure_ids"),
        ).group_by(
            ProcedureSummary.chart_number,
            ProcedureSummary.date_of_service,
            ProcedureSummary.type_code,
        ).having(
            func.count(ProcedureSummary.procedure_id) > 1
        ).all()

        procedures = []
        for dup in duplicates:
            procedures.append({
                "chart_number": dup.chart_number,
                "date_of_service": dup.date_of_service.isoformat() if dup.date_of_service else None,
                "type_code": dup.type_code,
                "duplicate_count": dup.count,
                "procedure_ids": dup.procedure_ids.split(",") if dup.procedure_ids else [],
            })

        return {
            "anomaly_type": "duplicate_procedures",
            "description": "Potential duplicate procedures (same patient, date, and type)",
            "severity": "low",
            "count": len(procedures),
            "procedures": procedures,
        }

    def get_anomaly_summary_by_carrier(self) -> List[Dict[str, Any]]:
        """
        Get anomaly counts grouped by insurance carrier.
        """
        # Get payment exceeds charge by carrier
        results = self.db.query(
            ProcedureSummary.primary_carrier,
            func.count(ProcedureSummary.procedure_id).label("anomaly_count"),
            func.sum(ProcedureSummary.total_payments - ProcedureSummary.total_charges).label("total_overpayment"),
        ).filter(
            ProcedureSummary.total_payments > ProcedureSummary.total_charges,
            ProcedureSummary.total_charges > 0,
        ).group_by(
            ProcedureSummary.primary_carrier
        ).all()

        carriers = []
        for r in results:
            carriers.append({
                "carrier": r.primary_carrier,
                "anomaly_count": r.anomaly_count,
                "total_overpayment": round(float(r.total_overpayment or 0), 2),
            })

        # Sort by anomaly count descending
        carriers.sort(key=lambda x: x["anomaly_count"], reverse=True)

        return carriers

    def get_anomaly_summary_by_patient(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get patients with the most anomalies.
        """
        results = self.db.query(
            ProcedureSummary.chart_number,
            func.count(ProcedureSummary.procedure_id).label("anomaly_count"),
            func.sum(ProcedureSummary.total_payments - ProcedureSummary.total_charges).label("total_overpayment"),
        ).filter(
            ProcedureSummary.total_payments > ProcedureSummary.total_charges,
            ProcedureSummary.total_charges > 0,
        ).group_by(
            ProcedureSummary.chart_number
        ).order_by(
            func.count(ProcedureSummary.procedure_id).desc()
        ).limit(limit).all()

        patients = []
        for r in results:
            patients.append({
                "chart_number": r.chart_number,
                "anomaly_count": r.anomaly_count,
                "total_overpayment": round(float(r.total_overpayment or 0), 2),
            })

        return patients
