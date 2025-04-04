import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import RegistrationForm from '../components/auth/RegistrationForm';
import { Container, Box, Typography, Link as MuiLink } from '@mui/material'; // Import MUI layout

function RegisterPage() {
  return (
    <Container component="main" maxWidth="xs"> {/* Limit width */} 
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          Garden Tracker
        </Typography>
        <RegistrationForm />
        {/* Link moved inside RegistrationForm, so no need for it here anymore */}
      </Box>
    </Container>
  );
}

export default RegisterPage;
