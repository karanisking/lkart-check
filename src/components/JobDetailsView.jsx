import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Briefcase, QrCode, X, Download, AlertCircle, ChevronDown, ChevronUp, History, Camera } from 'lucide-react';
import AadharModal from './AadharModal';
import TimeSlotButton from './TimeSlotButton';
import QRCode from 'react-qr-code';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../context/auth-context';
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import AccountDetails from './AccountDetails';
import SelfieImage from './SelfiImage';


const BASE_URL = process.env.REACT_APP_BASE_URL;

const JobDetailsView = ({ jobDetails, selectedSlot }) => {
  const { user, setUser, token, fetchQRLink, loading, fetchDownloadLink, applyForJob } = useAuth();
  const { showAadhaarModal, setShowAadhaarModal } = useAuth();
  const { bankModal, setBankModal } = useAuth();
  const [tempSlot, setTempSlot] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [qrlink, setQrLink] = useState('');
  const [error, setError] = useState('');
  const [accountDetails, setAccountDetails] = useState(null);
  const [accountExist, setAccountExist] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [status, setStatus] = useState('');
  const [pendingQRGeneration, setPendingQRGeneration] = useState(false);
  const [showViewSelfieModal, setShowViewSelfieModal] = useState(false);
  const [imageLoading, setImageLoading] = useState(true); // New state for image loading
  const navigate = useNavigate();

  const fetchAccountDetails = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/account-details`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data && response.data.accountNumber) {
        setAccountDetails(response.data);
        setAccountExist(true);
      }
    } catch (error) {
      setBankModal(true);
      console.error('Failed to fetch account details:', error);
      setError('Failed to fetch account details. Please try again.');
      setShowError(true);
    }
  };

  useEffect(() => {
    console.log(jobDetails);
    fetchAccountDetails();
    setIsInitialLoad(false);
  }, []);

  const toggleAccountDetails = () => {
    setShowAccountDetails(!showAccountDetails);
  };

  const handleSlotSubmit = async (slots) => {
    try {
      if (!user?.profilePhotoUrl) {
        toast.error('Please upload your profile photo first');
        setShowSelfieModal(true);
        return;
      }

      await applyForJob(slots.shifttime, slots.weekend_shift, jobDetails.id);
      toast.success('Time slots updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time slots. Please try again.');
      setShowError(true);
    }
  };

  const handleSelfieSuccess = async () => {
    toast.success('Selfie uploaded successfully!');
    setShowSelfieModal(false);

    // If QR generation was pending, generate it now
    if (pendingQRGeneration) {
      setPendingQRGeneration(false);
      await generateQR();
    }

    if (!user?.aadharVerified && !user?.dob) {
      setShowAadhaarModal(true);
    }
  };

  const showAgreementPendingToast = () => {
    const AgreementPendingToast = () => (
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
        </div>
        <div>
          <p className="text-sm text-red-600">
            Your agreement is pending. Please complete verification.
          </p>
        </div>
      </div>
    );

    toast(<AgreementPendingToast />, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: "bg-white shadow-lg border-l-4 border-red-600",
      progressClassName: "bg-red-600",
      toastId: 'agreement-pending-toast'
    });
  };

  useEffect(() => {
    if (!user?.aadharVerified && !user?.dob && !isInitialLoad) {
      const WelcomeToast = () => (
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Welcome back to Lenskart</h3>
            <p className="text-sm text-gray-600">
              Let's find the perfect time slot for you
            </p>
          </div>
        </div>
      );

      const toastId = toast(<WelcomeToast />, {
        position: "top-left",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        className: "bg-white shadow-lg",
        progressClassName: "bg-indigo-600",
        toastId: 'welcome-toast'
      });

      return () => toast.dismiss(toastId);
    }
  }, [user?.aadharVerified, user?.dob, isInitialLoad]);

  useEffect(() => {
    const hasVerification = Boolean((user?.aadharVerified || user?.dob) && bankModal);
    const noAccount = accountExist === false;

    if (hasVerification && noAccount) {
      const BankDetailsToast = () => (
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-red-600">
              Please add your Bank Details for the Payment
            </p>
          </div>
        </div>
      );

      const toastId = toast(<BankDetailsToast />, {
        position: "top-left",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        className: "bg-white shadow-lg border-l-4 border-red-600",
        progressClassName: "bg-red-600",
        toastId: 'bank-details-toast'
      });

      return () => toast.dismiss(toastId);
    }
  }, [user?.aadharVerified, user?.dob, accountExist, bankModal]);

  const renderTimeSlots = () => {
    return (
      <TimeSlotButton
        jobId={jobDetails.id}
        token={token}
        setUser={setUser}
        disabled={false}
        user={user}
        onClick={handleSlotSubmit}
      />
    );
  };

  const goToAttendancePage = () => {
    navigate("/lkart/dashboard/view-attendance");
  };

  const goToPaymentHistoryPage = () => {
    navigate("/lkart/dashboard/payment-history");
  };

  const downloadAgreement = async () => {
    try {
      const link = await fetchDownloadLink();
      if (link) {
        window.open(link, '_blank');
      } else {
        throw new Error('No download link available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download agreement. Please try again.');
      setShowError(true);
    }
  };

  const generateQR = async () => {
    try {
      // Check if profile photo exists before generating QR
      if (!user?.profilePhotoUrl) {
        toast.error('Please upload your profile photo first');
        setPendingQRGeneration(true);
        setShowSelfieModal(true);
        return;
      }

      const templink = await fetchQRLink();
      if (!templink) {
        throw new Error('Failed to generate QR code');
      }

      const url = new URL(templink);
      const status = url.searchParams.get('status');
      console.log("QR Status:", status);
      setStatus(status);

      console.log(templink);
      setQrLink(templink);
      setShowQR(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code. Please try again.');
      setShowError(true);
    }
  };

  // Handle image load events
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
  };

  // Reset image loading state when modal opens
  const handleViewSelfieModalOpen = () => {
    setImageLoading(true);
    setShowViewSelfieModal(true);
  };

  return (
    <>
      <div className="bg-gray-100 px-4 py-6 md:max-w-4xl md:mx-auto">
        <ToastContainer
          position="top-center"
          autoClose={3000}
          limit={1}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            {(user?.aadharVerified || user?.dob) ? "You have successfully registered for Lenskart part-time work!" : jobDetails.title}
          </h1>

          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-gray-700 text-sm md:text-base">
                {(user?.aadharVerified || user?.dob) ? "" : `Department: ${jobDetails.role}`}
              </span>
            </div>

            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-indigo-600 mr-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm md:text-base">{jobDetails.address}</span>
            </div>

            <p
              className="text-gray-600 text-sm md:text-base"
              dangerouslySetInnerHTML={{
                __html: ((user?.aadharVerified || user?.dob)
                  ? `<b>Aapka chuna hua time slot:</b><br><br>
                     <b>${user?.selectedSlot}</b><br><br>
                   
                     <b>Humein aapka slot mil gaya hai. Hum aapse zaroorat ke anusaar sampark karenge.</b><br><br>
                     <b>Register karne ke liye dhanyawad!</b>`
                  : jobDetails.description) ?? ''
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4">
          {renderTimeSlots()}
        </div>

        {(user?.aadharVerified || user?.dob) && !showQR && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
              <button
                onClick={generateQR}
                disabled={loading}
                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center space-x-2 disabled:bg-indigo-400"
              >
                <QrCode className="h-5 w-5" />
                <span>QR Code For Attendance</span>
              </button>

              <div className="mt-4">
                <button
                  onClick={toggleAccountDetails}
                  className="w-full py-4 px-6 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 relative disabled:bg-indigo-400"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span>Account Details</span>
                  </div>
                  <div className="flex justify-end">
                    {showAccountDetails ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </button>

                {showAccountDetails && (
                  <div className="mt-4 mb-4 border-t border-b pb-4 pt-4">
                    <AccountDetails />
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-4">
                <button
                  onClick={goToAttendancePage}
                  disabled={loading}
                  className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center space-x-2 disabled:bg-indigo-400"
                >
                  <Clock className="h-5 w-5" />
                  <span>View Attendance</span>
                </button>

                {(user?.aadharVerified || user?.dob) && user?.profilePhotoUrl && (
                  <button
                    onClick={handleViewSelfieModalOpen}
                    className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center space-x-2"
                  >
                    <Camera className="h-5 w-5" />
                    <span>View/Reupload Selfie</span>
                  </button>
                )}
                {accountExist && (
                  <button
                    onClick={goToPaymentHistoryPage}
                    className="w-full py-3 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center space-x-2 disabled:bg-indigo-400"
                  >
                    <History className="h-5 w-5 mr-2" />
                    <span>View Payment History</span>
                  </button>
                )}

                <button
                  onClick={downloadAgreement}
                  disabled={loading}
                  className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center space-x-2 disabled:bg-indigo-400"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Agreement</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selfie Modal */}
        {showSelfieModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md relative">
              <SelfieImage
                onSuccess={handleSelfieSuccess}
                onClose={() => {
                  setShowSelfieModal(false);
                  setPendingQRGeneration(false);
                  if (showAadhaarModal && user?.profilePhotoUrl) {
                    setShowAadhaarModal(true);
                  }
                }}
                mandatory={true}
              />
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQR && user?.profilePhotoUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 relative">
              <button
                onClick={() => {
                  setShowQR(false);
                  navigate("/lkart/dashboard");
                  setTimeout(() => {
                    window.location.reload();
                    setTimeout(() => {
                      window.location.reload();
                    }, 100);
                  }, 50);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="bg-white p-4">
                <div className="text-center mb-4">
                  <p className="font-semibold text-gray-900 mb-5">{status.toUpperCase()} QR</p>
                  <QRCode value={qrlink} size={200} className="mx-auto" />
                </div>

                <div className="space-y-2 text-center text-sm">
                  <p className="font-semibold text-gray-900">{jobDetails.title}</p>
                  <p className="text-gray-600">{jobDetails.role}</p>
                  <p className="text-gray-600">{jobDetails.address}</p>
                  <p className="text-indigo-600 font-medium">
                    <br />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Selfie Modal with Loader */}
        {showViewSelfieModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md relative p-6">
              <button
                onClick={() => {
                  setShowViewSelfieModal(false);
                  setImageLoading(true); // Reset loading state when closing
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="text-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Your Current Selfie</h3>
                <div className="mt-4 flex justify-center relative">
                  {/* Loading Spinner */}
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg mt-4 mb-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                  )}
                  
                  {/* Image */}
                  <img
                    src={user?.profilePhotoUrl}
                    alt="Current Selfie"
                    className={`w-full h-auto rounded-lg max-h-[80vh] object-contain transition-opacity duration-300 ${
                      imageLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setShowViewSelfieModal(false);
                  setShowSelfieModal(true);
                  setImageLoading(true); // Reset for next time
                }}
                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Reupload Selfie
              </button>
            </div>
          </div>
        )}

        {/* Aadhar Modal */}
        {showAadhaarModal && user?.aadharVerified === false && user?.dob === undefined && (
          <AadharModal
            timeSlot={tempSlot}
            slot={tempSlot}
            onClose={() => {
              setShowAadhaarModal(false);
              if (!user?.aadharVerified && user?.dob === undefined) {
                showAgreementPendingToast();
              }
              else {
                window.location.reload();
              }
              setBankModal(true);

              setTimeout(() => {
                setShowAadhaarModal(true);
              }, 1000);
            }}
            jobId={jobDetails.id}
            isAadhaarVerified={user?.aadharVerified || user?.dob !== undefined || false}
            setUser={setUser}
          />
        )}
      </div>
    </>
  );
};

export default JobDetailsView;
