import sys
import os

from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.supplier import Supplier

def seed_catalog(db: Session):
    print("Seeding catalog (category and supplier)...")
    
    cat = db.query(Category).filter(Category.code == "MRM").first()
    if not cat:
        cat = Category(code="MRM", name="Marmer")
        db.add(cat)
        print("Created default Category: MRM (Marmer)")
    
    sup = db.query(Supplier).filter(Supplier.code == "ONX").first()
    if not sup:
        sup = Supplier(code="ONX", name="ONIX")
        db.add(sup)
        print("Created default Supplier: ONX (ONIX)")
        
    db.commit()
