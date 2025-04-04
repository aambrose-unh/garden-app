import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { Container, Box, Typography, Link } from '@mui/material'; // Import MUI layout components

function LoginPage() {
  return (
    <Container component="main" maxWidth="xs"> {/* Limit width for the form */} 
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Optional: Add an icon or logo here */} 
        <Typography component="h1" variant="h4" gutterBottom>
           Garden Tracker 
        </Typography>
        <LoginForm />
        <Box sx={{ mt: 2 }}> {/* Add margin top */} 
          <Link component={RouterLink} to="/register" variant="body2">
            {"Don't have an account? Sign Up"}
          </Link>
        </Box>
      </Box>
    </Container>
  );
}

export default LoginPage;
