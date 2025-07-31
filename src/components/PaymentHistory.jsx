import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router';
import axios from 'axios';
import { AuthContext } from '../context/auth-context';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { token, setToken } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [summary, setSummary] = useState({ totalAmount: 0, totalHours: 0, averageHourlyRate: 0 });
  const [accountDetails, setAccountDetails] = useState({ accountNumber: '' });
  const loadingRef = useRef(null);
  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const observerRef = useRef(null);

  // Function to get current month-year in "YYYY-M" format
  const getCurrentMonthYear = () => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  };

  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentMonthYear());

  const verifyTokenWithAuth = useCallback(async (authToken) => {
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if(response.data?.error?.name === "TokenExpiredError"){
        localStorage.removeItem('auth_token');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      return false;
    }
  }, [setToken, BASE_URL]);
  
  useEffect(() => {
    const checkTokenValidity = async () => {
      if (!token) {
        navigate("/lkart");
        return;
      }
      
      const isTokenValid = await verifyTokenWithAuth(token);
      if (!isTokenValid) {
        navigate("/lkart");
      }
    };
    
    checkTokenValidity();
  }, [token, navigate, verifyTokenWithAuth]);

  const formatAccountNumber = (accountNo) => {
    if (!accountNo) return '';
    const first = accountNo.charAt(0);
    const last4 = accountNo.slice(-4);
    return `${first}${'X'.repeat(accountNo.length - 5)}${last4}`;
  };

  const fetchAccountDetails = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/account-details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.accountNumber) {
        setAccountDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching account details:', error);
    }
  };

  const fetchPayments = useCallback(async (page = 1, reset = false) => {
    if (loading) return;

    try {
      setLoading(true);
      let params = { page };

      if (selectedPeriod !== 'all') {
        const [year, month] = selectedPeriod.split('-');
        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');
        params = { ...params, startDate, endDate };
      }

      const response = await axios.get(`${BASE_URL}/lenskart/payment-history`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      const { data } = response.data;
      setPayments(prev => reset ? data.payments : [...prev, ...data.payments]);
      setSummary(data.summary);
      setHasNextPage(data.pagination.hasNextPage);
      setCurrentPage(data.pagination.currentPage);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, token, BASE_URL, loading]);

  useEffect(() => {
    fetchAccountDetails();
  }, []);

  useEffect(() => {
    setPayments([]);
    fetchPayments(1, true);
  }, [selectedPeriod]);

  useEffect(() => {
    if (observerRef.current && loadingRef.current) {
      observerRef.current.unobserve(loadingRef.current);
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !loading) {
          fetchPayments(currentPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current && hasNextPage) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, loading, currentPage, fetchPayments]);

  const generateMonthYearOptions = () => {
    const options = [{ value: 'all', label: 'All Periods' }];
    const startDate = new Date(2025, 0);
    const currentDate = new Date();
    
    for (let date = new Date(startDate); date <= currentDate; date.setMonth(date.getMonth() + 1)) {
      options.push({
        value: `${date.getFullYear()}-${date.getMonth() + 1}`,
        label: `${date.toLocaleString('default', { month: 'short' })}, ${date.getFullYear()}`
      });
    }
    return options;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'success': return 'text-green-800';
      case 'pending': return 'text-yellow-800';
      case 'failed': return 'text-red-800';
      default: return 'text-gray-800';
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return { date: '-', time: '-' };
    
    // Extract time directly from the string (HH:MM:SS)
    const timePart = dateTimeStr.split('T')[1]?.split('.')[0] || '';
    const [hours, minutes] = timePart.split(':');
    
    // Convert to 12-hour format
    let hour12 = parseInt(hours, 10);
    const ampm = hour12 >= 12 ? 'pm' : 'am';
    hour12 = hour12 % 12;
    hour12 = hour12 ? hour12 : 12; // Convert 0 to 12
    const formattedTime = `${hour12}:${minutes} ${ampm}`;
  
    // Format date (25 Jul 2025)
    const date = new Date(dateTimeStr);
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    return {
      date: formattedDate,
      time: formattedTime
    };
  };

  const renderEmptyState = () => (
    <div className="text-center py-8">
      <p className="text-gray-400">
        {selectedPeriod === 'all' 
          ? "You haven't made any payments yet"
          : "No payments found for the selected period"}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen overflow-y-auto pt-16 bg-gray-100 p-0">
      <div className="max-w-4xl mx-auto bg-white p-4 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Payment History</h2>

        <div className="bg-pink-50 p-4 rounded-xl mb-6">
          <p className="text-gray-700">Total Amount Paid</p>
          <p className="text-2xl font-bold ">₹ {summary.totalAmount.toFixed(2)}</p>
          <p className="text-sm text-gray-600">
            Account Number: {formatAccountNumber(accountDetails.accountNumber)}
          </p>
        </div>

        <div className="flex justify-end space-x-4 mb-6">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {generateMonthYearOptions().map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {!loading && payments.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {payments.map(payment => {
                const entry = payment.entries && payment.entries.length > 0 ? payment.entries[0] : null;
                const entryData = entry ? formatDateTime(entry.entryTime) : formatDateTime(null);
                const exitData = entry ? formatDateTime(entry.exitTime) : formatDateTime(null);
                
                return (
                  <div key={payment._id} className="bg-gray-50 rounded-lg p-4 shadow">
                    <div className="flex justify-between items-center pb-2">
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Transaction ID/Reference Number</p>
                        <p className="font-medium">{payment.transaction ? payment.transaction : "-"}</p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mt-2">
                        ₹{payment.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-2 text-sm text-gray-600">
                      <div className="space-y-1">
                        <p className="text-gray-600 text-sm">Entry Date & Time</p>
                        <div>
                          <p className="font-semibold text-gray-900">{entryData.date}</p>
                          <p className="font-semibold text-gray-900">{entryData.time}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-600 text-sm">Exit Date & Time</p>
                        <div>
                          <p className="font-semibold text-gray-900">{exitData.date}</p>
                          <p className="font-semibold text-gray-900">{exitData.time}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm mb-3"></p>
                        <p className={`py-1 rounded-full font-medium capitalize text-md ${getStatusColor(payment.status)}`}>
                          {payment.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {hasNextPage && <div ref={loadingRef} style={{ height: '20px' }} />}
            </>
          )}
          {loading && <div className="text-center py-4">Loading...</div>}
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;