from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


logger = logging.getLogger(__name__)


def validation_message(detail) -> str | None:
    if isinstance(detail, dict):
        for value in detail.values():
            message = validation_message(value)
            if message:
                return message
    if isinstance(detail, (list, tuple)):
        for value in detail:
            message = validation_message(value)
            if message:
                return message
    if isinstance(detail, str) and detail:
        return detail
    return None


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API exception", exc_info=(type(exc), exc, exc.__traceback__))
        return Response(
            {"error": {"code": "server_error", "message": "An unexpected error occurred."}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = getattr(exc, "default_code", "request_error")
    detail = response.data
    message = "Request could not be completed."
    if isinstance(detail, dict) and "detail" in detail:
        message = str(detail["detail"])
    elif code == "invalid":
        message = validation_message(detail) or message

    response.data = {
        "error": {
            "code": code,
            "message": message,
            "details": detail,
        }
    }
    return response
