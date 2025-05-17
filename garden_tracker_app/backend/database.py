import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

from .models import Base # Assuming models.py is in the same directory and Base is defined there
from .config import settings # Import the settings instance

# load_dotenv() # Removed: pydantic-settings handles .env loading via SettingsConfigDict

DATABASE_URL = settings.DATABASE_URL # Use settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    # connect_args={"check_same_thread": False} # Needed only for SQLite if using multithreading
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Function to create database tables
def create_db_tables():
    # This will create tables for all models that inherit from Base
    Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
