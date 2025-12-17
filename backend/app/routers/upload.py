from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime

from ..database import get_db
from ..config import settings
from ..models.upload import Upload
from ..schemas.upload import UploadResponse, UploadSummary
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
    """
    # Validate file type
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an Excel file (.xlsx or .xls)",
        )

    # Create uploads directory if it doesn't exist
    os.makedirs(settings.upload_dir, exist_ok=True)

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.upload_dir, unique_filename)

    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create upload record
    upload = Upload(
        filename=unique_filename,
        original_filename=file.filename,
        file_size=len(contents),
        upload_status="processing",
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    # Parse and process file
    try:
        # Parse Excel
        parser = ExcelParserService()
        df = parser.parse_file(file_path)
        summary = parser.get_summary(df)

        # Process data
        processor = DataProcessorService(db)
        result = processor.process_upload(df, upload)

        return UploadSummary(
            upload_id=upload.id,
            filename=file.filename,
            rows_imported=result["transactions_imported"],
            procedures_count=result["procedures_created"],
            patients_count=result["patients_count"],
            status="completed",
            message=f"Successfully imported {result['transactions_imported']} transactions from {result['procedures_created']} procedures",
        )

    except Exception as e:
        # Update upload status to failed
        upload.upload_status = "failed"
        upload.error_message = str(e)
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to process file: {str(e)}",
        )


@router.get("/history", response_model=List[UploadResponse])
async def get_upload_history(
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """Get upload history."""
    uploads = (
        db.query(Upload)
        .order_by(Upload.uploaded_at.desc())
        .limit(limit)
        .all()
    )
    return uploads


@router.get("/{upload_id}", response_model=UploadResponse)
async def get_upload(
    upload_id: int,
    db: Session = Depends(get_db),
):
    """Get upload details by ID."""
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    return upload


@router.delete("/{upload_id}")
async def delete_upload(
    upload_id: int,
    db: Session = Depends(get_db),
):
    """Delete upload and associated data."""
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    # Delete file
    file_path = os.path.join(settings.upload_dir, upload.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete upload record (transactions will be cascade deleted if configured)
    db.delete(upload)
    db.commit()

    return {"message": "Upload deleted successfully"}
