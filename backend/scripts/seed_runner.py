import sys
import os

# Add root project dir to python path if executed directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from scripts.seed_uom import seed_uom
from scripts.seed_branches import seed_branches
from scripts.seed_admin import seed_admin
from scripts.seed_catalog import seed_catalog

def main():
    print("Starting database seed process...")
    db = SessionLocal()
    try:
        seed_uom(db)
        seed_branches(db)
        seed_admin(db)
        seed_catalog(db)
        print("All database seed scripts executed successfully.")
    except Exception as e:
        print(f"Error occurred during database seeding: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    main()
