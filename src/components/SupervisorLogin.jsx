import React, { useState, useEffect, useCallback } from 'react';
import axios from "axios"
import { useNavigate } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import prayLogo from "../assets/pray.png";
import ErrorModal from './ErrorModal';

const SupervisorLogin = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const BASE_URL = process.env.REACT_APP_BASE_URL;

  const verifyTokenWithAuth = useCallback(async (authToken) => {
 
    try {
      // Simplified request that only checks token validity
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if(response.data?.error?.name === "TokenExpiredError"){
        localStorage.removeItem('supervisor_token');
        return false;
       }
      
      // Only check if the request was successful, indicating a valid token
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('supervisor_token');

      return false;
    }
  }, []); 

  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem('supervisor_token');
      
      if (token) {
        const isTokenValid = await verifyTokenWithAuth(token);
        
        if (isTokenValid) {
          navigate('/lkart/supervisor/dashboard');
        } else {
          // Token is invalid/expired - it's already removed in verifyTokenWithAuth
          // User stays on current page and needs to re-login
        }
      }
    };
    
    checkTokenValidity();
  }, [navigate, verifyTokenWithAuth]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    
    if (!validateEmail(credentials.email)) {
      setError("Please enter a Valid Email Address.");
      setShowError(true);
      return;
    }
    
    if (!credentials.password) {
      setError("Please Provide Password");
      setShowError(true);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${BASE_URL}/floor-admin/login`, {
        username: credentials.email,
        password: credentials.password
      });

      console.log(response);
      
      // Assuming the backend returns a token in the response.data
      localStorage.setItem('supervisor_token', response.data.token);
      localStorage.setItem('department', response.data.user.department);
      
      setTimeout(() => {
        navigate('/lkart/supervisor/dashboard');
      }, 500);
      
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Login failed. Please try again.'
      );
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
              Supervisor Login
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your credentials to access the supervisor dashboard
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={credentials.email}
                  onChange={handleChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter the Email Id"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={credentials.password}
                  onChange={handleChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter Your Password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <span className="flex items-center">
                    <CalendarClock className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Logging in...
                  </span>
                ) : (
                  'Login'
                )}
               
              </button>
            </div>
          </form>
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

export default SupervisorLogin;