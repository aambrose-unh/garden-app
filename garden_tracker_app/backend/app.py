# Backend for Garden Tracker App

import os
from flask import Flask, request, jsonify, send_file
from flask_migrate import Migrate
from dotenv import load_dotenv
import datetime
from datetime import date
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
import logging
from logging.handlers import RotatingFileHandler
import signal
import json
import io

# Import db and models from models.py [CA]
# Changed from relative (.models) to absolute (models) to work when running flask run within backend dir [REH]
from models import db, User, GardenBed, PlantType, Planting, GardenLayout
from validators import validate_bed_shape_and_params  # [DRY][SF]

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
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or 'sqlite:///garden_tracker.db'
# Use SECRET_KEY from environment variables for better security [SFT]
# Fallback only for initial development, should not be used in production
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a-fallback-secret-key-replace-me')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'another-fallback-jwt-secret-replace-me')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app) # Link SQLAlchemy instance to the app
# Initialize Flask-Migrate [fix]
migrate = Migrate(app, db)

jwt = JWTManager(app) # Initialize JWT Manager

# --- Register plant import blueprint ---
from plant_import import plant_import_bp
app.register_blueprint(plant_import_bp)

# --- JWT Token Revocation Setup (Example, requires proper storage) ---
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
        logger.error("Invalid token")

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

# # --- Database Initialization (Uses imported db and models) ---
# with app.app_context():
#     # Drop existing tables and recreate them (NOTE: Destructive for existing data!) [SFT]
#     # Consider using Flask-Migrate for schema management in production.
#     db.drop_all()
#     db.create_all()

#     # Create a test user if none exists (useful for development)
#     if not User.query.first():
#         logger.info("No users found. Creating default test user: test@example.com")
#         test_user = User(
#             email="test@example.com",
#             password_hash=generate_password_hash("password123"),
#             preferred_units="imperial"
#         )
#         db.session.add(test_user)
#         db.session.commit()
#         logger.info("Default test user created.")
#     else:
#         logger.info("Database already contains users.")

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
        # auth_header = request.headers.get('Authorization') # Removed logging [SFT]
        # if auth_header:
            # logger.info("Authorization header: %s", auth_header)

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
                'shape': bed.shape,
                'shape_params': bed.shape_params,
                'unit_measure': bed.unit_measure,
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
        
        # Validate required fields for new model [IV][SF]
        required_fields = ["name", "shape", "shape_params", "unit_measure"]
        if not data or not all(key in data for key in required_fields):
            return jsonify({
                "message": "Missing required fields",
                "required_fields": required_fields
            }), 400
        is_valid, err = validate_bed_shape_and_params(data["shape"], data["shape_params"])
        if not is_valid:
            return jsonify({"message": f"Invalid shape/params: {err}"}), 400
        # Create new garden bed
        new_bed = GardenBed(
            name=data['name'],
            shape=data['shape'],
            shape_params=data['shape_params'],
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
                "shape": new_bed.shape,
                "shape_params": new_bed.shape_params,
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
        # Get the JWT token from the request
        # auth_header = request.headers.get('Authorization')
        # if auth_header:
            # logger.info("Authorization header: %s", auth_header)

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

@app.route('/api/garden-beds/<int:bed_id>', methods=['PUT'])
@jwt_required()  # Protect this route
def update_garden_bed(bed_id):
    current_user_id = get_jwt_identity()
    logger.info(f"User {current_user_id} attempting to update garden bed ID {bed_id}")
    try:
        bed = GardenBed.query.get(bed_id)
        if not bed:
            logger.warning(f"Garden bed ID {bed_id} not found for update attempt by user {current_user_id}")
            return jsonify({"message": "Garden bed not found"}), 404

        # Add logging to check user IDs before comparison [REH][SD]
        logger.debug(f"Checking ownership for bed ID {bed_id}: Bed owner ID = {bed.user_id} (type: {type(bed.user_id)}), Current user ID = {current_user_id} (type: {type(current_user_id)})")

        # Verify the bed belongs to the current user [SFT]
        # Convert JWT identity (string) to int for comparison with DB ID (int) [REH]
        try:
            current_user_id_int = int(current_user_id)
        except ValueError:
            logger.error(f"Could not convert current_user_id '{current_user_id}' to int for ownership check.")
            return jsonify({"message": "Internal server error during authorization"}), 500
        
        if bed.user_id != current_user_id_int:
            logger.warning(f"User {current_user_id_int} forbidden from updating bed ID {bed_id} owned by {bed.user_id}")
            return jsonify({"message": "Forbidden"}), 403

        data = request.get_json()
        if not data:
            return jsonify({"message": "No input data provided"}), 400

        # Update new fields if present [IV]
        if 'name' in data and data['name'] is not None:
            bed.name = data['name']
        if 'shape' in data and data['shape'] is not None:
            bed.shape = data['shape']
        if 'shape_params' in data and data['shape_params'] is not None:
            is_valid, err = validate_bed_shape_and_params(data['shape'], data['shape_params'])
            if not is_valid:
                return jsonify({"message": f"Invalid shape/params: {err}"}), 400
            bed.shape_params = data['shape_params']
        if 'unit_measure' in data and data['unit_measure'] is not None:
            bed.unit_measure = data['unit_measure']
        if 'notes' in data and data['notes'] is not None:
            bed.notes = data['notes']
        bed.last_modified = datetime.datetime.now(datetime.timezone.utc) # Update last modified time
        db.session.commit()
        logger.info(f"Garden bed ID {bed_id} updated successfully by user {current_user_id_int}")
        return jsonify(bed.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating garden bed ID {bed_id}: {e}", exc_info=True)
        return jsonify({"message": "Failed to update garden bed", "error": str(e)}), 500

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
        # Use the to_dict() method for serialization [DRY] [CA]
        plants_data = [plant.to_dict() for plant in plants]
        return jsonify(plants_data), 200
    except Exception as e:
        logger.error("Error retrieving plant types: %s", str(e))
        return jsonify({'message': 'Failed to retrieve plant types due to server error'}), 500

@app.route('/api/plants', methods=['POST'])
def create_plant_type():
    data = request.get_json()
    logger.debug(f"Received data for new plant: {data}")

    # Basic Input Validation [IV] [REH]
    required_fields = ['common_name', 'scientific_name']
    if not data:
        logger.warning("Create plant request failed: No data received.")
        return jsonify({'message': 'No input data provided'}), 400
    if not all(field in data and data[field] for field in required_fields):
        missing = [field for field in required_fields if field not in data or not data[field]]
        logger.warning(f"Create plant request failed: Missing fields: {missing}")
        return jsonify({'message': f'Missing required fields: {", ".join(missing)}'}), 400

    # Check for existing plant (optional, based on requirements - e.g., unique scientific_name)
    # existing = PlantType.query.filter_by(scientific_name=data['scientific_name']).first()
    # if existing:
    #     logger.warning(f"Attempt to create duplicate plant: {data['scientific_name']}")
    #     return jsonify({'message': 'Plant with this scientific name already exists'}), 409 # Conflict

    try:
        new_plant = PlantType(
            common_name=data['common_name'],
            scientific_name=data['scientific_name'],
            rotation_family=data.get('rotation_family'), # Use .get for optional fields
            description=data.get('description'),
            notes=data.get('notes')
        )
        db.session.add(new_plant)
        db.session.commit()
        logger.info(f"New plant created: {new_plant.common_name} (ID: {new_plant.id})")
        # Return the created plant data [ISA]
        return jsonify(new_plant.to_dict()), 201 # 201 Created
    except Exception as e:
        db.session.rollback()
        logger.error("Error creating new plant type: %s", str(e))
        return jsonify({'message': 'Failed to create plant type due to server error'}), 500

@app.route('/api/plants/<int:plant_type_id>', methods=['GET'])
def get_plant_type_details(plant_type_id):
    try:
        plant = PlantType.query.get(plant_type_id)

        if not plant:
            return jsonify({'message': 'Plant type not found'}), 404

        # Use the to_dict() method for serialization [DRY] [CA]
        return jsonify(plant.to_dict()), 200
    except Exception as e:
        logger.error("Error retrieving plant type details: %s", str(e))
        return jsonify({'message': 'Failed to retrieve plant type details due to server error'}), 500

# --- Planting History API Routes ---

@app.route('/api/garden-beds/<int:bed_id>/plantings', methods=['GET'])
@jwt_required()  # Protect this route
def get_plantings_for_bed(bed_id):
    """ Get all plantings for a specific bed, optionally filtered by active status. """
    user_id = get_jwt_identity()
    logger.debug(f"User {user_id} fetching plantings for bed {bed_id}")

    # Verify the bed exists and belongs to the user
    bed = GardenBed.query.filter_by(id=bed_id, user_id=user_id).first()
    if not bed:
        logger.warning(f"Auth failed or bed not found: User {user_id}, bed {bed_id}.")
        return jsonify({'message': 'Garden bed not found or access denied'}), 404

    # Check for 'active' query parameter
    show_active_only = request.args.get('active', 'false').lower() == 'true'
    logger.debug(f"Filtering active plantings for bed {bed_id}: {show_active_only}")

    query = Planting.query.filter_by(bed_id=bed_id)

    if show_active_only:
         # Filter based on the 'is_current' flag instead of dates [Fix][SF]
         logger.debug(f"Applying is_current filter for bed {bed_id}")
         query = query.filter(Planting.is_current.is_(True))
         # Previous date-based logic (commented out for reference):
         # today = datetime.date.today()
         # query = query.filter(
         #     Planting.date_planted <= today, 
         #     (Planting.expected_harvest_date == None) | (Planting.expected_harvest_date >= today)
         # )
        
    # Order results, e.g., by year then season (optional)
    query = query.order_by(Planting.year.desc(), Planting.season)

    plantings = query.all()
    
    # Use the to_dict() method for serialization [DRY]
    plantings_list = [p.to_dict() for p in plantings]
    logger.info(f"Returning {len(plantings_list)} plantings for bed {bed_id} (active filter: {show_active_only}).")
    return jsonify(plantings_list)

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
            'plant_common_name': plant_type.common_name,  # Access related object
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

@app.route('/api/plantings/<int:planting_id>', methods=['PUT'])
@jwt_required()  # Protect this route
def update_planting(planting_id):
    """ Updates an existing planting record. """
    user_id = get_jwt_identity()
    logger.debug(f"User {user_id} attempting to update planting {planting_id}")

    planting = Planting.query.get(planting_id)
    if not planting:
        logger.warning(f"Update failed: Planting {planting_id} not found.")
        return jsonify({'message': 'Planting record not found'}), 404

    # Verify the planting belongs to a bed owned by the user
    bed = GardenBed.query.filter_by(id=planting.bed_id, user_id=user_id).first()
    if not bed:
        logger.warning(f"Auth failed: User {user_id} cannot update planting {planting_id} in bed {planting.bed_id}.")
        return jsonify({'message': 'Unauthorized to update this planting record'}), 403

    data = request.get_json()
    if not data:
        logger.warning(f"Update failed for planting {planting_id}: No data provided.")
        return jsonify({'message': 'No update data provided'}), 400

    logger.debug(f"Received update data for planting {planting_id}: {data}")

    # Validate and update fields [IV]
    updated = False
    if 'plant_type_id' in data:
        # Ensure plant_type exists (optional, depends on requirements)
        plant_type = PlantType.query.get(data['plant_type_id'])
        if not plant_type:
            logger.warning(f"Update failed for planting {planting_id}: Invalid plant_type_id {data['plant_type_id']}.")
            return jsonify({'message': f"Invalid plant type ID: {data['plant_type_id']}"}), 400
        planting.plant_type_id = data['plant_type_id']
        updated = True

    # Safely update other fields, checking for presence in data
    if 'year' in data:
        try:
            planting.year = int(data['year'])
            updated = True
        except (ValueError, TypeError):
             logger.warning(f"Update failed for planting {planting_id}: Invalid year format {data['year']}.")
             return jsonify({'message': 'Invalid year format'}), 400
             
    if 'season' in data:
        planting.season = data['season']
        updated = True

    if 'date_planted' in data:
        try:
            # Handle empty string or null for clearing the date
            if data['date_planted']:
                planting.date_planted = datetime.date.fromisoformat(data['date_planted'])
            else:
                planting.date_planted = None
            updated = True
        except (ValueError, TypeError):
            logger.warning(f"Update failed for planting {planting_id}: Invalid date_planted format {data['date_planted']}.")
            return jsonify({'message': 'Invalid date planted format (YYYY-MM-DD)'}), 400
            
    if 'expected_harvest_date' in data:
        try:
             # Handle empty string or null for clearing the date
            if data['expected_harvest_date']:
                planting.expected_harvest_date = datetime.date.fromisoformat(data['expected_harvest_date'])
            else:
                 planting.expected_harvest_date = None
            updated = True
        except (ValueError, TypeError):
            logger.warning(f"Update failed for planting {planting_id}: Invalid expected_harvest_date format {data['expected_harvest_date']}.")
            return jsonify({'message': 'Invalid expected harvest date format (YYYY-MM-DD)'}), 400

    if 'notes' in data: # Allow setting notes to empty string
        planting.notes = data['notes']
        updated = True

    if 'quantity' in data: # Allow setting quantity to empty string
        planting.quantity = data['quantity']
        updated = True
        
    # Handle the 'is_current' field [Fix]
    if 'is_current' in data:
        if isinstance(data['is_current'], bool):
            planting.is_current = data['is_current']
            updated = True
            logger.debug(f"Setting is_current for planting {planting_id} to {data['is_current']}")
        else:
            logger.warning(f"Update failed for planting {planting_id}: Invalid is_current value type {type(data['is_current'])}.")
            return jsonify({'message': "Invalid value for 'is_current', must be boolean (true/false)"}), 400

    if not updated:
        logger.info(f"No valid fields provided for update on planting {planting_id}")
        return jsonify({'message': 'No valid fields provided for update'}), 400

    try:
        db.session.commit()
        logger.info(f"Planting {planting_id} updated successfully by user {user_id}.")
        # Return the updated object using to_dict [DRY]
        return jsonify(planting.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Database error updating planting {planting_id}: {str(e)}")
        return jsonify({'message': 'Update failed due to server error'}), 500

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

# --- Garden Layout API Routes ---
from flask_jwt_extended import jwt_required, get_jwt_identity
import json

@app.route('/api/layout', methods=['GET'])
@jwt_required()
def get_garden_layout():
    user_id = get_jwt_identity()
    layout = GardenLayout.query.filter_by(user_id=user_id).first()
    if layout:
        return jsonify(layout=layout.to_dict()), 200
    else:
        # Return default empty layout if not set
        return jsonify(layout=None), 200

@app.route('/api/layout', methods=['POST'])
@jwt_required()
def save_garden_layout():
    user_id = get_jwt_identity()
    data = request.get_json()
    if not data or 'layout' not in data:
        return jsonify(success=False, message='Missing layout data'), 400
    try:
        new_layout = data['layout']
        # Fetch existing layout if present
        existing = GardenLayout.query.filter_by(user_id=user_id).first()
        if existing:
            try:
                existing_layout = json.loads(existing.layout_json)
            except Exception:
                existing_layout = {}
            # Merge: update only keys present in new_layout
            merged_layout = existing_layout.copy() if isinstance(existing_layout, dict) else {}
            for key, value in new_layout.items():
                merged_layout[key] = value
            existing.layout_json = json.dumps(merged_layout)
            db.session.commit()
            return jsonify(success=True, layout=existing.to_dict()), 200
        else:
            layout = GardenLayout(user_id=user_id, layout_json=json.dumps(new_layout))
            db.session.add(layout)
            db.session.commit()
            return jsonify(success=True, layout=layout.to_dict()), 200
    except Exception as e:
        return jsonify(success=False, message=f'Error saving layout: {str(e)}'), 500


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

@app.route('/api/beds/<int:bed_id>/plantings', methods=['POST'])
def add_planting_to_bed(bed_id):
    # Verify bed exists and belongs to user (if login is required)
    bed = GardenBed.query.get(bed_id)
    if not bed:
        return jsonify({'message': 'Garden bed not found'}), 404
    # Add user check if implementing authentication: 
    # if bed.user_id != session.get('user_id'): return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    logger.debug(f"Received data for new planting in bed {bed_id}: {data}")

    # Basic Input Validation [IV] [REH]
    required_fields = ['plant_type_id', 'year'] # Season could be optional or derived
    if not data:
        logger.warning(f"Add planting request failed for bed {bed_id}: No data.")
        return jsonify({'message': 'No input data provided'}), 400
    if not all(field in data and data[field] for field in required_fields):
        missing = [field for field in required_fields if field not in data or not data[field]]
        logger.warning(f"Add planting request failed for bed {bed_id}: Missing fields: {missing}")
        return jsonify({'message': f'Missing required fields: {", ".join(missing)}'}), 400
    
    # Validate plant_type_id exists
    plant_type = PlantType.query.get(data['plant_type_id'])
    if not plant_type:
        logger.warning(f"Add planting request failed for bed {bed_id}: Invalid plant_type_id: {data['plant_type_id']}")
        return jsonify({'message': 'Invalid plant type ID provided'}), 400

    try:
        new_planting = Planting(
            bed_id=bed_id,
            plant_type_id=data['plant_type_id'],
            year=data['year'],
            season=data.get('season'), # Optional
            date_planted=datetime.datetime.strptime(data['date_planted'], '%Y-%m-%d').date() if data.get('date_planted') else None, # Handle optional date
            notes=data.get('notes'), # Optional
            quantity=data.get('quantity'), # Optional
            is_current=data.get('is_current', True) # Default to True if not provided
        )
        db.session.add(new_planting)
        db.session.commit()
        logger.info(f"New planting record (ID: {new_planting.id}) added to bed {bed_id}.")
        return jsonify(new_planting.to_dict()), 201 # [ISA]

    except ValueError as ve: # Handle potential date parsing errors
        logger.warning(f"Add planting date format error for bed {bed_id}: {str(ve)}")
        return jsonify({'message': 'Invalid date format. Please use YYYY-MM-DD.'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding planting to bed {bed_id}: {str(e)}")
        return jsonify({'message': 'Failed to add planting record due to server error'}), 500

# Data Management API Routes
@app.route('/api/data/export', methods=['GET'])
@jwt_required()
def export_user_data():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    plant_types = PlantType.query.all()
    garden_beds = GardenBed.query.filter_by(user_id=current_user_id).all()
    # plantings = Planting.query.filter_by(user_id=current_user_id).all() # Incorrect: Planting has no direct user_id
    plantings = db.session.query(Planting).join(GardenBed, Planting.bed_id == GardenBed.id).filter(GardenBed.user_id == current_user_id).all()
    garden_layout = GardenLayout.query.filter_by(user_id=current_user_id).first()

    export_data = {
        "user_preferences": user.to_dict().get('preferences', {}),
        "plant_types": [pt.to_dict() for pt in plant_types],
        "garden_beds": [gb.to_dict() for gb in garden_beds],
        "plantings": [p.to_dict() for p in plantings],
        "garden_layout": garden_layout.to_dict() if garden_layout else {}
    }

    # Create an in-memory file for the JSON data
    str_io = io.StringIO()
    json.dump(export_data, str_io, indent=4)
    mem_file = io.BytesIO()
    mem_file.write(str_io.getvalue().encode('utf-8'))
    mem_file.seek(0)
    str_io.close()

    return send_file(
        mem_file,
        as_attachment=True,
        download_name='garden_data_export.json',
        mimetype='application/json'
    )

@app.route('/api/data/import', methods=['POST'])
@jwt_required()
def import_user_data():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    if 'file' not in request.files:
        return jsonify({"msg": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400

    if file and file.filename.endswith('.json'):
        try:
            imported_data = json.load(file)
        except json.JSONDecodeError:
            return jsonify({"msg": "Invalid JSON file"}), 400

        # Basic validation of top-level keys
        expected_keys = ["user_preferences", "plant_types", "garden_beds", "plantings", "garden_layout"]
        if not all(key in imported_data for key in expected_keys):
            return jsonify({"msg": "JSON file missing required top-level keys"}), 400

        # --- Begin Transaction (Optional but recommended for atomicity) ---
        # For simplicity, direct db operations are shown. Consider wrapping in a transaction.
        try:
            # 1. Clear existing user-specific data (except PlantTypes which are global/shared)
            # Planting.query.filter_by(user_id=current_user_id).delete() # Incorrect
            # db.session.query(Planting).join(GardenBed, Planting.bed_id == GardenBed.id).filter(GardenBed.user_id == current_user_id).delete(synchronize_session=False) # Causes error with joined delete
            # Fetch IDs of plantings to delete for the current user
            planting_ids_to_delete = [
                p.id for p in db.session.query(Planting.id)
                .join(GardenBed, Planting.bed_id == GardenBed.id)
                .filter(GardenBed.user_id == current_user_id)
                .all()
            ]
            if planting_ids_to_delete:
                Planting.query.filter(Planting.id.in_(planting_ids_to_delete)).delete(synchronize_session=False)

            GardenLayout.query.filter_by(user_id=current_user_id).delete()
            GardenBed.query.filter_by(user_id=current_user_id).delete()
            # db.session.commit() # Commit deletions

            # 2. Import User Preferences
            if 'user_preferences' in imported_data and isinstance(imported_data['user_preferences'], dict):
                user.preferences = json.dumps(imported_data['user_preferences'])
                # db.session.add(user) # user is already in session

            # 3. Import Plant Types (Update existing by common_name or create new)
            plant_type_id_map = {}
            for pt_data in imported_data.get("plant_types", []):
                old_id = pt_data.get('id')
                common_name = pt_data.get('common_name')
                if not common_name:
                    continue # Skip if no common_name
                
                plant_type = PlantType.query.filter_by(common_name=common_name).first()
                if plant_type:
                    # Update existing plant type if necessary
                    plant_type.scientific_name = pt_data.get('scientific_name', plant_type.scientific_name)
                    plant_type.description = pt_data.get('description', plant_type.description) # Re-added this line
                    plant_type.avg_height = pt_data.get('avg_height', plant_type.avg_height)
                    plant_type.avg_spread = pt_data.get('avg_spread', plant_type.avg_spread)
                    plant_type.rotation_family = pt_data.get('rotation_family', plant_type.rotation_family)
                    plant_type.notes = pt_data.get('notes', plant_type.notes)
                else:
                    plant_type = PlantType(
                        common_name=common_name,
                        scientific_name=pt_data.get('scientific_name'),
                        description=pt_data.get('description'), # Re-added this line
                        avg_height=pt_data.get('avg_height'),
                        avg_spread=pt_data.get('avg_spread'),
                        rotation_family=pt_data.get('rotation_family'),
                        notes=pt_data.get('notes')
                    )
                    db.session.add(plant_type)
                db.session.flush() # To get new plant_type.id if it's new
                if old_id is not None:
                    plant_type_id_map[old_id] = plant_type.id
            
            # 4. Import Garden Beds
            garden_bed_id_map = {}
            for gb_data in imported_data.get("garden_beds", []):
                old_id = gb_data.get('id')
                new_bed = GardenBed(
                    user_id=current_user_id,
                    name=gb_data.get('name', 'Unnamed Bed'),
                    shape=gb_data.get('shape', 'rectangle'),
                    shape_params=gb_data.get('shape_params', {}), # Pass dict directly for JSON field
                    unit_measure=gb_data.get('unit_measure', user.preferred_units),
                    notes=gb_data.get('notes')
                )
                db.session.add(new_bed)
                db.session.flush() # To get new_bed.id
                if old_id is not None:
                    garden_bed_id_map[old_id] = new_bed.id

            # 5. Import Plantings
            for p_data in imported_data.get("plantings", []):
                old_plant_type_id = p_data.get('plant_type_id')
                old_bed_id = p_data.get('bed_id')

                new_plant_type_id = plant_type_id_map.get(old_plant_type_id)
                new_bed_id = garden_bed_id_map.get(old_bed_id)

                if new_plant_type_id is None or new_bed_id is None:
                    logger.warning(f"Skipping planting due to missing mapped ID: old_plant_type_id={old_plant_type_id}, old_bed_id={old_bed_id}")
                    continue

                new_planting = Planting(
                    plant_type_id=new_plant_type_id,
                    bed_id=new_bed_id,
                    date_planted=datetime.datetime.fromisoformat(p_data['date_planted']).date() if p_data.get('date_planted') else None, # Ensure date object
                    notes=p_data.get('notes'),
                    quantity=p_data.get('quantity', 1),
                    expected_harvest_date=datetime.date.fromisoformat(p_data['projected_harvest_date']) if p_data.get('projected_harvest_date') else None, # Corrected name and parse as date
                )
                db.session.add(new_planting)

            # 6. Import Garden Layout
            logger.debug(f"Import: garden_bed_id_map = {garden_bed_id_map}") # Log bed ID map

            layout_data = imported_data.get("garden_layout")
            if layout_data and isinstance(layout_data.get('layout'), dict): # Check 'layout' key for the dict
                actual_layout_content = layout_data.get('layout', {}) # Get the actual content
                logger.debug(f"Import: Original actual_layout_content = {json.dumps(actual_layout_content)}")

                # Attempt to update bed IDs within actual_layout_content
                if 'beds' in actual_layout_content and isinstance(actual_layout_content['beds'], list):
                    logger.debug(f"Import: Found 'beds' list in actual_layout_content. Processing {len(actual_layout_content['beds'])} items.")
                    for bed_item in actual_layout_content['beds']:
                        if isinstance(bed_item, dict) and 'id' in bed_item:
                            old_bed_item_id = bed_item['id']
                            logger.debug(f"Import: Processing bed_item with old_id = {old_bed_item_id}")
                            if old_bed_item_id in garden_bed_id_map:
                                bed_item['id'] = garden_bed_id_map[old_bed_item_id]
                                logger.debug(f"Import: Updated bed_item id to {bed_item['id']}")
                            else:
                                logger.warning(f"Import: old_bed_item_id {old_bed_item_id} not found in garden_bed_id_map.")
                else:
                    logger.debug("Import: No 'beds' list found in actual_layout_content or it's not a list.")

                logger.debug(f"Import: Modified actual_layout_content = {json.dumps(actual_layout_content)}")
                
                new_layout = GardenLayout(
                    user_id=current_user_id,
                    layout_json=json.dumps(actual_layout_content) # Save the modified content
                )
                db.session.add(new_layout)
            elif layout_data:
                logger.warning(f"Import: garden_layout data found, but 'layout' key is missing or not a dict. Data: {layout_data}")
            else:
                logger.debug("Import: No garden_layout data found in import file.")

            db.session.commit()
            return jsonify({"msg": "Data imported successfully"}), 200

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error during import: {e}") # Use logger.error here too
            return jsonify({"msg": f"Error during import: {str(e)}"}), 500
    else:
        return jsonify({"msg": "Invalid file type. Please upload a .json file"}), 400


if __name__ == '__main__':
    # Ensure app context is available for db operations if needed at startup
    # Moved DB init code to run after model definitions to avoid NameError
    # with app.app_context():
        # You might perform initial db checks or setup here if necessary
        # pass
    logger.info("Starting Flask server...")
    app.run(debug=True, host='0.0.0.0', port=5000) # Use host='0.0.0.0' to allow external access if needed
