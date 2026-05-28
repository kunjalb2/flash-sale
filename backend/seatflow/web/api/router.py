from fastapi.routing import APIRouter

from seatflow.web.api import auth, events, bookings, payments, admin, monitoring, chat

api_router = APIRouter()

api_router.include_router(monitoring.router)
api_router.include_router(auth.router, prefix="/v1/auth", tags=["Authentication"])
api_router.include_router(events.router, prefix="/v1/events", tags=["Events"])
api_router.include_router(bookings.router, prefix="/v1/reservations", tags=["Reservations"])
api_router.include_router(payments.router, prefix="/v1/payments", tags=["Payments"])
api_router.include_router(admin.router, prefix="/v1/admin", tags=["Admin"])
api_router.include_router(chat.router, prefix="/v1/chat", tags=["Chat"])
