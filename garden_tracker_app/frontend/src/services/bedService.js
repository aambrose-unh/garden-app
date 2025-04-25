// Service functions for interacting with the garden bed API
import { API_URL } from './apiConfig'; // Assuming API base URL configuration

/**
 * Fetches the details for a specific garden bed.
 * @param {number} bedId The ID of the garden bed.
 * @returns {Promise<object>} A promise that resolves to the garden bed details object.
 */
export const getGardenBedDetails = async (bedId) => {
  // Retrieve the token from local storage or context
  const token = localStorage.getItem('token'); 
  if (!token) {
    // Handle case where user is not logged in or token is missing
    console.error('Authentication token not found.');
    // Redirect to login or throw an error
    throw new Error('User not authenticated'); 
  }

  const response = await fetch(`${API_URL}/garden-beds/${bedId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Add JWT token for authorization
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Response (getGardenBedDetails):", errorBody);
    // Handle specific errors like 404 (Not Found) or 403 (Forbidden)
    if (response.status === 404) {
      throw new Error(`Garden bed with ID ${bedId} not found or access denied.`);
    } else {
      throw new Error(`Failed to fetch details for garden bed ${bedId}. Status: ${response.status}`);
    }
  }

  const data = await response.json();
  return data;
};

/**
 * Fetches all garden beds for the currently authenticated user.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of garden bed objects.
 */
export const getGardenBeds = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Authentication token not found.');
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${API_URL}/garden-beds`, { // Assuming '/api/garden-beds' is the endpoint for all beds
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Response (getGardenBeds):", errorBody);
    throw new Error(`Failed to fetch garden beds. Status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};


/**
 * Updates the position (x/y) of a garden bed.
 * @param {number} bedId The ID of the garden bed.
 * @param {object} position {x, y} coordinates.
 * @returns {Promise<object>} The updated bed.
 */
// Update garden bed position and orientation


// --- Planting History Functions ---

/**
 * Fetches planting history for a specific garden bed.
 * @param {number} bedId The ID of the garden bed.
 * @param {boolean} [activeOnly=false] Optional. If true, fetches only currently active plantings.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of planting objects.
 */
export const getPlantingsForBed = async (bedId, activeOnly = false) => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Authentication token not found.');
    throw new Error('User not authenticated');
  }

  let url = `${API_URL}/garden-beds/${bedId}/plantings`;
  if (activeOnly) {
    url += '?active=true'; // Add query parameter for active filtering [SF]
  }

  console.debug(`Fetching plantings from: ${url}`); // For debugging

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API Error Response (getPlantingsForBed ${bedId}):`, errorBody);
    // Handle specific errors like 404 or return a generic error
    if (response.status === 404) {
      // Bed not found likely already handled by page loading bed details
      // Could mean no plantings found, which is okay - return empty array
      return []; 
    } else {
      throw new Error(`Failed to fetch plantings for bed ${bedId}. Status: ${response.status}`);
    }
  }
  // If response is OK but empty (e.g., 200 with empty list), return empty array
  const data = await response.json();
  return data || []; // Ensure we always return an array
};

/**
 * Updates an existing planting record.
 * @param {number} plantingId The ID of the planting to update.
 * @param {object} plantingData The updated planting data.
 * @returns {Promise<object>} A promise that resolves to the updated planting object.
 */
export const updatePlanting = async (plantingId, plantingData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Authentication token not found.');
      throw new Error('User not authenticated');
    }
  
    const response = await fetch(`${API_URL}/plantings/${plantingId}`, { // Use the dedicated planting update route
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(plantingData) // Send the updated data [IV]
    });
  
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error Response (updatePlanting ${plantingId}):`, errorBody);
      // Consider more specific error handling based on status codes (400, 404, etc.)
      throw new Error(`Failed to update planting ${plantingId}. Status: ${response.status}`);
    }
  
    const data = await response.json();
    return data; // Return the updated planting details from the API
  };
  
  /**
   * Deletes a planting record.
   * @param {number} plantingId The ID of the planting to delete.
   * @returns {Promise<object>} A promise that resolves to the success message from the API.
   */
  export const deletePlanting = async (plantingId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Authentication token not found.');
      throw new Error('User not authenticated');
    }
  
    const response = await fetch(`${API_URL}/plantings/${plantingId}`, { // Use the dedicated planting delete route
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json', // Optional for DELETE, but good practice
        'Authorization': `Bearer ${token}`
      },
    });
  
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error Response (deletePlanting ${plantingId}):`, errorBody);
      throw new Error(`Failed to delete planting ${plantingId}. Status: ${response.status}`);
    }
  
    // DELETE often returns 200 OK with a success message or 204 No Content
    if (response.status === 204) {
      return { message: 'Planting deleted successfully' }; // Provide a consistent success object
    } 
    
    const data = await response.json(); // Assume 200 OK returns a message
    return data;
  };
