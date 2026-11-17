from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.community import router as community_router
# API Routers
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.faculty import router as faculty_router
from app.api.documents import router as documents_router
from app.api.assistant import router as assistant_router
from app.api.admin import router as admin_router
from app.api.academic_qa import router as academic_qa_router
from app.api.notices import router as notices_router
from app.api.learning_resources import router as learning_resources_router
from app.api.messages import router as messages_router

# Initialize FastAPI application
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="CampusSphere AI - College Management and AI Assistant API",
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API Routers
app.include_router(
    health_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    auth_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    faculty_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    documents_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    assistant_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    admin_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    community_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    academic_qa_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    notices_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    learning_resources_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    messages_router,
    prefix=settings.api_v1_prefix,
)

# Root Endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to CampusSphere AI API",
        "version": "0.1.0",
        "docs": "/docs",
        "status": "running",
    }
