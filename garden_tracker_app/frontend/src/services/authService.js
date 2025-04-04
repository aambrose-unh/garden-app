// Base URL for the backend API
// In development, the React app runs on port 3000 and the Flask backend on 5000.
// We need to proxy requests or specify the full backend URL.
// Using the full URL for simplicity here. Adjust if using a proxy.
const API_URL = 'http://127.0.0.1:5000/api/auth'; // Use 127.0.0.1 instead of localhost

// Function to handle user registration
const register = async (email, password) => {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to register');
    }
    return data; // Contains success message and user details
};

// Function to handle user login
const login = async (email, password) => {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
    }
    
    // If login is successful, store the token and user info
    if (data.access_token) {
        console.log('Storing new token:', data.access_token.substring(0, 20) + '...');
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Debug: Show the full token being stored
        console.log('Full token stored:', data.access_token);
        console.log('Token length:', data.access_token.length);
    }
    
    // Verify token was stored correctly
    const storedToken = localStorage.getItem('token');
    console.log('Token stored in localStorage:', storedToken ? storedToken.substring(0, 20) + '...' : 'No token');
    
    return data; // Contains message, token, and user info
};

// Function to handle logout
const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// Function to get the current stored token
const getToken = () => {
    const token = localStorage.getItem('token');
    console.log('Retrieving token from localStorage');
    if (!token) {
        console.log('No token found in localStorage');
        return null;
    }
    console.log('Token retrieved:', token.substring(0, 20) + '...');
    console.log('Token length:', token.length);
    return token;
};

// Function to get the current stored user info
const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

const authService = {
    register,
    login,
    logout,
    getToken,
    getCurrentUser,
};

export default authService;
