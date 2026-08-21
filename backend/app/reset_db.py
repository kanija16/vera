import asyncio
from sqlalchemy import text

from app.database import engine
from app.models import Base


async def reset_database():
    async with engine.begin() as conn:

        print("Dropping entire public schema...")

        await conn.execute(
            text("DROP SCHEMA public CASCADE")
        )

        print("Creating fresh public schema...")

        await conn.execute(
            text("CREATE SCHEMA public")
        )

        print("Creating current VERA tables...")

        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()

    print("DATABASE RESET SUCCESSFUL")


asyncio.run(reset_database())