"""Remove x, y, orientation from GardenBed

Revision ID: remove_bed_location_orientation
Revises: 1b55dcb40575
Create Date: 2025-04-25 16:00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'remove_bed_location_orientation'
down_revision = '1b55dcb40575'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('garden_bed', schema=None) as batch_op:
        batch_op.drop_column('x')
        batch_op.drop_column('y')
        batch_op.drop_column('orientation')

def downgrade():
    with op.batch_alter_table('garden_bed', schema=None) as batch_op:
        batch_op.add_column(sa.Column('x', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('y', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('orientation', sa.Float(), nullable=True, default=0.0))
