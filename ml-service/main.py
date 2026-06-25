from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from routers import delay, attendance, productivity, resource
from services.predictor import PredictorService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML models on startup
    print("Starting TaskForge AI ML Service...")
    # Initialize PredictorService to trigger model load
    PredictorService()
    yield
    print("Stopping TaskForge AI ML Service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    lifespan=lifespan
)

# Set up CORS middleware
origins = [
    settings.FRONTEND_URL,
    settings.BACKEND_URL,
    "http://localhost:5173",
    "http://localhost:4000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(delay.router, prefix=settings.API_V1_STR)
app.include_router(attendance.router, prefix=settings.API_V1_STR)
app.include_router(productivity.router, prefix=settings.API_V1_STR)
app.include_router(resource.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "docs_url": "/docs"
    }
