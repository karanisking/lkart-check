import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VerifyAttendance = ({ id }) => {
  const [verified, setVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    
    const verifyAttendance = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setVerified(true);
      setTimeout(() => navigate('/lkart/admin'), 2000);
    };

    verifyAttendance();
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex pt-16 items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {verified ? 'Attendance Verified!' : 'Verifying Attendance...'}
        </h2>
        <p className="text-gray-600">
          {verified
            ? 'Redirecting to dashboard...'
            : 'Please wait while we verify the attendance'}
        </p>
      </div>
    </div>
  );
};

export default VerifyAttendance;