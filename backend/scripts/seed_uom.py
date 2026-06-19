from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.uom import UOM
from typing import TypedDict

class UOMData(TypedDict):
    code: str
    name: str

UOMS: list[UOMData] = [
    {"code": "PCS", "name": "Pieces"},
    {"code": "LEMBAR", "name": "Lembar"},
    {"code": "METER", "name": "Meter"},
    {"code": "KG", "name": "Kilogram"},
    {"code": "ROLL", "name": "Roll"},
    {"code": "SET", "name": "Set"},
    {"code": "UNIT", "name": "Unit"},
    {"code": "BOX", "name": "Box"},
    {"code": "LUSIN", "name": "Lusin"},
    {"code": "PAK", "name": "Pak"}
]

def seed_uom(db: Session) -> None:
    print("Seeding UOMs...")
    for uom_data in UOMS:
        stmt = select(UOM).where(UOM.code == uom_data["code"])
        uom = db.scalars(stmt).first()
        if not uom:
            uom = UOM(
                code=uom_data["code"],
                name=uom_data["name"]
            )
            db.add(uom)
            print(f"Created UOM: {uom_data['code']}")
        else:
            print(f"UOM {uom_data['code']} already exists. Skipping.")
    db.commit()
    print("UOM seeding complete.")
