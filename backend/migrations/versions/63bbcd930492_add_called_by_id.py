"""add called_by_id

Revision ID: 63bbcd930492
Revises: 
Create Date: 2026-06-30 12:11:13.091474

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '63bbcd930492'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "group_messages",
        sa.Column("called_by_id", sa.Integer(), nullable=True)
    )

    op.create_foreign_key(
        "group_messages_called_by_id_fkey",
        "group_messages",
        "users",
        ["called_by_id"],
        ["id"],
        ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint(
        "group_messages_called_by_id_fkey",
        "group_messages",
        type_="foreignkey"
    )

    op.drop_column("group_messages", "called_by_id")
