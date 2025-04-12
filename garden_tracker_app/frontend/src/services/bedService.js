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
