from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime

# Initialize SQLAlchemy Base. Models will inherit from this.
Base = declarative_base()

# --- Database Models ---

class GardenLayout(Base):
    __tablename__ = 'garden_layout' # Explicitly define table name
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False, unique=True)
    layout_json = Column(Text, nullable=False)  # Store yard size, orientation, beds, etc. as JSON
    last_modified = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<GardenLayout user_id={self.user_id}>'

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'layout': json.loads(self.layout_json),
            'last_modified': self.last_modified.isoformat() if self.last_modified else None,
        }


class User(Base):
    __tablename__ = 'user' # Explicitly define table name
    id = Column(Integer, primary_key=True)
    email = Column(String(120), index=True, unique=True, nullable=False)
    password_hash = Column(String(256))  # Store hash, not plain password
    creation_date = Column(DateTime, default=datetime.datetime.utcnow)
    last_login_at = Column(DateTime)
    preferred_units = Column(String(10), default='imperial')  # 'imperial' or 'metric'
    garden_beds = relationship('GardenBed', backref='owner', lazy='dynamic')

    def __repr__(self):
        return f'<User {self.email}>'

    def get_id(self):
        """Return the user ID as a string."""
        return str(self.id)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'preferences': {
                'preferred_units': self.preferred_units
            },
            'creation_date': self.creation_date.isoformat() if self.creation_date else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None
        }

class GardenBed(Base):
    __tablename__ = 'garden_bed' # Explicitly define table name
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    name = Column(String(100), nullable=False)
    shape = Column(String(20), nullable=False)  # rectangle, circle, pill, c-rectangle
    shape_params = Column(JSON, nullable=False)  # shape-specific parameters
    length = Column(Float, nullable=True)  # Deprecated: use shape_params instead
    width = Column(Float, nullable=True)   # Deprecated: use shape_params instead
    unit_measure = Column(String(20), nullable=False)  # feet or meters
    notes = Column(Text)  # Optional notes about the bed

    creation_date = Column(DateTime, default=datetime.datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<GardenBed {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'shape': self.shape,
            'shape_params': self.shape_params,
            'length': self.length,  # Deprecated
            'width': self.width,    # Deprecated
            'unit_measure': self.unit_measure,
            'notes': self.notes,
            'creation_date': self.creation_date.isoformat(),
            'last_modified': self.last_modified.isoformat()
        }

class PlantType(Base):
    __tablename__ = 'plant_type' # Explicitly define table name
    id = Column(Integer, primary_key=True)
    common_name = Column(String(100), index=True, unique=True, nullable=False)
    scientific_name = Column(String(150))
    description = Column(Text)
    avg_height = Column(Float)  # Consider units (e.g., inches or cm)
    avg_spread = Column(Float)  # Consider units
    rotation_family = Column(String(50), index=True)  # e.g., Nightshade, Legume
    notes = Column(Text)
    plantings = relationship('Planting', backref='plant_type', lazy='dynamic')

    def __repr__(self):
        return f'<PlantType {self.common_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'common_name': self.common_name,
            'scientific_name': self.scientific_name,
            'description': self.description,
            'avg_height': self.avg_height,
            'avg_spread': self.avg_spread,
            'rotation_family': self.rotation_family,
            'notes': self.notes
        }

class Planting(Base):
    __tablename__ = 'planting' # Explicitly define table name
    id = Column(Integer, primary_key=True)
    bed_id = Column(Integer, ForeignKey('garden_bed.id'), nullable=False)
    plant_type_id = Column(Integer, ForeignKey('plant_type.id'), nullable=False)
    year = Column(Integer, index=True)
    season = Column(String(20))  # e.g., Spring, Summer, Fall, Full Season
    date_planted = Column(Date)
    expected_harvest_date = Column(Date, nullable=True)
    notes = Column(Text)
    is_current = Column(Boolean, default=True, index=True)
    quantity = Column(String(50)) # Optional, e.g., "5 plants", "2 sq ft"

    def __repr__(self):
        return f'<Planting {self.id} in Bed {self.bed_id}>'

    def to_dict(self):
        plant_common_name_str = 'Unknown Plant Type'
        if hasattr(self, 'plant_type') and self.plant_type:
            plant_common_name_str = self.plant_type.common_name
        
        return {
            'id': self.id,
            'bed_id': self.bed_id,
            'plant_type_id': self.plant_type_id,
            'plant_common_name': plant_common_name_str,
            'year': self.year,
            'season': self.season,
            'date_planted': self.date_planted.isoformat() if self.date_planted else None,
            'expected_harvest_date': self.expected_harvest_date.isoformat() if self.expected_harvest_date else None,
            'notes': self.notes,
            'is_current': self.is_current,
            'quantity': self.quantity
        }
