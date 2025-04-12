// Service functions for interacting with the planting history API
import { API_URL } from './apiConfig'; // Assuming you have a config file for the base API URL

/**
 * Fetches the planting history for a specific garden bed.
 * @param {number} bedId The ID of the garden bed.
 * @returns {Promise<Array>} A promise that resolves to an array of planting records.
 */
export const getPlantingsForBed = async (bedId) => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Authentication token not found.');
    // Optionally redirect to login or handle appropriately
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${API_URL}/garden-beds/${bedId}/plantings`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });

  if (!response.ok) {
    const errorBody = await response.text(); 
    console.error("API Error Response (getPlantingsForBed):", errorBody);
    throw new Error(`Failed to fetch planting history for bed ${bedId}. Status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Adds a new planting record to a specific garden bed.
 * @param {number} bedId The ID of the garden bed.
 * @param {object} plantingData The data for the new planting record.
 * @returns {Promise<object>} A promise that resolves to the newly created planting record.
 */
export const addPlantingToBed = async (bedId, plantingData) => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Authentication token not found.');
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${API_URL}/garden-beds/${bedId}/plantings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(plantingData),
  });

  if (!response.ok) {
    const errorBody = await response.text(); 
    console.error("API Error Response (addPlantingToBed):", errorBody);
    let errorMessage = `Failed to add planting to bed ${bedId}. Status: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorBody);
      errorMessage = errorJson.message || errorMessage;
    } catch (e) {
       errorMessage += ` - ${errorBody}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
};

// TODO: Add functions for updating and deleting planting records later
