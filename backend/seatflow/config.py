import enum
import os
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from yarl import URL


class LogLevel(enum.StrEnum):
    NOTSET = "NOTSET"
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    FATAL = "FATAL"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers_count: int = 1
    reload: bool = False

    # Application
    app_name: str = "seatflow"
    environment: str = "local"
    debug: bool = True
    log_level: LogLevel = LogLevel.INFO
    api_prefix: str = "/v1"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "seatflow_user"
    db_pass: str = "seatflow_password"
    db_base: str = "seatflow"
    db_echo: bool = False
    db_pool_size: int = 20
    db_max_overflow: int = 10

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_user: Optional[str] = None
    redis_pass: Optional[str] = ""
    redis_base: Optional[int] = 0
    redis_max_connections: int = 50

    # RabbitMQ
    rabbit_host: str = "localhost"
    rabbit_port: int = 5672
    rabbit_user: str = "guest"
    rabbit_pass: str = "guest"
    rabbit_vhost: str = "/"
    rabbit_pool_size: int = 2
    rabbit_channel_pool_size: int = 10

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""
    payment_mode: str = "sandbox"

    # Flash Sale
    reservation_timeout_seconds: int = 300
    max_tickets_per_user: int = 5
    enable_distributed_lock: bool = True

    # Cache
    cache_enabled: bool = True
    cache_ttl_seconds: int = 60
    cache_event_detail_ttl_seconds: int = 300
    cache_event_list_ttl_seconds: int = 120

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 60
    rate_limit_login_requests: int = 5
    rate_limit_login_window: int = 60
    rate_limit_register_requests: int = 3
    rate_limit_register_window: int = 300
    rate_limit_reservation_requests: int = 10
    rate_limit_reservation_window: int = 60

    # Celery
    celery_broker_url: str = "amqp://guest:guest@localhost:5672//"
    celery_result_backend: str = "redis://localhost:6379/1"

    # AI Chat Assistant
    chat_enabled: bool = True
    chat_llm_provider: str = "openai"
    chat_llm_model: str = "gpt-4o-mini"
    chat_llm_api_key: str = ""
    chat_llm_base_url: str = "https://api.openai.com/v1"
    chat_max_history_messages: int = 10
    chat_max_session_messages: int = 30
    chat_max_sessions_per_day: int = 10
    chat_system_prompt: str = ""
    chat_max_tokens: int = 500
    chat_temperature: float = 0.3

    @property
    def db_url(self) -> URL:
        return URL.build(
            scheme="postgresql+asyncpg",
            host=self.db_host,
            port=self.db_port,
            user=self.db_user,
            password=self.db_pass,
            path=f"/{self.db_base}",
        )

    @property
    def redis_url(self) -> URL:
        path = f"/{self.redis_base}" if self.redis_base is not None else ""
        return URL.build(
            scheme="redis",
            host=self.redis_host,
            port=self.redis_port,
            user=self.redis_user,
            password=self.redis_pass or None,
            path=path,
        )

    @property
    def rabbit_url(self) -> URL:
        return URL.build(
            scheme="amqp",
            host=self.rabbit_host,
            port=self.rabbit_port,
            user=self.rabbit_user,
            password=self.rabbit_pass,
            path=self.rabbit_vhost,
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = SettingsConfigDict(
        env_file=[".env.local", ".env"],
        env_prefix="SEATFLOW_",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
