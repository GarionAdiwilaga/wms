from typing import Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

class AuditService:
    """
    Core service for recording immutable audit logs across the system.
    
    Design principles:
    - Transactional alignment: It strictly adds objects to the provided SQLAlchemy session 
      but never calls session.commit(). This guarantees atomicity, meaning the audit log 
      and the business operation either succeed together or fail together.
    - Non-blocking: Simply invokes session.add() without triggering I/O, making it fully 
      async-friendly if an AsyncSession is passed.
    """

    @staticmethod
    def _serialize_dates(val: Any) -> Any:
        from datetime import datetime
        if isinstance(val, dict):
            return {k: AuditService._serialize_dates(v) for k, v in val.items()}
        elif isinstance(val, list):
            return [AuditService._serialize_dates(v) for v in val]
        elif isinstance(val, datetime):
            return val.isoformat()
        return val

    @staticmethod
    def create_log(
        db: Session,
        user_id: int,
        action: str,
        entity_type: str,
        entity_id: int,
        old_values: dict[str, Any] | None = None,
        new_values: dict[str, Any] | None = None,
        ip_address: str | None = None
    ) -> AuditLog:
        """
        Base utility to construct and register an AuditLog model in the current database transaction.
        """
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=AuditService._serialize_dates(old_values),
            new_values=AuditService._serialize_dates(new_values),
            ip_address=ip_address
        )
        db.add(log)
        return log

    @staticmethod
    def log_create(
        db: Session,
        user_id: int,
        entity_type: str,
        entity_id: int,
        new_values: dict[str, Any],
        ip_address: str | None = None
    ) -> AuditLog:
        """Logs an entity creation event."""
        return AuditService.create_log(
            db=db,
            user_id=user_id,
            action="CREATE",
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=None,
            new_values=new_values,
            ip_address=ip_address
        )

    @staticmethod
    def log_update(
        db: Session,
        user_id: int,
        entity_type: str,
        entity_id: int,
        old_values: dict[str, Any],
        new_values: dict[str, Any],
        ip_address: str | None = None
    ) -> AuditLog:
        """Logs an entity update event, retaining the before and after states."""
        return AuditService.create_log(
            db=db,
            user_id=user_id,
            action="UPDATE",
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address
        )

    @staticmethod
    def log_delete(
        db: Session,
        user_id: int,
        entity_type: str,
        entity_id: int,
        old_values: dict[str, Any],
        ip_address: str | None = None
    ) -> AuditLog:
        """Logs an entity deletion event."""
        return AuditService.create_log(
            db=db,
            user_id=user_id,
            action="DELETE",
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=None,
            ip_address=ip_address
        )
