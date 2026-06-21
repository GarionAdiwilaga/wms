from typing import Any, Generic, Type, TypeVar
from sqlalchemy.orm import Session
from sqlalchemy import select

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], db: Session):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).
        """
        self.model = model
        self.db = db

    def get(self, id: Any) -> ModelType | None:
        return self.db.get(self.model, id)

    def get_multi(self) -> list[ModelType]:
        stmt = select(self.model)
        return list(self.db.scalars(stmt).all())

    def get_by(self, **kwargs: Any) -> ModelType | None:
        stmt = select(self.model).filter_by(**kwargs)
        return self.db.scalars(stmt).first()

    def create(self, obj_in: CreateSchemaType | dict[str, Any]) -> ModelType:
        obj_in_data = obj_in if isinstance(obj_in, dict) else obj_in.model_dump()
        db_obj = self.model(**obj_in_data)
        self.db.add(db_obj)
        self.db.flush()
        return db_obj

    def update(self, db_obj: ModelType, obj_in: UpdateSchemaType | dict[str, Any]) -> ModelType:
        obj_data = obj_in if isinstance(obj_in, dict) else obj_in.model_dump(exclude_unset=True)
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        self.db.add(db_obj)
        self.db.flush()
        return db_obj

    def remove(self, id: Any) -> ModelType | None:
        obj = self.db.get(self.model, id)
        if obj:
            self.db.delete(obj)
            self.db.flush()
        return obj
