from enum import Enum


class TransactionType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class TransactionStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    cancelled = "cancelled"


class AllocationType(str, Enum):
    FIXED = "FIXED"
    PERCENT = "PERCENT"


class RecurringFrequency(str, Enum):
    monthly = "monthly"
    weekly = "weekly"
    biweekly = "biweekly"
    yearly = "yearly"
    daily = "daily"


class SubscriptionBillingCycle(str, Enum):
    monthly = "monthly"
    yearly = "yearly"


class AutopilotPaymentSourceType(str, Enum):
    BILL = "BILL"
    SUBSCRIPTION = "SUBSCRIPTION"
    GOAL = "GOAL"


class AutopilotPaymentStatus(str, Enum):
    approval_required = "approval_required"
    approved = "approved"
    processing = "processing"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"
