import pandas as pd
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
import logging

from ..models.transaction import Transaction
from ..models.procedure import ProcedureSummary

logger = logging.getLogger(__name__)


class DataProcessorService:
    """Process transactions and build procedure summaries."""

    def __init__(self, db: Session):
        self.db = db

    def process_upload(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Process uploaded data: save transactions and build summaries.

        Args:
            df: Parsed DataFrame from Excel

        Returns:
            Processing summary
        """
        try:
            # Save raw transactions
            transactions_count = self._save_transactions(df)

            # Build procedure summaries
            summaries_count = self._build_procedure_summaries(df)

            patients_count = df["chart_number"].nunique() if "chart_number" in df.columns else 0

            return {
                "transactions_imported": transactions_count,
                "procedures_created": summaries_count,
                "patients_count": patients_count,
            }

        except Exception as e:
            logger.error(f"Error processing upload: {str(e)}")
            raise

    def _save_transactions(self, df: pd.DataFrame) -> int:
        """Save raw transactions to database."""
        count = 0

        for _, row in df.iterrows():
            transaction = Transaction(
                upload_id=None,  # No longer tracking upload IDs
                office_key=self._safe_int(row.get("office_key")),
                chart_number=self._safe_int(row.get("chart_number")),
                visit_number=row.get("visit_number"),
                procedure_id=str(row.get("procedure_id", "")),
                procedure_seq=self._safe_int(row.get("procedure_seq")),
                transaction_type=row.get("transaction_type"),
                charge_code=row.get("charge_code"),
                transaction_code=row.get("transaction_code"),
                transaction_code_desc=row.get("transaction_code_desc"),
                modifiers=row.get("modifiers"),
                date_of_service=self._safe_date(row.get("date_of_service")),
                date_of_entry=self._safe_date(row.get("date_of_entry")),
                date_of_deposit=self._safe_date(row.get("date_of_deposit")),
                charges=float(row.get("charges", 0) or 0),
                patient_payments=float(row.get("patient_payments", 0) or 0),
                insurance_payments=float(row.get("insurance_payments", 0) or 0),
                total_payments=float(row.get("total_payments", 0) or 0),
                adjustments=float(row.get("adjustments", 0) or 0),
                units=float(row.get("units", 0) or 0),
                surgery_type=row.get("surgery_type"),
                type_code=row.get("type_code"),
                billing_category=row.get("billing_category"),
                billing_subcategory=row.get("billing_subcategory"),
                charge_code_norm=row.get("charge_code_norm"),
                visit_primary_carrier=row.get("visit_primary_carrier"),
                visit_secondary_carrier=row.get("visit_secondary_carrier"),
                transaction_carrier=row.get("transaction_carrier"),
                facility_name=row.get("facility_name"),
                provider_profile=row.get("provider_profile"),
                financial_class=row.get("financial_class"),
                primary_dx_icd9=row.get("primary_dx_icd9"),
                primary_dx_icd10=row.get("primary_dx_icd10"),
                payment_method=row.get("payment_method"),
                check_number=row.get("check_number"),
                void=bool(row.get("void", False)),
                flag_procedure_unknown=bool(row.get("flag_procedure_unknown", False)),
                flag_billing_unknown=bool(row.get("flag_billing_unknown", False)),
                dos_str=row.get("dos_str"),
            )
            self.db.add(transaction)
            count += 1

            # Commit in batches
            if count % 500 == 0:
                self.db.commit()
                logger.info(f"Saved {count} transactions...")

        self.db.commit()
        logger.info(f"Saved total of {count} transactions")
        return count

    def _build_procedure_summaries(self, df: pd.DataFrame) -> int:
        """Build aggregated procedure summaries."""
        count = 0

        # Group by procedure_id
        for proc_id, group in df.groupby("procedure_id"):
            # Check if summary already exists
            existing = self.db.query(ProcedureSummary).filter(
                ProcedureSummary.procedure_id == proc_id
            ).first()

            if existing:
                # Update existing summary
                summary = existing
            else:
                # Create new summary
                summary = ProcedureSummary(procedure_id=str(proc_id))

            # Get first row for base info
            first_row = group.iloc[0]

            # Basic info
            summary.chart_number = self._safe_int(first_row.get("chart_number"))
            summary.date_of_service = self._safe_date(first_row.get("date_of_service"))
            summary.surgery_type = first_row.get("surgery_type")
            summary.type_code = first_row.get("type_code")
            summary.primary_carrier = first_row.get("visit_primary_carrier")
            summary.secondary_carrier = first_row.get("visit_secondary_carrier")
            summary.facility_name = first_row.get("facility_name")
            summary.provider_profile = first_row.get("provider_profile")

            # Aggregate financials
            summary.total_charges = float(group["charges"].sum()) if "charges" in group.columns else 0
            summary.total_payments = float(group["total_payments"].sum()) if "total_payments" in group.columns else 0
            summary.total_adjustments = float(group["adjustments"].sum()) if "adjustments" in group.columns else 0
            summary.patient_payments = float(group["patient_payments"].sum()) if "patient_payments" in group.columns else 0
            summary.insurance_payments = float(group["insurance_payments"].sum()) if "insurance_payments" in group.columns else 0

            # By billing category
            if "billing_category" in group.columns:
                pro_fee = group[group["billing_category"] == "Pro Fee"]
                facility_fee = group[group["billing_category"] == "Facility Fee"]

                summary.pro_fee_charges = float(pro_fee["charges"].sum()) if "charges" in pro_fee.columns else 0
                summary.pro_fee_payments = float(pro_fee["total_payments"].sum()) if "total_payments" in pro_fee.columns else 0
                summary.facility_fee_charges = float(facility_fee["charges"].sum()) if "charges" in facility_fee.columns else 0
                summary.facility_fee_payments = float(facility_fee["total_payments"].sum()) if "total_payments" in facility_fee.columns else 0

            # Timing
            if "date_of_entry" in group.columns:
                charge_dates = group[group["charges"] > 0]["date_of_entry"].dropna()
                if not charge_dates.empty:
                    summary.first_charge_date = charge_dates.min()

            if "date_of_deposit" in group.columns:
                payment_dates = group[group["total_payments"] > 0]["date_of_deposit"].dropna()
                if not payment_dates.empty:
                    summary.first_payment_date = payment_dates.min()
                    summary.last_payment_date = payment_dates.max()

            # Days to first payment (from date of service)
            if summary.first_payment_date and summary.date_of_service:
                dos = pd.to_datetime(summary.date_of_service)
                first_pay = pd.to_datetime(summary.first_payment_date)
                summary.days_to_first_payment = (first_pay - dos).days

            # Collection rate
            if summary.total_charges and summary.total_charges > 0:
                summary.collection_rate = round(
                    (summary.total_payments / summary.total_charges) * 100, 2
                )
            else:
                summary.collection_rate = 0

            # Status determination
            if summary.total_charges > 0:
                if summary.total_payments >= summary.total_charges * 0.95:
                    summary.status = "collected"
                elif summary.total_payments > 0:
                    summary.status = "partial"
                elif summary.total_adjustments >= summary.total_charges * 0.95:
                    summary.status = "written_off"
                else:
                    summary.status = "pending"

            if not existing:
                self.db.add(summary)
                count += 1

        self.db.commit()
        logger.info(f"Created/updated {count} procedure summaries")
        return count

    def _safe_int(self, value) -> int:
        """Safely convert to int."""
        if pd.isna(value):
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None

    def _safe_date(self, value):
        """Safely convert to date."""
        if pd.isna(value):
            return None
        if isinstance(value, (datetime, pd.Timestamp)):
            return value.date() if hasattr(value, 'date') else value
        try:
            return pd.to_datetime(value).date()
        except:
            return None
