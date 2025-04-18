import React, { useState, useEffect, useCallback } from 'react'; 
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Snackbar, 
  Alert as MuiAlert, 
  IconButton, 
  Switch, 
  FormControlLabel 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add'; 
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getGardenBedDetails } from '../services/bedService';
// Import all planting-related functions for a specific bed from bedService [Fix][CA]
import { 
  getPlantingsForBed, 
  updatePlanting, 
  deletePlanting 
} from '../services/bedService';
// Import only the generic addPlantingToBed from plantingService (if needed elsewhere, or could be moved too)
import { addPlantingToBed } from '../services/plantingService'; 
import AddPlantingForm from '../components/AddPlantingForm'; 

function GardenBedDetailsPage() {
  const { bedId } = useParams(); 
  const [bedDetails, setBedDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [plantingHistory, setPlantingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false); 

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false); 
  const [editingPlanting, setEditingPlanting] = useState(null); 
  const [submitError, setSubmitError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success'); 

  const fetchPlantingHistory = useCallback(async () => {
    if (!bedId) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      console.log(`Fetching plantings for bed ${bedId}, activeOnly: ${showActiveOnly}`);
      const history = await getPlantingsForBed(bedId, showActiveOnly);
      setPlantingHistory(history);
    } catch (histErr) {
      console.error("Failed to fetch planting history:", histErr);
      setHistoryError(histErr.message || 'Failed to load planting history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [bedId, showActiveOnly]);

  useEffect(() => {
    const fetchBedDetails = async () => {
      if (!bedId) return;

      setLoading(true);
      setError('');
      try {
        const details = await getGardenBedDetails(bedId);
        setBedDetails(details);
      } catch (err) {
        console.error("Failed to fetch garden bed details:", err);
        setError(err.message || 'Failed to load garden bed data.');
      } finally {
        setLoading(false);
      }
    };

    fetchBedDetails();
    fetchPlantingHistory(); 
  }, [bedId, fetchPlantingHistory]); 

  const handleFilterChange = (event) => {
    setShowActiveOnly(event.target.checked);
    fetchPlantingHistory(); 
  };

  const handleAddPlantingSubmit = async (formData) => {
    setSubmitError(''); 
    try {
      const newPlanting = await addPlantingToBed(bedId, formData);
      setIsAddFormOpen(false); 
      setSnackbarMessage(`Planting record added successfully!`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      await fetchPlantingHistory(); 
    } catch (err) {
      console.error("Failed to add planting record:", err);
      setSubmitError(err.message || 'Failed to add planting record. Please try again.');
      setSnackbarMessage(err.message || 'Failed to add planting record.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleOpenEditForm = (planting) => {
    setEditingPlanting(planting); 
    setIsEditFormOpen(true);     
    setSubmitError('');         
  };

  const handleEditPlantingSubmit = async (formData) => {
    if (!editingPlanting || !editingPlanting.id) {
        console.error("No planting selected for editing.");
        setSubmitError("Error: No planting selected for editing.");
        return;
    }
    setSubmitError('');
    try {
        await updatePlanting(editingPlanting.id, formData);
        setIsEditFormOpen(false); 
        setEditingPlanting(null); 
        setSnackbarMessage('Planting record updated successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        await fetchPlantingHistory(); 
    } catch (err) {
        console.error("Failed to update planting record:", err);
        setSubmitError(err.message || 'Failed to update planting record. Please try again.');
        setSnackbarMessage(err.message || 'Failed to update planting record.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        // Keep edit form open on error
    }
  };

  const handleDeletePlanting = async (plantingId) => {
    if (!window.confirm("Are you sure you want to delete this planting record?")) {
      return;
    }

    try {
      await deletePlanting(plantingId);
      setSnackbarMessage('Planting record deleted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      await fetchPlantingHistory(); 
    } catch (err) {
      console.error("Failed to delete planting record:", err);
      setSnackbarMessage(err.message || 'Failed to delete planting record.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString + 'T00:00:00').toLocaleDateString();
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
  };

  return (
    <> 
      <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button 
          component={RouterLink} 
          to="/dashboard" 
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
            <CircularProgress /> 
          </Box> 
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}> 
            {error}
          </Alert>
        )}

        {!loading && !error && bedDetails && (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {bedDetails.name}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1">
                  <strong>Dimensions:</strong> {bedDetails.length} x {bedDetails.width} {bedDetails.unit_measure}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1">
                  <strong>Created:</strong> {formatDate(bedDetails.creation_date)}
                </Typography>
              </Grid>
              {bedDetails.notes && (
                <Grid item xs={12}>
                  <Typography variant="body1">
                    <strong>Notes:</strong> {bedDetails.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>

            <Box sx={{ mt: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 0 }}>
                  Planting History
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={<Switch checked={showActiveOnly} onChange={handleFilterChange} />}
                    label="Show Active Only"
                    sx={{ mr: 2 }} 
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsAddFormOpen(true)}
                  >
                    Add Planting
                  </Button>
                </Box>
              </Box>
              {historyLoading && <CircularProgress size={24} sx={{ mt: 2 }} />}
              {historyError && <Alert severity="error" sx={{ mt: 2 }}>{historyError}</Alert>}
              {!historyLoading && !historyError && (
                plantingHistory.length > 0 ? (
                  <List dense sx={{ mt: 1 }}>
                    {plantingHistory.map((planting, index) => (
                      <React.Fragment key={planting.id}>
                        <ListItem 
                          secondaryAction={
                            <>
                              <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditForm(planting)} sx={{ mr: 0.5 }}>
                                <EditIcon />
                              </IconButton>
                              <IconButton edge="end" aria-label="delete" onClick={() => handleDeletePlanting(planting.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </>
                          }
                        >
                          <ListItemText 
                            primary={`${planting.plant_common_name || 'Unknown Plant'} (${planting.year} ${planting.season || ''})`}
                            secondary={
                                `Planted: ${formatDate(planting.date_planted)}` + 
                                `${planting.expected_harvest_date ? ' | Expected Harvest: ' + formatDate(planting.expected_harvest_date) : ''}` + 
                                `${planting.quantity ? ' | Qty: ' + planting.quantity : ''}` + 
                                `${planting.notes ? ' | Notes: ' + planting.notes : ''}`
                            }
                            primaryTypographyProps={{ fontWeight: 'medium' }}
                          />
                        </ListItem>
                        {index < plantingHistory.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography sx={{ mt: 2, fontStyle: 'italic' }}>
                    {showActiveOnly ? 'No active plantings found for this period.' : 'No planting history recorded for this bed yet.'}
                  </Typography>
                )
              )}
            </Box>
          </Paper>
        )}

        {isAddFormOpen && (
          <AddPlantingForm
            open={isAddFormOpen}
            onClose={() => setIsAddFormOpen(false)}
            onSubmit={handleAddPlantingSubmit}
            initialData={{ bed_id: bedId }} 
            error={submitError} 
          />
        )}

        {isEditFormOpen && editingPlanting && (
          <AddPlantingForm 
            open={isEditFormOpen}
            onClose={() => {setIsEditFormOpen(false); setEditingPlanting(null);}} 
            onSubmit={handleEditPlantingSubmit}
            initialData={editingPlanting} 
            error={submitError}
          />
        )}

        <Snackbar 
          open={snackbarOpen} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} 
        >
          <MuiAlert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
            {snackbarMessage}
          </MuiAlert>
        </Snackbar>
      </Container>
    </>
  );
}

export default GardenBedDetailsPage;
