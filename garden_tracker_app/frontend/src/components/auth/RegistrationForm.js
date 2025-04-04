import React, { useState } from 'react';
import authService from '../../services/authService';
import { TextField, Button, Box, Typography, Alert, CircularProgress, Link as MuiLink } from '@mui/material'; 
import { Link as RouterLink } from 'react-router-dom'; 

function RegistrationForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }

    setLoading(true);

    try {
      const data = await authService.register(email, password);
      setMessage(data.message || 'Registration successful! You can now log in.');
      console.log("Registration successful:", data);
      // Clear form on success
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      console.error("Registration error:", err);
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
        Register
      </Typography>
      {/* Display success or error messages */}
      {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ width: '100%' }}>{message}</Alert>}

      {/* Conditionally render form fields only if no success message */}
      {!message && (
        <>
          <TextField
            margin="normal"
            required
            fullWidth
            id="register-email"
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
            label="Password (min 6 chars)"
            type="password"
            id="register-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            error={!!error && error.includes('Password')} 
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            error={!!error && error.includes('match')} 
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Register'}
          </Button>
        </>
      )}

      {/* Always show link to login page */}
      <Box sx={{ textAlign: 'center', mt: message ? 2 : 0 }}>
        <MuiLink component={RouterLink} to="/login" variant="body2">
            {message ? "Back to Login" : "Already have an account? Sign In"}
        </MuiLink>
      </Box>

    </Box>
  );
}

export default RegistrationForm;
