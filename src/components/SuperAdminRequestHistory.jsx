import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SuperAdminRequestHistory = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const BASE_URL = process.env.REACT_APP_BASE_URL;

  const verifyTokenWithAuth = async (authToken) => {
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data?.error?.name === "TokenExpiredError") {
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

  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem("superadmintoken");

      if (!token) {
        navigate("/lkart/superadmin/");
        return;
      }

      const isTokenValid = await verifyTokenWithAuth(token);

      if (!isTokenValid) {
        navigate("/lkart/superadmin/");
      }
    };

    checkTokenValidity();
    fetchDepartments();
  }, [navigate]);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("superadmintoken");
      const response = await axios.get(
        `${BASE_URL}/lenskart/department`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success && Array.isArray(response.data.departments)) {
        // Filter out "All" from departments
        const filteredDepartments = response.data.departments.filter(dept => dept !== "All");
        setDepartments(filteredDepartments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchHistory = async (page = 1, isNewSearch = false) => {
    if (isNewSearch) {
      setHistoryLoading(true);
    }
    
    try {
      const token = localStorage.getItem("superadmintoken");
      // Manual URL construction to ensure %20 encoding for spaces
      const encodedDepartment = encodeURIComponent(selectedDepartment);
      const response = await axios.get(`${BASE_URL}/floor-admin/department?department=${encodedDepartment}`, {
        headers: {
          Authorization: `Bearer ${token}`
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

  const handleApply = () => {
    if (selectedDepartment) {
      fetchHistory(1, true);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto pt-16 bg-gray-100 p-0">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-lg p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Request History</h2>

        {/* Department Selection */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsDeptOpen(!isDeptOpen)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md text-left flex justify-between items-center"
                >
                  {selectedDepartment || 'Select Department'}
                  <svg
                    className={`h-4 w-4 transform transition-transform ${isDeptOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {isDeptOpen && (
                  <div
                    className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-48 overflow-auto border"
                    style={{ borderColor: '#cacaca' }}
                  >
                    {departments.map((dept, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setIsDeptOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-indigo-100 ${selectedDepartment === dept ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleApply}
            disabled={!selectedDepartment || historyLoading}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed self-end"
          >
            {historyLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Apply'}
          </button>
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
    </div>
  );
};

export default SuperAdminRequestHistory;