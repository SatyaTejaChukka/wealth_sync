import logging
import sys
from pythonjsonlogger import jsonlogger
from app.core.config import settings
from app.core.request_context import get_request_id


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True

def setup_logging():
    logger = logging.getLogger()
    
    # Remove existing handlers
    for handler in logger.handlers:
        logger.removeHandler(handler)
    
    handler = logging.StreamHandler(sys.stdout)
    
    if settings.ENVIRONMENT in {"production", "test"}:
        # JSON logging for production/test
        formatter = jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(request_id)s %(message)s"
        )
        logger.setLevel(logging.INFO)
    else:
        # Standard logging for development
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - [request_id=%(request_id)s] - %(message)s"
        )
        logger.setLevel(logging.DEBUG)

    handler.setFormatter(formatter)
    handler.addFilter(RequestContextFilter())
    logger.addHandler(handler)
    
    # Set levels for third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
