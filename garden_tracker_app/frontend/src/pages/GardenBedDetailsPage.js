import React, { useState, useEffect } from 'react';
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
  Snackbar, // For feedback
  Alert as MuiAlert // Alias Alert to avoid conflict if needed, used in Snackbar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add'; // For the button
import { getGardenBedDetails } from '../services/bedService';
import { getPlantingsForBed, addPlantingToBed } from '../services/plantingService'; // Import add function too
import AddPlantingForm from '../components/AddPlantingForm'; // Import the form component

function GardenBedDetailsPage() {
  const { bedId } = useParams(); // Get bedId from URL parameter
  const [bedDetails, setBedDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for Planting History [AC]
  const [plantingHistory, setPlantingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  // State for Add Planting Form Modal
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success' or 'error'

  useEffect(() => {
    // Renamed inner function for clarity and reuse
    const fetchBedAndHistoryData = async () => {
      if (!bedId) return; // Don't fetch if bedId is not available

      setLoading(true);
      setError('');
      try {
        const details = await getGardenBedDetails(bedId);
        setBedDetails(details);
        // Fetch history initially
        await fetchPlantingHistory(); // Call the separate history fetching function
      } catch (err) {
        console.error("Failed to fetch garden bed details:", err);
        setError(err.message || 'Failed to load garden bed data.');
      } finally {
        setLoading(false); // Stop loading indicator regardless of history fetch outcome
      }
    };

    fetchBedAndHistoryData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bedId]); // Refetch if bedId changes

  // Function to fetch planting history (can be called on load and after adding)
  const fetchPlantingHistory = async () => {
    if (!bedId) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const history = await getPlantingsForBed(bedId);
      setPlantingHistory(history);
    } catch (histErr) {
      console.error("Failed to fetch planting history:", histErr);
      setHistoryError(histErr.message || 'Failed to load planting history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handler for submitting the new planting form
  const handleAddPlantingSubmit = async (formData) => {
    setSubmitError(''); // Clear previous errors
    try {
      const newPlanting = await addPlantingToBed(bedId, formData);
      setIsAddFormOpen(false); // Close the modal
      // Show success feedback
      setSnackbarMessage(`Planting record for ${newPlanting.plant_common_name || 'plant'} added successfully!`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      // Refresh planting history list [AC]
      await fetchPlantingHistory(); 
    } catch (err) {
      console.error("Failed to add planting record:", err);
      setSubmitError(err.message || 'Failed to add planting record. Please try again.');
      // Show error feedback (can optionally use snackbar too)
      setSnackbarMessage(err.message || 'Failed to add planting record.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      // Keep the form open if submission fails so user can retry/correct
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <> 
      {console.log('--- Rendering GardenBedDetailsPage ---')}
      {console.log(`State: loading=${loading}, error=${error}, bedDetails=${!!bedDetails}, historyLoading=${historyLoading}, historyError=${historyError}`)}
      <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button 
          component={RouterLink} 
          to="/dashboard" // Link back to the dashboard or bed list page
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
            <CircularProgress /> 
          </Box> // Ensure Box is closed if it wraps CircularProgress
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}> 
            {error}
          </Alert>
        )}

        {!loading && !error && bedDetails && (
          console.log('Rendering Paper section (bedDetails exist)') ||
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
                  <strong>Created:</strong> {new Date(bedDetails.creation_date).toLocaleDateString()}
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

            {/* Planting History Section */}
            <Box sx={{ mt: 4 }}>
              {console.log('Rendering Planting History Box')}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 0 }}>
                  Planting History
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsAddFormOpen(true)}
                >
                  Add Planting
                </Button>
              </Box>
              {console.log(`Planting history state: loading=${historyLoading}, error=${historyError}, count=${plantingHistory.length}`)}
              
              {/* Planting History Display */}
              {historyLoading && <CircularProgress size={24} sx={{ mt: 2 }} />}
              {historyError && <Alert severity="error" sx={{ mt: 2 }}>{historyError}</Alert>}
              {!historyLoading && !historyError && (
                plantingHistory.length > 0 ? (
                  <List dense sx={{ mt: 1 }}>
                    {plantingHistory.map((planting, index) => (
                      <React.Fragment key={planting.id}>
                        <ListItem>
                          <ListItemText 
                            primary={`${planting.plant_common_name} (${planting.year} ${planting.season || ''})`}
                            secondary={`Planted: ${planting.date_planted ? new Date(planting.date_planted + 'T00:00:00').toLocaleDateString() : 'N/A'} ${planting.notes ? '- ' + planting.notes : ''} ${planting.quantity ? '- Qty: ' + planting.quantity : ''}`}
                            primaryTypographyProps={{ fontWeight: 'medium' }}
                          />
                          {/* TODO: Add Edit/Delete Icons here */}
                        </ListItem>
                        {index < plantingHistory.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    No planting history recorded for this bed yet.
                  </Typography>
                )
              )}
            </Box>
          </Paper>
        )}

        {!loading && !error && !bedDetails && (
           <Typography sx={{ mt: 2 }}>Could not load bed details.</Typography>
        )}
      </Container>
      
      {/* Add Planting Form Modal */}
      <AddPlantingForm
        open={isAddFormOpen}
        onClose={() => {
          setIsAddFormOpen(false);
          setSubmitError(''); // Clear error when closing manually
        }}
        onSubmit={handleAddPlantingSubmit}
        bedId={bedId} 
      />

      {/* Feedback Snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert 
          elevation={6} 
          variant="filled" 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
        >
          {snackbarMessage}
        </MuiAlert>
      </Snackbar>
    </> 
  );
}

export default GardenBedDetailsPage;
