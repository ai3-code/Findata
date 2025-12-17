from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UploadBase(BaseModel):
    filename: str
    original_filename: str


class UploadCreate(UploadBase):
    file_size: Optional[int] = None


class UploadResponse(UploadBase):
    id: int
    file_size: Optional[int]
    rows_imported: int
    procedures_count: int
    patients_count: int
    upload_status: str
    error_message: Optional[str]
    uploaded_at: datetime
    processed_at: Optional[datetime]

    class Config:
        from_attributes = True


class UploadSummary(BaseModel):
    upload_id: int
    filename: str
    rows_imported: int
    procedures_count: int
    patients_count: int
    status: str
    message: str
