from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any # Added Any for shape_params
import datetime

from .. import schemas, models, security
from ..database import get_db

router = APIRouter(
    prefix="/garden-beds",
    tags=["Garden Beds"],
    dependencies=[Depends(security.get_current_active_user)] # All routes here require auth
)

@router.post("/", response_model=schemas.GardenBed, status_code=status.HTTP_201_CREATED)
def create_garden_bed(
    garden_bed_create: schemas.GardenBedCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Create a new garden bed for the authenticated user.
    """
    # Basic validation for shape and shape_params can be added here if needed,
    # e.g., ensuring required keys in shape_params based on shape value.
    # Pydantic handles basic type validation (e.g., shape_params is a dict).

    new_garden_bed = models.GardenBed(
        **garden_bed_create.model_dump(), # Pydantic v2
        user_id=current_user.id,
        creation_date=datetime.datetime.now(datetime.timezone.utc),
        last_modified=datetime.datetime.now(datetime.timezone.utc)
        # Note: 'length' and 'width' are deprecated and not set here.
        # They will remain None/null in the DB unless explicitly handled for legacy data.
    )
    db.add(new_garden_bed)
    db.commit()
    db.refresh(new_garden_bed)
    return new_garden_bed

@router.get("/", response_model=List[schemas.GardenBed])
def get_user_garden_beds(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Retrieve all garden beds for the authenticated user.
    """
    garden_beds = db.query(models.GardenBed).filter(models.GardenBed.user_id == current_user.id).all()
    return garden_beds

@router.get("/{bed_id}", response_model=schemas.GardenBed)
def get_garden_bed(
    bed_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Retrieve a specific garden bed by its ID for the authenticated user.
    """
    garden_bed = db.query(models.GardenBed).filter(
        models.GardenBed.id == bed_id,
        models.GardenBed.user_id == current_user.id
    ).first()

    if not garden_bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Garden bed with id {bed_id} not found or not owned by user"
        )
    return garden_bed

@router.put("/{bed_id}", response_model=schemas.GardenBed)
def update_garden_bed(
    bed_id: int,
    garden_bed_update: schemas.GardenBedUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Update a specific garden bed by its ID for the authenticated user.
    """
    garden_bed = db.query(models.GardenBed).filter(
        models.GardenBed.id == bed_id,
        models.GardenBed.user_id == current_user.id
    ).first()

    if not garden_bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Garden bed with id {bed_id} not found or not owned by user"
        )

    update_data = garden_bed_update.model_dump(exclude_unset=True) # Pydantic v2, exclude_unset for partial updates
    for key, value in update_data.items():
        setattr(garden_bed, key, value)
    
    garden_bed.last_modified = datetime.datetime.now(datetime.timezone.utc)
    
    db.add(garden_bed) # Add to session before commit, even if it's an update
    db.commit()
    db.refresh(garden_bed)
    return garden_bed

@router.delete("/{bed_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_garden_bed(
    bed_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Delete a specific garden bed by its ID for the authenticated user.
    """
    garden_bed = db.query(models.GardenBed).filter(
        models.GardenBed.id == bed_id,
        models.GardenBed.user_id == current_user.id
    ).first()

    if not garden_bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Garden bed with id {bed_id} not found or not owned by user"
        )

    db.delete(garden_bed)
    db.commit()
    return None # For 204 No Content, no response body is sent
