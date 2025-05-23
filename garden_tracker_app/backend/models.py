from flask_sqlalchemy import SQLAlchemy
import datetime

# Initialize SQLAlchemy instance.
# This will be linked to the Flask app instance later using db.init_app(app)
db = SQLAlchemy()

# --- Database Models ---

class GardenLayout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    layout_json = db.Column(db.Text, nullable=False)  # Store yard size, orientation, beds, etc. as JSON
    last_modified = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

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


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(256))  # Store hash, not plain password
    creation_date = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    last_login_at = db.Column(db.DateTime)
    preferred_units = db.Column(db.String(10), default='imperial')  # 'imperial' or 'metric'
    garden_beds = db.relationship('GardenBed', backref='owner', lazy='dynamic')

    def __repr__(self):
        return f'<User {self.email}>'

    def get_id(self):
        """Return the user ID as a string, as required by Flask-Login."""
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

class GardenBed(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    shape = db.Column(db.String(20), nullable=False)  # rectangle, circle, pill, c-rectangle
    shape_params = db.Column(db.JSON, nullable=False)  # shape-specific parameters
    length = db.Column(db.Float, nullable=True)  # Deprecated: use shape_params instead
    width = db.Column(db.Float, nullable=True)   # Deprecated: use shape_params instead
    unit_measure = db.Column(db.String(20), nullable=False)  # feet or meters
    notes = db.Column(db.Text)  # Optional notes about the bed

    creation_date = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    last_modified = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

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

class PlantType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    common_name = db.Column(db.String(100), index=True, unique=True, nullable=False)
    scientific_name = db.Column(db.String(150))
    description = db.Column(db.Text)
    avg_height = db.Column(db.Float)  # Consider units (e.g., inches or cm)
    avg_spread = db.Column(db.Float)  # Consider units
    rotation_family = db.Column(db.String(50), index=True)  # e.g., Nightshade, Legume
    notes = db.Column(db.Text)
    plantings = db.relationship('Planting', backref='plant_type', lazy='dynamic')

    def __repr__(self):
        return f'<PlantType {self.common_name}>'

    # Add serialization method [DRY][CA]
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

class Planting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bed_id = db.Column(db.Integer, db.ForeignKey('garden_bed.id'), nullable=False)
    plant_type_id = db.Column(db.Integer, db.ForeignKey('plant_type.id'), nullable=False)
    year = db.Column(db.Integer, index=True)
    season = db.Column(db.String(20))  # e.g., Spring, Summer, Fall, Full Season
    date_planted = db.Column(db.Date)
    expected_harvest_date = db.Column(db.Date, nullable=True) # Added field for active filtering [REH]
    notes = db.Column(db.Text)
    is_current = db.Column(db.Boolean, default=True, index=True)
    quantity = db.Column(db.String(50)) # Optional, e.g., "5 plants", "2 sq ft"

    def __repr__(self):
        return f'<Planting {self.id} in Bed {self.bed_id}>'

    # Add serialization method [DRY][ISA]
    def to_dict(self):
        return {
            'id': self.id,
            'bed_id': self.bed_id,
            'plant_type_id': self.plant_type_id,
            # Access related PlantType object to get the common name [Fix]
            'plant_common_name': self.plant_type.common_name if self.plant_type else 'Unknown Plant Type',
            'year': self.year,
            'season': self.season,
            'date_planted': self.date_planted.isoformat() if self.date_planted else None,
            'expected_harvest_date': self.expected_harvest_date.isoformat() if self.expected_harvest_date else None, # Add to serialization
            'notes': self.notes,
            'is_current': self.is_current,
            'quantity': self.quantity
        }
