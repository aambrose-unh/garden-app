// Configuration for the backend API URL

// Use environment variable if available (for deployment), otherwise default to local Flask server
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

export const API_URL = `${API_BASE_URL}/api`;

// Example Usage:
// fetch(`${API_URL}/garden-beds`)
// fetch(`${API_URL}/plants`)
