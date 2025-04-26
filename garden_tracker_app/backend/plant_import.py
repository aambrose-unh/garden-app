import csv
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, PlantType
from app import logger

plant_import_bp = Blueprint('plant_import', __name__)

@plant_import_bp.route('/api/plants/import', methods=['POST'])
@jwt_required()
def import_plants():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part in request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    try:
        # Decode file stream for csv.reader
        stream = (line.decode('utf-8') for line in file.stream)
        reader = csv.DictReader(stream)
        added = 0
        skipped = 0
        errors = []
        for i, row in enumerate(reader, start=2):  # Header is line 1
            common_name = row.get('common_name', '').strip()
            scientific_name = row.get('scientific_name', '').strip()
            if not common_name or not scientific_name:
                errors.append(f"Row {i}: Missing required fields.")
                continue
            # Check for duplicate [DRY]
            exists = PlantType.query.filter_by(common_name=common_name).first()
            if exists:
                skipped += 1
                continue
            plant = PlantType(
                common_name=common_name,
                scientific_name=scientific_name,
                rotation_family=row.get('rotation_family', '').strip() or None,
                avg_height=float(row['avg_height']) if row.get('avg_height') else None,
                avg_spread=float(row['avg_spread']) if row.get('avg_spread') else None,
                description=row.get('description', '').strip() or None,
                notes=row.get('notes', '').strip() or None
            )
            db.session.add(plant)
            added += 1
        if added > 0:
            db.session.commit()
        return jsonify({
            'added': added,
            'skipped': skipped,
            'errors': errors
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error importing plants: {str(e)}")
        return jsonify({'message': 'Failed to import plants due to server error'}), 500
