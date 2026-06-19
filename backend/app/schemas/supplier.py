from typing import Annotated
from pydantic import BaseModel, ConfigDict, StringConstraints
from datetime import datetime

UpperCaseStr = Annotated[str, StringConstraints(to_upper=True)]

class SupplierBase(BaseModel):
    code: UpperCaseStr
    name: str
    contact_person: str | None = None
    phone: str | None = None
    notes: str | None = None
    is_active: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    code: UpperCaseStr | None = None
    name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    notes: str | None = None
    is_active: bool | None = None

class SupplierResponse(SupplierBase):
    supplier_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
