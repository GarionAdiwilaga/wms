import os
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.user import User
from app.core.security import get_password_hash

def seed_admin(db: Session) -> None:
    print("Seeding Super Admin...")
    admin_password = os.getenv("INITIAL_ADMIN_PASSWORD")
    if not admin_password:
        print("WARNING: INITIAL_ADMIN_PASSWORD environment variable not set. Skipping admin seed.")
        return

    username = "admin"
    stmt = select(User).where(User.username == username)
    user = db.scalars(stmt).first()
    
    if not user:
        hashed_password = get_password_hash(admin_password)
        admin_user = User(
            username=username,
            password_hash=hashed_password,
            full_name="System Administrator",
            role="super_admin",
            branch_id=None,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print(f"Created Super Admin user '{username}' successfully.")
    else:
        print(f"User '{username}' already exists. Skipping admin seed.")
