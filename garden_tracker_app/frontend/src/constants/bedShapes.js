// constants/bedShapes.js
export const BED_SHAPES = [
  {
    value: 'rectangle',
    label: 'Rectangle',
    params: [
      { name: 'width', label: 'Width', type: 'number', required: true },
      { name: 'height', label: 'Height', type: 'number', required: true },
    ],
  },
  {
    value: 'circle',
    label: 'Circle',
    params: [
      { name: 'radius', label: 'Radius', type: 'number', required: true },
    ],
  },
  {
    value: 'pill',
    label: 'Pill',
    params: [
      { name: 'width', label: 'Width', type: 'number', required: true },
      { name: 'height', label: 'Height', type: 'number', required: true },
      { name: 'border_radius', label: 'Border Radius', type: 'number', required: true },
    ],
  },
  {
    value: 'c-rectangle',
    label: 'C-Rectangle',
    params: [
      { name: 'width', label: 'Width', type: 'number', required: true },
      { name: 'height', label: 'Height', type: 'number', required: true },
      { name: 'missing_side', label: 'Missing Side', type: 'select', required: true, options: ['top','bottom','left','right'] },
      { name: 'missing_width', label: 'Missing Width', type: 'number', required: true },
      { name: 'missing_height', label: 'Missing Height', type: 'number', required: true },
    ],
  },
];
