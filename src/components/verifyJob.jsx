import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const VerifyJob = () => {
   const {  token   } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Extract all required parameters from URL
  const params = {
    phone: searchParams.get("phone"),
    date: searchParams.get("date"),
    shift: searchParams.get("shift"),
    department: searchParams.get("department")
  };

  // Validate required parameters
  useEffect(() => {
    const missingParams = Object.entries(params)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingParams.length > 0) {
      setError(`Missing required parameters: ${missingParams.join(', ')}`);
    }
  }, []);

  const handleResponse = async (response) => {
    if (error) return;
    
    setLoading(true);
    const isPresent = response === "yes";

    try {
      const res = await fetch(`${BASE_URL}/lenskart-admin/mark-worker`, {
        method: 'POST',
       headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: params.phone,
          date: params.date,
          shift: params.shift,
          department: params.department,
          isPresent
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit response');
      }

      setSelectedOption(response);
      setMessage(isPresent 
        ? "You have confirmed your presence for the job. Please be present at the scheduled time and location."
        : "You have declined this job opportunity. Thank you for your response."
      );
      
    } catch (error) {
      setMessage("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <p>{error}</p>
          </div>
          <p className="mt-4 text-gray-600">
            Please check the URL and ensure all required parameters are included.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6 text-center">
        <h2 className="text-2xl font-semibold mb-8">Are you interested in this job?</h2>
        
        <div className="flex flex-col items-center space-y-4">
          {!selectedOption ? (
            <div className="space-x-4">
              <button
                onClick={() => handleResponse("yes")}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Yes'}
              </button>
              <button
                onClick={() => handleResponse("no")}
                disabled={loading}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                No
              </button>
            </div>
          ) : null}

          {message && (
            <div className={`mt-6 w-full px-4 py-3 rounded relative ${
              selectedOption === "yes" 
                ? "bg-green-100 border border-green-400 text-green-700"
                : "bg-yellow-100 border border-yellow-400 text-yellow-700"
            }`}>
              <p>{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyJob;