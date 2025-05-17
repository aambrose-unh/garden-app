import os
import logging
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import create_db_tables, get_db
from .routers import auth
from .routers import garden_beds
from .routers import plant_types
from .routers import plantings

# Configure logging (similar to your Flask app)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
handler = RotatingFileHandler('app_fastapi.log', maxBytes=100000, backupCount=1)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Load environment variables from .env file
load_dotenv()

# Create database tables if they don't exist
# This should be called once at application startup.
create_db_tables()

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Garden Tracker API",
    description="API for managing garden beds, plants, and plantings.",
    version="1.0.0"
)

# --- CORS Middleware ---
# Similar to your Flask app, allowing specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Add your frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Basic Test Route ---
@app.get("/api/hello-fastapi")
def read_root():
    logger.info("FastAPI root endpoint was called.")
    return {"message": "Hello from FastAPI Backend!"}

# --- Include Routers for different modules (auth, garden_beds, etc.) ---
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(garden_beds.router, prefix="/api/garden-beds", tags=["Garden Beds"])
app.include_router(plant_types.router, prefix="/api/plant-types", tags=["Plant Types"])
app.include_router(plantings.router, prefix="/api/plantings", tags=["Plantings"])

if __name__ == "__main__":
    import uvicorn
    # This is for development. For production, use Gunicorn or another ASGI server.
    logger.info(f"Starting Uvicorn server on http://127.0.0.1:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, log_level="info")
