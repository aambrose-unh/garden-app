import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import authService from '../services/authService';
import gardenService from '../services/gardenService'; 
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle,
  ListItemButton
} from '@mui/material'; 
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GardenBedForm from '../components/GardenBedForm';

function DashboardPage() {
  const [userData, setUserData] = useState(null);
  const [userLoading, setUserLoading] = useState(true); 
  const [userError, setUserError] = useState('');     

  const [gardenBeds, setGardenBeds] = useState([]);
  const [bedsLoading, setBedsLoading] = useState(false); 
  const [bedsError, setBedsError] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bedToEdit, setBedToEdit] = useState(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [bedToDeleteId, setBedToDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true; 

    const fetchInitialData = async () => {
      setUserLoading(true);
      setUserError('');
      try {
        const data = await authService.getCurrentUser(); 
        if (!data || !data.email) {
            console.warn("No user data found, logging out.");
            authService.logout();
            if (isMounted) navigate('/login');
            return; 
        }
        if (isMounted) setUserData(data);

        setBedsLoading(true);
        setBedsError('');
        try {
            const bedsData = await gardenService.getGardenBeds();
            if (isMounted) setGardenBeds(bedsData || []); 
        } catch (bedErr) {
            console.error("Error fetching garden beds:", bedErr);
            if (isMounted) setBedsError('Failed to load garden beds. '+ bedErr.message);
            if (bedErr.message.includes('Unauthorized') && isMounted) {
                authService.logout();
                navigate('/login');
            }
        } finally {
            if (isMounted) setBedsLoading(false);
        }

      } catch (err) {
        console.error("Error fetching user data:", err);
        if (isMounted) setUserError('Failed to load user data. Please try logging in again.');
        authService.logout(); 
        // navigate('/login'); 
      } finally {
        if (isMounted) setUserLoading(false);
      }
    };

    fetchInitialData();

    return () => {
        isMounted = false;
    };

  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Renamed and updated to handle both create and edit [RP] [CA]
  const handleFormSuccess = (bedData, isEditing) => {
    if (isEditing) {
      // Update existing bed in the list
      setGardenBeds(prevBeds => 
        prevBeds.map(bed => bed.id === bedData.id ? bedData : bed)
      );
    } else {
      // Add new bed to the beginning of the list
      setGardenBeds(prevBeds => [bedData, ...prevBeds]);
    }
  };

  const handleEditClick = (bed) => {
    console.log('[DashboardPage] Editing bed:', bed);
    setBedToEdit(bed); // full object
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setBedToEdit(null);
    setIsEditModalOpen(false);
    setIsCreateModalOpen(false);
  };

  const handleDeleteClick = (bedId) => {
    setBedToDeleteId(bedId);
    setIsDeleteConfirmOpen(true);
    setDeleteError('');
  };

  const handleCloseDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setBedToDeleteId(null);
    setDeleteError(''); // Clear error on close
  };

  const handleConfirmDelete = async () => {
    if (!bedToDeleteId) return; // Should not happen, but safeguard

    setDeleteError(''); // Clear previous errors
    try {
      await gardenService.deleteGardenBed(bedToDeleteId);
      // Remove the bed from the state upon successful deletion
      setGardenBeds(prevBeds => prevBeds.filter(bed => bed.id !== bedToDeleteId));
      handleCloseDeleteConfirm(); // Close dialog on success
    } catch (error) {
      console.error('Failed to delete garden bed:', error);
      setDeleteError(error.message || 'Could not delete garden bed. Please try again.');
      // Keep dialog open to show the error
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
    setBedToEdit(null); // Ensure no stale edit data
  };

  if (userLoading) {
    return (
        <Container component="main" maxWidth="md">
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
            </Box>
        </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md"> 
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          Welcome to Your Garden Dashboard
        </Typography>

        {userError && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {userError} - Redirecting to login...
            </Alert>
        )}

        {userData && !userError && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mb: 4 }}> 
              Logged in as: {userData.email}
            </Typography>
            
            <Box sx={{ mt: 0, width: '100%' }}> 
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography component="h2" variant="h5">
                  My Garden Beds
                </Typography>
                <Button variant="contained" onClick={handleOpenCreateModal}>
                  Add New Garden Bed
                </Button>
              </Box>
              
              <GardenBedForm 
                onSuccess={(bedData, isEditing) => handleFormSuccess(bedData, false)} 
              />
              
              {bedsLoading && <CircularProgress size={30} sx={{ display: 'block', margin: '20px auto' }}/>}
              
              {bedsError && !bedsLoading && (
                <Alert severity="warning" sx={{ width: '100%', mb: 2 }}>
                    {bedsError}
                </Alert>
              )}

              {!bedsLoading && !bedsError && (
                gardenBeds.length > 0 ? (
                  <List>
                    {gardenBeds.map((bed) => (
                      <ListItem 
                        key={bed.id} 
                        divider 
                        disablePadding 
                      >
                        <ListItemButton component={RouterLink} to={`/beds/${bed.id}`}>
                          <ListItemText 
                            primary={bed.name}
                            secondary={`Dimensions: ${bed.length || 'N/A'} x ${bed.width || 'N/A'} - Notes: ${bed.notes || 'None'}`}
                          />
                        </ListItemButton>
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            aria-label="edit" 
                            onClick={() => handleEditClick(bed)} 
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            aria-label="delete" 
                            onClick={() => handleDeleteClick(bed.id)} 
                            sx={{ ml: 1 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    You haven't added any garden beds yet.
                  </Typography>
                )
              )}
            </Box>

            <Button 
              variant="contained" 
              color="secondary" 
              onClick={handleLogout} 
              sx={{ mt: 4 }}
            >
              Logout
            </Button>
          </>
        )}
      </Box>

      <GardenBedForm 
        open={isCreateModalOpen || isEditModalOpen} 
        handleClose={handleCloseModal} 
        onSuccess={(bedData) => handleFormSuccess(bedData, isEditModalOpen)}
        bedData={bedToEdit} 
        isEditing={isEditModalOpen} 
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
      >
        <DialogTitle>Delete Garden Bed</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Are you sure you want to delete this garden bed? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default DashboardPage;
