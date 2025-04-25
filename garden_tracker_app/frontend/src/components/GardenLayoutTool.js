import React, { useState } from "react";
import PropTypes from "prop-types";
import { getGardenLayout, saveGardenLayout } from "../services/layoutService";
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

// Constants for default yard size
const DEFAULT_YARD = { width: 800, height: 400, shape: "rectangle" };

/**
 * GardenLayoutTool
 * Visual tool for defining yard, creating garden beds, drag-and-drop placement, and plant visualization.
 * Now uses beds and plants from props. [DRY][RP][CA]
 */
function GardenLayoutTool({ beds = [], onBedClick, onPlantClick }) {
  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const showSnackbar = (message, severity = 'info') => setSnackbar({ open: true, message, severity });
  const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });
  // Tooltip state
  const [hovered, setHovered] = useState(null); // { type: 'bed'|'plant', data, x, y }

  // State for yard definition only
  const [yard, setYard] = useState(DEFAULT_YARD);

  // Local state for bed positions and orientation (keyed by bed id)
  const [bedPositions, setBedPositions] = useState(() => {
    const positions = {};
    beds.forEach((bed, idx) => {
      const id = bed.id || bed.bed_id;
      positions[id] = {
        x: bed.x ?? 10 + idx * 120,
        y: bed.y ?? 10 + idx * 70,
        orientation: typeof bed.orientation === 'number' ? bed.orientation : 0,
      };
    });
    return positions;
  });

  // Load layout from backend on mount
  React.useEffect(() => {
    (async () => {
      try {
        const layout = await getGardenLayout();
        if (layout) {
          if (layout.yard) setYard(layout.yard);
          if (layout.bedPositions) setBedPositions(layout.bedPositions);
        }
        showSnackbar('Garden layout loaded.', 'success');
      } catch (err) {
        if (err.message && !/404|not found/i.test(err.message)) {
          console.error("Failed to load layout:", err);
          showSnackbar('Failed to load garden layout: ' + err.message, 'error');
        }
      }
    })();
  }, []);

  // Save layout to backend when yard or bedPositions change
  React.useEffect(() => {
    (async () => {
      try {
        await saveGardenLayout({ yard, bedPositions });
        showSnackbar('Garden layout saved.', 'success');
      } catch (err) {
        console.error("Failed to save layout:", err);
        showSnackbar('Failed to save garden layout: ' + err.message, 'error');
      }
    })();
  }, [yard, bedPositions]);

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
            (positions[id].x !== bed.x || positions[id].y !== bed.y)) ||
          (typeof bed.orientation === 'number' && positions[id].orientation !== bed.orientation)) {
          positions[id] = {
            x: typeof bed.x === 'number' ? bed.x : 10 + idx * 120,
            y: typeof bed.y === 'number' ? bed.y : 10 + idx * 70,
            orientation: typeof bed.orientation === 'number' ? bed.orientation : 0,
          };
        }
      });
      return positions;
    });
  }, [beds]);

  // Handlers for yard definition (size/shape)
  const handleYardChange = (e) => {
    const { name, value } = e.target;
    setYard((prev) => ({ ...prev, [name]: Number(value) }));
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

  // Only update local state during drag; persist only on mouse up
  const handleMouseMove = (e) => {
    if (draggingBedId) {
      setBedPositions((prev) => ({
        ...prev,
        [draggingBedId]: {
          ...prev[draggingBedId],
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        },
      }));
    }
  };

  // Rotate bed by 15 degrees and persist
  const handleRotateBed = async (id) => {
    setBedPositions((prev) => {
      const newOrientation = ((prev[id]?.orientation || 0) + 15) % 360;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          orientation: newOrientation,
        },
      };
    });
    // Persist orientation to backend
    try {
      const { updateGardenBedPosition } = await import("../services/bedService");
      const pos = bedPositions[id] || {};
      await updateGardenBedPosition(id, {
        x: pos.x,
        y: pos.y,
        orientation: ((bedPositions[id]?.orientation || 0) + 15) % 360,
      });
      showSnackbar('Bed orientation updated.', 'success');
    } catch (err) {
      console.error("Failed to persist bed orientation:", err);
      showSnackbar('Failed to update bed orientation: ' + err.message, 'error');
    }
  };


  const handleMouseUp = async () => {
    if (draggingBedId) {
      const pos = bedPositions[draggingBedId];
      let bedSuccess = false, layoutSuccess = false;
      try {
        // 1. Persist position and orientation to backend (individual bed)
        const { updateGardenBedPosition } = await import("../services/bedService");
        await updateGardenBedPosition(draggingBedId, { x: pos.x, y: pos.y, orientation: pos.orientation });
        bedSuccess = true;
        showSnackbar('Bed position updated.', 'success');
      } catch (err) {
        console.error("Failed to persist bed position/orientation:", err);
        showSnackbar('Failed to update bed position: ' + err.message, 'error');
      }
      // 2. Also persist to layout JSON
      try {
        await saveGardenLayout({ yard, bedPositions });
        layoutSuccess = true;
        if (bedSuccess) {
          showSnackbar('Layout updated.', 'success');
        } else {
          showSnackbar('Layout updated, but bed update failed.', 'warning');
        }
      } catch (err) {
        console.error("Failed to update layout JSON after bed move:", err);
        showSnackbar('Failed to update layout after bed move: ' + err.message, 'error');
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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
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
            <g key={id} style={{ pointerEvents: 'all' }} transform={`rotate(${pos.orientation || 0}, ${pos.x + (bed.width || 100) / 2}, ${pos.y + (bed.height || 50) / 2})`}>
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
                onMouseEnter={e => setHovered({ type: 'bed', data: bed, x: e.clientX, y: e.clientY })}
                onMouseMove={e => setHovered(prev => prev && prev.type === 'bed' ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
                onMouseLeave={() => setHovered(null)}
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
              {/* Rotate button */}
              <g onClick={() => handleRotateBed(id)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={pos.x + (bed.width || 100) - 10}
                  cy={pos.y + 10}
                  r={10}
                  fill="#ffb74d"
                  stroke="#f57c00"
                  strokeWidth={1}
                />
                <text
                  x={pos.x + (bed.width || 100) - 10}
                  y={pos.y + 14}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#6d4c00"
                  pointerEvents="none"
                >
                  &#8635;
                </text>
              </g>
              {/* Render only active plants in bed */}
              {Array.isArray(bed.plants) && bed.plants.filter(p => p.is_current).map((plant, pidx) => (
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
                  onMouseEnter={e => setHovered({ type: 'plant', data: plant, x: e.clientX, y: e.clientY })}
                  onMouseMove={e => setHovered(prev => prev && prev.type === 'plant' ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </g>
          );
        })}
      </svg>
      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: 'fixed',
            left: hovered.x + 12,
            top: hovered.y + 12,
            background: 'rgba(255,255,240,0.98)',
            border: '1px solid #bbb',
            borderRadius: 6,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 1000,
            minWidth: 120,
            boxShadow: '0 2px 8px #aaa',
            fontSize: 13
          }}
        >
          {hovered.type === 'bed' ? (
            <div>
              <strong>{hovered.data.name}</strong><br />
              Size: {hovered.data.width || 100}×{hovered.data.length || 50} {hovered.data.unit_measure || ''}<br />
              {Array.isArray(hovered.data.plants) && hovered.data.plants.filter(p => p.is_current).length > 0 ? (
                <>
                  <span>Active plants:</span>
                  <ul style={{margin: '4px 0 0 16px', padding: 0}}>
                    {hovered.data.plants.filter(p => p.is_current).map((p, i) => (
                      <li key={p.id || p.planting_id || i}>{p.plant_common_name || 'Plant'}</li>
                    ))}
                  </ul>
                </>
              ) : <span>No active plants</span>}
            </div>
          ) : hovered.type === 'plant' ? (
            <div>
              <strong>{hovered.data.plant_common_name || hovered.data.commonName || hovered.data.name || 'Plant'}</strong><br />
              {hovered.data.variety ? <>Variety: {hovered.data.variety}<br /></> : null}
              {hovered.data.datePlanted ? <>Planted: {hovered.data.datePlanted}<br /></> : null}
              {hovered.data.notes ? <>{hovered.data.notes}<br /></> : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

GardenLayoutTool.propTypes = {
  beds: PropTypes.array,
  onBedClick: PropTypes.func,
  onPlantClick: PropTypes.func,
};

export default GardenLayoutTool;
