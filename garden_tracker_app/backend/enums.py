# enums.py
from enum import Enum

class GardenBedShape(str, Enum):
    RECTANGLE = "rectangle"
    CIRCLE = "circle"
    PILL = "pill"
    C_RECTANGLE = "c-rectangle"

    @classmethod
    def list(cls):
        return [e.value for e in cls]
