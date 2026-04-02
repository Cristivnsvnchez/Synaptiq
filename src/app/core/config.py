from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/synaptiq"
    secret_key: str = "changeme-in-production"
    anthropic_api_key: str = ""
    storage_path: str = "./storage"

    class Config:
        env_file = ".env"


settings = Settings()
