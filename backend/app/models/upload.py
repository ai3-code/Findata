from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class Upload(Base):
    """Track uploaded Excel files."""

    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer)
    rows_imported = Column(Integer, default=0)
    procedures_count = Column(Integer, default=0)
    patients_count = Column(Integer, default=0)
    upload_status = Column(String(20), default="processing")  # processing, completed, failed
    error_message = Column(Text, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
