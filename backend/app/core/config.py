from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings, loaded automatically from environment variables or a .env file.
    Pydantic will validate that all required variables without defaults are present.
    """
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER_ME: int = 43200
    ENVIRONMENT: str = "development"
    APP_VERSION: str = "v1.0.0-rc1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
