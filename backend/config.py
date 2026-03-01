from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # database / persistence (alias to support legacy DB_PATH env var)
    DATABASE_URL: str = Field(
        str(Path(__file__).parent / "events.db"), env="DB_PATH"
    )

    # rate limiting
    RATE_LIMIT: int = 100
    RATE_WINDOW: int = 60

    # health engine
    MAX_EVENTS: int = 20
    DECAY_FACTOR: float = 0.97
    # ignore events older than this (minutes) when computing health
    HEALTH_WINDOW_MINUTES: int = 10

    model_config = {
        "env_file": Path(__file__).parent.parent / ".env",
        "env_file_encoding": "utf-8",
        "extra": "allow",  # accept unknown variables
    }


settings = Settings()

# convenience aliases used throughout the codebase
DB_PATH = settings.DATABASE_URL
RATE_LIMIT = settings.RATE_LIMIT
RATE_WINDOW = settings.RATE_WINDOW
MAX_EVENTS = settings.MAX_EVENTS
DECAY_FACTOR = settings.DECAY_FACTOR
HEALTH_WINDOW_MINUTES = settings.HEALTH_WINDOW_MINUTES

__all__ = [
    "settings",
    "DB_PATH",
    "RATE_LIMIT",
    "RATE_WINDOW",
    "MAX_EVENTS",
    "DECAY_FACTOR",
    "HEALTH_WINDOW_MINUTES",
]
