import asyncio
from app.database import engine
from app.models import Base

async def reset_database():
    async with engine.begin() as conn:
        print("Dropping existing tables...")
        await conn.run_sync(Base.metadata.drop_all)

        print("Creating new tables...")
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
    print("DATABASE RESET SUCCESSFUL")

asyncio.run(reset_database())
