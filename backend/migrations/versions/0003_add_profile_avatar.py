"""Add profile avatar storage.

Revision ID: 0003_add_profile_avatar
Revises: 0002_add_user_names
Create Date: 2026-11-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_add_profile_avatar"
down_revision: Union[str, None] = "0002_add_user_names"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_data", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_data")
