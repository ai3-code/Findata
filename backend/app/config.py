from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://surgery_admin:localdev123@localhost:5432/surgery_billing"

    # App settings
    app_name: str = "Surgery Billing Dashboard"
    debug: bool = True

    # CORS - allow all origins in development
    cors_origins: list[str] = ["*"]

    # Upload settings
    upload_dir: str = "uploads"
    max_upload_size: int = 50 * 1024 * 1024  # 50MB

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
