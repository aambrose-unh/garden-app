# validators.py
# Validation logic for garden bed shapes and shape_params [SF][RP][DRY][TDT]
from enums import GardenBedShape

def validate_bed_shape_and_params(shape, shape_params):
    """
    Validate the shape and shape_params for a garden bed.
    Returns (is_valid: bool, error_message: str or None)
    """
    if shape not in GardenBedShape.list():
        return False, f"Shape must be one of: {', '.join(GardenBedShape.list())}."
    if not isinstance(shape_params, dict):
        return False, "shape_params must be a JSON object."
    # Rectangle: width, height
    if shape == "rectangle":
        if not all(k in shape_params for k in ("width", "height")):
            return False, "Rectangle requires 'width' and 'height' in shape_params."
        if not (isinstance(shape_params["width"], (int, float)) and shape_params["width"] > 0):
            return False, "Rectangle 'width' must be a positive number."
        if not (isinstance(shape_params["height"], (int, float)) and shape_params["height"] > 0):
            return False, "Rectangle 'height' must be a positive number."
    # Circle: radius
    elif shape == "circle":
        if "radius" not in shape_params:
            return False, "Circle requires 'radius' in shape_params."
        if not (isinstance(shape_params["radius"], (int, float)) and shape_params["radius"] > 0):
            return False, "Circle 'radius' must be a positive number."
    # Pill: width, height, border_radius
    elif shape == "pill":
        for k in ("width", "height", "border_radius"):
            if k not in shape_params:
                return False, f"Pill requires '{k}' in shape_params."
            if not (isinstance(shape_params[k], (int, float)) and shape_params[k] > 0):
                return False, f"Pill '{k}' must be a positive number."
    # C-rectangle: width, height, missing_side, missing_width, missing_height
    elif shape == "c-rectangle":
        required = ["width", "height", "missing_side", "missing_width", "missing_height"]
        for k in required:
            if k not in shape_params:
                return False, f"C-rectangle requires '{k}' in shape_params."
        if shape_params["missing_side"] not in {"top", "bottom", "left", "right"}:
            return False, "C-rectangle 'missing_side' must be one of: top, bottom, left, right."
        if not (isinstance(shape_params["width"], (int, float)) and shape_params["width"] > 0):
            return False, "C-rectangle 'width' must be a positive number."
        if not (isinstance(shape_params["height"], (int, float)) and shape_params["height"] > 0):
            return False, "C-rectangle 'height' must be a positive number."
        if not (isinstance(shape_params["missing_width"], (int, float)) and shape_params["missing_width"] > 0):
            return False, "C-rectangle 'missing_width' must be a positive number."
        if not (isinstance(shape_params["missing_height"], (int, float)) and shape_params["missing_height"] > 0):
            return False, "C-rectangle 'missing_height' must be a positive number."
        if shape_params["missing_width"] >= shape_params["width"]:
            return False, "C-rectangle 'missing_width' must be less than 'width'."
        if shape_params["missing_height"] >= shape_params["height"]:
            return False, "C-rectangle 'missing_height' must be less than 'height'."
    return True, None
