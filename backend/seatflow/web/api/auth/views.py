from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.web.api.deps import get_current_active_user
from seatflow.config import settings
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.core.rate_limiter import LoginRateLimit, RegisterRateLimit
from seatflow.db.dependencies import get_db_session
from seatflow.db.models.user import User
from seatflow.db.dao.user import UserDAO
from seatflow.web.api.auth.schema import (
    LoginResponse,
    TokenRefresh,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)
from seatflow.services.auth.service import AuthService

router = APIRouter(tags=["Authentication"])


@router.post(
    "/register",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    request: Request,
    _: RegisterRateLimit,
    user_data: UserCreate,
    session: AsyncSession = Depends(get_db_session),
) -> LoginResponse:
    """Register a new user account."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="AuthService",
        operation="register_user",
        details={
            "email": user_data.email,
            "registration_timestamp": user_data.created_at.isoformat() if user_data.created_at else None,
        },
    )

    try:
        auth_service = AuthService(session)
        user, access_token, refresh_token = await auth_service.register(user_data)

        ServiceLogger.log_service_operation(
            service_name="AuthService",
            operation="register_user",
            user_id=str(user.id),
            entity_id=str(user.id),
            success=True,
            details={
                "user_id": str(user.id),
                "email": user.email,
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=user,
        )
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="AuthService",
            operation="register_user",
            success=False,
            error=str(e),
        )
        raise


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login with email and password",
)
async def login(
    request: Request,
    _: LoginRateLimit,
    credentials: UserLogin,
    session: AsyncSession = Depends(get_db_session),
) -> LoginResponse:
    """Authenticate user and return JWT tokens."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="AuthService",
        operation="user_login",
        details={
            "email": credentials.email,
            "login_timestamp": credentials.created_at.isoformat() if hasattr(credentials, 'created_at') else None,
        },
    )

    try:
        auth_service = AuthService(session)
        user, access_token, refresh_token = await auth_service.login(credentials)

        ServiceLogger.log_service_operation(
            service_name="AuthService",
            operation="user_login",
            user_id=str(user.id),
            entity_id=str(user.id),
            success=True,
            details={
                "user_id": str(user.id),
                "email": user.email,
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=user,
        )
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="AuthService",
            operation="user_login",
            success=False,
            error=str(e),
        )
        raise


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
async def refresh_token(
    request: Request,
    token_data: TokenRefresh,
    session: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    """Refresh access token using refresh token."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="AuthService",
        operation="refresh_token",
        details={
            "refresh_provided": bool(token_data.refresh_token),
        },
    )

    try:
        auth_service = AuthService(session)
        access_token, refresh_token = await auth_service.refresh_token(token_data.refresh_token)

        ServiceLogger.log_service_operation(
            service_name="AuthService",
            operation="refresh_token",
            success=True,
            details={
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        )
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="AuthService",
            operation="refresh_token",
            success=False,
            error=str(e),
        )
        raise


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Get the currently authenticated user's profile."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="AuthService",
        operation="get_user_profile",
        user_id=str(current_user.id),
        entity_id=str(current_user.id),
        details={
            "email": current_user.email,
        },
    )

    try:
        ServiceLogger.log_service_operation(
            service_name="AuthService",
            operation="get_user_profile",
            user_id=str(current_user.id),
            entity_id=str(current_user.id),
            success=True,
            details={
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return current_user
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="AuthService",
            operation="get_user_profile",
            user_id=str(current_user.id),
            success=False,
            error=str(e),
        )
        raise


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
async def update_me(
    request: Request,
    update_data: UserUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    """Update the currently authenticated user's profile."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="AuthService",
        operation="update_user_profile",
        user_id=str(current_user.id),
        entity_id=str(current_user.id),
        details={"update_fields": list(update_data.model_dump(exclude_none=True).keys())},
    )

    try:
        update_dict = update_data.model_dump(exclude_none=True)
        if update_dict:
            user_dao = UserDAO(session)
            # Fetch the user fresh from the current session to avoid detached instance issues
            user = await user_dao.get_by_id(current_user.id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            updated_user = await user_dao.update(user, update_dict)

            ServiceLogger.log_service_operation(
                service_name="AuthService",
                operation="update_user_profile",
                user_id=str(updated_user.id),
                entity_id=str(updated_user.id),
                success=True,
                details={
                    "updated_fields": list(update_dict.keys()),
                    "duration_ms": round((time.time() - start_time) * 1000, 2),
                },
            )

            return updated_user

        return current_user
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="AuthService",
            operation="update_user_profile",
            user_id=str(current_user.id),
            success=False,
            error=str(e),
        )
        raise


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout current user",
)
async def logout(
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Logout the current user (client-side token invalidation)."""
    pass
