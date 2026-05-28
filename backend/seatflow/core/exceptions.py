from typing import Any

from fastapi import HTTPException, status


class SeatFlowException(HTTPException):
    def __init__(self, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, detail: Any = None, headers: dict[str, Any] | None = None) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotFoundException(SeatFlowException):
    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class BadRequestException(SeatFlowException):
    def __init__(self, detail: str = "Bad request") -> None:
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class UnauthorizedException(SeatFlowException):
    def __init__(self, detail: str = "Unauthorized") -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ForbiddenException(SeatFlowException):
    def __init__(self, detail: str = "Forbidden") -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ConflictException(SeatFlowException):
    def __init__(self, detail: str = "Resource conflict") -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class ValidationException(SeatFlowException):
    def __init__(self, detail: str = "Validation error") -> None:
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class RateLimitException(SeatFlowException):
    def __init__(self, detail: str = "Rate limit exceeded") -> None:
        super().__init__(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)


class PaymentException(SeatFlowException):
    def __init__(self, detail: str = "Payment processing failed") -> None:
        super().__init__(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=detail)


class ReservationException(SeatFlowException):
    def __init__(self, detail: str = "Reservation failed") -> None:
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class LockConflictException(SeatFlowException):
    def __init__(self, detail: str = "Resource is locked by another operation") -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
