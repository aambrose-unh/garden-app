import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import gardenService from '../services/gardenService';

const GardenBedForm = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    length: '',
    width: '',
    unit_measure: 'feet',
    notes: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setFormData({
      name: '',
      length: '',
      width: '',
      unit_measure: 'feet',
      notes: ''
    });
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await gardenService.createGardenBed(formData);
      handleClose();
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      setError(err.message || 'Failed to create garden bed');
    }
  };

  return (
    <Box>
      <Button variant="contained" onClick={handleOpen}>
        Add New Garden Bed
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Garden Bed</DialogTitle>
        <DialogContent>
          <form id="garden-bed-form-id" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                required
                fullWidth
                label="Bed Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  required
                  type="number"
                  label="Length"
                  name="length"
                  value={formData.length}
                  onChange={handleChange}
                  sx={{ flex: 1 }}
                />
                <TextField
                  required
                  type="number"
                  label="Width"
                  name="width"
                  value={formData.width}
                  onChange={handleChange}
                  sx={{ flex: 1 }}
                />
              </Box>
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
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GardenBedForm;
