# seed.py - Script to populate initial PlantType data

from app import app, db, PlantType

# Define initial plant data
# TODO: Expand this list with more plants and details (spacing, etc.)
initial_plants = [
    {
        "common_name": "Tomato",
        "scientific_name": "Solanum lycopersicum",
        "rotation_family": "Nightshade",
        "description": "Popular fruiting vegetable, typically grown as an annual."
    },
    {
        "common_name": "Carrot",
        "scientific_name": "Daucus carota",
        "rotation_family": "Root Vegetable",
        "description": "Root vegetable, usually orange in color."
    },
    {
        "common_name": "Bush Bean",
        "scientific_name": "Phaseolus vulgaris",
        "rotation_family": "Legume",
        "description": "Nitrogen-fixing legume, relatively easy to grow."
    },
    {
        "common_name": "Broccoli",
        "scientific_name": "Brassica oleracea var. italica",
        "rotation_family": "Brassica",
        "description": "Cool-season crop grown for its flowering head."
    },
    {
        "common_name": "Lettuce",
        "scientific_name": "Lactuca sativa",
        "rotation_family": "Leafy Green", # May sometimes be grouped differently
        "description": "Leafy vegetable, commonly used in salads."
    },
    {
        "common_name": "Cucumber",
        "scientific_name": "Cucumis sativus",
        "rotation_family": "Cucurbit",
        "description": "Vining plant producing cylindrical fruits."
    },
    {
        "common_name": "Onion",
        "scientific_name": "Allium cepa",
        "rotation_family": "Allium",
        "description": "Widely cultivated bulb vegetable."
    },
    {
        "common_name": "Potato",
        "scientific_name": "Solanum tuberosum",
        "rotation_family": "Nightshade",
        "description": "Starchy tuber crop, related to tomatoes."
    },
    {
        "common_name": "Spinach",
        "scientific_name": "Spinacia oleracea",
        "rotation_family": "Leafy Green", # Often grouped with Chenopodiaceae/Amaranthaceae
        "description": "Nutrient-rich leafy green vegetable."
    },
    {
        "common_name": "Bell Pepper",
        "scientific_name": "Capsicum annuum",
        "rotation_family": "Nightshade",
        "description": "Sweet pepper variety, fruit vegetable."
    }
]

def seed_database():
    with app.app_context():
        print("Seeding PlantType data...")
        added_count = 0
        skipped_count = 0
        for plant_data in initial_plants:
            # Check if plant already exists
            exists = db.session.query(PlantType.id).filter_by(common_name=plant_data['common_name']).first() is not None
            if not exists:
                plant = PlantType(
                    common_name=plant_data['common_name'],
                    scientific_name=plant_data.get('scientific_name'),
                    rotation_family=plant_data.get('rotation_family'),
                    description=plant_data.get('description')
                    # Add avg_height, avg_spread, notes later if needed
                )
                db.session.add(plant)
                added_count += 1
                print(f"  Added: {plant_data['common_name']}")
            else:
                skipped_count += 1
                print(f"  Skipped (already exists): {plant_data['common_name']}")

        if added_count > 0:
            db.session.commit()
            print(f"\nSuccessfully added {added_count} plant types.")
        else:
            print("\nNo new plant types were added.")

        if skipped_count > 0:
            print(f"{skipped_count} plant types were already present.")
        print("Seeding finished.")

if __name__ == '__main__':
    seed_database()
