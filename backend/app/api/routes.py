from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Literal

from sqlalchemy import case, func, or_

from app.schemas.dashboard import DashboardSummary
from app.core.dependencies import get_current_user, get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionPage,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter()


def commit_or_raise(db: Session) -> None:
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the transaction.",
        )


@router.get("/transactions", response_model=list[TransactionResponse])
def list_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date, Transaction.id)
        .all()
    )


@router.get("/transactions/history", response_model=TransactionPage)
def list_transaction_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=100),
    transaction_type: Literal["income", "expense"] | None = Query(
        default=None,
        alias="type",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if transaction_type is not None:
        query = query.filter(Transaction.type == transaction_type)
    if search is not None:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Transaction.category.ilike(search_pattern),
                Transaction.description.ilike(search_pattern),
            )
        )

    total = query.count()
    transactions = (
        query.order_by(Transaction.transaction_date, Transaction.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return TransactionPage(
        items=transactions,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get(
    "/transactions/{transaction_id}",
    response_model=TransactionResponse,
)
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    return transaction


@router.post(
    "/transactions",
    status_code=status.HTTP_201_CREATED,
    response_model=TransactionResponse,
)
def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_transaction = Transaction(
        **transaction_data.model_dump(),
        user_id=current_user.id,
    )
    db.add(db_transaction)
    commit_or_raise(db)
    db.refresh(db_transaction)
    return db_transaction


@router.delete(
    "/transactions/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    db.delete(transaction)
    commit_or_raise(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put(
    "/transactions/{transaction_id}",
    response_model=TransactionResponse,
)
def update_transaction(
    transaction_id: int,
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    for field, value in transaction_data.model_dump().items():
        setattr(transaction, field, value)

    commit_or_raise(db)
    db.refresh(transaction)
    return transaction


@router.patch(
    "/transactions/{transaction_id}",
    response_model=TransactionResponse,
)
def patch_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    changes = transaction_data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(transaction, field, value)

    commit_or_raise(db)
    db.refresh(transaction)
    return transaction

@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
        )
        .scalar()
    )

    total_expenses = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
        )
        .scalar()
    )

    total_income = Decimal(str(total_income))
    total_expenses = Decimal(str(total_expenses))

    return DashboardSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        balance=total_income - total_expenses,
    )
