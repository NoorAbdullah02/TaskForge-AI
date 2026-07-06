import os

class Settings:
    PROJECT_NAME: str = "TaskForge AI ML Service"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Allow CORS origins
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:4000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

settings = Settings()
