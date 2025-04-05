import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, Box, CircularProgress, Alert
} from '@mui/material';
import { createPlantType /*, updatePlantType */ } from '../services/plantService'; // Import the service function

function PlantForm({ open, handleClose, onSuccess, plantData, isEditing }) {
  // Form State
  const [formData, setFormData] = useState({ 
    common_name: '', 
    scientific_name: '', 
    rotation_family: '',
    description: '', 
    notes: '' 
    // Add avg_height, avg_spread later if needed
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Effect to populate form when editing
  useEffect(() => {
    if (isEditing && plantData) {
      setFormData({
        common_name: plantData.common_name || '',
        scientific_name: plantData.scientific_name || '',
        rotation_family: plantData.rotation_family || '',
        description: plantData.description || '',
        notes: plantData.notes || ''
        // Populate other fields if added
      });
    } else {
      // Reset form for creating or if data is cleared
      setFormData({ 
        common_name: '', 
        scientific_name: '', 
        rotation_family: '',
        description: '',
        notes: ''
      });
    }
    setError(''); // Clear errors when modal opens or data changes
  }, [plantData, isEditing, open]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Actual API call [AC]
      if (isEditing) {
        // await updatePlantType(plantData.id, formData); // Keep update commented for now
        console.warn('Update functionality not implemented yet.') // Placeholder
      } else {
        await createPlantType(formData); // Use the imported service function
      }
      onSuccess(formData, isEditing); // Notify parent component
      handleClose(); // Close modal on success
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} plant.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Plant Type' : 'Add New Plant Type'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            autoFocus
            required
            margin="dense"
            id="common_name"
            name="common_name"
            label="Common Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.common_name}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField
            margin="dense"
            id="scientific_name"
            name="scientific_name"
            label="Scientific Name (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.scientific_name}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField
            margin="dense"
            id="rotation_family"
            name="rotation_family"
            label="Rotation Family (e.g., Legume, Nightshade)"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.rotation_family}
            onChange={handleChange}
            disabled={loading}
          />
           <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField
            margin="dense"
            id="notes"
            name="notes"
            label="Notes (Optional)"
            type="text"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={formData.notes}
            onChange={handleChange}
            disabled={loading}
          />
          {/* Add other fields like height, spread here if needed */}

        </DialogContent>
        <DialogActions sx={{ pb: 3, px: 3 }}>
          <Button onClick={handleClose} disabled={loading} color="secondary">
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !formData.common_name} // Basic validation
          >
            {loading ? <CircularProgress size={24} /> : (isEditing ? 'Save Changes' : 'Create Plant')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default PlantForm;
