from enum import Enum
from typing import Any


class ErrorCode(str, Enum):
    VALIDATION_ERROR = "ERR_VALIDATION_ERROR"
    NOT_FOUND = "ERR_NOT_FOUND"
    INVALID_STATE_TRANSITION = "ERR_INVALID_STATE_TRANSITION"
    DUPLICATE_REQUEST = "ERR_DUPLICATE_REQUEST"
    FORBIDDEN = "ERR_FORBIDDEN"
    INTERNAL_ERROR = "ERR_INTERNAL_ERROR"


def error_payload(code: ErrorCode, message: str, **extra: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"code": code.value, "message": message}
    payload.update(extra)
    return payload
