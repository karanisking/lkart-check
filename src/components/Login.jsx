import React, { useState , useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/auth-context"
import prayLogo from "../assets/pray.png"
import ErrorModal from './ErrorModal';

const Login = ({ isAdmin }) => {
  const { InitiateLogin, VerifyOtp, loading, verifyAdminOtp, adminLogin } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
 

  useEffect(() => {
    const token = localStorage.getItem('auth_token'); // Adjust the key based on how you store the token
    
  //console.log(token);
    if (token) {
      // If token exists, redirect to dashboard
      navigate(isAdmin ? '/lkart/admin/attendance' : '/lkart/dashboard');
    }
  }, [navigate, isAdmin]);


  const handleSendOtp = async () => {
    try {
      if (phone.length === 10) {
        if (isAdmin) {
          await adminLogin(phone);
        } else {
          const userId = await InitiateLogin(phone, acceptedTerms);
          setUserId(userId);
        }
        setShowOtp(true);
      }
    } catch (err) {
      setError("You are not eligible. Please contact us");
      setShowError(true);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (otp.length === 4) {
        if (isAdmin) {
          await verifyAdminOtp(phone, otp);
          const params = new URLSearchParams(window.location.search);
          const returnUrl = params.get('returnUrl');
          navigate(returnUrl || '/lkart/admin/attendance');
        } else {
          await VerifyOtp(userId, otp);
          navigate(isAdmin ? '/lkart/admin' : '/lkart/dashboard');
        }
      }
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      setShowError(true);
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
              Welcome Back to Lenskart
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
                <div className="mb-3 mt-6">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1 mr-2"
                    />
                    <span className="text-sm text-gray-600">
                      I allow factorykaam to send me WhatsApp messages and updates.
                    </span>
                  </label>
                </div>
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

export default Login; 