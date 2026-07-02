"""add extra_data to group_messages

Revision ID: d2db09f69af3
Revises: 15f8218cab85
Create Date: 2026-06-30 16:23:26.769520

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2db09f69af3'
down_revision: Union[str, Sequence[str], None] = '15f8218cab85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "group_messages",
        sa.Column("extra_data", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("group_messages", "extra_data")
