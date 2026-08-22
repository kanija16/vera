import os
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./vera.db"
)

# Convert standard postgres/sqlite schemes to async equivalent
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("sqlite://"):
    DATABASE_URL = DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://", 1)

# SQLite async connection args
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Initialize Async Engine
engine = create_async_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

# Async Session Factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Dependency Injector for Async Database session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Deterministic database bootstrap logic (clean drop and create)
async def bootstrap_database(db_engine, force: bool = False):
    if force or os.getenv("DB_FORCE_BOOTSTRAP", "").lower() == "true":
        print("[DATABASE] Force bootstrap enabled. Dropping public schema cascade for clean reset...")
        async with db_engine.begin() as conn:
            if conn.dialect.name == "postgresql":
                await conn.execute(text("DROP SCHEMA public CASCADE;"))
                await conn.execute(text("CREATE SCHEMA public;"))
                await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
                print("[DATABASE] PostgreSQL public schema cascaded and recreated.")
            else:
                from app.models import Base
                await conn.run_sync(Base.metadata.drop_all)
                print("[DATABASE] SQLite tables dropped.")
                
    # Create all tables asynchronously
    from app.models import Base
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[DATABASE] Database tables initialized and verified.")
