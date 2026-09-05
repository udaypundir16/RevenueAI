import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.health import router as health_router
from routes.webhooks import router as webhooks_router
from db.connection import init_db

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("revenue-recovery-ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist
    try:
        init_db()
        logger.info("Database tables verified.")
    except Exception as e:
        logger.warning(f"Database initialization deferred: {e}")
    yield
    # Shutdown

app = FastAPI(
    title="Revenue Recovery AI API",
    description="Automated Revenue Recovery, Smart Dunning, and Payment Retries with AI Agents",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS setup
cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
app.include_router(webhooks_router)

@app.get("/")
def root():
    return {
        "message": "Welcome to Revenue Recovery AI API",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "webhooks": "/api/webhooks/razorpay"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
