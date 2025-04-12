import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  CircularProgress
} from '@mui/material';
import { getAllPlantTypesNew as getAllPlantTypes } from '../services/plantService'; // Use alias for consistency

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i); // Last 10 years
const seasons = ['Spring', 'Summer', 'Fall', 'Winter', 'Year-Round'];

function AddPlantingForm({ open, onClose, onSubmit, bedId }) {
  const [plantTypes, setPlantTypes] = useState([]);
  const [loadingPlantTypes, setLoadingPlantTypes] = useState(true);
  const [errorPlantTypes, setErrorPlantTypes] = useState('');
  const [formData, setFormData] = useState({
    plant_type_id: '',
    date_planted: '', // YYYY-MM-DD format
    year: currentYear.toString(),
    season: '',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    const fetchPlantTypes = async () => {
      if (!open) return; // Only fetch when dialog is open
      setLoadingPlantTypes(true);
      setErrorPlantTypes('');
      try {
        const types = await getAllPlantTypes();
        setPlantTypes(types || []); // Ensure it's an array
      } catch (err) {
        console.error("Failed to fetch plant types:", err);
        setErrorPlantTypes('Could not load plant types.');
      } finally {
        setLoadingPlantTypes(false);
      }
    };

    fetchPlantTypes();
  }, [open]); // Refetch when dialog opens

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Basic validation
    if (!formData.plant_type_id || !formData.year) {
      // TODO: Add better user feedback for validation
      console.error('Plant Type and Year are required.');
      return;
    }
    // Pass bedId along with form data
    onSubmit({ ...formData, bed_id: bedId }); 
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add New Planting Record</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {loadingPlantTypes ? (
            <CircularProgress />
          ) : errorPlantTypes ? (
            <DialogContentText color="error">
              {errorPlantTypes}
            </DialogContentText>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="plant-type-label">Plant Type</InputLabel>
                  <Select
                    labelId="plant-type-label"
                    id="plant_type_id"
                    name="plant_type_id"
                    value={formData.plant_type_id}
                    label="Plant Type"
                    onChange={handleChange}
                  >
                    {plantTypes.map((plant) => (
                      <MenuItem key={plant.id} value={plant.id}>
                        {plant.common_name} ({plant.scientific_name})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="date_planted"
                  name="date_planted"
                  label="Date Planted"
                  type="date"
                  value={formData.date_planted}
                  onChange={handleChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              <Grid item xs={6} sm={3}>
                <FormControl fullWidth required>
                  <InputLabel id="year-label">Year</InputLabel>
                  <Select
                    labelId="year-label"
                    id="year"
                    name="year"
                    value={formData.year}
                    label="Year"
                    onChange={handleChange}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y.toString()}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3}>
                <FormControl fullWidth>
                  <InputLabel id="season-label">Season</InputLabel>
                  <Select
                    labelId="season-label"
                    id="season"
                    name="season"
                    value={formData.season}
                    label="Season"
                    onChange={handleChange}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {seasons.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="quantity"
                  name="quantity"
                  label="Quantity (e.g., 3 rows, 5 plants)"
                  value={formData.quantity}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="notes"
                  name="notes"
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loadingPlantTypes || !formData.plant_type_id}>
            Add Planting
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default AddPlantingForm;
