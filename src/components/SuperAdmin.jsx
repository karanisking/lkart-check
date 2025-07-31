import React, { useState, useEffect, useCallback } from 'react';
import axios from "axios"
import { useNavigate } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { useAuth } from "../context/auth-context"
import prayLogo from "../assets/pray.png"
import ErrorModal from './ErrorModal';


const BASE_URL = process.env.REACT_APP_BASE_URL;

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

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
      const token = localStorage.getItem('superadmintoken');
      
      if (token) {
        const isTokenValid = await verifyTokenWithAuth(token);
        
        if (isTokenValid) {
          navigate('/lkart/superadmin/view');
        } else {
          // Token is invalid/expired - already removed in verifyTokenWithAuth
          // User stays on current page and needs to re-login
        }
      }
    };
    
    checkTokenValidity();
  }, [navigate, verifyTokenWithAuth]);

  const handleSendOtp = async () => {
    if (phone.length !== 10) return;
     
    const phoneWithCountryCode = `91${phone}`;
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/lenskart-admin/login-super`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
     
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      setShowOtp(true);
    } catch (err) {
      setError("You are not eligible. Please contact us");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/lenskart-admin/verify-super-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }

      if (data.success) {
        // Set cookie and localStorage
        document.cookie = `superAdminToken=${data.token}; path=/`;
        localStorage.setItem('superadmintoken', data.token);
        //console.log(data.token);
        
        // Navigate to dashboard
        navigate('/lkart/superadmin/view');
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen overflow-y-auto pt-16 flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center flex flex-col items-center justify-center">
            <img
              src={prayLogo}
              alt="Pray Logo"
              width={60}
              height={60}
              className="object-contain"
            />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Welcome Admin
            </h2>
          </div>
          <div className="mt-8 space-y-6">
            {!showOtp ? (
              <div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter phone number"
                />
      
                <button
                  onClick={handleSendOtp}
                  disabled={phone.length !== 10 || loading}
                  className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Send OTP
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter OTP"
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 4 || loading}
                  className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Verify OTP
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ErrorModal
        message={error}
        isOpen={showError}
        setIsOpen={setShowError}
      />
    </>
  );
};

export default SuperAdminLogin;