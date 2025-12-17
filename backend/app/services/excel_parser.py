import pandas as pd
from typing import Dict, List, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ExcelParserService:
    """Parse Excel files and extract the 'result' sheet."""

    # Column mapping from Excel to database
    COLUMN_MAPPING = {
        "Office Key": "office_key",
        "Chart Number": "chart_number",
        "Visit Number": "visit_number",
        "Procedure_ID": "procedure_id",
        "Procedure_Seq": "procedure_seq",
        "Transaction Type": "transaction_type",
        "Charge Code": "charge_code",
        "Transaction Code": "transaction_code",
        "Transaction Code Desc": "transaction_code_desc",
        "Modifiers": "modifiers",
        "Date of Service": "date_of_service",
        "Date of Entry": "date_of_entry",
        "Date of Deposit": "date_of_deposit",
        "Charges": "charges",
        "Patient Payments": "patient_payments",
        "Insurance Payments": "insurance_payments",
        "Total Payments": "total_payments",
        "Adjustments": "adjustments",
        "Units": "units",
        "Surgery_Type": "surgery_type",
        "Type_Code": "type_code",
        "Billing_Category": "billing_category",
        "Billing_Subcategory": "billing_subcategory",
        "ChargeCodeNorm": "charge_code_norm",
        "Visit - Primary Carrier": "visit_primary_carrier",
        "Visit - Secondary Carrier": "visit_secondary_carrier",
        "Transaction Carrier": "transaction_carrier",
        "Facility Name": "facility_name",
        "Provider Profile": "provider_profile",
        "Financial Class": "financial_class",
        "Primary Dx ICD9": "primary_dx_icd9",
        "Primary Dx ICD10": "primary_dx_icd10",
        "Payment Method": "payment_method",
        "Check Number": "check_number",
        "Void": "void",
        "Flag_Procedure_Unknown": "flag_procedure_unknown",
        "Flag_Billing_Unknown": "flag_billing_unknown",
        "DOS_STR": "dos_str",
    }

    REQUIRED_COLUMNS = [
        "Procedure_ID",
        "Date of Service",
    ]

    def parse_file(self, file_path: str) -> pd.DataFrame:
        """
        Read Excel file, extract 'result' sheet, validate and transform data.

        Args:
            file_path: Path to the Excel file

        Returns:
            DataFrame with cleaned and transformed data
        """
        logger.info(f"Parsing Excel file: {file_path}")

        # Read the 'result' sheet
        try:
            df = pd.read_excel(file_path, sheet_name="result")
        except ValueError:
            # Try reading first sheet if 'result' doesn't exist
            df = pd.read_excel(file_path, sheet_name=0)
            logger.warning("Sheet 'result' not found, using first sheet")

        logger.info(f"Loaded {len(df)} rows from Excel")

        # Validate required columns
        self._validate_columns(df)

        # Rename columns to database format
        df = self._rename_columns(df)

        # Convert data types
        df = self._convert_dtypes(df)

        # Clean data
        df = self._clean_data(df)

        logger.info(f"Processed {len(df)} rows successfully")
        return df

    def _validate_columns(self, df: pd.DataFrame) -> None:
        """Ensure required columns exist."""
        missing = []
        for col in self.REQUIRED_COLUMNS:
            if col not in df.columns:
                missing.append(col)

        if missing:
            raise ValueError(f"Missing required columns: {missing}")

    def _rename_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Rename columns to database format."""
        # Create reverse mapping for columns that exist
        rename_map = {}
        for excel_col, db_col in self.COLUMN_MAPPING.items():
            if excel_col in df.columns:
                rename_map[excel_col] = db_col

        df = df.rename(columns=rename_map)
        return df

    def _convert_dtypes(self, df: pd.DataFrame) -> pd.DataFrame:
        """Convert columns to appropriate types."""
        # Date columns
        date_columns = ["date_of_service", "date_of_entry", "date_of_deposit"]
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce")

        # Numeric columns - handle currency formatting
        numeric_columns = [
            "charges",
            "total_payments",
            "adjustments",
            "patient_payments",
            "insurance_payments",
            "units",
        ]
        for col in numeric_columns:
            if col in df.columns:
                # Remove currency symbols and convert
                if df[col].dtype == object:
                    df[col] = (
                        df[col]
                        .astype(str)
                        .str.replace(r"[$,]", "", regex=True)
                        .str.strip()
                    )
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        # Integer columns
        int_columns = ["office_key", "chart_number", "procedure_seq"]
        for col in int_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Boolean columns
        bool_columns = ["void", "flag_procedure_unknown", "flag_billing_unknown"]
        for col in bool_columns:
            if col in df.columns:
                df[col] = df[col].fillna(False).astype(bool)

        return df

    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and validate data."""
        # Remove rows without procedure_id
        if "procedure_id" in df.columns:
            df = df[df["procedure_id"].notna() & (df["procedure_id"] != "")]

        # Ensure date_of_service exists
        if "date_of_service" in df.columns:
            df = df[df["date_of_service"].notna()]

        # Strip whitespace from string columns
        string_columns = df.select_dtypes(include=["object"]).columns
        for col in string_columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace("nan", None)
            df[col] = df[col].replace("", None)

        return df

    def get_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get summary statistics from parsed data."""
        return {
            "total_rows": len(df),
            "unique_procedures": df["procedure_id"].nunique() if "procedure_id" in df.columns else 0,
            "unique_patients": df["chart_number"].nunique() if "chart_number" in df.columns else 0,
            "date_range": {
                "min": df["date_of_service"].min().isoformat() if "date_of_service" in df.columns and not df["date_of_service"].isna().all() else None,
                "max": df["date_of_service"].max().isoformat() if "date_of_service" in df.columns and not df["date_of_service"].isna().all() else None,
            },
            "surgery_types": df["type_code"].dropna().unique().tolist() if "type_code" in df.columns else [],
            "carriers": df["visit_primary_carrier"].dropna().unique().tolist() if "visit_primary_carrier" in df.columns else [],
        }
