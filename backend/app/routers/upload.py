from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import uuid
import tempfile

from ..database import get_db
from ..config import settings
from ..schemas.upload import UploadSummary
from ..services.excel_parser import ExcelParserService
from ..services.data_processor import DataProcessorService

router = APIRouter()


@router.post("/", response_model=UploadSummary)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload an Excel file and process it.

    The file should contain a 'result' sheet with surgery billing data.
    Data is processed and saved to database for analysis.
    """
    # Validate file type
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an Excel file (.xlsx or .xls)",
        )

    # Save to temp file for processing
    file_ext = os.path.splitext(file.filename)[1]
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)

    try:
        contents = await file.read()
        temp_file.write(contents)
        temp_file.close()

        # Parse Excel
        parser = ExcelParserService()
        df = parser.parse_file(temp_file.name)

        # Process data (save transactions and create procedure summaries)
        processor = DataProcessorService(db)
        result = processor.process_upload(df)

        return UploadSummary(
            upload_id=0,  # No longer tracking upload IDs
            filename=file.filename,
            rows_imported=result["transactions_imported"],
            procedures_count=result["procedures_created"],
            patients_count=result["patients_count"],
            status="completed",
            message=f"Successfully imported {result['transactions_imported']} transactions from {result['procedures_created']} procedures",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process file: {str(e)}",
        )
    finally:
        # Clean up temp file
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)
