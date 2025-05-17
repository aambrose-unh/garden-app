from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, models, security
from ..database import get_db

router = APIRouter(
    prefix="/plant-types",
    tags=["Plant Types"],
    dependencies=[Depends(security.get_current_active_user)] # Secure all plant type routes
)

@router.post("/", response_model=schemas.PlantType, status_code=status.HTTP_201_CREATED)
def create_plant_type(
    plant_type_create: schemas.PlantTypeCreate,
    db: Session = Depends(get_db)
    # current_user: models.User = Depends(security.get_current_active_user) # Not directly used for plant type ownership
):
    """
    Create a new plant type.
    Plant types are generally global, not user-specific in this model.
    Consider admin restrictions in a production app.
    """
    # Check if plant type with the same common_name already exists to avoid duplicates
    existing_plant_type = db.query(models.PlantType).filter(models.PlantType.common_name == plant_type_create.common_name).first()
    if existing_plant_type:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Plant type with common name '{plant_type_create.common_name}' already exists."
        )

    new_plant_type = models.PlantType(**plant_type_create.model_dump())
    db.add(new_plant_type)
    db.commit()
    db.refresh(new_plant_type)
    return new_plant_type

@router.get("/", response_model=List[schemas.PlantType])
def get_all_plant_types(db: Session = Depends(get_db)):
    """
    Retrieve all plant types.
    """
    plant_types = db.query(models.PlantType).order_by(models.PlantType.common_name).all()
    return plant_types

@router.get("/{plant_type_id}", response_model=schemas.PlantType)
def get_plant_type(plant_type_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific plant type by its ID.
    """
    plant_type = db.query(models.PlantType).filter(models.PlantType.id == plant_type_id).first()
    if not plant_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant type with id {plant_type_id} not found"
        )
    return plant_type

@router.put("/{plant_type_id}", response_model=schemas.PlantType)
def update_plant_type(
    plant_type_id: int,
    plant_type_update: schemas.PlantTypeUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a specific plant type by its ID.
    """
    plant_type = db.query(models.PlantType).filter(models.PlantType.id == plant_type_id).first()
    if not plant_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant type with id {plant_type_id} not found"
        )

    update_data = plant_type_update.model_dump(exclude_unset=True)
    
    # If common_name is being updated, check for conflicts
    if "common_name" in update_data and update_data["common_name"] != plant_type.common_name:
        existing_plant_type = db.query(models.PlantType).filter(models.PlantType.common_name == update_data["common_name"]).first()
        if existing_plant_type:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Plant type with common name '{update_data['common_name']}' already exists."
            )

    for key, value in update_data.items():
        setattr(plant_type, key, value)
    
    db.add(plant_type)
    db.commit()
    db.refresh(plant_type)
    return plant_type

@router.delete("/{plant_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plant_type(plant_type_id: int, db: Session = Depends(get_db)):
    """
    Delete a specific plant type by its ID.
    Consider implications if this plant type is currently used in Plantings.
    A soft delete or check for existing plantings might be better in a production app.
    """
    plant_type = db.query(models.PlantType).filter(models.PlantType.id == plant_type_id).first()
    if not plant_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant type with id {plant_type_id} not found"
        )

    # Add check for existing plantings before deleting
    existing_plantings = db.query(models.Planting).filter(models.Planting.plant_type_id == plant_type_id).first()
    if existing_plantings:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete plant type with id {plant_type_id} as it is currently used in plantings. Please remove associated plantings first."
        )

    db.delete(plant_type)
    db.commit()
    return None
