// plantService.js
// Service functions for interacting with the plant type API endpoints

import { getToken } from './authService'; // Assuming token might be needed later for protected plant routes

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Fetches all plant types from the backend.
 * @returns {Promise<Array>} A promise that resolves to an array of plant type objects.
 * @throws {Error} If the fetch operation fails or the response status is not ok.
 */
export const getAllPlantTypes = async () => {
    try {
        const response = await fetch(`${API_URL}/plants`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // No Authorization needed for public plant list view currently [SFT]
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to fetch plant types and parse error response.' }));
            console.error('Get all plant types error data:', errorData);
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching all plant types:', error);
        // Rethrow the error so the calling component can handle it [REH]
        throw error; 
    }
};

// Function to create a new plant type via the API [SF]
export const createPlantType = async (plantData) => {
  const response = await fetch(`${API_URL}/plants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add authorization header if needed
      // 'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(plantData),
  });

  if (!response.ok) {
    const errorBody = await response.text(); 
    console.error("API Error Response:", errorBody);
    let errorMessage = `Failed to create plant. Status: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorBody);
      errorMessage = errorJson.message || errorMessage;
    } catch (e) {
      // If response body is not JSON or doesn't have message
      errorMessage += ` - ${errorBody}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
};

// Add more functions here later for getting details, updating, deleting plants
// e.g., getPlantTypeDetails(id), updatePlantType(plantData), deletePlantType(id), etc.
