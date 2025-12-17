from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import create_tables
from .routers import upload, analytics, patients, filters, procedures, anomalies


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Create tables
    create_tables()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title=settings.app_name,
    description="Surgery Billing & Payment Tracking Dashboard API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(filters.router, prefix="/api/filters", tags=["Filters"])
app.include_router(procedures.router, prefix="/api/procedures", tags=["Procedures"])
app.include_router(anomalies.router, prefix="/api/anomalies", tags=["Anomalies"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Surgery Billing Dashboard API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
