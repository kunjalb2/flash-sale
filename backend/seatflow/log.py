import sys

from loguru import logger

from seatflow.config import settings


def configure_logging() -> None:
    """Configure loguru logging."""
    logger.remove()
    logger.add(
        sys.stderr,
        level=settings.log_level.value,
        format=(
            "<level>{level: <8}</level> | "
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
            "<level>{message}</level>"
        ),
        colorize=True,
    )
    logger.add(
        "logs/seatflow.log",
        level=settings.log_level.value,
        format=(
            "{level: <8} | {time:YYYY-MM-DD HH:mm:ss} | "
            "{name}:{function}:{line} | {message}"
        ),
        rotation="10 MB",
        retention="7 days",
    )
