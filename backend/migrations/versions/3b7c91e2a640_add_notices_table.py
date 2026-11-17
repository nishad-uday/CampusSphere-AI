"""add notices table

Revision ID: 3b7c91e2a640
Revises: 1da33f561685
Create Date: 2026-11-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "3b7c91e2a640"
down_revision: Union[str, Sequence[str], None] = "1da33f561685"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notices",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("college_id", sa.Uuid(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=250), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["college_id"], ["colleges.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notices_college_id"), "notices", ["college_id"], unique=False)
    op.create_index(op.f("ix_notices_created_by"), "notices", ["created_by"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notices_created_by"), table_name="notices")
    op.drop_index(op.f("ix_notices_college_id"), table_name="notices")
    op.drop_table("notices")
