import React, { useState } from 'react';
import { Modal, Box, Typography, Button, Alert, CircularProgress, Link } from '@mui/material';
import PropTypes from 'prop-types';
import { API_URL } from '../services/apiConfig';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #1976d2',
  boxShadow: 24,
  p: 4,
};

function PlantImportModal({ open, handleClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/plants/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Import failed.');
      } else {
        setResult(data);
        if (onSuccess) onSuccess(data);
      }
    } catch (err) {
      setError('An error occurred during import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} aria-labelledby="import-modal-title">
      <Box sx={style}>
        <Typography id="import-modal-title" variant="h6" component="h2" gutterBottom>
          Import Plants from CSV
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Upload a CSV file to add multiple plants.{' '}
          <Link href={process.env.PUBLIC_URL + '/example_plant_import.csv'} download underline="hover">
            Download Example CSV
          </Link>
        </Typography>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ marginBottom: 8 }}
          disabled={loading}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={loading}
          sx={{ mt: 1, mb: 1 }}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : 'Upload'}
        </Button>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        {result && (
          <Alert severity="success" sx={{ mt: 1 }}>
            Added: {result.added} | Skipped: {result.skipped}
            {result.errors && result.errors.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="error">Errors:</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
              </Box>
            )}
          </Alert>
        )}
      </Box>
    </Modal>
  );
}

PlantImportModal.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default PlantImportModal;
