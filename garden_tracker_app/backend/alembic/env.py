from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the project's backend directory to the Python path
# This allows alembic to find your models.py
import os, sys
from pathlib import Path
PROJECT_DIR = Path(__file__).resolve().parents[1] # This should be 'backend' directory
APP_DIR = PROJECT_DIR.parent # This should be 'garden_tracker_app' directory
# Corrected path to add the main project directory (garden_tracker_app) to sys.path
# so that 'from garden_tracker_app.backend import models' can work.
# However, since models.py is in the 'backend' directory which is PROJECT_DIR,
# and env.py is in 'backend/alembic', a relative import should also work if backend is treated as a package.
# Let's try a simpler approach first by adding the 'backend' directory to the path.
sys.path.insert(0, str(PROJECT_DIR))

# Import your Base from models.py
# Assuming models.py is in the same directory as this env.py or configured in sys.path
# Correct import path from garden_tracker_app.backend.models
# Since PROJECT_DIR (backend) is added to sys.path, we can import models directly
from models import Base # If 'backend' is treated as a package, this becomes: from ..models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.attributes.get('configure_logger', True):
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata # Use your Base from models.py

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata,
            render_as_batch=True,
            version_table_schema=None,
            include_schemas=True,
            sqlalchemy_module_prefix="sqlalchemy.",
            include_object_schemas=False,
            include_symbol_tables=False,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
