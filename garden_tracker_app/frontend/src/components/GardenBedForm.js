import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import gardenService from '../services/gardenService';
import { BED_SHAPES } from '../constants/bedShapes';

const GardenBedForm = ({ open, handleClose, onSuccess, bedData, isEditing = false }) => {
  console.log('[GardenBedForm] Rendered with bedData:', bedData);
  const [formData, setFormData] = useState({
    name: '',
    shape: 'rectangle',
    shape_params: {},
    unit_measure: 'feet',
    notes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('[GardenBedForm] useEffect triggered. open:', open, 'isEditing:', isEditing, 'bedData:', bedData);
    if (open && isEditing && bedData) {
      // Ensure all required shape_params fields for the current shape are present
      const shape = bedData.shape || 'rectangle';
      const shapeObj = BED_SHAPES.find(s => s.value === shape);
      let filledParams = {};
      if (shapeObj) {
        shapeObj.params.forEach(param => {
          filledParams[param.name] = (bedData.shape_params && bedData.shape_params[param.name] !== undefined)
            ? bedData.shape_params[param.name]
            : '';
        });
      }
      setFormData({
        name: bedData.name || '',
        shape,
        shape_params: filledParams,
        unit_measure: bedData.unit_measure || 'feet',
        notes: bedData.notes || ''
      });
      setError('');
    } else if (open && !isEditing) {
      setFormData({
        name: '',
        shape: 'rectangle',
        shape_params: {},
        unit_measure: 'feet',
        notes: ''
      });
      setError('');
    }
  }, [open, isEditing, bedData, bedData?.id]);

  // Reset form if modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        shape: 'rectangle',
        shape_params: {},
        unit_measure: 'feet',
        notes: ''
      });
      setError('');
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('shape_param_')) {
      const paramName = name.replace('shape_param_', '');
      setFormData(prev => ({
        ...prev,
        shape_params: {
          ...prev.shape_params,
          [paramName]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleShapeChange = (e) => {
    const shape = e.target.value;
    setFormData(prev => ({
      ...prev,
      shape,
      shape_params: {} // reset params on shape change
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Convert all shape_params fields to number if the param type is 'number'
      const currentShapeObj = BED_SHAPES.find(s => s.value === formData.shape);
      let shape_params = { ...formData.shape_params };
      if (currentShapeObj) {
        currentShapeObj.params.forEach(param => {
          if (param.type === 'number' && shape_params[param.name] !== undefined && shape_params[param.name] !== '') {
            shape_params[param.name] = Number(shape_params[param.name]);
          }
        });
      }
      const payload = { ...formData, shape_params };
      let response;
      if (isEditing) {
        if (!bedData || !bedData.id) {
          throw new Error('Cannot update bed without ID.');
        }
        response = await gardenService.updateGardenBed(bedData.id, payload);
      } else {
        response = await gardenService.createGardenBed(payload);
      }
      handleClose();
      if (onSuccess) {
        onSuccess(response, isEditing);
      }
    } catch (err) {
      setError(err.message || (isEditing ? 'Failed to update garden bed' : 'Failed to create garden bed'));
    }
  };

  // Get current shape's parameter definitions
  const currentShapeObj = BED_SHAPES.find(s => s.value === formData.shape);
  const paramFields = currentShapeObj ? currentShapeObj.params : [];


  // Use a unique key to force React to reset the form fields when editing a different bed or shape
  const formKey = isEditing ? `edit-${bedData?.id || ''}-${formData.shape}` : 'create';

  console.log('[GardenBedForm] formData before render:', formData);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Garden Bed' : 'Add New Garden Bed'}</DialogTitle>
      <DialogContent>
        <form id="garden-bed-form-id" onSubmit={handleSubmit} key={formKey}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              required
              fullWidth
              label="Bed Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel id="shape-label">Shape</InputLabel>
              <Select
                labelId="shape-label"
                name="shape"
                value={formData.shape}
                label="Shape"
                onChange={handleShapeChange}
              >
                {BED_SHAPES.map(shape => (
                  <MenuItem key={shape.value} value={shape.value}>{shape.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {paramFields.map(param => (
              param.type === 'select' ? (
                <FormControl fullWidth required={param.required} key={param.name} sx={{ mb: 2 }}>
                  <InputLabel id={`param-label-${param.name}`}>{param.label}</InputLabel>
                  <Select
                    labelId={`param-label-${param.name}`}
                    name={`shape_param_${param.name}`}
                    value={formData.shape_params[param.name] || ''}
                    label={param.label}
                    onChange={handleChange}
                  >
                    {param.options.map(opt => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  key={param.name}
                  required={param.required}
                  type={param.type}
                  label={param.label}
                  name={`shape_param_${param.name}`}
                  value={formData.shape_params[param.name] || ''}
                  onChange={handleChange}
                  fullWidth
                  sx={{ mb: 2 }}
                />
              )
            ))}
            <TextField
              select
              required
              fullWidth
              label="Unit of Measure"
              name="unit_measure"
              value={formData.unit_measure}
              onChange={handleChange}
            >
              <MenuItem value="feet">Feet</MenuItem>
              <MenuItem value="meters">Meters</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={4}
            />
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" variant="contained" form="garden-bed-form-id">
          {isEditing ? 'Save Changes' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GardenBedForm;
