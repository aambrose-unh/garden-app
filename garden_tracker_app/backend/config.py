from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./garden_tracker_fastapi.db"
    SECRET_KEY: str = "your_default_secret_key_here_please_change_in_env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 # Default to 30 minutes

    # Pydantic-settings configuration
    # This tells Pydantic to load environment variables from a .env file if it exists,
    # and to treat environment variables as case-insensitive.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

# Create a single instance of the settings to be used throughout the application
settings = Settings()
