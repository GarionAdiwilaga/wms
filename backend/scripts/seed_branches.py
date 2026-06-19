from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.branch import Branch
from typing import TypedDict

class BranchData(TypedDict):
    code: str
    name: str

BRANCHES: list[BranchData] = [
    {"code": "BPN", "name": "Balikpapan"},
    {"code": "SMD", "name": "Samarinda"},
    {"code": "BTG", "name": "Bontang"}
]

def seed_branches(db: Session) -> None:
    print("Seeding Branches...")
    for branch_data in BRANCHES:
        stmt = select(Branch).where(Branch.code == branch_data["code"])
        branch = db.scalars(stmt).first()
        if not branch:
            branch = Branch(
                code=branch_data["code"],
                name=branch_data["name"]
            )
            db.add(branch)
            print(f"Created Branch: {branch_data['code']}")
        else:
            print(f"Branch {branch_data['code']} already exists. Skipping.")
    db.commit()
    print("Branch seeding complete.")
