import React, { useState } from "react";
import PropTypes from "prop-types";

// Constants for default yard size
const DEFAULT_YARD = { width: 800, height: 400, shape: "rectangle" };

/**
 * GardenLayoutTool
 * Visual tool for defining yard, creating garden beds, drag-and-drop placement, and plant visualization.
 * Now uses beds and plants from props. [DRY][RP][CA]
 */
function GardenLayoutTool({ beds = [], onBedClick, onPlantClick }) {
  // State for yard definition only
  const [yard, setYard] = useState(DEFAULT_YARD);

  // Local state for bed positions (keyed by bed id)
  const [bedPositions, setBedPositions] = useState(() => {
    const positions = {};
    beds.forEach((bed, idx) => {
      const id = bed.id || bed.bed_id;
      positions[id] = {
        x: bed.x ?? 10 + idx * 120,
        y: bed.y ?? 10 + idx * 70,
      };
    });
    return positions;
  });

  // Track dragging state
  const [draggingBedId, setDraggingBedId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Update positions if beds prop changes (e.g., after backend reload)
  React.useEffect(() => {
    setBedPositions((prev) => {
      const positions = { ...prev };
      beds.forEach((bed, idx) => {
        const id = bed.id || bed.bed_id;
        // Only update if x/y have changed in backend, or if bed is new
        if (!(id in positions) ||
          (typeof bed.x === 'number' && typeof bed.y === 'number' &&
            (positions[id].x !== bed.x || positions[id].y !== bed.y))) {
          positions[id] = {
            x: typeof bed.x === 'number' ? bed.x : 10 + idx * 120,
            y: typeof bed.y === 'number' ? bed.y : 10 + idx * 70,
          };
        }
      });
      return positions;
    });
  }, [beds]);

  // Handlers for yard definition (size/shape)
  const handleYardChange = (e) => {
    const { name, value } = e.target;
    setYard((prev) => ({ ...prev, [name]: value }));
  };

  // Mouse event handlers for drag-and-drop
  const handleBedMouseDown = (e, bed, idx) => {
    e.preventDefault();
    const svgRect = e.target.ownerSVGElement.getBoundingClientRect();
    const id = bed.id || bed.bed_id;
    setDraggingBedId(id);
    setDragOffset({
      x: e.clientX - (bedPositions[id]?.x ?? 10 + idx * 120),
      y: e.clientY - (bedPositions[id]?.y ?? 10 + idx * 70),
    });
  };

  const handleMouseMove = (e) => {
    if (draggingBedId) {
      setBedPositions((prev) => ({
        ...prev,
        [draggingBedId]: {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        },
      }));
    }
  };

  const handleMouseUp = async () => {
    if (draggingBedId) {
      const pos = bedPositions[draggingBedId];
      try {
        // Persist position to backend
        const { updateGardenBedPosition } = await import("../services/bedService");
        await updateGardenBedPosition(draggingBedId, { x: pos.x, y: pos.y });
      } catch (err) {
        // Optionally, show error to user
        console.error("Failed to persist bed position:", err);
        // Optionally, revert UI position or notify user
      }
    }
    setDraggingBedId(null);
  };

  // Attach global listeners only when dragging
  React.useEffect(() => {
    if (draggingBedId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  });

  // Simple SVG visualization
  return (
    <div>
      <h2>Garden Bed Layout Tool</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          Yard Width:
          <input
            type="number"
            name="width"
            value={yard.width}
            min={100}
            max={2000}
            onChange={handleYardChange}
          />
        </label>
        <label style={{ marginLeft: 16 }}>
          Yard Height:
          <input
            type="number"
            name="height"
            value={yard.height}
            min={100}
            max={2000}
            onChange={handleYardChange}
          />
        </label>
        {/* Remove Add Garden Bed button for now (backend integration) */}
      </div>
      <svg
        width={yard.width}
        height={yard.height}
        style={{ border: "2px solid #4CAF50", background: "#f9fff9" }}
      >
        {/* Yard boundary */}
        {/* Render garden beds */}
        {beds.map((bed, idx) => {
          const id = bed.id || bed.bed_id;
          const pos = bedPositions[id] || { x: 10 + idx * 120, y: 10 + idx * 70 };
          return (
            <g key={id} style={{ pointerEvents: 'all' }}>
              <rect
                x={pos.x}
                y={pos.y}
                width={bed.width || 100}
                height={bed.height || 50}
                fill="#b2dfdb"
                stroke="#00695c"
                strokeWidth={2}
                cursor={draggingBedId === id ? "grabbing" : "grab"}
                onMouseDown={(e) => handleBedMouseDown(e, bed, idx)}
                onClick={() => onBedClick && onBedClick(bed)}
              />
              <text
                x={pos.x + (bed.width || 100) / 2}
                y={pos.y + (bed.height || 50) / 2}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize={14}
                fill="#004d40"
                pointerEvents="none"
              >
                {bed.name}
              </text>
              {/* Render plants in bed */}
              {Array.isArray(bed.plants) && bed.plants.map((plant, pidx) => (
                <circle
                  key={plant.id || plant.planting_id || pidx}
                  cx={pos.x + 20 + (pidx * 20)}
                  cy={pos.y + (bed.height || 50) / 2}
                  r={8}
                  fill="#81c784"
                  stroke="#388e3c"
                  strokeWidth={1}
                  cursor="pointer"
                  onClick={() => onPlantClick && onPlantClick(plant)}
                />
              ))}
            </g>
          );
        })}
      </svg>
      {/* TODO: Instructions, drag-and-drop UI, plant visualization, click handlers for plants */}
    </div>
  );
}

GardenLayoutTool.propTypes = {
  beds: PropTypes.array,
  onBedClick: PropTypes.func,
  onPlantClick: PropTypes.func,
};

export default GardenLayoutTool;
