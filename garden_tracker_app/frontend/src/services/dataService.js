import { API_URL } from './apiConfig';
import authService from './authService';

const DATA_API_URL = `${API_URL}/data`; // Base for data endpoints: http://127.0.0.1:5000/api/data

const exportUserData = async () => {
    const token = authService.getToken();
    if (!token) {
        console.error('Export User Data: No token found');
        throw new Error('No authentication token found. Please log in.');
    }

    try {
        const response = await fetch(`${DATA_API_URL}/export`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // If response is not JSON, use status text or a generic message
                errorData = { message: response.statusText || 'Failed to export data. Server returned an error.' }; 
            }
            console.error('Export User Data Error:', errorData);
            throw new Error(errorData.msg || errorData.message || `HTTP error ${response.status}`);
        }

        // Get filename from Content-Disposition header
        const disposition = response.headers.get('content-disposition');
        let filename = 'garden_data_export.json'; // Default filename
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) { 
              filename = matches[1].replace(/['"]/g, '');
            }
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        return { success: true, message: 'Data export initiated successfully.' };

    } catch (error) {
        console.error('Export User Data System Error:', error);
        // Ensure the error thrown is an Error object with a message property
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred during data export.');
    }
};

const importUserData = async (formData) => {
    const token = authService.getToken();
    if (!token) {
        console.error('Import User Data: No token found');
        throw new Error('No authentication token found. Please log in.');
    }

    try {
        const response = await fetch(`${DATA_API_URL}/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                // 'Content-Type': 'multipart/form-data' is automatically set by the browser for FormData
            },
            body: formData,
        });

        const data = await response.json(); // Expect JSON response for success or error
        
        if (!response.ok) {
            console.error('Import User Data Error:', data);
            throw new Error(data.msg || data.message || `HTTP error ${response.status}`);
        }
        return data; // Should contain { msg: "Data imported successfully" }
    } catch (error) {
        console.error('Import User Data System Error:', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred during data import.');
    }
};

const dataService = {
    exportUserData,
    importUserData,
};

export default dataService;
