"""add direct student faculty messaging

Revision ID: 8a4d2c91f6b0
Revises: 525f38e06ac3
Create Date: 2026-11-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8a4d2c91f6b0"
down_revision: Union[str, Sequence[str], None] = "525f38e06ac3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "direct_conversations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("college_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("faculty_id", sa.Uuid(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["college_id"], ["colleges.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["faculty_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "student_id",
            "faculty_id",
            name="uq_direct_conversation_student_faculty",
        ),
    )
    op.create_index(
        op.f("ix_direct_conversations_college_id"),
        "direct_conversations",
        ["college_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_direct_conversations_student_id"),
        "direct_conversations",
        ["student_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_direct_conversations_faculty_id"),
        "direct_conversations",
        ["faculty_id"],
        unique=False,
    )
    op.create_index(
        "ix_direct_conversations_college_student",
        "direct_conversations",
        ["college_id", "student_id"],
        unique=False,
    )
    op.create_index(
        "ix_direct_conversations_college_faculty",
        "direct_conversations",
        ["college_id", "faculty_id"],
        unique=False,
    )

    op.create_table(
        "direct_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("sender_id", sa.Uuid(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["direct_conversations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_direct_messages_conversation_id"),
        "direct_messages",
        ["conversation_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_direct_messages_sender_id"),
        "direct_messages",
        ["sender_id"],
        unique=False,
    )
    op.create_index(
        "ix_direct_messages_conversation_created",
        "direct_messages",
        ["conversation_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_direct_messages_conversation_read",
        "direct_messages",
        ["conversation_id", "read_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_direct_messages_conversation_read", table_name="direct_messages")
    op.drop_index("ix_direct_messages_conversation_created", table_name="direct_messages")
    op.drop_index(op.f("ix_direct_messages_sender_id"), table_name="direct_messages")
    op.drop_index(op.f("ix_direct_messages_conversation_id"), table_name="direct_messages")
    op.drop_table("direct_messages")

    op.drop_index("ix_direct_conversations_college_faculty", table_name="direct_conversations")
    op.drop_index("ix_direct_conversations_college_student", table_name="direct_conversations")
    op.drop_index(op.f("ix_direct_conversations_faculty_id"), table_name="direct_conversations")
    op.drop_index(op.f("ix_direct_conversations_student_id"), table_name="direct_conversations")
    op.drop_index(op.f("ix_direct_conversations_college_id"), table_name="direct_conversations")
    op.drop_table("direct_conversations")
