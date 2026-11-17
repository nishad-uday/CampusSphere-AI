
"""create initial database models

Revision ID: 7371f41ccaf1
Revises:
Create Date: 2026-11-05 16:44:35.882857

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '7371f41ccaf1'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        'colleges',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('email_domain', sa.String(length=150), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(
        op.f('ix_colleges_code'),
        'colleges',
        ['code'],
        unique=True
    )

    op.create_table(
        'departments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('college_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['college_id'],
            ['colleges.id'],
            ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'college_id',
            'code',
            name='uq_department_college_code'
        )
    )

    op.create_index(
        op.f('ix_departments_college_id'),
        'departments',
        ['college_id'],
        unique=False
    )

    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('college_id', sa.Uuid(), nullable=True),
        sa.Column('department_id', sa.Uuid(), nullable=True),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column(
            'role',
            sa.Enum(
                'student',
                'faculty',
                'college_admin',
                'super_admin',
                name='user_role'
            ),
            nullable=False
        ),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['college_id'],
            ['colleges.id'],
            ondelete='RESTRICT'
        ),
        sa.ForeignKeyConstraint(
            ['department_id'],
            ['departments.id'],
            ondelete='SET NULL'
        ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(
        op.f('ix_users_college_id'),
        'users',
        ['college_id'],
        unique=False
    )

    op.create_index(
        op.f('ix_users_department_id'),
        'users',
        ['department_id'],
        unique=False
    )

    op.create_index(
        op.f('ix_users_email'),
        'users',
        ['email'],
        unique=True
    )

    op.create_table(
        'faculty_profiles',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('employee_id', sa.String(length=100), nullable=True),
        sa.Column('designation', sa.String(length=150), nullable=True),
        sa.Column('specialization', sa.String(length=200), nullable=True),
        sa.Column('qualification', sa.String(length=200), nullable=True),
        sa.Column('experience_years', sa.Integer(), nullable=True),
        sa.Column('office_location', sa.String(length=150), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(
        op.f('ix_faculty_profiles_employee_id'),
        'faculty_profiles',
        ['employee_id'],
        unique=False
    )

    op.create_index(
        op.f('ix_faculty_profiles_user_id'),
        'faculty_profiles',
        ['user_id'],
        unique=True
    )

    op.create_table(
        'student_profiles',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('enrollment_number', sa.String(length=100), nullable=True),
        sa.Column('roll_number', sa.String(length=100), nullable=True),
        sa.Column('admission_year', sa.Integer(), nullable=True),
        sa.Column('graduation_year', sa.Integer(), nullable=True),
        sa.Column('current_semester', sa.Integer(), nullable=True),
        sa.Column('section', sa.String(length=30), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('skills', sa.Text(), nullable=True),
        sa.Column('github_url', sa.String(length=500), nullable=True),
        sa.Column('linkedin_url', sa.String(length=500), nullable=True),
        sa.Column('portfolio_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(
        op.f('ix_student_profiles_enrollment_number'),
        'student_profiles',
        ['enrollment_number'],
        unique=False
    )

    op.create_index(
        op.f('ix_student_profiles_user_id'),
        'student_profiles',
        ['user_id'],
        unique=True
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f('ix_student_profiles_user_id'),
        table_name='student_profiles'
    )
    op.drop_index(
        op.f('ix_student_profiles_enrollment_number'),
        table_name='student_profiles'
    )
    op.drop_table('student_profiles')

    op.drop_index(
        op.f('ix_faculty_profiles_user_id'),
        table_name='faculty_profiles'
    )
    op.drop_index(
        op.f('ix_faculty_profiles_employee_id'),
        table_name='faculty_profiles'
    )
    op.drop_table('faculty_profiles')

    op.drop_index(
        op.f('ix_users_email'),
        table_name='users'
    )
    op.drop_index(
        op.f('ix_users_department_id'),
        table_name='users'
    )
    op.drop_index(
        op.f('ix_users_college_id'),
        table_name='users'
    )
    op.drop_table('users')

    op.drop_index(
        op.f('ix_departments_college_id'),
        table_name='departments'
    )
    op.drop_table('departments')

    op.drop_index(
        op.f('ix_colleges_code'),
        table_name='colleges'
    )
    op.drop_table('colleges')

    # Remove PostgreSQL ENUM type after dropping the users table.
    postgresql.ENUM(
        'student',
        'faculty',
        'college_admin',
        'super_admin',
        name='user_role'
    ).drop(op.get_bind(), checkfirst=True)
