import React, { useEffect } from 'react';
import { X, AlertCircle, Phone } from 'lucide-react';

const ErrorModal = ({ message, isOpen, setIsOpen }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGetHelp = () => {
    window.location.href = 'tel:+917428266445';
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 pt-16 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 relative transform transition-all">
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="flex flex-col items-center p-6 space-y-6">
          {/* Error Icon */}
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          {/* Error Message */}
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{message}</p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              OK
            </button>
            <button
              onClick={handleGetHelp}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Phone className="h-4 w-4" />
              <span>Get Help</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;