import React, { useState } from 'react';
import dataService from '../services/dataService';
import './SettingsPage.css'; // We'll create this for basic styling

function SettingsPage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [exportMessage, setExportMessage] = useState('');
    const [importMessage, setImportMessage] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setImportMessage(''); // Clear previous import messages
    };

    const handleExport = async () => {
        setExportMessage('');
        setIsExporting(true);
        try {
            const result = await dataService.exportUserData();
            setExportMessage(result.message || 'Export initiated successfully!');
        } catch (error) {
            console.error('Export error:', error);
            setExportMessage(error.message || 'Failed to export data.');
        }
        setIsExporting(false);
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setImportMessage('Please select a JSON file to import.');
            return;
        }

        setImportMessage('');
        setIsImporting(true);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const result = await dataService.importUserData(formData);
            setImportMessage(result.msg || 'Data imported successfully!');
            setSelectedFile(null); // Clear the file input
            // Optionally, reset the file input visually
            const fileInput = document.getElementById('import-file-input');
            if (fileInput) {
                fileInput.value = '';
            }
        } catch (error) {
            console.error('Import error:', error);
            setImportMessage(error.message || 'Failed to import data.');
        }
        setIsImporting(false);
    };

    return (
        <div className="settings-page-container">
            <h2>Data Management</h2>
            
            <section className="data-section">
                <h3>Export Data</h3>
                <p>Download all your garden data (plants, beds, layouts, preferences) as a single JSON file.</p>
                <button onClick={handleExport} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export My Data'}
                </button>
                {exportMessage && <p className={`message ${exportMessage.includes('Failed') ? 'error' : 'success'}`}>{exportMessage}</p>}
            </section>

            <hr />

            <section className="data-section">
                <h3>Import Data</h3>
                <p>Import data from a previously exported JSON file. <strong>Warning:</strong> This will overwrite your existing garden beds, plantings, and garden layout. Plant types will be merged/updated.</p>
                <div>
                    <input 
                        type="file" 
                        id="import-file-input" 
                        accept=".json" 
                        onChange={handleFileChange} 
                        disabled={isImporting} 
                    />
                </div>
                <button onClick={handleImport} disabled={!selectedFile || isImporting} style={{ marginTop: '10px' }}>
                    {isImporting ? 'Importing...' : 'Import Data from File'}
                </button>
                {importMessage && <p className={`message ${importMessage.includes('Failed') ? 'error' : 'success'}`}>{importMessage}</p>}
            </section>
        </div>
    );
}

export default SettingsPage;
