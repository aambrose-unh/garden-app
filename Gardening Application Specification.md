**Application Specification: Garden Tracker**

Version: 1.0  
Date: April 3, 2025  
**1\. Introduction**

This document outlines the specifications for the Garden Tracker application. The primary goal of this web-based application is to assist gardeners in managing their garden beds, tracking planting history, and making informed decisions about future plantings based on crop rotation principles and plant characteristics to promote garden health and productivity.

**2\. Goals & Objectives**

* Provide a simple interface for users to define and manage their garden beds.  
* Enable tracking of current and historical plantings within each garden bed.  
* Maintain a database of plant types, including information relevant to spacing and crop rotation.  
* Offer basic recommendations for subsequent plantings to minimize soil depletion and disease.  
* Ensure data persistence and user-specific information management.

**3\. Target Audience**

* Home gardeners (beginner to intermediate) seeking better organization and planning for their vegetable or flower gardens.  
* Community gardeners managing individual plots.

**4\. Functional Requirements**

4.1. User Management  
\* Users must be able to register for an account (e.g., using email and password).  
\* Users must be able to log in and log out.  
\* User data (garden beds, plantings) must be associated with their account and kept private.  
\* (Optional V1.1) Password recovery mechanism.  
4.2. Garden Bed Management  
* Create Bed: Users can add a new garden bed, specifying:  
  * Name (e.g., "North Raised Bed", "Herb Spiral")  
  * Shape: Users select from supported shapes: Rectangle, Circle, Pill-shaped (rounded rectangle), Rectangular C-shape (rectangle with a section missing from the middle of one side)
    * For C-shape: User specifies which side is missing (top, bottom, left, right) and the size of the missing section (must be less than the corresponding side)
  * Dimensions/Parameters: Relevant to the selected shape (e.g., width/height for rectangle, radius for circle, etc.)
  * Optional: Description/Location notes.
* View Beds: Users can see a list or visual representation of all their defined garden beds.
* View Bed Details: Users can select a bed to see its details (shape, dimensions/parameters, description) and its planting history.
* Edit Bed: Users can modify the name, shape, dimensions, or description of an existing bed.
* Delete Bed: Users can remove a garden bed (confirmation required). This may also remove associated planting history or require explicit confirmation for that.

**Garden Bed Shapes Specification**

- **Supported Shapes:**
  - Rectangle
  - Circle
  - Pill-shaped (rounded rectangle)
  - Rectangular C-shape (rectangle with a section missing from the middle of one side)

- **Rectangular C-shape Definition:**
  - A rectangle with a rectangular section removed from the center of one of its sides.
  - User specifies:
    - Which side is missing: `top`, `bottom`, `left`, or `right`
    - The width and height of the missing section (must be less than the corresponding side)

- **Validation:**
  - Shape must be one of the supported types.
  - For C-shape, the missing section must fit within the rectangle and be smaller than the corresponding side.
  - All shape parameters must be present and valid for the selected shape.

- **API & UI Impact:**
  - Endpoints for creating, updating, and retrieving garden beds must support the `shape` and `shape_params` fields.
  - API must validate shape and parameters as described above.
  - UI for garden bed creation/editing must allow shape selection and dynamically show relevant parameter inputs based on the selected shape.
  - Visualization logic must render all supported shapes accurately, including the rectangular C-shape.

- **Testing:**
  - Add or update tests for backend and frontend to cover all supported shapes, including edge cases for the rectangular C-shape.

4.3. Plant Information Management  
\* The application will maintain a database of common garden plants.  
\* Each plant entry should include:  
\* Common Name (e.g., "Tomato", "Carrot", "Basil")  
\* Scientific Name (Optional but good for accuracy, e.g., Solanum lycopersicum)  
\* Typical Mature Size/Spacing (e.g., Height, Spread \- needed for layout planning)  
\* Crop Rotation Family/Group (e.g., Nightshade, Root Vegetable, Legume, Brassica). This is crucial for rotation logic.  
\* Brief Description/Notes (Optional: planting tips, sun requirements, etc.)  
\* Initial Population: The database should be pre-populated with a reasonable number of common garden plants.  
\* (Future Enhancement): Allow users to add custom plant types or edit existing ones (requires careful consideration of data integrity for recommendations).  
4.4. Planting History & Tracking  
\* Add Planting: Users can record a planting event for a specific garden bed, specifying:  
\* Plant Type (selected from the Plant Information database)  
\* Year/Season (e.g., "2025 Spring", "2025 Full Season")  
\* Date Planted (Optional)  
\* Quantity/Approximate Area Used (Optional \- helps with future spacing)  
\* Notes (Optional: e.g., "Variety: Beefsteak", "Started from seed")  
\* View History: Users can view the chronological planting history for a specific garden bed.  
\* Mark Current: Ability to easily identify/filter for plants currently growing in a bed for the active season.  
\* Edit/Delete Planting Record: Users can correct or remove past planting records.  
4.5. Planting Recommendations  
* When viewing a garden bed, the application should provide guidance for the next planting cycle based on its history.  
* Rotation Logic:  
\* Identify the Crop Rotation Family of the most recent plantings in the bed.  
\* Consult predefined rules (e.g., "Avoid planting Nightshades after Nightshades", "Legumes are good predecessors for heavy feeders like Brassicas").  
\* Suggest suitable plant families or specific plants for the next season.  
\* Warn against planting incompatible successive crops (e.g., same family consecutively).  
\* Spacing Consideration (Basic): When viewing potential plants, display their typical size to help users assess fit within the bed dimensions (detailed layout planning is a future enhancement).  
4.6. Visual Garden Bed Layout Tool
* Users can define their yard by specifying its size and shape (e.g., rectangular, L-shaped; dimensions in user-preferred units).
* Users can visually create and configure garden beds, selecting their size and shape.
* Drag-and-drop interface allows users to place garden beds within the defined yard area.
* Each garden bed visually indicates which plants are currently planted within it.
* Garden beds and individual plants are clickable, allowing navigation to detailed views for the selected bed or plant.
* The layout tool should be intuitive and responsive, supporting both desktop and tablet use.
* (Optional V1.1) Support for non-rectangular yards or beds, grid snapping, and advanced alignment tools.

**5\. Non-Functional Requirements**

* **Performance:** The application should load quickly and respond promptly to user interactions under typical load (e.g., \< 2-second response for most actions).  
* **Usability:** The interface should be intuitive and easy to navigate for non-technical users. Minimal learning curve.  
* **Reliability:** Data should be saved reliably. The application should handle errors gracefully. Regular backups of the database are essential.  
* **Scalability:** The application should be designed to handle a moderate number of users (e.g., thousands) and associated data (dozens of beds, hundreds of planting records per user) without significant performance degradation.  
* **Security:** User authentication must be secure. Protect against common web vulnerabilities (e.g., SQL injection, XSS). User data must be isolated.  
* **Maintainability:** Code should be well-structured, commented, and follow best practices for React and Python development to facilitate future updates and bug fixes.  
* **Cross-Browser Compatibility:** The frontend should render correctly on major modern web browsers (Chrome, Firefox, Safari, Edge).  
* **Responsiveness (Optional V1):** Ideally, the layout should adapt reasonably well to different screen sizes (desktop, tablet). Full mobile optimization might be V1.1.

**6\. Technology Stack**

* **Frontend:** React.js (potentially using a framework like Next.js or Create React App)  
* **Backend:** Python (using a web framework like Flask or Django)  
* **Database:** SQL-based Relational Database (e.g., PostgreSQL, MySQL, SQLite for simpler deployments/development)  
* **API:** RESTful API for communication between frontend and backend.

**7\. Data Model (High-Level Schema)**

* **Users:** user\_id (PK), email, password\_hash, creation\_date, last\_login, preferred\_units (e.g., 'metric'/'imperial')  
* **GardenBeds:** bed\_id (PK), user\_id (FK), name, shape, shape\_params (JSON), unit\_measure, description, creation\_date  
  - `shape`: enum ('rectangle', 'circle', 'pill', 'c-rectangle')
  - `shape\_params`: object with shape-specific parameters:
    - Rectangle: `{ width, height }`
    - Circle: `{ radius }`
    - Pill: `{ width, height, border\_radius }`
    - C-rectangle: `{ width, height, missing\_side, missing\_width, missing\_height }`
* **PlantTypes:** plant\_type\_id (PK), common\_name, scientific\_name, description, avg\_height, avg\_spread, rotation\_family, notes  
* **Plantings:** planting\_id (PK), bed\_id (FK), plant\_type\_id (FK), year, season (e.g., Spring, Summer, Fall, Full), date\_planted, notes, is\_current (Boolean flag)  
* **(Potential Future Table) RotationRules:** rule\_id (PK), preceding\_family, succeeding\_family, recommendation\_level (e.g., 'Good', 'Avoid', 'Neutral'), reason

**8\. API Endpoints (Illustrative Examples)**

* POST /api/auth/register  
* POST /api/auth/login  
* GET /api/beds \- List user's beds  
* POST /api/beds \- Create new bed  
* GET /api/beds/{bed\_id} \- Get bed details  
* PUT /api/beds/{bed\_id} \- Update bed details  
* DELETE /api/beds/{bed\_id} \- Delete bed  
* GET /api/beds/{bed\_id}/plantings \- Get planting history for a bed  
* POST /api/beds/{bed\_id}/plantings \- Add a planting record to a bed  
* PUT /api/plantings/{planting\_id} \- Update a planting record  
* DELETE /api/plantings/{planting\_id} \- Delete a planting record  
* GET /api/plants \- Search/List plant types  
* GET /api/plants/{plant\_type\_id} \- Get details for a specific plant type  
* GET /api/beds/{bed\_id}/recommendations \- Get planting recommendations for a bed

**9\. User Interface (UI) / User Experience (UX) Guidelines**

* Clean, simple, and visually appealing design. Perhaps use nature-inspired colors.  
* Clear navigation structure.  
* Consistent layout and controls across different sections.  
* Forms should be easy to fill out with clear labels and validation messages.  
* Visual feedback for actions (e.g., saving, deleting).  
* Prioritize clarity over feature density for V1.

**10\. Future Enhancements**

* Photo uploads for beds and plants.  
* Pest and disease tracking/logging per planting.  
* Integration with weather data/APIs.  
* Advanced companion planting information and checks.  
* Notifications/Reminders (e.g., planting times, watering reminders).  
* Community features (sharing garden layouts, tips).  
* More detailed reporting/analytics.  
* Mobile-native application.  
* User-defined custom plant types.  
* Support for tracking soil amendments.