"""Create the first admin user.

Usage:
    python -m scripts.create_admin --email admin@example.com --password "StrongPass123!" --name "Admin"
"""

import argparse
import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User


async def create_admin(email: str, password: str, full_name: str) -> None:
    async with AsyncSessionLocal() as session:
        existing = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing:
            existing.role = UserRole.ADMIN
            existing.is_active = True
            await session.commit()
            print(f"Existing user {email} promoted to admin.")
            return

        user = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
        )
        session.add(user)
        await session.commit()
        print(f"Admin user created: {email}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Administrator")
    args = parser.parse_args()
    asyncio.run(create_admin(args.email, args.password, args.name))
