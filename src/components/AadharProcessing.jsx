import React, { useEffect, useState } from 'react';
import { Loader, CheckCircle, AlertCircle } from 'lucide-react';

const AadharProcessing = () => {
  const [status, setStatus] = useState('processing'); // processing, success, error

  useEffect(() => {
    const handleUrlParams = () => {
      try {
        // Extract all parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const paramsObject = {};
        
        // Iterate through all parameters and add them to paramsObject
        urlParams.forEach((value, key) => {
          paramsObject[key] = value;
        });

        // Console log all parameters for debugging
        console.log('Received URL parameters:', paramsObject);

        // Check for error parameters that might indicate failure
        const hasError = paramsObject.error || paramsObject.error_description;
        
        if (hasError) {
          console.warn('Error detected in URL params:', { 
            error: paramsObject.error, 
            description: paramsObject.error_description 
          });
          setStatus('error');
        } else {
          setStatus('success');
        }

        // Notify parent window if it exists
        if (window.opener && !window.opener.closed) {
          try {
            const messageType = hasError ? 'DIGILOCKER_ERROR' : 'DIGILOCKER_SUCCESS';
            
            window.opener.postMessage({
              type: messageType,
              ...paramsObject,  // Spread all parameters into the message
              timestamp: Date.now()
            }, '*');
            
            console.log(`Sent ${messageType} message to parent window with all parameters`);
          } catch (e) {
            console.error('Could not communicate with parent window:', e);
            setStatus('error');
          }
        } else {
          console.warn('No parent window found or it was closed');
        }

      } catch (error) {
        console.error('Error processing URL parameters:', error);
        setStatus('error');
      }
    };

    // Process URL params immediately
    handleUrlParams();

    // Auto close after delay
    const timer = setTimeout(() => {
      console.log('Closing window...');
      try {
        window.close();
      } catch (e) {
        console.log('Could not close window automatically');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusDisplay = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />,
          title: "Verification Completed!",
          message: "Your Aadhaar verification was successful.",
          bgColor: "bg-green-50",
          textColor: "text-green-800"
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />,
          title: "Verification Failed",
          message: "There was an issue with your verification. Please try again.",
          bgColor: "bg-red-50",
          textColor: "text-red-800"
        };
      default:
        return {
          icon: <Loader className="h-16 w-16 text-indigo-500 animate-spin mx-auto mb-4" />,
          title: "Processing Verification...",
          message: "Please wait while we process your verification.",
          bgColor: "bg-indigo-50",
          textColor: "text-indigo-800"
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className={`${statusDisplay.bgColor} p-8 rounded-lg shadow-xl max-w-md w-full text-center border`}>
        {statusDisplay.icon}
        <h2 className={`text-2xl font-semibold ${statusDisplay.textColor} mb-2`}>
          {statusDisplay.title}
        </h2>
        <p className={`${statusDisplay.textColor} mb-4 opacity-80`}>
          {statusDisplay.message}
        </p>
        {status === 'processing' && (
          <div className="flex justify-center">
            <Loader className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        )}
        <p className="text-sm text-gray-500 mt-4">
          This window will close automatically in a few seconds.
        </p>
      </div>
    </div>
  );
};

export default AadharProcessing;