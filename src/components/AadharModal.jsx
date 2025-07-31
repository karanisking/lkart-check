import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { X, Edit, FileText, CheckCircle, Loader, Calendar } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { AuthContext } from '../context/auth-context';

const AadharModal = ({ timeSlot, onClose, jobId, slot, isAadhaarVerified, setUser }) => {
  const { user, fetchAgreementUrl, applyForJob, initiateAadhaarVerification, verifyAadhaar, verifytoken, loading } = useAuth();
  const { showAadhaarModal, setShowAadhaarModal, setBankModal } = useAuth();
  const { token } = useContext(AuthContext);

  // Existing states
  const [aadhar, setAadhar] = useState('');
  const [url, setUrl] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [requestId, setRequestId] = useState('');
  const [currentStep, setCurrentStep] = useState('details');
  const [isVerifyingAadhar, setIsVerifyingAadhar] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);

  // DigiLocker specific states
  const [digiLockerLink, setDigiLockerLink] = useState('');
  const [accessRequestId, setAccessRequestId] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isWaitingForConsent, setIsWaitingForConsent] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isDownloadingAadhar, setIsDownloadingAadhar] = useState(false);
  const [aadharData, setAadharData] = useState(null);
  const [digiWindow, setDigiWindow] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasProcessedDigiLocker, setHasProcessedDigiLocker] = useState(false);
  const processingRef = useRef(false);

  // DigiLocker API Base URL
 
  const BASE_URL = process.env.REACT_APP_BASE_URL;
  // Memoized function to prevent multiple calls
  const handleFetchDigiLockerDocuments = useCallback(async (requestId) => {
    if (!requestId || processingRef.current) return;
    processingRef.current = true;

    try {
      const response = await fetch(`${BASE_URL}/lenskart/digilocker/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consent: 'Y',
          accessRequestId: requestId,
          clientData: {
            caseId: `case_${user?.id || 'user123'}_${Date.now()}`
          },
        })
      });

      const data = await response.json();
      console.log('DigiLocker Documents Response:', data);

      if (data.statusCode === 101 && data.result) {
        setDocuments(data.result);
        const aadharDoc = data.result.find(doc => doc.doctype === 'ADHAR');
        if (aadharDoc) {
          console.log(aadharDoc);
          // Immediately process the Aadhaar document
          const downloadSuccess = await handleDownloadAadharDocument(aadharDoc.uri, requestId);
          if (downloadSuccess) {
            setShowSuccessModal(true);
            return true;
          }
        } else {
          alert('Aadhaar document not found. Please try manual verification.');
          setCurrentStep('details');
        }
      } else {
        console.error('Failed to fetch documents:', data);
        alert('Failed to fetch DigiLocker documents. Please try manual verification.');
        setCurrentStep('details');
      }
    } catch (error) {
      console.error('Error fetching DigiLocker documents:', error);
      alert('Error fetching DigiLocker documents. Please try manual verification.');
      setCurrentStep('details');
    } finally {
      processingRef.current = false;
      setHasProcessedDigiLocker(false);
    }
    return false;
  }, [user?.id]);

  // Download Aadhaar document - fixed to ensure it's called properly
  const handleDownloadAadharDocument = useCallback(async (documentUri, authState) => {


    setIsDownloadingAadhar(true);

    try {
      const response = await fetch(`${BASE_URL}/lenskart/digilocker/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({
          consent: 'Y',
          accessRequestId: authState,
          files: [{ uri: documentUri, pdfB64: false, parsed: true }],
          clientData: {
            userId: user?.id || 'user123',
            timestamp: new Date().toISOString()
          },
          caseId: `case_${user?.id || 'user123'}_${Date.now()}`,
          userId: user.id,
        })
      });

      const data = await response.json();
      console.log('DigiLocker Download Response:', data);

      if (data.statusCode === 101 && data.result && data.result[0]?.parsedFile) {
        setAadharData(data.result[0]);

        return true;
      } else {
        console.error('Failed to download Aadhaar document:', data);
        alert('Failed to download Aadhaar document. Please try manual verification.');
        setCurrentStep('details');
        return false;
      }
    } catch (error) {
      console.error('Error downloading Aadhaar document:', error);
      alert('Error downloading Aadhaar document. Please try manual verification.');
      setCurrentStep('details');
      return false;
    } finally {
      setIsDownloadingAadhar(false);
      processingRef.current = false;
    }
  }, [user?.id]);

  // Listen for messages from DigiLocker redirect page
  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data.type === 'DIGILOCKER_SUCCESS' && !hasProcessedDigiLocker) {
        console.log('DigiLocker success received:', event.data);
        setHasProcessedDigiLocker(true);

        if (digiWindow && !digiWindow.closed) {
          digiWindow.close();
          setDigiWindow(null);
        }

        setIsWaitingForConsent(false);

        // Process documents immediately
        const success = await handleFetchDigiLockerDocuments(accessRequestId);
        if (success) {
          setShowSuccessModal(true);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [digiWindow, accessRequestId, hasProcessedDigiLocker, handleFetchDigiLockerDocuments]);

  // Clean up DigiLocker window on unmount
  useEffect(() => {
    return () => {
      if (digiWindow && !digiWindow.closed) {
        digiWindow.close();
      }
    };
  }, [digiWindow]);

  // Generate DigiLocker link with mobile-friendly dimensions
  const handleDigiLockerLinkGeneration = async () => {
    setIsGeneratingLink(true);
    try {
      const oAuthState = `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const redirectUrl = `${window.location.origin}/aadhar-processing`;

      const response = await fetch(`${BASE_URL}/lenskart/digilocker/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oAuthState: oAuthState,
          redirectUrl: redirectUrl,
          consent: 'Y',
          pinlessAuth: true,
          aadhaarFlowRequired: true,
          customDocList: 'ADHAR',
          clientData: {
            caseId: `case_${user?.id || 'user123'}_${Date.now()}`
          },
        })
      });

      const data = await response.json();
      console.log('DigiLocker Link Generation Response:', data);

      if (data.statusCode === 101 && data.result?.link) {
        setDigiLockerLink(data.result.link);
        setAccessRequestId(data.requestId);
        setCurrentStep('digilockerConsent');

        // Mobile-friendly window dimensions
        const isMobile = window.innerWidth <= 768;
        const width = isMobile ? Math.min(window.screen.width - 20, 500) : Math.min(900, window.screen.width - 100);
        const height = isMobile ? Math.min(window.screen.height - 100, 700) : Math.min(700, window.screen.height - 100);
        const left = isMobile ? 10 : (window.screen.width - width) / 2;
        const top = isMobile ? 10 : (window.screen.height - height) / 2;

        const features = `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`;
        const newWindow = window.open(data.result.link, 'digilocker_auth', features);

        if (!newWindow) {
          alert('Please allow popups for this site to use DigiLocker verification');
          setCurrentStep('aadhar');
          return;
        }

        setDigiWindow(newWindow);
        setIsWaitingForConsent(true);

        const checkPopupClosed = setInterval(() => {
          if (newWindow.closed) {
            clearInterval(checkPopupClosed);
            if (isWaitingForConsent) {
              console.log('Popup closed manually');
              setIsWaitingForConsent(false);
              setCurrentStep('aadhar');
            }
          }
        }, 1000);
      } else {
        console.error('Failed to generate DigiLocker link:', data);
        alert('Failed to generate DigiLocker link. Please try manual verification.');
        setCurrentStep('aadhar');
      }
    } catch (error) {
      console.error('Error generating DigiLocker link:', error);
      alert('Error generating DigiLocker link. Please try manual verification.');
      setCurrentStep('aadhar');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleVerifyAadhar = async () => {
    if (aadhar.length === 12) {
      setIsVerifyingAadhar(true);
      try {
        const response = await initiateAadhaarVerification(aadhar);
        setRequestId(response);
        setCurrentStep('otp');
      } catch (e) {
        console.log("error while fetching url", e);
      } finally {
        setIsVerifyingAadhar(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length === 6) {
      setIsVerifyingOtp(true);
      try {
        await verifyAadhaar(requestId, otp, aadhar);
        const tempurl = await fetchAgreementUrl(user?.name || '');
        setUrl(tempurl);
        setCurrentStep("agreement");
      } catch (e) {
        console.log("error while verifying otp", e);
      } finally {
        setIsVerifyingOtp(false);
      }
    }
  };

  const handleSubmitDetails = async () => {
    if (!dob || !address) return;

    setIsSubmittingDetails(true);
    try {
      
      const response = await fetch(`${BASE_URL}/lenskart/details/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          dob: dob,
          address: address
        })
      });

      const tempurl = await fetchAgreementUrl(user?.name || '');
      setUrl(tempurl);
      setCurrentStep('agreement');

    } catch (e) {
      console.log("error while submitting details", e);
    } finally {
      setIsSubmittingDetails(false);
    }
  };

  const validateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 18;
  };

  const validateAddress = (address) => {
    return address.trim().length >= 5;
  };

  const handleValidateAndSubmit = () => {
    const newErrors = {};

    if (!validateAge(dob)) {
      newErrors.dob = 'You must be at least 18 years old';
    }

    if (!validateAddress(address)) {
      newErrors.address = 'Address must be at least 5 characters long';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    handleSubmitDetails();
  };

  const closeModal = () => {
    setShowAadhaarModal(false);
  };

  const LoadingButton = ({ isLoading, onClick, disabled, children }) => (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 text-base flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader className="h-5 w-5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 pt-16 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-xl p-6 relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        {isAadhaarVerified ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-center mb-2">
              Aadhar Already Verified
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              <b>Your Timeslot chosen:</b> <br />
              <b>{user?.selectedSlot}</b> <br />

            </p>
            <LoadingButton onClick={onClose} isLoading={loading}>
              Apply Now
            </LoadingButton>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4">
              {currentStep === 'aadhar' && 'Aadhaar Verification Options'}
              {currentStep === 'digilockerConsent' && 'DigiLocker Verification in Progress'}
              {currentStep === 'details' && 'Please add your details'}
              {currentStep === 'agreement' && 'Factorykaam X Lenskart Gig Work Agreement'}
              {currentStep === 'otp' && 'Enter OTP'}
            </h3>

            {/* Success Modal for Aadhaar Verification */}
            {showSuccessModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-md w-full">
                  <div className="flex items-center justify-center mb-4">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-center mb-2">
                    Your Aadhaar is Verified Successfully
                  </h3>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Please proceed to the next step.
                  </p>
                  <LoadingButton
                    onClick={async () => {
                      const tempurl = await fetchAgreementUrl(user?.name || '');
                      setUrl(tempurl);
                      setShowSuccessModal(false);
                      setCurrentStep('agreement');
                    }}
                    isLoading={false}
                  >
                    Proceed
                  </LoadingButton>
                </div>
              </div>
            )}

            {/* Step: Choose verification method */}
            {currentStep === 'aadhar' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4 flex items-center justify-between">
                  <div>
                    <b>Your Timeslot chosen:</b> <br />
                    <b>{user?.selectedSlot}</b> <br />
                   
                  </div>
                  <button
                    onClick={closeModal}
                    className="ml-2 py-1 px-2 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                  >
                    Modify
                  </button>
                </p>

                <LoadingButton
                  onClick={handleDigiLockerLinkGeneration}
                  isLoading={isGeneratingLink}
                >
                  Verify you aadhar details
                </LoadingButton>

                <button
                  onClick={() => setCurrentStep('details')}
                  className="w-full py-2 px-4 bg-gray-500 text-white text-base font-medium rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                >
                  Don't have aadhar linked mobile number?
                </button>
              </div>
            )}

            {/* Step: DigiLocker processing */}

            {currentStep === 'digilockerConsent' && (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center mb-6">
                  <Loader className="h-16 w-16 text-indigo-500 animate-spin" />
                </div>
                <p className="text-base font-medium text-gray-800 mb-2">
                  Processing Your Aadhaar Verification
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  We're fetching your Aadhaar details from DigiLocker. This may take a moment...
                </p>

                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      setCurrentStep('details');
                      setIsWaitingForConsent(false);
                      if (digiWindow && !digiWindow.closed) {
                        digiWindow.close();
                      }
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Continue with Manual Verification
                  </button>
                </div>
              </div>
            )}

            {/* Manual Details Entry Step */}
            {currentStep === 'details' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4 flex items-center justify-between">
                  <div>
                    <b>Your Timeslot chosen:</b> <br />
                    <b>{user?.selectedSlot}</b> <br />
                   
                  </div>

                  <button
                    onClick={closeModal}
                    className="ml-2 py-1 px-2 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                  >
                    Modify
                  </button>
                </p>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => {
                        setDob(e.target.value);
                        setErrors(prev => ({ ...prev, dob: '' }));
                      }}
                      className={`w-full px-4 py-2 border ${errors?.dob ? 'border-red-500' : 'border-gray-300'
                        } rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-base`}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {errors?.dob && (
                      <p className="mt-1 text-sm text-red-600">{errors.dob}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setErrors(prev => ({ ...prev, address: '' }));
                    }}
                    rows={4}
                    className={`w-full px-4 py-2 border ${errors?.address ? 'border-red-500' : 'border-gray-300'
                      } rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-base`}
                    placeholder="Enter your complete address"
                  />
                  {errors?.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                  )}
                </div>
                <LoadingButton
                  onClick={handleValidateAndSubmit}
                  isLoading={isSubmittingDetails}
                  disabled={!dob || !address}
                >
                  Submit
                </LoadingButton>
              </div>
            )}

            {/* Agreement Step */}
            {currentStep === 'agreement' && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="h-96 mb-4 overflow-hidden rounded-md">
                    <iframe
                      src={url}
                      className="w-full h-full"
                      title="Agreement PDF"
                    />
                  </div>
                </div>
                <LoadingButton
                  onClick={() => {
                    setCurrentStep("lastStep");
                  }}
                  isLoading={loading}
                >
                  <FileText className="h-5 w-5" />
                  <span>I Accept The Agreement</span>
                </LoadingButton>
              </div>
            )}

            {/* OTP Verification Step */}
            {currentStep === 'otp' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4 flex items-center justify-between">
                  <div>
                    <b>Your Timeslot chosen:</b> <br />
                    <b>{user?.selectedSlot}</b> <br />
                 
                  </div>

                  <button
                    onClick={closeModal}
                    className="ml-2 py-1 px-2 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                  >
                    Modify
                  </button>
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-base"
                  placeholder="Enter OTP"
                  disabled={isVerifyingOtp}
                />

                <LoadingButton
                  onClick={handleVerifyOtp}
                  isLoading={isVerifyingOtp}
                  disabled={otp.length !== 6}
                >
                  Verify OTP
                </LoadingButton>
              </div>
            )}

            {/* Final Success Step */}
            {currentStep === "lastStep" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-6">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-center mb-2">
                  Registered Successfully
                </h3>
                <p className="text-sm text-gray-600 text-center mb-4">
                  You can now download the Agreement anytime
                </p>
                <LoadingButton
                  onClick={async () => {
                    onClose();
                    setBankModal(true);
                    window.location.reload();
                  }}
                  isLoading={loading}
                >
                  Ok
                </LoadingButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AadharModal;