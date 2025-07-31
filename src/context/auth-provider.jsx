import React, { useState, useEffect } from 'react';
import { AuthContext } from './auth-context';
import axios from 'axios';


const BASE_URL = process.env.REACT_APP_BASE_URL;


const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [showAadhaarModal, setShowAadhaarModal] = useState(false); 
  const [bankModal, setBankModal] = useState(false); 
   
  const verifyTokenWithAuth = async (authToken) => {
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      if(response.data?.error?.name === "TokenExpiredError"){
        localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
       }

      //console.log(response.data);
  
      setUpUser({
        name: response.data.user.name,
        id: response.data.user.id,
        phone: response.data.user.phone,
        isAuthenticated: true,
        aadharVerified: response.data.user.isAadhaarVerified,
        department: response.data.user.department,
        selectedSlot: response.data.user.shifttime,
        profilePhotoUrl: response.data.user.profilePhotoUrl,
        selectedWeekendSlot : response.data.user.weekend_shift,
        dob : response.data.user.dob,
        currentStatus: response.data.user.status,
        isAdmin: response.data.user.userType === "Admins"
      });
    
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      throw error;
    }
  };


  const setUpToken = (token) => {
   
    
    localStorage.setItem('auth_token', token);
    setToken(token);
  }

  const setUpUser = (user) => { 
    setUser(user);
  } 

  //console.log(user);

  const verifytoken = async () => {
    if (!token) {
      throw new Error('No token available');
    }
    await verifyTokenWithAuth(token);
  };

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');

        
        if (storedToken) {
          setToken(storedToken);
          await verifyTokenWithAuth(storedToken);
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
  
    verifyAuth();
  }, []);

  //console.log("Token is",token);
  const InitiateLogin = async (phone, isWhatsapp) => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/lenskart/initiate`, 
        { phone: "91" + phone, isWhatsapp },
        { headers: { 'Content-Type': 'application/json' }}
      );

      //console.log(response.data.otp);
     
      return response.data.userId;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  //console.log("Token is",token);
  //console.log("User is",user);
  
 
  const VerifyOtp = async (userId, otp) => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/lenskart/verify-login-otp`, { userId, otp });
     // console.log(response.data);
      setUpToken(response.data.token);
      setUpUser({
        name: response.data.user.name,
        id: response.data.user.id,
        phone: response.data.user.phone,
        isAuthenticated: true,
        aadharVerified: response.data.user.isAadhaarVerified,
        profilePhotoUrl: response.data.user.profilePhotoUrl,
        dob : response.data.user.dob,
        department: response.data.user.department,
        selectedSlot: response.data.user.shifttime,
        selectedWeekendSlot: response.data.user.weekend_shift,
        currentStatus: response.data.user.status,
        isAdmin: response.data.user.userType === "Admins"
      });
    
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/lenskart/factory`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
     
      //console.log(response);
      //console.log(token);
      return response.data;
    } catch (error) {
      console.error('Fetching job details failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const fetchAgreementUrl = async ( name) => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/agreement/generate`,
        {  name },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data.data.publicUrl;
    } catch (error) {
      console.error('Fetching agreement URL failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const generateAttendanceQR = (userId, currentDay, status) => {
    return `https://jobs.factorykaam.com/lkart/admin/attendance?userId=${userId}&currentDay=${currentDay}&status=${status}`;
  };
  
  const adminLogin = async (phone) => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/lenskart-admin/signup`,
        { phone: "+91" + phone },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data.requestId;
    } catch (error) {
      console.error('Admin login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const verifyAdminOtp = async (phone, otp) => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/lenskart-admin/login`, { phone: "+91" + phone, otp });
      setUpToken(response.data.token);
      setUpUser({
        name: "admin",
        id: "random",
        phone: "not required",
        isAuthenticated: true,
        aadharVerified: false,
        department: "any",
        selectedSlot: 'none',
        currentStatus: "none",
        isAdmin: true
      });
    } catch (error) {
      console.error('Admin OTP verification failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }
  //console.log(token);
  const initiateAadhaarVerification = async (aadhaarNo) => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/lenskart/initiate-aadhaar-verification`,
        { aadhaarNo },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data.requestId;
    } catch (error) {
      console.error('Aadhaar verification initiation failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const verifyAadhaar = async (requestId, otp, aadhaarNo) => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/lenskart/verify-aadhaar-otp`,
        { requestId, otp, aadhaarNo },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data.isAadhaarVerified;
    } catch (error) {
      console.error('Aadhaar verification failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const applyForJob = async (shifttime, weekend_shift,  jobId) => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/lenskart/apply`,
        { weekend_shift, shifttime, job_id: jobId },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      console.loe.log(response);
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          selectedSlot: response.data.shifttime || prev.selectedSlot,
          selectedWeekendSlot: response.data.weekend_shift || prev.selectedWeekendSlot,
          currentStatus: response.data.status || prev.currentStatus
        };
      });
    
      return response.data;
    } catch (error) {
      console.error('Job application failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const fetchQRLink = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/lenskart/qr`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );

      const qrLink = generateAttendanceQR(
        response.data.data.userId,
        response.data.data.currentDay,
        response.data.data.status
      );

       //console.log(response.data);
     console.log(qrLink);

     //console.log(qrLink);
      return qrLink;  
    } catch (error) {
      console.error('QR link fetch failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const logout = async () => {
    try {
      setLoading(true);
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadLink = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/lenskart/download-link`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.link;
    } catch (error) {
      console.error('Download link fetch failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const MarkAttendance = async (userId, currentDay, status) => {
    try {
      setLoading(true);
    
      const response = await axios.post(
        `${BASE_URL}/lenskart-admin/mark-attendance`,
        { userId, date: currentDay, status },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data.data;
    } catch (error) {
      // Handle different types of errors
      if (error.response) {
        // Server responded with error (4xx, 5xx)
        console.error('API Error:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        throw new Error(error.response.data.message || 'Server error occurred');
      } else if (error.request) {
       
        throw new Error('Network connection failed. Please check your internet connection.');
      } else {
        // Something else happened while setting up the request
        console.error('Request Error:', error.message);
        throw new Error('Failed to send request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    InitiateLogin,
    logout,
    VerifyOtp,
    fetchJobDetails,
    fetchAgreementUrl,
    initiateAadhaarVerification,
    verifyAadhaar,
    applyForJob,
    fetchQRLink,
    token,
    initialized,
    showAadhaarModal, 
    bankModal,
    setShowAadhaarModal, 
    setBankModal,
    setUser,
    verifytoken,
    MarkAttendance,
    adminLogin,
    verifyAdminOtp,
    fetchDownloadLink
  };

  if (!initialized) {
    return <div>Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;