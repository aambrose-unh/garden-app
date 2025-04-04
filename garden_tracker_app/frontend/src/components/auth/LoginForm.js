import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { TextField, Button, Box, Typography, Alert, CircularProgress } from '@mui/material'; 

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      console.log('Login successful:', data);
      // authService handles token storage
      navigate('/dashboard'); // Redirect to dashboard on success
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form" 
      onSubmit={handleSubmit}
      sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }} 
      noValidate 
      autoComplete="off"
    >
      <Typography component="h2" variant="h5" align="center">
        Login
      </Typography>
      {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
      <TextField
        margin="normal"
        required
        fullWidth
        id="login-email"
        label="Email Address"
        name="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="login-password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }} 
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Sign In'}
      </Button>
    </Box>
  );
}

export default LoginForm;
