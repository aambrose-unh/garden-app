# Backend for Garden Tracker App

import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create a rotating file handler
handler = RotatingFileHandler('app.log', maxBytes=100000, backupCount=1)
handler.setLevel(logging.DEBUG)

# Create a formatter and add it to the handler
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)

# Add the handler to the logger
logger.addHandler(handler)

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Initialize CORS more explicitly, allowing multiple frontend origins
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

# --- Configuration ---
# Database Configuration (using environment variable)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///garden_tracker.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT Configuration
# IMPORTANT: Replace this placeholder with a strong, random secret key!
# Store it securely, preferably as an environment variable (e.g., os.environ.get('JWT_SECRET_KEY')). [SFT]
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "super-secret-placeholder-change-me!") 
jwt = JWTManager(app)  # Initialize JWTManager

# Custom JWT loader to debug token contents
@jwt.token_in_blocklist_loader
def check_if_token_is_revoked(jwt_header, jwt_payload):
    """Example check for revoked tokens (currently bypassed)."""
    # In a real app, you would check against a token blacklist database here.
    logger.debug("Checking if token is revoked for identity: %s", jwt_payload.get('sub')) # Log less sensitive info [SD]
    return False  # Always return False since we're not implementing token revocation yet

# --- JWT Error Handlers ---

@jwt.invalid_token_loader
def invalid_token_callback(error_string):
    """ Handles errors when the token is invalid format, expired (but specific handlers are better), etc. """
    logger.error("Invalid token error: %s", error_string) # Log the specific error
    
    # Try to get the token from the request for debugging
    auth_header = request.headers.get('Authorization')
    if auth_header:
        token = auth_header.split(' ')[1]
        logger.error("Invalid token (first 20 chars): %s", token[:20])
    
    return jsonify({"message": "Invalid token provided.", "error": error_string}), 422

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """ Handles errors when the token has expired. """
    logger.warning("Expired token received")
    return jsonify({"message": "Token has expired", "error": "token_expired"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error_string):
    """ Handles errors when no token is found or it's malformed/unparseable before validation. """
    logger.warning("Unauthorized/Missing token error: %s", error_string)
    return jsonify({"message": "Authorization token is missing or invalid", "error": error_string}), 401

# --- Database Setup ---
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Initialize database
with app.app_context():
    # Drop existing tables and recreate them
    db.drop_all()
    db.create_all()

    # Create a test user if none exists (useful for development)
    if not User.query.first():
        logger.info("No users found. Creating default test user: test@example.com")
        test_user = User(
            email="test@example.com",
            password_hash=generate_password_hash("password123"),
            preferred_units="imperial"
        )
        db.session.add(test_user)
        db.session.commit()

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

# --- API Routes (Placeholder) ---

@app.route('/api/hello')
def hello():
    return {'message': 'Hello from Flask Backend with DB Setup!'}

@app.route('/shutdown', methods=['GET'])
def shutdown():
    os.kill(os.getpid(), signal.SIGINT)
    return "Server is shutting down..."

# --- Authentication API Routes ---

@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password are required'}), 400

    email = data.get('email')
    password = data.get('password')

    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'message': 'Email already registered'}), 409  # Conflict

    # Hash the password
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    # Create new user
    new_user = User(email=email, password_hash=hashed_password)
    db.session.add(new_user)
    try:
        db.session.commit()
        # Exclude password hash from the response
        user_data = {
            'id': new_user.id,
            'email': new_user.email,
            'creation_date': new_user.creation_date.isoformat()
        }
        return jsonify({'message': 'User registered successfully', 'user': user_data}), 201
    except Exception as e:
        db.session.rollback()
        logger.error("Error registering user: %s", str(e))
        return jsonify({'message': 'Registration failed due to server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Email and password required"}), 400

    user = User.query.filter_by(email=data['email']).first()

    if user and check_password_hash(user.password_hash, data['password']):
        # Update last login time
        user.last_login_at = datetime.datetime.now(datetime.timezone.utc)
        try:
            db.session.commit()
            
            # Create a simple token with just the user ID as string
            user_id_str = str(user.id)
            
            # Create token with explicit claims
            access_token = create_access_token(
                identity=user_id_str,
                additional_claims={
                    'user_id': user_id_str,
                    'email': user.email
                }
            )
            
            logger.info("Successfully created JWT token with identity: %s", user_id_str)
            
            return jsonify({
                "message": "Login successful",
                "access_token": access_token,
                "user": {
                    "id": user_id_str,
                    "email": user.email
                }
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error("Error updating last login or creating token: %s", str(e))
            return jsonify({"message": "Login failed due to server error"}), 500
    else:
        return jsonify({"message": "Invalid credentials"}), 401

# --- Garden Bed API Routes ---

@app.route('/api/garden-beds', methods=['GET'])
@jwt_required()
def get_garden_beds():
    logger.info("\n=== Garden Beds Request Received ===")
    try:
        # Get the JWT token from the request
        auth_header = request.headers.get('Authorization')
        if auth_header:
            logger.info("Authorization header: %s", auth_header)
            token = auth_header.split(' ')[1]
            logger.info("Token (first 20 chars): %s", token[:20])
        else:
            logger.warning("No Authorization header found")

        # Get the current user ID from the token
        current_user_id = get_jwt_identity()
        logger.info("Current user ID from token: %s", current_user_id)
        logger.info("Type of user ID: %s", type(current_user_id))

        user = User.query.get(current_user_id)
        if not user:
            logger.warning("User not found for ID: %s", current_user_id)
            return jsonify({"message": "User not found"}), 404

        garden_beds = GardenBed.query.filter_by(user_id=current_user_id).all()
        beds_list = [
            {
                'id': bed.id,
                'name': bed.name,
                'length': bed.length,
                'width': bed.width,
                'notes': bed.notes
            }
            for bed in garden_beds
        ]

        logger.info("=== Garden Beds Response ===")
        logger.info("Found %d garden beds", len(garden_beds))
        logger.info("=== End of Request ===\n")
        
        return jsonify(beds_list), 200

    except Exception as e:
        logger.error("Error in get_garden_beds: %s", str(e))
        raise

@app.route('/api/garden-beds', methods=['POST'])
@jwt_required()
def create_garden_bed():
    """Create a new garden bed for the authenticated user"""
    current_user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not all(key in data for key in ['name', 'length', 'width', 'unit_measure']):
            return jsonify({
                "message": "Missing required fields",
                "required_fields": ["name", "length", "width", "unit_measure"]
            }), 400
        
        # Create new garden bed
        new_bed = GardenBed(
            name=data['name'],
            length=float(data['length']),
            width=float(data['width']),
            unit_measure=data['unit_measure'],
            notes=data.get('notes', ''),
            user_id=current_user_id
        )
        
        db.session.add(new_bed)
        db.session.commit()
        
        logger.info("Created new garden bed for user %s", current_user_id)
        
        return jsonify({
            "message": "Garden bed created successfully",
            "garden_bed": {
                "id": new_bed.id,
                "name": new_bed.name,
                "length": new_bed.length,
                "width": new_bed.width,
                "unit_measure": new_bed.unit_measure,
                "notes": new_bed.notes,
                "created_at": new_bed.creation_date.isoformat()
            }
        }), 201
        
    except ValueError as e:
        logger.error("Invalid input data: %s", str(e))
        return jsonify({"message": "Invalid input data"}), 400
    except Exception as e:
        logger.error("Error creating garden bed: %s", str(e))
        db.session.rollback()
        return jsonify({"message": "Failed to create garden bed"}), 500

@app.route('/api/garden-beds/<int:bed_id>', methods=['GET'])
@jwt_required()  # Protect this route
def get_bed_details(bed_id):
    current_user_id = get_jwt_identity()
    try:
        bed = GardenBed.query.filter_by(id=bed_id, user_id=current_user_id).first()
        # bed = GardenBed.query.get(bed_id) # Old way

        if not bed:
            return jsonify({'message': 'Garden bed not found or access denied'}), 404

        bed_data = {
            'id': bed.id,
            'user_id': bed.user_id,
            'name': bed.name,
            'length': bed.length,
            'width': bed.width,
            'unit_measure': bed.unit_measure,
            'description': bed.description,
            'creation_date': bed.creation_date.isoformat()
            # TODO: Add planting history here later
        }
        return jsonify(bed_data), 200
    except Exception as e:
        logger.error("Error retrieving garden bed details: %s", str(e))
        return jsonify({'message': 'Failed to retrieve garden bed details due to server error'}), 500

@app.route('/api/garden-beds/<int:bed_id>', methods=['PUT'])
@jwt_required()  # Protect this route
def update_bed(bed_id):
    current_user_id = get_jwt_identity()
    # bed = GardenBed.query.get(bed_id)
    bed = GardenBed.query.filter_by(id=bed_id, user_id=current_user_id).first()

    if not bed:
        return jsonify({'message': 'Garden bed not found or access denied'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    # Update fields if provided in the request
    if 'name' in data: bed.name = data['name']
    if 'length' in data: bed.length = data['length']
    if 'width' in data: bed.width = data['width']
    if 'unit_measure' in data: bed.unit_measure = data['unit_measure']
    if 'description' in data: bed.description = data['description']

    # Validate required fields (e.g., name cannot be empty if updated)
    if bed.name == "" or bed.name is None:
        return jsonify({'message': 'Bed name cannot be empty'}), 400

    try:
        db.session.commit()
        # Return the updated bed details
        bed_data = {
            'id': bed.id,
            'user_id': bed.user_id,
            'name': bed.name,
            'length': bed.length,
            'width': bed.width,
            'unit_measure': bed.unit_measure,
            'description': bed.description,
            'creation_date': bed.creation_date.isoformat()
        }
        return jsonify({'message': 'Garden bed updated successfully', 'bed': bed_data}), 200
    except Exception as e:
        db.session.rollback()
        logger.error("Error updating garden bed: %s", str(e))
        return jsonify({'message': 'Failed to update garden bed due to server error'}), 500

@app.route('/api/garden-beds/<int:bed_id>', methods=['DELETE'])
@jwt_required()  # Protect this route
def delete_bed(bed_id):
    current_user_id = get_jwt_identity()
    # bed = GardenBed.query.get(bed_id)
    bed = GardenBed.query.filter_by(id=bed_id, user_id=current_user_id).first()

    if not bed:
        return jsonify({'message': 'Garden bed not found or access denied'}), 404

    try:
        # Plantings associated with the bed will be deleted due to cascade rule in model
        db.session.delete(bed)
        db.session.commit()
        return jsonify({'message': 'Garden bed deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error("Error deleting garden bed: %s", str(e))
        return jsonify({'message': 'Failed to delete garden bed due to server error'}), 500

# --- Plant Type API Routes ---

@app.route('/api/plants', methods=['GET'])
def get_all_plant_types():
    try:
        plants = PlantType.query.order_by(PlantType.common_name).all()
        plants_data = [
            {
                'id': plant.id,
                'common_name': plant.common_name,
                'scientific_name': plant.scientific_name,
                'rotation_family': plant.rotation_family,
                'description': plant.description,
                'avg_height': plant.avg_height,
                'avg_spread': plant.avg_spread,
                'notes': plant.notes
            } for plant in plants
        ]
        return jsonify(plants_data), 200
    except Exception as e:
        logger.error("Error retrieving plant types: %s", str(e))
        return jsonify({'message': 'Failed to retrieve plant types due to server error'}), 500

@app.route('/api/plants/<int:plant_type_id>', methods=['GET'])
def get_plant_type_details(plant_type_id):
    try:
        plant = PlantType.query.get(plant_type_id)

        if not plant:
            return jsonify({'message': 'Plant type not found'}), 404

        plant_data = {
            'id': plant.id,
            'common_name': plant.common_name,
            'scientific_name': plant.scientific_name,
            'rotation_family': plant.rotation_family,
            'description': plant.description,
            'avg_height': plant.avg_height,
            'avg_spread': plant.avg_spread,
            'notes': plant.notes
        }
        return jsonify(plant_data), 200
    except Exception as e:
        logger.error("Error retrieving plant type details: %s", str(e))
        return jsonify({'message': 'Failed to retrieve plant type details due to server error'}), 500

# --- Planting History API Routes ---

@app.route('/api/garden-beds/<int:bed_id>/plantings', methods=['POST'])
@jwt_required()  # Protect this route
def add_planting(bed_id):
    # TODO: Replace with actual user identification from auth token
    # For now, assume user 1
    # user_id = 1
    current_user_id = get_jwt_identity()

    # Check if bed exists and belongs to user
    bed = GardenBed.query.filter_by(id=bed_id, user_id=current_user_id).first()
    if not bed:
        return jsonify({'message': 'Garden bed not found or access denied'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    plant_type_id = data.get('plant_type_id')
    year = data.get('year')
    season = data.get('season')
    date_planted_str = data.get('date_planted')  # Expecting YYYY-MM-DD string
    notes = data.get('notes')
    is_current = data.get('is_current', True)  # Default to True if not provided

    # Basic Validation
    if not plant_type_id or not year or not season:
        return jsonify({'message': 'Plant type ID, year, and season are required'}), 400

    # Check if plant type exists
    plant_type = PlantType.query.get(plant_type_id)
    if not plant_type:
        return jsonify({'message': f'Plant type with id {plant_type_id} not found'}), 404

    # Convert date string to date object if provided
    date_planted = None
    if date_planted_str:
        try:
            date_planted = datetime.datetime.strptime(date_planted_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format for date_planted. Use YYYY-MM-DD.'}), 400

    new_planting = Planting(
        bed_id=bed_id,
        plant_type_id=plant_type_id,
        year=year,
        season=season,
        date_planted=date_planted,
        notes=notes,
        is_current=is_current
    )
    db.session.add(new_planting)
    try:
        db.session.commit()
        # Return the created planting details
        planting_data = {
            'id': new_planting.id,
            'bed_id': new_planting.bed_id,
            'plant_type_id': new_planting.plant_type_id,
            'plant_common_name': plant_type.common_name,  # Include for convenience
            'year': new_planting.year,
            'season': new_planting.season,
            'date_planted': new_planting.date_planted.isoformat() if new_planting.date_planted else None,
            'notes': new_planting.notes,
            'is_current': new_planting.is_current
        }
        return jsonify({'message': 'Planting recorded successfully', 'planting': planting_data}), 201
    except Exception as e:
        db.session.rollback()
        logger.error("Error adding planting record: %s", str(e))
        return jsonify({'message': 'Failed to add planting record due to server error'}), 500

@app.route('/api/garden-beds/<int:bed_id>/plantings', methods=['GET'])
@jwt_required()  # Protect this route
def get_plantings_for_bed(bed_id):
    # TODO: Replace with actual user identification from auth token
    # For now, assume user 1
    # user_id = 1
    current_user_id = get_jwt_identity()

    # Check if bed exists and belongs to user
    bed = GardenBed.query.filter_by(id=bed_id, user_id=current_user_id).first()
    if not bed:
        return jsonify({'message': 'Garden bed not found or access denied'}), 404

    try:
        # Query plantings for the specific bed, order by year/season perhaps?
        plantings = Planting.query.filter_by(bed_id=bed_id) \
            .order_by(Planting.year.desc(), Planting.season).all()

        plantings_data = [
            {
                'id': p.id,
                'bed_id': p.bed_id,
                'plant_type_id': p.plant_type_id,
                'plant_common_name': p.plant_type.common_name,  # Access related object
                'year': p.year,
                'season': p.season,
                'date_planted': p.date_planted.isoformat() if p.date_planted else None,
                'notes': p.notes,
                'is_current': p.is_current
            } for p in plantings
        ]
        return jsonify(plantings_data), 200
    except Exception as e:
        logger.error("Error retrieving planting history: %s", str(e))
        return jsonify({'message': 'Failed to retrieve planting history due to server error'}), 500

@app.route('/api/plantings/<int:planting_id>', methods=['PUT'])
@jwt_required()  # Protect this route
def update_planting(planting_id):
    # TODO: Replace with actual user identification from auth token
    # Verify planting belongs to the user indirectly via the bed
    # user_id = 1
    current_user_id = get_jwt_identity()

    planting = Planting.query.get(planting_id)
    if not planting:
        return jsonify({'message': 'Planting record not found'}), 404

    # Check ownership by verifying the associated bed belongs to the user
    bed = GardenBed.query.filter_by(id=planting.bed_id, user_id=current_user_id).first()
    if not bed:
        return jsonify({'message': 'Access denied to this planting record'}), 403  # Forbidden

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    # Update fields if provided
    if 'plant_type_id' in data:
        # Check if new plant type exists
        new_plant_type = PlantType.query.get(data['plant_type_id'])
        if not new_plant_type:
            return jsonify({'message': f"Plant type with id {data['plant_type_id']} not found"}), 404
        planting.plant_type_id = data['plant_type_id']
        plant_common_name = new_plant_type.common_name  # Keep track for response
    else:
        plant_common_name = planting.plant_type.common_name

    if 'year' in data: planting.year = data['year']
    if 'season' in data: planting.season = data['season']
    if 'date_planted' in data:
        date_planted_str = data['date_planted']
        if date_planted_str:
            try:
                planting.date_planted = datetime.datetime.strptime(date_planted_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'message': 'Invalid date format for date_planted. Use YYYY-MM-DD.'}), 400
        else:
            planting.date_planted = None  # Allow setting date to null
    if 'notes' in data: planting.notes = data['notes']
    if 'is_current' in data: planting.is_current = data['is_current']

    # Re-validate required fields after update
    if not planting.plant_type_id or not planting.year or not planting.season:
        return jsonify({'message': 'Plant type ID, year, and season cannot be empty'}), 400

    try:
        db.session.commit()
        planting_data = {
            'id': planting.id,
            'bed_id': planting.bed_id,
            'plant_type_id': planting.plant_type_id,
            'plant_common_name': plant_common_name,
            'year': planting.year,
            'season': planting.season,
            'date_planted': planting.date_planted.isoformat() if planting.date_planted else None,
            'notes': planting.notes,
            'is_current': planting.is_current
        }
        return jsonify({'message': 'Planting record updated successfully', 'planting': planting_data}), 200
    except Exception as e:
        db.session.rollback()
        logger.error("Error updating planting record: %s", str(e))
        return jsonify({'message': 'Failed to update planting record due to server error'}), 500

@app.route('/api/plantings/<int:planting_id>', methods=['DELETE'])
@jwt_required()  # Protect this route
def delete_planting(planting_id):
    # TODO: Replace with actual user identification from auth token
    # user_id = 1
    current_user_id = get_jwt_identity()

    planting = Planting.query.get(planting_id)
    if not planting:
        return jsonify({'message': 'Planting record not found'}), 404

    # Check ownership
    bed = GardenBed.query.filter_by(id=planting.bed_id, user_id=current_user_id).first()
    if not bed:
        return jsonify({'message': 'Access denied to this planting record'}), 403

    try:
        db.session.delete(planting)
        db.session.commit()
        return jsonify({'message': 'Planting record deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error("Error deleting planting record: %s", str(e))
        return jsonify({'message': 'Failed to delete planting record due to server error'}), 500

# --- Planting Recommendations API Route ---

@app.route('/api/garden-beds/<int:bed_id>/recommendations', methods=['GET'])
@jwt_required()  # Protect this route
def get_planting_recommendations(bed_id):
    # TODO: Replace with actual user identification from auth token
    # user_id = 1
    current_user_id = get_jwt_identity()

    # Check if bed exists and belongs to user
    bed = GardenBed.query.filter_by(id=bed_id, user_id=current_user_id).first()
    if not bed:
        return jsonify({'message': 'Garden bed not found or access denied'}), 404

    try:
        # Find the most recent planting for this bed
        most_recent_planting = Planting.query.filter_by(bed_id=bed_id) \
            .order_by(Planting.year.desc(), Planting.season.desc()).first()

        last_rotation_family = None
        if most_recent_planting:
            last_rotation_family = most_recent_planting.plant_type.rotation_family

        # Query for plants NOT in the last rotation family
        recommendations_query = PlantType.query
        if last_rotation_family:
            recommendations_query = recommendations_query.filter(
                PlantType.rotation_family != last_rotation_family
            )

        # Fetch recommended plants (limit results?)
        recommended_plants = recommendations_query.order_by(PlantType.common_name).all()

        recommendations_data = [
            {
                'id': plant.id,
                'common_name': plant.common_name,
                'scientific_name': plant.scientific_name,
                'rotation_family': plant.rotation_family,
                'description': plant.description,
                # Add other relevant details if needed
            } for plant in recommended_plants
        ]

        return jsonify({
            'last_planted_family': last_rotation_family,  # Provide context
            'recommendations': recommendations_data
        }), 200

    except Exception as e:
        logger.error("Error generating planting recommendations: %s", str(e))
        return jsonify({'message': 'Failed to generate recommendations due to server error'}), 500

if __name__ == '__main__':
    # Ensure app context is available for db operations if needed at startup
    with app.app_context():
        # You might perform initial db checks or setup here if necessary
        # db.create_all() # Usually handled by migrations
        pass
    app.run(debug=True)
