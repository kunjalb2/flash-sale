from typing import Any

from loguru import logger


class ServiceLogger:
    """Unified service logging using loguru."""

    @staticmethod
    def log(
        service: str,
        operation: str,
        user_id: str | None = None,
        entity_id: str | None = None,
        success: bool = True,
        error: str | None = None,
        duration_ms: float | None = None,
        **kwargs: Any,
    ) -> None:
        log_data = {
            "service": service,
            "operation": operation,
            "success": success,
        }
        if user_id:
            log_data["user_id"] = user_id
        if entity_id:
            log_data["entity_id"] = entity_id
        if error:
            log_data["error"] = error
        if duration_ms is not None:
            log_data["duration_ms"] = duration_ms
        log_data.update(kwargs)

        if error:
            logger.error(f"{service}.{operation} | {log_data}")
        elif success:
            logger.info(f"{service}.{operation} | {log_data}")
        else:
            logger.warning(f"{service}.{operation} | {log_data}")

    @staticmethod
    def log_service_operation(
        service_name: str,
        operation: str,
        success: bool = True,
        error: str | None = None,
        entity_id: str | None = None,
        user_id: str | None = None,
        details: dict[str, Any] | None = None,
        level: str = "info",
    ) -> None:
        log_data = {"service": service_name, "operation": operation, "success": success}
        if entity_id:
            log_data["entity_id"] = entity_id
        if user_id:
            log_data["user_id"] = user_id
        if error:
            log_data["error"] = error
        if details:
            log_data.update(details)

        if error:
            logger.error(f"{service_name}.{operation} | {log_data}")
        elif level == "warning":
            logger.warning(f"{service_name}.{operation} | {log_data}")
        else:
            logger.info(f"{service_name}.{operation} | {log_data}")

    @staticmethod
    def log_business_logic(service: str, operation: str, **kwargs: Any) -> None:
        logger.info(f"{service}.{operation} | {kwargs}")

    @staticmethod
    def log_performance(service: str, operation: str, duration_ms: float, **kwargs: Any) -> None:
        logger.info(f"{service}.{operation} | duration_ms={duration_ms} | {kwargs}")

    @staticmethod
    def log_db(operation: str, table: str, **kwargs: Any) -> None:
        logger.info(f"DB.{operation} | table={table} | {kwargs}")

    @staticmethod
    def log_external(service: str, operation: str, **kwargs: Any) -> None:
        logger.info(f"{service}.{operation} | {kwargs}")
