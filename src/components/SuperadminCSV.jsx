import React, { useState, useRef, useEffect } from 'react';
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
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [manualEntries, setManualEntries] = useState([
    { name: '', phone: '', department: '', source: '' }
  ]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(null); // Track which row's dropdown is open

  const verifyToken = async (authToken) => {
    try {
      const response = await fetch(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) {
        localStorage.removeItem('superadmintoken');
        return false;
      }

      const data = await response.json();
      if (data?.error?.name === "TokenExpiredError") {
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

  const fetchDepartments = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/lenskart/department`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.departments)) {
        const filteredDepartments = data.departments.filter(dept => dept !== "All");
      setDepartments(filteredDepartments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
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
    fetchDepartments();
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
    console.log("The file is", uploadState.file);
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

  // Manual entry functions
  const handleManualEntryChange = (index, field, value) => {
    const updatedEntries = [...manualEntries];
    updatedEntries[index][field] = value;
    setManualEntries(updatedEntries);
    if (field === 'department') {
      setDeptDropdownOpen(null); // Close dropdown when department is selected
    }
  };

  const addNewRow = () => {
    setManualEntries([...manualEntries, { name: '', phone: '', department: '', source: '' }]);
  };

  const removeRow = (index) => {
    if (manualEntries.length > 1) {
      const updatedEntries = manualEntries.filter((_, i) => i !== index);
      setManualEntries(updatedEntries);
    }
  };

  const toggleDeptDropdown = (index) => {
    setDeptDropdownOpen(deptDropdownOpen === index ? null : index);
  };

  const submitManualEntries = async () => {
    // Validate entries
    for (const entry of manualEntries) {
      if (!entry.name || !entry.phone || !entry.department) {
        showModal('Error', 'Please fill all required fields (Name, Phone, Department)');
        return;
      }

      if (!/^\d{10}$/.test(entry.phone)) {
        showModal('Error', 'Please enter valid 10-digit phone numbers');
        return;
      }
    }

    // Create CSV content
    const headers = ['name', 'phone', 'department', 'source'];
    const csvContent = [
      headers.join(','),
      ...manualEntries.map(entry =>
        headers.map(header =>
          `"${entry[header] || ''}"`
        ).join(',')
      )
    ].join('\n');

    console.log('Generated CSV:', csvContent);

    // Create CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const csvFile = new File([blob], 'manual_entries.csv', { type: 'text/csv' });

    // const downloadLink = document.createElement('a');
    // downloadLink.href = URL.createObjectURL(blob);
    // downloadLink.download = 'manual_entries.csv';
    // document.body.appendChild(downloadLink);
    // downloadLink.click();
    // document.body.removeChild(downloadLink);

    // Upload the file
    setUploadState(prev => ({ ...prev, isUploading: true }));
    console.log("The csv file is", csvFile);
    const formData = new FormData();
    formData.append("csv", csvFile);

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
          'Manual entries processed successfully!',
          data.results
        );
        setManualEntries([{ name: '', phone: '', department: '', source: '' }]);
        setShowManualEntryModal(false);
      } else {
        showModal('Error', data.message || 'Failed to process entries');
      }
    } catch (error) {
      console.error("Error uploading manual entries:", error);
      showModal('Error', error instanceof Error ? error.message : 'Failed to upload entries');
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-2 sm:p-6 pt-16">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 text-center mb-4">
            Upload CSV for Signups
          </h2>
          <div className="flex justify-end">
            <button
              onClick={() => setShowManualEntryModal(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Add Manually
            </button>
          </div>
        </div>


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
                  className={`px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ${uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''
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

        {/* Manual Entry Modal */}
        {showManualEntryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Add Workers Manually</h3>
                <button
                  onClick={() => {
                    setShowManualEntryModal(false);
                    setManualEntries([{ name: '', phone: '', department: '', source: '' }]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '23%' }}>Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '22%' }}>Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '30%' }}>Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>Source (Optional)</th>
                      <th style={{ width: '5%' }}></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {manualEntries.map((entry, index) => (
                      <tr key={index}>
                        <td className="px-4 py-4 whitespace-nowrap" style={{ width: '23%' }}>
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) => handleManualEntryChange(index, 'name', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Name"
                            required
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap" style={{ width: '22%' }}>
                          <input
                            type="text"
                            value={entry.phone}
                            onChange={(e) => handleManualEntryChange(index, 'phone', e.target.value.replace(/\D/g, ''))}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Phone (10 digits)"
                            maxLength="10"
                            required
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap relative" style={{ width: '30%' }}>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => toggleDeptDropdown(index)}
                              className="border border-gray-300 rounded px-2 py-1 w-full text-left flex justify-between items-center"
                            >
                              <span className="truncate">
                                {entry.department || 'Select Department'}
                              </span>
                              <svg
                                className="h-5 w-5 text-gray-400"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            {deptDropdownOpen === index && (
                              <div
                                className="absolute z-[60] mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-60 overflow-auto border border-gray-200"
                                style={{
                                  position: 'fixed', // Changed from absolute to fixed
                                  width: 'auto', // Let it size to content
                                  minWidth: '200px', // Minimum width
                                  maxHeight: '180px', // Maximum height before scrolling
                                  transform: 'translateY(5px)' // Position below the button
                                }}
                              >
                                {departments.map((dept, deptIndex) => (
                                  <button
                                    key={deptIndex}
                                    onClick={() => handleManualEntryChange(index, 'department', dept)}
                                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-indigo-100 ${entry.department === dept ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                      }`}
                                  >
                                    {dept}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap" style={{ width: '20%' }}>
                          <input
                            type="text"
                            value={entry.source}
                            onChange={(e) => handleManualEntryChange(index, 'source', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Source (optional)"
                          />
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center" style={{ width: '5%' }}>
                          {manualEntries.length > 1 && (
                            <button
                              onClick={() => removeRow(index)}
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
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between mt-4">
                <button
                  onClick={addNewRow}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Add Row
                </button>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      setShowManualEntryModal(false);
                      setManualEntries([{ name: '', phone: '', department: '', source: '' }]);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitManualEntries}
                    disabled={uploadState.isUploading}
                    className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    {uploadState.isUploading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Modal - Fixed z-index issue */}
        {showMessageModal && (
          <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${showManualEntryModal ? 'z-[60]' : 'z-50'}`}>
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
