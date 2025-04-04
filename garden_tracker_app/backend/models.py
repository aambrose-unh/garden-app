from flask_sqlalchemy import SQLAlchemy
import datetime

# Initialize SQLAlchemy instance.
# This will be linked to the Flask app instance later using db.init_app(app)
db = SQLAlchemy()

# --- Database Models ---

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

class GardenBed(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    length = db.Column(db.Float, nullable=False)
    width = db.Column(db.Float, nullable=False)
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
            'length': self.length,
            'width': self.width,
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

class Planting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bed_id = db.Column(db.Integer, db.ForeignKey('garden_bed.id'), nullable=False)
    plant_type_id = db.Column(db.Integer, db.ForeignKey('plant_type.id'), nullable=False)
    year = db.Column(db.Integer, index=True)
    season = db.Column(db.String(20))  # e.g., Spring, Summer, Fall, Full Season
    date_planted = db.Column(db.Date)
    notes = db.Column(db.Text)
    is_current = db.Column(db.Boolean, default=True, index=True)

    def __repr__(self):
        return f'<Planting {self.id} in Bed {self.bed_id}>'
