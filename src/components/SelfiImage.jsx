import React, { useState, useCallback, useEffect, useRef } from 'react';
import Camera, { FACING_MODES, IMAGE_TYPES } from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import { useAuth } from '../context/auth-context';

const SelfieImage = ({ onSuccess, onClose }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const cameraRef = useRef(null);

  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const { token, user, setUser } = useAuth();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get ideal dimensions based on device
  const getCameraDimensions = () => {
    const isMobile = windowSize.width <= 768;
    
    if (isMobile) {
      return {
        idealFacingMode: FACING_MODES.USER,
        idealResolution: { width: 640, height: 480 },
        maxResolution: { width: 1280, height: 960 },
        isImageMirror: true
      };
    } else {
      return {
        idealFacingMode: FACING_MODES.USER,
        idealResolution: { width: 1280, height: 720 },
        maxResolution: { width: 1920, height: 1080 },
        isImageMirror: true
      };
    }
  };

  // Convert dataURL to blob
  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Handle photo capture
  const handleTakePhoto = useCallback((dataUri) => {
    setCapturedImage(dataUri);
    const blob = dataURLtoBlob(dataUri);
    setCapturedBlob(blob);
  }, []);

  // Handle camera errors
  const handleCameraError = useCallback((error) => {
    console.error('Camera error:', error);
    setCameraError(error);
  }, []);

  // Handle camera start
  const handleCameraStart = useCallback(() => {
    setCameraError(null);
    setIsCameraReady(true);
    
    // Hide the default camera button circles and any capture icons after camera starts
    setTimeout(() => {
      // Hide the specific circle button elements
      const circleElements = [
        '#container-circles',
        '#outer-circle', 
        '#inner-circle',
        '#white-flash'
      ];
      
      circleElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          element.style.opacity = '0';
          element.style.pointerEvents = 'none';
        }
      });
      
      // Hide all other possible button selectors
      const otherSelectors = [
        '.react-html5-camera-photo button',
        '.react-html5-camera-photo [role="button"]',
        '.camera-photo button',
        '.camera-photo [role="button"]',
        '.camera-photo svg',
        '.capture-button'
      ];
      
      otherSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          element.style.opacity = '0';
          element.style.pointerEvents = 'none';
        });
      });
    }, 100);
    
    // Additional check after a longer delay to ensure everything stays hidden
    setTimeout(() => {
      const allElements = document.querySelectorAll('#container-circles, #outer-circle, #inner-circle, .react-html5-camera-photo button, .react-html5-camera-photo [role="button"]');
      allElements.forEach(element => {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        element.style.opacity = '0';
      });
    }, 1000);
  }, []);

  // Custom capture function
  const handleCapture = useCallback(() => {
    if (isCameraReady) {
      // Try to find and click the hidden circle button first
      const circleButton = document.querySelector('#inner-circle');
      if (circleButton) {
        circleButton.click();
        return;
      }
      
      // Fallback to other possible selectors
      const possibleSelectors = [
        '#container-circles',
        '.react-html5-camera-photo button',
        '.react-html5-camera-photo [role="button"]',
        '.camera-photo button'
      ];
      
      for (let selector of possibleSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
          break;
        }
      }
    }
  }, [isCameraReady]);

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setUploadStatus('');
  };

  // Submit image
  const submitImage = async () => {
    if (!capturedBlob) return;

    setIsUploading(true);
    setUploadStatus('');

    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, 'selfie.jpg');

      const response = await fetch(`${BASE_URL}/lenskart/profile-media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus('success');

        if (result.worker?.profilePhotoUrl) {
          setUser(prevUser => ({
            ...prevUser,
            profilePhotoUrl: result.worker.profilePhotoUrl
          }));
        }

        // Close modal after successful upload
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
          handleClose();
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Close modal
  const handleClose = () => {
    setIsModalOpen(false);
    if (onClose) {
      onClose();
    }
  };

  // Get error message
  const getErrorMessage = () => {
    if (!cameraError) return null;
    
    const errorStr = cameraError.toString();
    if (errorStr.includes('NotAllowedError') || errorStr.includes('Permission denied')) {
      return 'Camera access denied. Please allow camera permission and refresh the page.';
    } else if (errorStr.includes('NotFoundError') || errorStr.includes('No camera found')) {
      return 'No camera found. Please check if your device has a camera.';
    } else {
      return 'Camera error occurred. Please try again or refresh the page.';
    }
  };

  if (!isModalOpen) return null;

  const cameraSettings = getCameraDimensions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 border-b rounded-t-lg flex items-center justify-between">
          <h2 className="text-xl font-bold">Take Your Selfie</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Custom CSS to hide default camera button */}
          <style jsx>{`
            /* Hide the default capture button circles */
            #container-circles {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }
            #outer-circle,
            #inner-circle {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }
            
            /* Hide any other button elements */
            .react-html5-camera-photo > div > button {
              display: none !important;
            }
            .react-html5-camera-photo button {
              display: none !important;
            }
            .react-html5-camera-photo > div {
              background: transparent !important;
            }
            .react-html5-camera-photo [role="button"] {
              display: none !important;
            }
            .react-html5-camera-photo .camera-photo {
              position: relative;
            }
            .react-html5-camera-photo .camera-photo button,
            .react-html5-camera-photo .camera-photo [role="button"],
            .react-html5-camera-photo .camera-photo .capture-button,
            .react-html5-camera-photo .camera-photo svg {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }
            
            /* Hide white flash effect */
            #white-flash {
              display: none !important;
            }
          `}</style>
          
          {!capturedImage ? (
            // Camera View
            <div className="text-center">
              {cameraError ? (
                // Error State
                <div className="p-8">
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <strong>Camera Error</strong>
                    </div>
                    <p className="text-sm">{getErrorMessage()}</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                    <h3 className="font-semibold text-blue-800 mb-2">How to fix:</h3>
                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                      <li>Make sure you're using HTTPS (or localhost for development)</li>
                      <li>Click the camera icon in your browser's address bar</li>
                      <li>Select "Allow" for camera access</li>
                      <li>Refresh the page if needed</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    ↻ Refresh Page
                  </button>
                </div>
              ) : (
                // Camera Interface
                <div>
                  <div className="relative mb-4 rounded-lg overflow-hidden bg-black">
                    <div 
                      ref={cameraRef}
                      className="camera-container" 
                      style={{ 
                        width: '100%', 
                        maxHeight: '400px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Camera
                        onTakePhoto={handleTakePhoto}
                        onCameraError={handleCameraError}
                        onCameraStart={handleCameraStart}
                        idealFacingMode={cameraSettings.idealFacingMode}
                        idealResolution={cameraSettings.idealResolution}
                        maxResolution={cameraSettings.maxResolution}
                        isImageMirror={cameraSettings.isImageMirror}
                        isMaxResolution={false}
                        isDisplayStartCameraError={true}
                        imageType={IMAGE_TYPES.JPG}
                        imageCompression={0.92}
                        sizeFactor={1}
                        isFullscreen={false}
                      />
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 text-sm">
                    Position your face in the frame and click capture
                  </p>

                  <button
                    onClick={handleCapture}
                    disabled={!isCameraReady}
                    className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
                  >
                    {isCameraReady ? (
                      <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        Capture Selfie
                      </span>
                    ) : (
                      'Loading Camera...'
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Preview & Upload
            <div className="text-center">
              <div className="mb-4">
                <img
                  src={capturedImage}
                  alt="Captured selfie"
                  className="w-full max-h-80 object-contain rounded-lg border-2 border-gray-300 bg-gray-50"
                />
              </div>

              {/* Upload Status */}
              {uploadStatus === 'success' && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Image uploaded successfully!
                  </div>
                </div>
              )}

              {uploadStatus && uploadStatus !== 'success' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {uploadStatus}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={retakePhoto}
                  disabled={isUploading}
                  className="bg-gray-500 hover:bg-gray-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded transition-colors duration-200"
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retake
                  </span>
                </button>
                
                <button
                  onClick={submitImage}
                  disabled={isUploading || uploadStatus === 'success'}
                  className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-6 rounded transition-colors duration-200 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : uploadStatus === 'success' ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Uploaded!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelfieImage;