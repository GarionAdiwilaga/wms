from typing import Annotated
from pydantic import BaseModel, ConfigDict, StringConstraints
from datetime import datetime

UpperCaseStr = Annotated[str, StringConstraints(to_upper=True)]

class BranchBase(BaseModel):
    code: UpperCaseStr
    name: str
    location: str | None = None
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    code: UpperCaseStr | None = None
    name: str | None = None
    location: str | None = None
    is_active: bool | None = None

class BranchResponse(BranchBase):
    branch_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
