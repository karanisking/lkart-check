import React, { useState, useEffect, useCallback } from 'react';
import axios from "axios";
import { useNavigate } from 'react-router';
import { Loader2, Calendar, Users, Clock, ChevronDown } from 'lucide-react';

const SupervisorRequirement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSlotDropdownOpen, setIsSlotDropdownOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    slot: '',
    numberOfWorkers: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  // History state
  const [historyData, setHistoryData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Time slots state
  const [timeSlots, setTimeSlots] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  
  const BASE_URL = process.env.REACT_APP_BASE_URL;
  
  const verifyTokenWithAuth = useCallback(async (authToken) => {
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      localStorage.setItem("department", response.data.user.department);
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('supervisor_token');
      return false;
    }
  }, [BASE_URL]);
  
  const fetchTimeSlots = async (department) => {
    if (!department) {
      setTimeSlots([]);
      return;
    }

    try {
      setFetchingSlots(true);
      const response = await fetch(`${BASE_URL}/lenskart/department-dropdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          department: department
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      if (data.success && data.timeSlots) {
        // Format slots for display as "start_time - end_time"
        const formattedSlots = data.timeSlots.map(slot => 
          `${slot.start_time} - ${slot.end_time}`
        );
        setTimeSlots(formattedSlots);
      } else {
        setTimeSlots([]);
        console.error('No time slots available for this department');
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      setTimeSlots([]);
    } finally {
      setFetchingSlots(false);
    }
  };

  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem("supervisor_token");
      if (!token) {
        navigate("/lkart/supervisor-login");
        return;
      }
      
      const isTokenValid = await verifyTokenWithAuth(token);
      if (!isTokenValid) {
        navigate("/lkart/supervisor-login");
        return;
      }
      
      // Fetch time slots after token verification
      const department = localStorage.getItem("department");
      if (department) {
        fetchTimeSlots(department);
      }
    };
    
    checkTokenValidity();
  }, [navigate, verifyTokenWithAuth]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.date) {
      errors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.date = 'Cannot select previous dates';
      }
    }
    
    if (!formData.slot) {
      errors.slot = 'Slot is required';
    }
    
    if (!formData.numberOfWorkers) {
      errors.numberOfWorkers = 'Number of workers is required';
    } else if (parseInt(formData.numberOfWorkers) <= 0) {
      errors.numberOfWorkers = 'Number of workers must be positive';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSlotSelect = (slot) => {
    handleInputChange('slot', slot);
    setIsSlotDropdownOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const requestData = {
        date: formData.date,
        slot: formData.slot,
        TotalWorkers: parseInt(formData.numberOfWorkers)
      };
      
      await axios.post(`${BASE_URL}/floor-admin/add`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("supervisor_token")}`
        }
      });
      
      setShowSuccessModal(true);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        slot: '',
        numberOfWorkers: ''
      });
      
      // Refresh history
      fetchHistory();
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting requirement:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to send requirement');
      setShowErrorModal(true);
      
      setTimeout(() => {
        setShowErrorModal(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (page = 1, isNewSearch = false) => {
    if (isNewSearch) {
      setHistoryLoading(true);
    }
    
    try {
      const response = await axios.get(`${BASE_URL}/floor-admin`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("supervisor_token")}`
        }
      });
      
      const historyArray = response.data.data?.history || [];
      
      setHistoryData(historyArray);
      setHasMore(false); // No pagination needed
      
    } catch (error) {
      console.error('Error fetching history:', error);
      setHasMore(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !historyLoading && currentPage < totalPages) {
      fetchHistory(currentPage + 1);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.slot-dropdown')) {
        setIsSlotDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-y-auto pt-16 bg-gray-100 p-0">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Worker Requirement</h2>
        
        {/* Requirement Form */}
        <div className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.date && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>
                )}
              </div>
              
              {/* Custom Slot Dropdown */}
              <div className="slot-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Slot *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSlotDropdownOpen(!isSlotDropdownOpen)}
                    className={`w-full h-[42px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between ${
                      formErrors.slot ? 'border-red-500' : 'border-gray-300'
                    } ${!formData.slot ? 'text-gray-500' : 'text-gray-900'}`}
                  >
                    <span>{formData.slot || 'Select Slot'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isSlotDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isSlotDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {timeSlots.length > 0 ? (
                        timeSlots.map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSlotSelect(slot)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            {slot}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500">
                          {fetchingSlots ? 'Loading slots...' : 'No slots available'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {formErrors.slot && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.slot}</p>
                )}
              </div>
              
              {/* Number of Workers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Users className="h-4 w-4 inline mr-1" />
                  Number of Workers *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.numberOfWorkers}
                  onChange={(e) => handleInputChange('numberOfWorkers', e.target.value)}
                  placeholder="Enter number"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.numberOfWorkers ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.numberOfWorkers && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.numberOfWorkers}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-start mt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Requirement
              </button>
            </div>
          </form>
        </div>
        
        {/* History Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Request History</h3>
          
          <div className="w-full max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-white shadow-md">
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Requested On</th>
                  <th className="p-3 text-center">Requested Date</th>
                  <th className="p-3 text-center">Requested Slot</th>
                  <th className="p-3 text-center">Total Workers</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan="4" className="text-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : historyData.length > 0 ? (
                  historyData.map((record, index) => (
                    <tr 
                      key={record._id || index} 
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="p-3 text-left">
                        {formatDateTime(record.created_at)}
                      </td>
                      <td className="p-3 text-center">
                        {formatDate(record.date)}
                      </td>
                      <td className="p-3 text-center">
                        {record.slot || '-'}
                      </td>
                      <td className="p-3 text-center">
                        {record.TotalWorkers || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center p-4 text-gray-500">
                      No history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center max-w-md w-full mx-4">
            <div className="text-green-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Requirement has been successfully sent!
            </h3>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center max-w-md w-full mx-4">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Failed to send requirement
            </h3>
            <p className="text-sm text-gray-600">
              {errorMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorRequirement;