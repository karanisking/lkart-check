import React, { useState, useEffect, useContext } from 'react';
import { Check, Edit2, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext , useAuth } from '../context/auth-context';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const AccountDetails = () => {
  const { token } = useContext(AuthContext);
  const { setShowAadhaarModal } = useAuth();
  const [paymentDetails, setPaymentDetails] = useState({
    name: '',
    accountNo: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    branchAddress: '',
    city: '',
    district: '',
    state: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
   const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [ifscDetails, setIfscDetails] = useState(null);
  const [hasExistingDetails, setHasExistingDetails] = useState(false);

  useEffect(() => {
    fetchAccountDetails();
  }, [token]);

  const fetchAccountDetails = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${BASE_URL}/lenskart/account-details`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

    
      //console.log(response.data);

      if (response.data && response.data.accountNumber) {
        setPaymentDetails({
          name: response.data.name,
          accountNo: response.data.accountNumber,
          ifscCode: response.data.ifscCode,
          bankName: response.data.bankName,
          branchName: response.data.branchName,
          branchAddress: response.data.branchAddress,
          city: response.data.city,
          district: response.data.district,
          state: response.data.state
        });
        setIfscDetails({
          BANK: response.data.bankName,
          BRANCH: response.data.branchName,
          ADDRESS: response.data.branchAddress,
          CITY: response.data.city,
          DISTRICT: response.data.district,
          STATE: response.data.state
        });
        setShowAadhaarModal(true);
        setHasExistingDetails(true);
        setIsSubmitted(true);
      }
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  // const goToPaymentHistoryPage=()=>{
  //    navigate("/lkart/dashboard/payment-history");
  //  }


  const validateName = (name) => /^[a-zA-Z\s]*$/.test(name) && name.trim().length > 0;
  const validateIFSC = (ifsc) => /^[a-zA-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
  const validateAccountNo = (accountNo) => accountNo.length >= 9 && accountNo.length <= 18;


  const fetchIfscDetails = async (ifsc) => {
    try {
      setIsLoading(true);
      setIfscDetails(null); // Temporarily hide details during loading
      const response = await axios.get(`https://ifsc.razorpay.com/${ifsc}`);
      setIfscDetails(response.data);
      setPaymentDetails(prev => ({
        ...prev,
        bankName: response.data.BANK,
        branchName: response.data.BRANCH,
        branchAddress: response.data.ADDRESS,
        city: response.data.CITY,
        district: response.data.DISTRICT,
        state: response.data.STATE
      }));
    } catch (error) {
      console.error('IFSC fetch failed:', error);
      setErrors(prev => ({
        ...prev,
        ifscCode: 'Invalid IFSC code. Please check and try again.'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  
    if (name === 'ifscCode') {
      if (value.length === 11) {
        fetchIfscDetails(value);
      } else if (value.length < 11) {
        setIfscDetails(null);
        setPaymentDetails(prev => ({
          ...prev,
          bankName: '',
          branchName: '',
          branchAddress: '',
          city: '',
          district: '',
          state: ''
        }));
      }
    }
  };

  const submitDetails = async () => {
    try {
      setIsLoading(true);
      const method = hasExistingDetails ? 'put' : 'post';
      const response = await axios[method](
        `${BASE_URL}/lenskart/account-details`,
        {
          name: paymentDetails.name,
          accountNumber: paymentDetails.accountNo,
          ifscCode: paymentDetails.ifscCode,
          branchName: paymentDetails.branchName,
          bankName: paymentDetails.bankName,
          branchAddress: paymentDetails.branchAddress,
          city: paymentDetails.city,
          district: paymentDetails.district,
          state: paymentDetails.state
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setShowAadhaarModal(true);
      setHasExistingDetails(true);
      setIsSubmitted(true);
      window.location.reload();
     // console.log("Account details are",response.data);
      return response.data;
    } catch (error) {
      console.error('Account details submission failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!validateName(paymentDetails.name)) {
      newErrors.name = 'Name should only contain Alphabets';
    }
    if (!validateAccountNo(paymentDetails.accountNo)) {
      newErrors.accountNo = 'Account number must be between 9 and 18 digits';
    }
    if (!validateIFSC(paymentDetails.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC code format. Should be like BANK0123456';
    }
    if (!ifscDetails) {
      newErrors.ifscCode = 'Please enter a valid IFSC code';
    }

    if (Object.keys(newErrors).length === 0) {
      try {
        await submitDetails();
        setErrors({});
      } catch (error) {
        setErrors({
          submit: 'Failed to submit details. Please try again.'
        });
      }
    } else {
      setErrors(newErrors);
    }
  };

  const handleEdit = () => {
    setIsSubmitted(false);
  };

  

  return (
    <div className="overflow-y-auto">
      <h1 className="text-xl font-bold mb-6">
        {hasExistingDetails ? 'Your Bank Account Details' : 'Please provide your bank account details'}
      </h1>

      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
            <input
              type="text"
              name="name"
              value={paymentDetails.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
          </div>
          <div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              name="accountNo"
              value={paymentDetails.accountNo}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border ${errors.accountNo ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              required
            />
            {errors.accountNo && <p className="text-sm text-red-600">{errors.accountNo}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
            <input
              type="text"
              name="ifscCode"
              value={paymentDetails.ifscCode}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border ${errors.ifscCode ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              required
            />
            {errors.ifscCode && <p className="text-sm text-red-600">{errors.ifscCode}</p>}
          </div>

          {ifscDetails && (
            <div >
              <p className="text-sm  text-gray-600">Bank Name : {paymentDetails.bankName}</p>
              <p className="text-sm text-gray-600"> Branch Name : {paymentDetails.branchName}</p>
              <p className="text-sm text-gray-600">Branch Address : {paymentDetails.branchAddress}</p>
            </div>
          )}

          {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-md flex items-center justify-center disabled:bg-indigo-400"
          >
            <Check className="h-5 w-5 mr-2" />
            {isLoading ? 'Submitting...' : hasExistingDetails ? 'Update Details' : 'Submit Details'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Account Holder Name</p>
            <p className="text-base font-medium text-gray-900">{paymentDetails.name}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">Account Number</p>
            <p className="text-base font-medium text-gray-900">{paymentDetails.accountNo}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">IFSC Code</p>
            <p className="text-base font-medium text-gray-900">{paymentDetails.ifscCode}</p>
          </div>

          <div>
            <p className="text-sm  text-gray-600">Bank Name : {paymentDetails.bankName}</p>
            <p className="text-sm text-gray-600">Branch Name : {paymentDetails.branchName}</p>
            <p className="text-sm text-gray-600">Branch Address : {paymentDetails.branchAddress}</p>
          
          </div>

          <button
            onClick={handleEdit}
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-md flex items-center justify-center disabled:bg-indigo-400"
          >
            <Edit2 className="h-5 w-5 mr-2" />
            {isLoading ? 'Processing...' : 'Modify Details'}
          </button>

           {/* <button
            onClick={() => goToPaymentHistoryPage()}
            className="w-full py-3 bg-white text-gray-700 border border-gray-300 rounded-md flex items-center justify-center"
          >
            <History className="h-5 w-5 mr-2" /> View Payment History
          </button>  */}
        </div>
      )}

    </div>
  );
};

export default AccountDetails;