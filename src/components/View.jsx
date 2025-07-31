import React, {useEffect, useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "axios"

const View = () => {
  const navigate = useNavigate();
  const BASE_URL = process.env.REACT_APP_BASE_URL;

  const handleViewAttendance = () => {
    navigate('/lkart/superadmin/view-attendance');
  };

  const handleSendMessage = () => {
    navigate('/lkart/superadmin/dashboard');
  };

  const handleUploadCSV = () => {
    navigate('/lkart/superadmin/upload-csv');
  };

  const hanldeRequestHistory = () => {
    navigate('/lkart/superadmin/request-history');
  };


  const verifyTokenWithAuth = useCallback(async (authToken) => {
 
    try {
      // Simplified request that only checks token validity
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if(response.data?.error?.name === "TokenExpiredError"){
        localStorage.removeItem('superadmintoken');
        return false;
       }
      
      // Only check if the request was successful, indicating a valid token
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('superadmintoken');

      return false;
    }
  }, []); 

  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem("superadmintoken");
      
      if (!token) {
        navigate("/lkart/superadmin/");
        return;
      }
      
      // Verify token validity
      const isTokenValid = await verifyTokenWithAuth(token);
      
      if (!isTokenValid) {
        // Token is invalid/expired - already removed in verifyTokenWithAuth
        navigate("/lkart/superadmin/");
      }
      // If token is valid, stay on current page
    };
    
    checkTokenValidity();
  }, [navigate, verifyTokenWithAuth]);

  return (
    <div className="min-h-screen overflow-y-auto bg-gray-100 p-0 flex items-center">
      <div className="max-w-4xl w-full mx-auto bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-12 text-center">Admin Dashboard</h2>
        
        <div className="flex flex-col space-y-4 items-center">
          <button
            onClick={handleViewAttendance}
            className="w-64 px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border-2 border-blue-500"
          >
            View Attendance
          </button>
          
          <button
            onClick={handleSendMessage}
            className="w-64 px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border-2 border-blue-500"
          >
            Send Message
          </button>

          <button
            onClick={handleUploadCSV}
            className="w-64 px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border-2 border-blue-500"
          >
            Upload CSV
          </button>

          {/* <button
            onClick={hanldeRequestHistory}
            className="w-64 px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border-2 border-blue-500"
          >
            View Request History
          </button> */}
        </div>


      </div>
    </div>
  );
};

export default View;