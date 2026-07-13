import os
import sys
from sqlalchemy import text

# Add the parent directory to sys.path to allow importing from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.core.config import settings

TABLES_TO_TRUNCATE = [
    "audit_logs",
    "transfer_lines",
    "transfers",
    "stock_opname_lines",
    "stock_opname_sessions",
    "outbound_lines",
    "outbound_sessions",
    "stock_in_lines",
    "stock_in_sessions",
    "inventory_transactions",
    "branch_stocks"
]

def main():
    print("=" * 60)
    print("⚠️  WARNING: PREPARE GO-LIVE SCRIPT ⚠️")
    print("=" * 60)
    print("This script will PERMANENTLY DELETE all transactional data.")
    print("It is designed to be run ONCE before the system goes live.")
    print("\nThe following tables will be truncated and their sequences reset:")
    for t in TABLES_TO_TRUNCATE:
        print(f" - {t}")
    
    print("\nMaster Data (Users, Branches, Categories, Suppliers, Items, UOM) will NOT be deleted.")
    
    confirm1 = input("\nAre you absolutely sure you want to proceed? Type 'YES' to continue: ")
    if confirm1 != "YES":
        print("Operation cancelled.")
        sys.exit(0)
        
    confirm2 = input("Please confirm again by typing 'I_UNDERSTAND_DATA_WILL_BE_LOST': ")
    if confirm2 != "I_UNDERSTAND_DATA_WILL_BE_LOST":
        print("Operation cancelled.")
        sys.exit(0)
        
    print("\nConnecting to database...")
    db = SessionLocal()
    
    try:
        # PostgreSQL supports TRUNCATE with RESTART IDENTITY which does exactly what we want:
        # It deletes the data and resets the auto-increment sequences.
        # We also use CASCADE to handle foreign key dependencies.
        tables_str = ", ".join(TABLES_TO_TRUNCATE)
        
        print(f"Executing TRUNCATE {tables_str} RESTART IDENTITY CASCADE...")
        db.execute(text(f"TRUNCATE {tables_str} RESTART IDENTITY CASCADE"))
        
        db.commit()
        print("✅ Data successfully wiped and sequences reset.\n")
        
        # Post-reset verification
        print("Running post-reset verification...")
        all_clear = True
        for table in TABLES_TO_TRUNCATE:
            result = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            if result == 0:
                print(f" - {table}: 0 rows (OK)")
            else:
                print(f" - {table}: {result} rows (FAILED)")
                all_clear = False
                
        if all_clear:
            print("\n🎉 Verification passed! All transactional tables are empty.")
            print("The system is now clean and ready for Production Go-Live.")
        else:
            print("\n❌ Verification failed! Some tables still contain data.")
            sys.exit(1)
            
    except Exception as e:
        db.rollback()
        print(f"\n❌ An error occurred: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
