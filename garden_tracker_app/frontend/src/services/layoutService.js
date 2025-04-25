// layoutService.js
// Handles persistence of yard size and garden bed layout for the authenticated user [SF][DRY][ISA]

import { API_URL } from './apiConfig';

export const getGardenLayout = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${API_URL}/layout`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch layout. Status: ${response.status}. ${errorBody}`);
  }
  const data = await response.json();
  return data.layout ? data.layout.layout : null;
};

export const saveGardenLayout = async (layout) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${API_URL}/layout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ layout }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to save layout. Status: ${response.status}. ${errorBody}`);
  }
  const data = await response.json();
  return data.layout ? data.layout.layout : null;
};
