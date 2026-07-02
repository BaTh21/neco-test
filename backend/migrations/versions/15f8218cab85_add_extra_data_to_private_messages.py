"""add extra_data to private_messages

Revision ID: 15f8218cab85
Revises: 63bbcd930492
Create Date: 2026-06-30 16:04:33.549845

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15f8218cab85'
down_revision: Union[str, Sequence[str], None] = '63bbcd930492'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "private_messages",
        sa.Column("extra_data", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("private_messages", "extra_data")
