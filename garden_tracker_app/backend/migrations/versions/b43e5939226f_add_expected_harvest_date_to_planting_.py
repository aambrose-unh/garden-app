"""Add expected_harvest_date to Planting model

Revision ID: b43e5939226f
Revises: 5424394b4157
Create Date: 2025-04-12 20:55:05.923502

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b43e5939226f'
down_revision = '5424394b4157'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('planting', schema=None) as batch_op:
        batch_op.add_column(sa.Column('expected_harvest_date', sa.Date(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('planting', schema=None) as batch_op:
        batch_op.drop_column('expected_harvest_date')

    # ### end Alembic commands ###
