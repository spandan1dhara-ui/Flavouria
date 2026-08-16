from pydantic import BaseModel, Field
from typing import List, Optional


class Ingredient(BaseModel):
    quantity: Optional[str] = ""
    unit: Optional[str] = ""
    name: str


class RecipeCreate(BaseModel):
    title: str
    description: str = ""
    thumbnail: Optional[str] = None
    cuisine: str
    region: Optional[str] = ""
    category: str = ""
    diet: str = "Vegetarian"
    spice_level: str = "medium"  # mild | medium | spicy
    difficulty: str = "Medium"  # Easy | Medium | Advanced
    prep_time: int = 0
    cook_time: int = 0
    servings: int = 2
    tags: List[str] = Field(default_factory=list)
    ingredients: List[Ingredient] = Field(default_factory=list)
    instructions: List[str] = Field(default_factory=list)
    youtube_url: Optional[str] = None
    status: str = "PENDING"  # DRAFT | PENDING | PUBLISHED | REJECTED | ARCHIVED


class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    cuisine: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    diet: Optional[str] = None
    spice_level: Optional[str] = None
    difficulty: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = None
    tags: Optional[List[str]] = None
    ingredients: Optional[List[Ingredient]] = None
    instructions: Optional[List[str]] = None
    youtube_url: Optional[str] = None
    status: Optional[str] = None


class RatingBody(BaseModel):
    value: int  # 1-5


class BecomeCreatorBody(BaseModel):
    display_name: str
    bio: str = ""
    avatar: Optional[str] = None


class SuggestDishBody(BaseModel):
    query: str


class PreferencesBody(BaseModel):
    spice_tolerance: Optional[str] = None
    dietary: Optional[List[str]] = None
    cuisines: Optional[List[str]] = None
    max_cook_time: Optional[int] = None


class ModerateBody(BaseModel):
    status: str
    note: Optional[str] = None


class WeightsBody(BaseModel):
    weights: dict
