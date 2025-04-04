import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService'; // Adjust path as necessary

/**
 * A component that wraps routes requiring authentication.
 * If the user is authenticated (token exists), it renders the child components.
 * Otherwise, it redirects the user to the login page, saving the intended destination.
 */
function ProtectedRoute({ children }) {
  const token = authService.getToken();
  const location = useLocation();

  if (!token) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them back there after they log in.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children; // Render the child component if authenticated
}

export default ProtectedRoute;
