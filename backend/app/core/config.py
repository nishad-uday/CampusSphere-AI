
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # Application settings
    app_name: str = "CampusSphere AI"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"

    # Database settings
    database_url: str
    redis_url: str = "redis://127.0.0.1:6379/0"

    # Frontend CORS settings
    frontend_origins: str = "http://localhost:5173"

    # JWT authentication settings
    secret_key: str = Field(min_length=32)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Gemini AI settings
    gemini_api_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            item.strip()
            for item in self.frontend_origins.split(",")
            if item.strip()
        ]


settings = Settings()
