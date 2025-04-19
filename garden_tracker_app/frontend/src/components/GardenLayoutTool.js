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

  // Handlers for yard definition (size/shape)
  const handleYardChange = (e) => {
    const { name, value } = e.target;
    setYard((prev) => ({ ...prev, [name]: value }));
  };

  // TODO: Implement drag-and-drop for beds
  // TODO: Visualize plants in beds
  // TODO: Make beds/plants clickable

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
        {beds.map((bed, idx) => (
          <g key={bed.id || bed.bed_id}>
            <rect
              x={bed.x || 10 + idx * 120}
              y={bed.y || 10 + idx * 70}
              width={bed.width || 100}
              height={bed.height || 50}
              fill="#b2dfdb"
              stroke="#00695c"
              strokeWidth={2}
              cursor="pointer"
              onClick={() => onBedClick && onBedClick(bed)}
            />
            <text
              x={(bed.x || 10 + idx * 120) + (bed.width || 100) / 2}
              y={(bed.y || 10 + idx * 70) + (bed.height || 50) / 2}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={14}
              fill="#004d40"
            >
              {bed.name}
            </text>
            {/* Render plants in bed */}
            {Array.isArray(bed.plants) && bed.plants.map((plant, pidx) => (
              <circle
                key={plant.id || plant.planting_id || pidx}
                cx={(bed.x || 10 + idx * 120) + 20 + (pidx * 20)}
                cy={(bed.y || 10 + idx * 70) + (bed.height || 50) / 2}
                r={8}
                fill="#81c784"
                stroke="#388e3c"
                strokeWidth={1}
                cursor="pointer"
                onClick={() => onPlantClick && onPlantClick(plant)}
              />
            ))}
          </g>
        ))}
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
