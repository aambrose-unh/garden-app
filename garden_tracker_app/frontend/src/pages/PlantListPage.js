import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Box, 
  Button, IconButton, ListItemSecondaryAction 
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon 
} from '@mui/icons-material';
import { getAllPlantTypes } from '../services/plantService';
import PlantForm from '../components/PlantForm'; // Import the form component
import PlantImportModal from '../components/PlantImportModal';

function PlantListPage() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [plantToEdit, setPlantToEdit] = useState(null);

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getAllPlantTypes();
        setPlants(data);
      } catch (err) {
        console.error("Failed to fetch plants:", err);
        setError(err.message || 'Failed to load plant data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlants();
  }, []); // Empty dependency array means this runs once on mount

  // Modal Handlers [AC]
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
    setPlantToEdit(null); // Ensure form is empty
  };

  const handleOpenEditModal = (plant) => {
    setPlantToEdit(plant);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setPlantToEdit(null);
  };

  const handleOpenImportModal = () => setIsImportModalOpen(true);
  const handleCloseImportModal = () => setIsImportModalOpen(false);

  const handleFormSuccess = (updatedPlant, wasEditing) => {
    // TODO: Implement proper state update or refetch
    // For now, just log and maybe refetch as a simple approach
    console.log('Form success:', updatedPlant, 'Was editing:', wasEditing);
    // Simplest way to update: refetch all plants
    const fetchPlants = async () => { // Re-define fetchPlants here or make it reusable
      try {
        setLoading(true);
        setError('');
        const data = await getAllPlantTypes();
        setPlants(data);
      } catch (err) {
        console.error("Failed to refetch plants:", err);
        setError(err.message || 'Failed to reload plant data after update.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlants(); 
    handleCloseModal(); // Close the modal after success
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Plant Library
      </Typography>

      {/* Add New Plant Button [AC][CA] */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleOpenCreateModal} // Connect button [AC]
        >
          Add New Plant
        </Button>
        <Button 
          variant="outlined"
          color="primary"
          onClick={handleOpenImportModal}
        >
          Import from CSV
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <List>
          {plants.length > 0 ? (
            plants.map((plant) => (
              <ListItem key={plant.id} divider>
                <ListItemText 
                  primary={plant.common_name}
                  secondary={`Scientific Name: ${plant.scientific_name || 'N/A'} | Family: ${plant.rotation_family || 'N/A'}`}
                />
                {/* Action Buttons [AC][CA] */}
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="view" sx={{ mr: 1 }} /* onClick={() => handleViewDetails(plant.id)} */ >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="edit" sx={{ mr: 1 }} onClick={() => handleOpenEditModal(plant)} /* Connect button [AC] */ >
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" /* onClick={() => handleDeleteClick(plant.id)} */ >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          ) : (
            <Typography variant="body1" sx={{ mt: 2 }}>
              No plants found in the library.
            </Typography>
          )}
        </List>
      )}
      
      {/* Plant Import Modal */}
      <PlantImportModal
        open={isImportModalOpen}
        handleClose={handleCloseImportModal}
        onSuccess={() => {
          // After import, refresh plant list
          const fetchPlants = async () => {
            try {
              setLoading(true);
              setError('');
              const data = await getAllPlantTypes();
              setPlants(data);
            } catch (err) {
              setError(err.message || 'Failed to reload plant data after import.');
            } finally {
              setLoading(false);
            }
          };
          fetchPlants();
          handleCloseImportModal();
        }}
      />

      {/* Plant Form Modal */}
      <PlantForm 
        open={isCreateModalOpen || isEditModalOpen}
        handleClose={handleCloseModal}
        onSuccess={handleFormSuccess}
        plantData={plantToEdit}
        isEditing={isEditModalOpen}
      />
    </Container>
  );
}

export default PlantListPage;
