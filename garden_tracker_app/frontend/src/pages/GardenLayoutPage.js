import React, { useEffect, useState } from "react";
import GardenLayoutTool from "../components/GardenLayoutTool";
import { getGardenBeds } from "../services/bedService";
import { getPlantingsForBed } from "../services/plantingService";

/**
 * GardenLayoutPage
 * Page for the visual garden bed layout tool.
 * Fetches beds and plantings from backend and passes to layout tool. [TR][DRY][REH]
 */
function GardenLayoutPage() {
  const [beds, setBeds] = useState([]);
  const [bedsWithPlants, setBedsWithPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBedsAndPlants = async () => {
      setLoading(true);
      setError(null);
      try {
        const beds = await getGardenBeds();
        // Fetch plantings for each bed in parallel
        const bedsWithPlants = await Promise.all(
          beds.map(async (bed) => {
            let plants = [];
            try {
              plants = await getPlantingsForBed(bed.id);
            } catch (e) {
              // If fetching plantings fails for one bed, log and continue
              console.error(`Failed to fetch plants for bed ${bed.id}:`, e);
            }
            return { ...bed, plants };
          })
        );
        setBedsWithPlants(bedsWithPlants);
      } catch (err) {
        setError(err.message || "Failed to load garden beds.");
      } finally {
        setLoading(false);
      }
    };
    fetchBedsAndPlants();
  }, []);

  const handleBedClick = (bed) => {
    // Dialog disabled: do nothing on bed click [SF]
  };

  const handlePlantClick = (plant) => {
    // Dialog disabled: do nothing on plant click [SF]
  };


  if (loading) return <div>Loading garden layout...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <GardenLayoutTool
        beds={bedsWithPlants}
        onBedClick={handleBedClick}
        onPlantClick={handlePlantClick}
      />
    </div>
  );
}

export default GardenLayoutPage;
