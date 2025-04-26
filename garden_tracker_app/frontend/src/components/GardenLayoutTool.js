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
  const [bedPositions, setBedPositions] = useState({});

  // Track layout loading status
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  // Load layout from backend on mount
  React.useEffect(() => {
    (async () => {
      try {
        const layout = await getGardenLayout();
        if (layout) {
          if (layout.yard) setYard(layout.yard);
          if (layout.bedPositions) setBedPositions(layout.bedPositions);
          setLayoutLoaded(true);
        } else {
          setLayoutLoaded(true); // No layout found, allow user to create one
        }
        showSnackbar('Garden layout loaded.', 'success');
      } catch (err) {
        if (err.message && !/404|not found/i.test(err.message)) {
          console.error("Failed to load layout:", err);
          showSnackbar('Failed to load garden layout: ' + err.message, 'error');
        }
        setLayoutLoaded(true); // Even on error, allow user to interact
      }
    })();
  }, []);

  // Save layout to backend only if layoutLoaded is true
  React.useEffect(() => {
    if (!layoutLoaded) return;
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

  };


  const handleMouseUp = async () => {
    if (draggingBedId) {
      const pos = bedPositions[draggingBedId];
      try {
        await saveGardenLayout({ yard, bedPositions });
        showSnackbar('Layout updated.', 'success');
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

  // Helper to render the correct SVG shape for a bed
  function renderBedShape(bed, pos, isDragging, idx) {
    const { shape, shape_params = {}, name } = bed;
    const fill = "#b2dfdb";
    const stroke = "#00695c";
    const strokeWidth = 2;
    const cursor = isDragging ? "grabbing" : "grab";
    // Rectangle fallback
    if (!shape || shape === "rectangle") {
      const width = shape_params.width || bed.width || 100;
      const height = shape_params.height || bed.height || 50;
      return (
        <rect
          x={pos.x}
          y={pos.y}
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          cursor={cursor}
          onMouseDown={e => handleBedMouseDown(e, bed, idx)}
          onClick={() => onBedClick && onBedClick(bed)}
          onMouseEnter={e => setHovered({ type: 'bed', data: bed, x: e.clientX, y: e.clientY })}
          onMouseMove={e => setHovered(prev => prev && prev.type === 'bed' ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
          onMouseLeave={() => setHovered(null)}
          rx={shape === "pill" ? (shape_params.height || bed.height || 50) / 2 : 0}
          ry={shape === "pill" ? (shape_params.height || bed.height || 50) / 2 : 0}
        />
      );
    }
    if (shape === "circle") {
      const radius = shape_params.radius || 40;
      return (
        <circle
          cx={pos.x + radius}
          cy={pos.y + radius}
          r={radius}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          cursor={cursor}
          onMouseDown={e => handleBedMouseDown(e, bed, idx)}
          onClick={() => onBedClick && onBedClick(bed)}
          onMouseEnter={e => setHovered({ type: 'bed', data: bed, x: e.clientX, y: e.clientY })}
          onMouseMove={e => setHovered(prev => prev && prev.type === 'bed' ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
          onMouseLeave={() => setHovered(null)}
        />
      );
    }
    if (shape === "pill") {
      // Pill: rectangle with full height corner radius
      const width = shape_params.width || bed.width || 100;
      const height = shape_params.height || bed.height || 40;
      const rx = height / 2;
      return (
        <rect
          x={pos.x}
          y={pos.y}
          width={width}
          height={height}
          rx={rx}
          ry={rx}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          cursor={cursor}
          onMouseDown={e => handleBedMouseDown(e, bed, idx)}
          onClick={() => onBedClick && onBedClick(bed)}
          onMouseEnter={e => setHovered({ type: 'bed', data: bed, x: e.clientX, y: e.clientY })}
          onMouseMove={e => setHovered(prev => prev && prev.type === 'bed' ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
          onMouseLeave={() => setHovered(null)}
        />
      );
    }
    if (shape === "c-rectangle") {
      // C-rectangle: use backend params: width, height, missing_side, missing_width, missing_height
      const W = shape_params.width || 100;
      const H = shape_params.height || 80;
      const missingSide = shape_params.missing_side || "right";
      const MW = shape_params.missing_width || 40;
      const MH = shape_params.missing_height || 40;
      const x = pos.x, y = pos.y;
      // Center the gap along the missing side
      let gapX = x, gapY = y;
      if (missingSide === "right") {
        gapX = x + W - MW;
        gapY = y + (H - MH) / 2;
      } else if (missingSide === "left") {
        gapX = x;
        gapY = y + (H - MH) / 2;
      } else if (missingSide === "top") {
        gapX = x + (W - MW) / 2;
        gapY = y;
      } else if (missingSide === "bottom") {
        gapX = x + (W - MW) / 2;
        gapY = y + H - MH;
      }
      // SVG: use two <rect>s, one for the full bed, one for the gap, with gap as white to "erase" that part
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={W}
            height={H}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            cursor={cursor}
            onMouseDown={e => handleBedMouseDown(e, bed, idx)}
            onClick={() => onBedClick && onBedClick(bed)}
            onMouseEnter={e => setHovered({ type: 'bed', data: bed, x: e.clientX, y: e.clientY })}
            onMouseMove={e => setHovered(prev => prev && prev.type === 'bed' ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
            onMouseLeave={() => setHovered(null)}
          />
          <rect
            x={gapX}
            y={gapY}
            width={MW}
            height={MH}
            fill="#fff"
            stroke="#fff"
            strokeWidth={0}
            pointerEvents="none"
          />
        </g>
      );
    }
    // Fallback: rectangle
    const width = bed.width || 100;
    const height = bed.height || 50;
    return (
      <rect
        x={pos.x}
        y={pos.y}
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        cursor={cursor}
        onMouseDown={e => handleBedMouseDown(e, bed, idx)}
        onClick={() => onBedClick && onBedClick(bed)}
        onMouseEnter={e => setHovered({ type: 'bed', data: bed, x: e.clientX, y: e.clientY })}
        onMouseMove={e => setHovered(prev => prev && prev.type === 'bed' ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
        onMouseLeave={() => setHovered(null)}
      />
    );
  }

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
              {renderBedShape(bed, pos, draggingBedId === id, idx)}
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
