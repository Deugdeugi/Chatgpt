from pydantic import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """설정 관리"""

    # Telegram API 설정 (https://my.telegram.org에서 획득)
    TELEGRAM_API_ID: int
    TELEGRAM_API_HASH: str
    TELEGRAM_PHONE: str

    class Config:
        env_file = ".env"


def get_settings() -> Settings:
    """설정 로드"""
    return Settings()
