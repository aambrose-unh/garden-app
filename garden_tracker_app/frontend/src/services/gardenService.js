import authService from './authService'; // To get the token

const API_URL = 'http://127.0.0.1:5000/api'; // TODO: Move to a shared config? [DRY]

const getGardenBeds = async () => {
  const token = authService.getToken(); // Get token using authService logic
  if (!token) {
    throw new Error('No authentication token found.'); // Or handle redirect
  }

  const response = await fetch(`${API_URL}/garden-beds`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json', // Optional for GET, but good practice
    },
  });

  if (!response.ok) {
    // Handle common errors
    if (response.status === 401) {
      authService.logout(); // Token likely invalid/expired
      // Maybe throw specific error to trigger redirect in component
      throw new Error('Unauthorized. Please log in again.');
    }
    const errorData = await response.json().catch(() => ({})); // Try to parse error message
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json(); // Parse and return the JSON data (list of beds)
};

const createGardenBed = async (bedData) => {
  const token = authService.getToken();
  if (!token) {
    throw new Error('No token found');
  }

  try {
    const response = await fetch(`${API_URL}/garden-beds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bedData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create garden bed');
    }
    
    const data = await response.json();
    return data.garden_bed;
  } catch (error) {
    console.error('Error creating garden bed:', error);
    throw error;
  }
};

const gardenService = {
  getGardenBeds,
  createGardenBed,
  // Add other garden-related API functions here (update, delete)
};

export default gardenService;
