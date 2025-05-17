from pydantic import BaseModel, EmailStr, Json
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    preferred_units: Optional[str] = 'imperial'

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    creation_date: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True # Pydantic V2 way to use orm_mode

# --- GardenBed Schemas ---
# Reflects the memory MEMORY[633b5fd8-0e81-46bd-92c2-3be3fd3b432d]
# with 'shape' and 'shape_params' as primary fields for dimensions.
class GardenBedBase(BaseModel):
    name: str
    shape: str  # e.g., "rectangle", "circle", "pill", "c-rectangle"
    shape_params: Dict[str, Any] # e.g., {"length": 10, "width": 5}, {"diameter": 7}
    unit_measure: str # e.g., "feet", "meters"
    notes: Optional[str] = None

class GardenBedCreate(GardenBedBase):
    pass

class GardenBedUpdate(GardenBedBase):
    name: Optional[str] = None
    shape: Optional[str] = None
    shape_params: Optional[Dict[str, Any]] = None
    unit_measure: Optional[str] = None
    notes: Optional[str] = None

class GardenBed(GardenBedBase):
    id: int
    user_id: int
    creation_date: datetime
    last_modified: datetime
    # Deprecated fields, included for potential read operations during transition
    length: Optional[float] = None 
    width: Optional[float] = None

    class Config:
        from_attributes = True

# --- PlantType Schemas ---
class PlantTypeBase(BaseModel):
    common_name: str
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    avg_height: Optional[float] = None
    avg_spread: Optional[float] = None
    rotation_family: Optional[str] = None
    notes: Optional[str] = None

class PlantTypeCreate(PlantTypeBase):
    pass

class PlantTypeUpdate(PlantTypeBase):
    common_name: Optional[str] = None

class PlantType(PlantTypeBase):
    id: int

    class Config:
        from_attributes = True

# --- Planting Schemas ---
class PlantingBase(BaseModel):
    plant_type_id: int
    year: Optional[int] = None
    season: Optional[str] = None
    date_planted: Optional[date] = None
    expected_harvest_date: Optional[date] = None
    notes: Optional[str] = None
    is_current: Optional[bool] = True
    quantity: Optional[str] = None

class PlantingCreate(PlantingBase):
    bed_id: int # Required on creation, associated with a specific bed

class PlantingUpdate(BaseModel): # Allows partial updates
    plant_type_id: Optional[int] = None
    year: Optional[int] = None
    season: Optional[str] = None
    date_planted: Optional[date] = None
    expected_harvest_date: Optional[date] = None
    notes: Optional[str] = None
    is_current: Optional[bool] = None
    quantity: Optional[str] = None

class Planting(PlantingBase):
    id: int
    bed_id: int
    plant_common_name: Optional[str] = None # To be populated from related PlantType

    class Config:
        from_attributes = True

# --- GardenLayout Schemas ---
class GardenLayoutBase(BaseModel):
    layout_json: Dict[str, Any] # Assuming layout_json is a JSON object, represented as a dict

class GardenLayoutCreate(GardenLayoutBase):
    pass

class GardenLayoutUpdate(GardenLayoutBase):
    pass

class GardenLayout(GardenLayoutBase):
    id: int
    user_id: int
    last_modified: Optional[datetime] = None

    class Config:
        from_attributes = True

# Schemas for JWT
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
