
import asyncio
from getpass import getpass

from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.models import College, User, UserRole
from app.core.security import hash_password


async def create_college_admin():
    print("\n=== CampusSphere AI: College Admin Setup ===\n")

    college_code = input("Enter College Code: ").strip().upper()
    full_name = input("Enter Admin Full Name: ").strip()
    email = input("Enter Admin Email: ").strip().lower()

    password = getpass("Enter Admin Password: ")
    confirm_password = getpass("Confirm Admin Password: ")

    if password != confirm_password:
        print("Error: Passwords do not match.")
        return

    if len(password) < 8:
        print("Error: Password must contain at least 8 characters.")
        return

    async with AsyncSessionLocal() as db:
        try:
            async with db.begin():

                # Find the requested active college
                result = await db.execute(
                    select(College).where(
                        College.code == college_code,
                        College.is_active.is_(True),
                    )
                )
                college = result.scalar_one_or_none()

                if college is None:
                    print("Error: Active college not found.")
                    return

                # Prevent duplicate admin bootstrap for this college
                result = await db.execute(
                    select(User.id).where(
                        User.college_id == college.id,
                        User.role == UserRole.COLLEGE_ADMIN,
                    ).limit(1)
                )

                if result.scalar_one_or_none() is not None:
                    print("Error: College Admin already exists.")
                    return

                # Prevent duplicate email
                result = await db.execute(
                    select(User.id).where(User.email == email)
                )

                if result.scalar_one_or_none() is not None:
                    print("Error: Email is already registered.")
                    return

                admin = User(
                    full_name=full_name,
                    email=email,
                    password_hash=hash_password(password),
                    role=UserRole.COLLEGE_ADMIN,
                    college_id=college.id,
                    department_id=None,
                    is_active=True,
                    is_verified=True,
                )

                db.add(admin)
                await db.flush()

                print("\nCollege Admin created successfully!")
                print("College:", college.name)
                print("Admin:", admin.full_name)
                print("Email:", admin.email)
                print("Role:", admin.role.value)

        except Exception as exc:
            print("Error creating College Admin:", type(exc).__name__)


if __name__ == "__main__":
    asyncio.run(create_college_admin())
