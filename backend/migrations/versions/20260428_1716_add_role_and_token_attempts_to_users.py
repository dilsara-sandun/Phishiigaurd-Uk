"""Add role and verify_token_attempts to users table

Revision ID: add_role_token_attempts
Revises: 49822a0524f2
Create Date: 2026-04-28 17:16:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_role_token_attempts'
down_revision: Union[str, None] = '49822a0524f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type if it doesn't already exist
    user_role_enum = postgresql.ENUM('user', 'admin', name='user_role_enum', create_type=False)
    user_role_enum.create(op.get_bind(), checkfirst=True)

    # Add 'role' column if it doesn't exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [col['name'] for col in inspector.get_columns('users')]

    if 'role' not in existing_cols:
        op.add_column(
            'users',
            sa.Column(
                'role',
                sa.Enum('user', 'admin', name='user_role_enum'),
                nullable=False,
                server_default='user',
            )
        )

    if 'verify_token_attempts' not in existing_cols:
        op.add_column(
            'users',
            sa.Column(
                'verify_token_attempts',
                sa.Integer(),
                nullable=False,
                server_default='0',
            )
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [col['name'] for col in inspector.get_columns('users')]

    if 'verify_token_attempts' in existing_cols:
        op.drop_column('users', 'verify_token_attempts')

    if 'role' in existing_cols:
        op.drop_column('users', 'role')
