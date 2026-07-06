from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field

from app.domain.enums import AllocationType

# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    color: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    name: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: str
    user_id: str
    
    class Config:
        from_attributes = True

# --- Rule Schemas ---
class BudgetRuleBase(BaseModel):
    category_id: str
    allocation_type: AllocationType
    allocation_value: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    monthly_limit: Optional[Decimal] = Field(default=None, ge=0)

class BudgetRuleCreate(BudgetRuleBase):
    pass

class BudgetRuleUpdate(BaseModel):
    category_id: Optional[str] = None
    allocation_type: Optional[AllocationType] = None
    allocation_value: Optional[Decimal] = Field(default=None, ge=0)
    monthly_limit: Optional[Decimal] = Field(default=None, ge=0)

class BudgetRuleResponse(BudgetRuleBase):
    id: str
    user_id: str
    category: Optional[CategoryResponse] = None # For nested display if needed

    class Config:
        from_attributes = True
