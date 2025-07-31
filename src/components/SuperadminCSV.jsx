import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const SuperadminCSV = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    isSuccess: false,
    file: null,
  });
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [uploadResults, setUploadResults] = useState(null);

  const verifyToken = async (authToken) => {
    try {
      const response = await fetch(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if(!response.ok) {
        localStorage.removeItem('superadmintoken');
        return false;
      }
      
      const data = await response.json();
      if(data?.error?.name === "TokenExpiredError"){
        localStorage.removeItem('superadmintoken');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('superadmintoken');
      return false;
    }
  };

  React.useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem("superadmintoken");
      
      if (!token) {
        navigate("/lkart/superadmin/");
        return;
      }
      
      const isTokenValid = await verifyToken(token);
      
      if (!isTokenValid) {
        navigate("/lkart/superadmin/");
      }
    };
    
    checkTokenValidity();
  }, [navigate]);

  const showModal = (title, message, results = null) => {
    setModalTitle(title);
    setModalMessage(message);
    setUploadResults(results);
    setShowMessageModal(true);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setUploadState(prev => ({ ...prev, file, isSuccess: true }));
    } else {
      showModal('Error', 'Please select a valid CSV file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadState(prev => ({ ...prev, file: null, isSuccess: false }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  const handleUpload = async () => {
    if (!uploadState.file) {
      showModal('Error', 'Please select a file first');
      return;
    }

    setUploadState(prev => ({ ...prev, isUploading: true }));
    
    const formData = new FormData();
    formData.append("csv", uploadState.file);

    try {
      const token = localStorage.getItem("superadmintoken");
      const response = await fetch(`${BASE_URL}/lenskart/upload-eligible-workers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload CSV');
      }

      const data = await response.json();
      if (data.success) {
        showModal(
          'Success', 
          'CSV processed successfully!', 
          data.results
        );
        handleRemoveFile();
      } else {
        showModal('Error', data.message || 'Failed to process CSV');
      }
    } catch (error) {
      console.error("Error uploading CSV:", error);
      showModal('Error', error instanceof Error ? error.message : 'Failed to upload CSV');
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setUploadState(prev => ({ ...prev, file, isSuccess: true }));
    } else {
      showModal('Error', 'Please select a valid CSV file');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-2 sm:p-6 pt-16">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-4xl">
        <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
          Upload CSV for Signups
        </h2>

        <div className="flex flex-col items-center space-y-6">
          {!uploadState.file ? (
            <>
              <div 
                className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center p-8">
                  <svg
                    className="w-12 h-12 mb-4 text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    CSV file only
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center w-full max-w-md">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Select File
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">File Selected</h3>
                <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                  <div className="flex items-center">
                    <svg
                      className="w-6 h-6 text-gray-700 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-gray-700 truncate max-w-xs">
                      {uploadState.file.name.length > 20
                        ? `${uploadState.file.name.substring(0, 20)}...`
                        : uploadState.file.name}
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 w-full max-w-md">
                <button
                  onClick={handleRemoveFile}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Choose Another File
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploadState.isUploading}
                  className={`px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ${
                    uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploadState.isUploading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : 'Upload'}
                </button>
              </div>
            </>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv"
            className="hidden"
          />
        </div>

        {/* Message Modal */}
        {showMessageModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{modalTitle}</h3>
        <button
          onClick={() => {
            setShowMessageModal(false);
            setUploadResults(null);
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <p className="mb-4">{modalMessage}</p>
      
      {uploadResults?.summary && (
        <div className="mb-4 space-y-2">
          <div className="flex ">
            <span className="font-medium mr-5">Total Entries :</span>
            <span>{uploadResults.summary.totalProcessed || 0}</span>
          </div>
          <div className="flex ">
            <span className="font-medium mr-5"> Successfully Added :</span>
            <span>{uploadResults.summary.newEntries || 0}</span>
          </div>
          <div className="flex ">
            <span className="font-medium mr-5">Invalid Phone Numbers :</span>
            <span>{uploadResults.summary.errorCount || 0}</span>
          </div>
          <div className="flex ">
            <span className="font-medium mr-5">Existing Users Updated :</span>
            <span>{uploadResults.summary.updatedEntries || 0}</span>
          </div>
          <div className="flex ">
            <span className="font-medium mr-5">Duplicate Entries :</span>
            <span>{uploadResults.summary.duplicatePhoneCount || 0}</span>
          </div>

        </div>
      )}
      
      <div className="flex justify-end">
        <button
          onClick={() => {
            setShowMessageModal(false);
            setUploadResults(null);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          OK
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
};

export default SuperadminCSV;