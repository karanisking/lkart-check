import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useAuth } from '../context/auth-context';

const SelfieImage = ({ onSuccess, onClose }) => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const { token, user, setUser } = useAuth();

  // Camera configuration
  const videoConstraints = {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    facingMode: "user", 
    frameRate: { ideal: 30, min: 15 }
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

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (webcamRef.current && isCameraReady) {
      const imageSrc = webcamRef.current.getScreenshot({
        width: 1280,
        height: 720,
        screenshotFormat: 'image/jpeg',
        screenshotQuality: 0.9
      });
      
      if (imageSrc) {
        setCapturedImage(imageSrc);
        const blob = dataURLtoBlob(imageSrc);
        setCapturedBlob(blob);
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

  // Handle camera ready
  const handleCameraReady = () => {
    setIsCameraReady(true);
    setCameraError(null);
  };

  // Handle camera error
  const handleCameraError = (error) => {
    console.error('Camera error:', error);
    setIsCameraReady(false);
    setCameraError(error);
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
    
    if (cameraError.name === 'NotAllowedError') {
      return 'Camera access denied. Please allow camera permission and refresh the page.';
    } else if (cameraError.name === 'NotFoundError') {
      return 'No camera found. Please check if your device has a camera.';
    } else {
      return 'Camera error occurred. Please try again or refresh the page.';
    }
  };

  if (!isModalOpen) return null;

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
                  <div className="relative mb-4 bg-gray-100 rounded-lg overflow-hidden">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={videoConstraints}
                      onUserMedia={handleCameraReady}
                      onUserMediaError={handleCameraError}
                      mirrored={true}
                      className="w-[230px] h-[340px] object-contain"
                      style={{ 
                        display: isCameraReady ? 'block' : 'none' 
                      }}
                    />
                    
                    {/* Loading overlay */}
                    {!isCameraReady && !cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                          <p className="text-gray-600">Starting camera...</p>
                        </div>
                      </div>
                    )}

                    {/* Camera frame overlay */}
                    {isCameraReady && (
                      <div className="absolute inset-0 border-2 border-dashed border-white opacity-50 pointer-events-none"></div>
                    )}
                  </div>

                  <p className="text-gray-600 mb-6 text-sm">
                    Position your face in the frame and click capture
                  </p>

                  <button
                    onClick={capturePhoto}
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
  <div className="mb-4 flex justify-center">
    <div className="relative max-w-full" style={{ width: '230px', height: '340px' }}>
      <img
        src={capturedImage}
        alt="Captured selfie"
        className="w-full h-full object-contain rounded-lg border-2 border-gray-300"
      />
    </div>
  </div>

              {/* Upload Status */}
              {uploadStatus === 'success' && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Image uploaded successfully!
                  </div>
                </div>
              )}

              {uploadStatus && uploadStatus !== 'success' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  <div className="flex items-center">
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
