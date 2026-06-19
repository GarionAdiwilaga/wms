from typing import Annotated
from pydantic import BaseModel, ConfigDict, StringConstraints
from datetime import datetime

UpperCaseStr = Annotated[str, StringConstraints(to_upper=True)]

class CategoryBase(BaseModel):
    code: UpperCaseStr
    name: str
    description: str | None = None
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    code: UpperCaseStr | None = None
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None

class CategoryResponse(CategoryBase):
    category_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
