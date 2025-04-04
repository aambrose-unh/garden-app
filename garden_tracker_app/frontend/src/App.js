import React from 'react';
import {
  Routes,
  Route,
  Navigate,
  useLocation 
} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { AppBar, Toolbar, Typography, Box } from '@mui/material'; 
import authService from './services/authService'; 
import logo from './logo.svg';
import './App.css';

function App() {
  const location = useLocation(); 
  const isLoggedIn = authService.getCurrentUser() !== null; 

  const showAppBar = !['/login', '/register'].includes(location.pathname);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}> 
      {showAppBar && (
        <AppBar position="static"> 
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Garden Tracker
            </Typography>
            {isLoggedIn && (
              <Typography variant="body2" sx={{ mr: 2 }}>
              </Typography>
            )}
          </Toolbar>
        </AppBar>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}> 
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} /> 
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
