import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy database models."""
    pass

# ============================================================================
# 1. Customer Model
# ============================================================================
class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    segment: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="b2c",
        server_default="b2c",
    )
    risk_flag: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
        server_default=func.now(),
    )

    # Relationships
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction",
        back_populates="customer",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("segment IN ('b2c', 'b2b')", name="chk_customer_segment"),
        Index("idx_customers_segment", "segment"),
        Index("idx_customers_risk_flag", "risk_flag"),
    )

    def as_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "segment": self.segment,
            "risk_flag": self.risk_flag,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

# ============================================================================
# 2. Transaction Model
# ============================================================================
class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
        index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR", server_default="INR")
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="failed",
        server_default="failed",
        index=True,
    )
    failure_reason_raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    failure_reason_classified: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    confidence_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
        server_default=func.now(),
    )

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="transactions")
    retry_attempts: Mapped[List["RetryAttempt"]] = relationship(
        "RetryAttempt",
        back_populates="transaction",
        cascade="all, delete-orphan",
    )
    recovery_actions: Mapped[List["RecoveryAction"]] = relationship(
        "RecoveryAction",
        back_populates="transaction",
        cascade="all, delete-orphan",
    )
    recovery_messages: Mapped[List["RecoveryMessage"]] = relationship(
        "RecoveryMessage",
        back_populates="transaction",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_transaction_amount_positive"),
        CheckConstraint(
            "status IN ('failed', 'retrying', 'recovered', 'lost')",
            name="chk_transaction_status",
        ),
        CheckConstraint(
            "confidence_score IS NULL OR (confidence_score >= 0.0000 AND confidence_score <= 1.0000)",
            name="chk_transaction_confidence_range",
        ),
    )

    def as_dict(self):
        return {
            "id": str(self.id),
            "razorpay_payment_id": self.razorpay_payment_id,
            "customer_id": str(self.customer_id),
            "amount": float(self.amount) if self.amount is not None else None,
            "currency": self.currency,
            "status": self.status,
            "failure_reason_raw": self.failure_reason_raw,
            "failure_reason_classified": self.failure_reason_classified,
            "confidence_score": float(self.confidence_score) if self.confidence_score is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

# ============================================================================
# 3. RetryAttempt Model
# ============================================================================
class RetryAttempt(Base):
    __tablename__ = "retry_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    # Relationships
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="retry_attempts")

    __table_args__ = (
        CheckConstraint("attempt_number >= 1", name="chk_retry_attempt_positive"),
    )

    def as_dict(self):
        return {
            "id": str(self.id),
            "transaction_id": str(self.transaction_id),
            "attempt_number": self.attempt_number,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "outcome": self.outcome,
            "method": self.method,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ============================================================================
# 4. RecoveryAction Model
# ============================================================================
class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )
    agent_reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        index=True,
    )

    # Relationships
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="recovery_actions")

    __table_args__ = (
        CheckConstraint(
            "action_type IN ('retry', 'notify', 'escalate', 'write_off')",
            name="chk_recovery_action_type",
        ),
    )

    def as_dict(self):
        return {
            "id": str(self.id),
            "transaction_id": str(self.transaction_id),
            "action_type": self.action_type,
            "agent_reasoning": self.agent_reasoning,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ============================================================================
# 5. RecoveryMessage Model
# ============================================================================
class RecoveryMessage(Base):
    __tablename__ = "recovery_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    # Relationships
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="recovery_messages")

    __table_args__ = (
        CheckConstraint(
            "channel IN ('email', 'sms', 'whatsapp')",
            name="chk_recovery_message_channel",
        ),
    )

    def as_dict(self):
        return {
            "id": str(self.id),
            "transaction_id": str(self.transaction_id),
            "channel": self.channel,
            "content": self.content,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "opened_at": self.opened_at.isoformat() if self.opened_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
