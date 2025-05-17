from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime

from .. import schemas, models, security
from ..database import get_db

router = APIRouter(
    prefix="/plantings",
    tags=["Plantings"],
    dependencies=[Depends(security.get_current_active_user)]
)

@router.post("/", response_model=schemas.Planting, status_code=status.HTTP_201_CREATED)
def create_planting(
    planting_create: schemas.PlantingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Create a new planting in a specified garden bed for the authenticated user.
    """
    # Verify the garden bed exists and belongs to the current user
    garden_bed = db.query(models.GardenBed).filter(
        models.GardenBed.id == planting_create.bed_id,
        models.GardenBed.user_id == current_user.id
    ).first()
    if not garden_bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Garden bed with id {planting_create.bed_id} not found or not owned by user."
        )

    # Verify the plant type exists
    plant_type = db.query(models.PlantType).filter(models.PlantType.id == planting_create.plant_type_id).first()
    if not plant_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant type with id {planting_create.plant_type_id} not found."
        )
    
    # Set default year if not provided
    year_to_set = planting_create.year if planting_create.year is not None else datetime.date.today().year

    new_planting_data = planting_create.model_dump()
    new_planting_data['year'] = year_to_set # Ensure year is set

    new_planting = models.Planting(**new_planting_data)
    
    db.add(new_planting)
    db.commit()
    db.refresh(new_planting)

    # For the response, populate plant_common_name
    # This is a bit manual here; could be improved with a relationship loader or property in the model/schema
    response_planting = schemas.Planting.model_validate(new_planting) # Pydantic v2
    response_planting.plant_common_name = plant_type.common_name
    
    return response_planting

@router.get("/by-bed/{bed_id}", response_model=List[schemas.Planting])
def get_plantings_for_bed(
    bed_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Retrieve all plantings for a specific garden bed owned by the authenticated user.
    """
    # Verify the garden bed exists and belongs to the current user
    garden_bed = db.query(models.GardenBed).filter(
        models.GardenBed.id == bed_id,
        models.GardenBed.user_id == current_user.id
    ).first()
    if not garden_bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Garden bed with id {bed_id} not found or not owned by user."
        )

    plantings = db.query(models.Planting).filter(models.Planting.bed_id == bed_id).all()
    
    # Populate plant_common_name for each planting in the response
    response_plantings = []
    for p in plantings:
        schema_planting = schemas.Planting.model_validate(p)
        plant_type = db.query(models.PlantType).filter(models.PlantType.id == p.plant_type_id).first()
        if plant_type:
            schema_planting.plant_common_name = plant_type.common_name
        response_plantings.append(schema_planting)
        
    return response_plantings

@router.get("/{planting_id}", response_model=schemas.Planting)
def get_planting(
    planting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Retrieve a specific planting by its ID.
    Ensures the planting belongs to a bed owned by the authenticated user.
    """
    planting = db.query(models.Planting).filter(models.Planting.id == planting_id).first()
    if not planting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Planting with id {planting_id} not found."
        )

    # Verify ownership by checking the associated garden bed
    garden_bed = db.query(models.GardenBed).filter(
        models.GardenBed.id == planting.bed_id,
        models.GardenBed.user_id == current_user.id
    ).first()
    if not garden_bed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, # Or 404 if we don't want to reveal existence
            detail=f"Planting with id {planting_id} not found or access denied."
        )

    # Populate plant_common_name
    response_planting = schemas.Planting.model_validate(planting)
    plant_type = db.query(models.PlantType).filter(models.PlantType.id == planting.plant_type_id).first()
    if plant_type:
        response_planting.plant_common_name = plant_type.common_name

    return response_planting

@router.put("/{planting_id}", response_model=schemas.Planting)
def update_planting(
    planting_id: int,
    planting_update: schemas.PlantingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Update a specific planting by its ID.
    Ensures the planting belongs to a bed owned by the authenticated user.
    If bed_id is updated, ensures the new bed also belongs to the user.
    """
    planting = db.query(models.Planting).filter(models.Planting.id == planting_id).first()
    if not planting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Planting with id {planting_id} not found."
        )

    # Verify current ownership of the planting's bed
    current_garden_bed = db.query(models.GardenBed).filter(
        models.GardenBed.id == planting.bed_id,
        models.GardenBed.user_id == current_user.id
    ).first()
    if not current_garden_bed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to planting with id {planting_id}."
        )

    update_data = planting_update.model_dump(exclude_unset=True)

    # If bed_id is being updated, verify the new bed belongs to the user
    if "bed_id" in update_data and update_data["bed_id"] != planting.bed_id:
        new_garden_bed = db.query(models.GardenBed).filter(
            models.GardenBed.id == update_data["bed_id"],
            models.GardenBed.user_id == current_user.id
        ).first()
        if not new_garden_bed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"New garden bed with id {update_data['bed_id']} not found or not owned by user."
            )

    # If plant_type_id is being updated, verify the new plant type exists
    if "plant_type_id" in update_data and update_data["plant_type_id"] != planting.plant_type_id:
        new_plant_type = db.query(models.PlantType).filter(models.PlantType.id == update_data["plant_type_id"]).first()
        if not new_plant_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"New plant type with id {update_data['plant_type_id']} not found."
            )

    for key, value in update_data.items():
        setattr(planting, key, value)
    
    db.add(planting)
    db.commit()
    db.refresh(planting)

    # Populate plant_common_name for the response
    response_planting = schemas.Planting.model_validate(planting)
    # Determine which plant_type_id to use for fetching common_name (original or updated)
    final_plant_type_id = update_data.get("plant_type_id", planting.plant_type_id)
    plant_type_for_name = db.query(models.PlantType).filter(models.PlantType.id == final_plant_type_id).first()
    if plant_type_for_name:
        response_planting.plant_common_name = plant_type_for_name.common_name
        
    return response_planting

@router.delete("/{planting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_planting(
    planting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Delete a specific planting by its ID.
    Ensures the planting belongs to a bed owned by the authenticated user.
    """
    planting = db.query(models.Planting).filter(models.Planting.id == planting_id).first()
    if not planting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Planting with id {planting_id} not found."
        )

    # Verify ownership by checking the associated garden bed
    garden_bed = db.query(models.GardenBed).filter(
        models.GardenBed.id == planting.bed_id,
        models.GardenBed.user_id == current_user.id
    ).first()
    if not garden_bed:
        # If the bed doesn't exist or isn't owned by the user, they can't delete its plantings
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Access denied to planting with id {planting_id}."
        )

    db.delete(planting)
    db.commit()
    return None
