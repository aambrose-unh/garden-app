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

const updateGardenBed = async (bedId, bedData) => {
  const token = authService.getToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_URL}/garden-beds/${bedId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(bedData),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Update Garden Bed Error Response:', data);
    throw new Error(data.message || 'Failed to update garden bed');
  }
  console.log('Update Garden Bed Success Response:', data);
  return data; // Return the updated garden bed data
};

const deleteGardenBed = async (bedId) => {
  const token = authService.getToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  // Note: Using /api/garden-beds/ based on the backend route definition for DELETE
  const response = await fetch(`${API_URL}/garden-beds/${bedId}`, { // Corrected path
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})); // Try to parse error
    console.error('Delete Garden Bed Error Response:', errorData);
    throw new Error(errorData.message || 'Failed to delete garden bed');
  }

  // DELETE requests often return 204 No Content on success, no body to parse
  if (response.status === 204) {
    return { message: 'Garden bed deleted successfully' }; // Return success object
  } else {
      const data = await response.json(); // Or handle other potential success responses
      console.log('Delete Garden Bed Success Response (unexpected body):', data);
      return data; 
  }
};

const gardenService = {
  getGardenBeds,
  createGardenBed,
  updateGardenBed,
  deleteGardenBed,
};

export default gardenService;
