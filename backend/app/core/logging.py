import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        # Add any extra attributes passed via `extra={"custom": "val"}`
        for key, val in record.__dict__.items():
            if key not in ["args", "asctime", "created", "exc_info", "exc_text", "filename",
                          "funcName", "id", "levelname", "levelno", "lineno", "module",
                          "msecs", "message", "msg", "name", "pathname", "process",
                          "processName", "relativeCreated", "stack_info", "thread", "threadName"]:
                log_obj[key] = val
                
        return json.dumps(log_obj)

def setup_logging():
    # Configure the root logger so all module-level loggers (logging.getLogger(__name__))
    # automatically inherit the JSON formatter — including inventory_service, transfer_service, etc.
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        root_logger.addHandler(handler)

    # Named application logger for explicit use in main.py
    app_logger = logging.getLogger("gpk_wms")
    app_logger.setLevel(logging.INFO)

    return app_logger

logger = setup_logging()
