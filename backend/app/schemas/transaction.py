from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationInfo,
    field_validator,
    model_validator,
)


class TransactionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    type: Literal["income", "expense"]
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    category: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=500)
    transaction_date: date


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: Literal["income", "expense"]
    amount: Decimal
    category: str
    description: str | None
    transaction_date: date
    user_id: int


class TransactionUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    type: Literal["income", "expense"] | None = None
    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )
    category: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=500)
    transaction_date: date | None = None

    @field_validator(
        "type",
        "amount",
        "category",
        "transaction_date",
        mode="before",
    )
    @classmethod
    def reject_null_required_patch_fields(cls, value, info: ValidationInfo):
        if value is None:
            raise ValueError(f"Field '{info.field_name}' cannot be null.")
        return value

    @model_validator(mode="before")
    @classmethod
    def validate_patch_fields(cls, value):
        if not isinstance(value, dict):
            return value

        if not value:
            raise ValueError("Provide at least one field to update.")

        return value
