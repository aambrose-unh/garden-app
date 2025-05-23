import React from 'react';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  Link
} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GardenBedDetailsPage from './pages/GardenBedDetailsPage';
import PlantListPage from './pages/PlantListPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material'; 
import authService from './services/authService'; 
import logo from './logo.svg';
import SettingsPage from './pages/SettingsPage';
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
              <Box>
                {/* Navigation Links [AC][CA] */}
                <Button color="inherit" component={Link} to="/dashboard">
                  Dashboard
                </Button>
                <Button color="inherit" component={Link} to="/plants">
                  Plant Library
                </Button>
                <Button color="inherit" component={Link} to="/layout">
                  Garden Layout
                </Button>
                <Button color="inherit" component={Link} to="/settings">
                  Settings
                </Button>
                {/* Add Logout button here later */}
              </Box>
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
            path="/layout" 
            element={
              <ProtectedRoute>
                {/* Lazy import to avoid circular dependency issues */}
                {React.createElement(require('./pages/GardenLayoutPage').default)}
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plants" 
            element={
              <ProtectedRoute>
                <PlantListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/beds/:bedId" 
            element={
              <ProtectedRoute>
                <GardenBedDetailsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
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
