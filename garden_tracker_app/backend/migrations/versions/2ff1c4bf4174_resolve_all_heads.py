"""Resolve all heads

Revision ID: 2ff1c4bf4174
Revises: 652f312db7af, c9b61553498d, remove_bed_location_orientation
Create Date: 2025-04-25 16:04:07.325490

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2ff1c4bf4174'
down_revision = ('652f312db7af', 'c9b61553498d', 'remove_bed_location_orientation')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
