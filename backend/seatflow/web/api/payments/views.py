from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.web.api.deps import get_current_active_user
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.db.dependencies import get_db_session
from seatflow.services.redis.dependency import get_redis_client
from seatflow.core.cache import CacheService
from seatflow.db.models.user import User
from seatflow.web.api.payments.schema import (
    CheckoutCreate,
    CheckoutResponse,
    PaymentResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
    WebhookEvent,
)
from seatflow.services.payment.service import PaymentService

router = APIRouter(tags=["Payments"])


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a checkout session",
)
async def create_checkout_session(
    request: Request,
    checkout_data: CheckoutCreate,
    session: AsyncSession = Depends(get_db_session),
    redis: Annotated[object, Depends(get_redis_client)] = None,
    current_user: Annotated[User, Depends(get_current_active_user)] = None,
) -> CheckoutResponse:
    """Create a Stripe checkout session for a booking."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="PaymentService",
        operation="create_checkout_session",
        user_id=str(current_user.id),
        details={
            "booking_id": str(checkout_data.booking_id),
        },
    )

    try:
        payment_service = PaymentService(session, cache)
        checkout_session = await payment_service.create_checkout_session(checkout_data, current_user.id)

        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="create_checkout_session",
            user_id=str(current_user.id),
            entity_id=checkout_session.checkout_session_id,
            success=True,
            details={
                "checkout_session_id": checkout_session.checkout_session_id,
                "booking_id": str(checkout_data.booking_id),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return checkout_session
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="create_checkout_session",
            user_id=str(current_user.id),
            success=False,
            error=str(e),
        )
        raise


@router.post(
    "/verify",
    response_model=PaymentVerifyResponse,
    summary="Verify a payment",
)
async def verify_payment(
    request: Request,
    verify_data: PaymentVerifyRequest,
    session: AsyncSession = Depends(get_db_session),
    redis: Annotated[object, Depends(get_redis_client)] = None,
    current_user: Annotated[User, Depends(get_current_active_user)] = None,
) -> PaymentVerifyResponse:
    """Verify the status of a payment."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="PaymentService",
        operation="verify_payment",
        user_id=str(current_user.id),
        details={
            "payment_id": str(verify_data.payment_id),
        },
    )

    try:
        payment_service = PaymentService(session, cache)
        result = await payment_service.verify_payment(verify_data, current_user.id)

        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="verify_payment",
            user_id=str(current_user.id),
            success=True,
            details={
                "payment_id": str(verify_data.payment_id),
                "status": result.status.value if hasattr(result.status, 'value') else str(result.status),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return result
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="verify_payment",
            user_id=str(current_user.id),
            success=False,
            error=str(e),
        )
        raise


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
    summary="Get payment details",
)
async def get_payment(
    request: Request,
    payment_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: Annotated[User, Depends(get_current_active_user)] = None,
) -> PaymentResponse:
    """Get detailed information about a payment."""
    import time
    from datetime import datetime

    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="PaymentService",
        operation="get_payment",
        user_id=str(current_user.id),
        entity_id=payment_id,
        details={
            "payment_id": payment_id,
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        from seatflow.db.dao.payment import PaymentDAO

        payment_dao = PaymentDAO(session)
        payment = await payment_dao.get_by_id(payment_id)

        if not payment:
            ServiceLogger.log_service_operation(
                service_name="PaymentService",
                operation="get_payment",
                user_id=str(current_user.id),
                entity_id=payment_id,
                success=False,
                error="Payment not found",
            )
            from seatflow.core.exceptions import NotFoundException

            raise NotFoundException(detail="Payment not found")

        if payment.user_id != current_user.id:
            ServiceLogger.log_service_operation(
                service_name="PaymentService",
                operation="get_payment",
                user_id=str(current_user.id),
                entity_id=payment_id,
                success=False,
                error="Unauthorized access to payment",
            )
            from seatflow.core.exceptions import BadRequestException

            raise BadRequestException(detail="You do not have permission to view this payment")

        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="get_payment",
            user_id=str(current_user.id),
            entity_id=payment_id,
            success=True,
            details={
                "payment_id": payment_id,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "status": payment.status.value if hasattr(payment.status, 'value') else str(payment.status),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return PaymentResponse.model_validate(payment)
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="get_payment",
            user_id=str(current_user.id),
            entity_id=payment_id,
            success=False,
            error=str(e),
        )
        raise


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Handle Stripe webhook events",
    include_in_schema=False,
)
async def stripe_webhook(
    request: Request,
    stripe_signature: Annotated[str, Header(alias="stripe-signature")],
) -> dict:
    """Handle incoming webhook events from Stripe."""
    import time
    from datetime import datetime

    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="PaymentService",
        operation="stripe_webhook",
        details={
            "stripe_signature_present": bool(stripe_signature),
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        from seatflow.payment.base import get_payment_gateway

        payment_gateway = get_payment_gateway()

        payload = await request.body()
        event_data = await payment_gateway.handle_webhook(payload, stripe_signature)

        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="stripe_webhook",
            success=True,
            details={
                "event_type": event_data.get("type"),
                "event_id": event_data.get("id"),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        redis_client = request.app.state.redis
        cache_service = CacheService(redis_client)

        from seatflow.db.dependencies import get_db_session

        async for session in get_db_session():
            from seatflow.services.payment.service import PaymentService

            payment_service = PaymentService(session, cache_service)
            result = await payment_service.handle_webhook(event_data)
            await session.commit()
            return result

        return {"status": "error", "message": "Failed to process webhook"}
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="stripe_webhook",
            success=False,
            error=str(e),
        )
        return {"status": "error", "message": f"Webhook processing failed: {str(e)}"}


@router.post(
    "/mock/complete",
    status_code=status.HTTP_200_OK,
    summary="Mock payment completion for testing",
    include_in_schema=False,
)
async def mock_payment_complete(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: Annotated[User, Depends(get_current_active_user)] = None,
) -> dict:
    """Simulate a successful payment completion for testing with mock gateway."""
    import time
    from datetime import datetime

    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="PaymentService",
        operation="mock_payment_complete",
        user_id=str(current_user.id),
        details={
            "timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        from seatflow.db.dao.payment import PaymentDAO
        from seatflow.db.models.payment import PaymentStatus

        payment_dao = PaymentDAO(session)

        # Get the most recent pending payment for this user
        payments = await payment_dao.get_by_user_id(current_user.id)
        pending_payment = None
        for payment in payments:
            if payment.status == PaymentStatus.pending:
                pending_payment = payment
                break

        if not pending_payment:
            ServiceLogger.log_service_operation(
                service_name="PaymentService",
                operation="mock_payment_complete",
                user_id=str(current_user.id),
                success=False,
                error="No pending payment found",
            )
            return {"status": "error", "message": "No pending payment found"}

        # Simulate webhook event for checkout.session.completed
        event_data = {
            "event_type": "checkout.session.completed",
            "data": {
                "id": pending_payment.stripe_checkout_session_id,
                "payment_intent": f"pi_mock_{pending_payment.id}",
                "payment_status": "paid",
                "receipt_url": f"https://mock.stripe.com/receipt/{pending_payment.id}",
                "invoice_pdf": f"https://mock.stripe.com/invoice/{pending_payment.id}",
            },
        }

        redis_client = request.app.state.redis
        from seatflow.core.cache import CacheService

        cache_service = CacheService(redis_client)
        from seatflow.services.payment.service import PaymentService

        payment_service = PaymentService(session, cache_service)
        result = await payment_service.handle_webhook(event_data)
        await session.commit()

        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="mock_payment_complete",
            user_id=str(current_user.id),
            entity_id=pending_payment.id,
            success=True,
            details={
                "payment_id": pending_payment.id,
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return {"status": "success", "payment_id": pending_payment.id, "message": "Payment completed successfully"}
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="PaymentService",
            operation="mock_payment_complete",
            user_id=str(current_user.id),
            success=False,
            error=str(e),
        )
        raise
