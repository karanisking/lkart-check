import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const MarkAttendance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, token } = useAuth();
  const apiCallMade = useRef(false);

  const [state, setState] = useState({
    status: 'idle',
    error: null,
    attendanceData: null,
    userProfile: null,
    showConfirmation: false,
    rejected: false,
    userLocation: null,
    locationError: null,
    isGettingLocation: false,
    locationValidated: false,
    busStatus: false,
    haveFood: false,
  });

  const fetchUserProfile = async (userId) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/lenskart/profile/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch user profile');
    }
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      setState(prev => ({ ...prev, isGettingLocation: true, locationError: null }));

      if (!navigator.geolocation) {
        reject(new Error('Your browser does not support location tracking'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          resolve(locationData);
        },
        (error) => {
          let errorMessage;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                `Please enable location permissions to mark attendance.\n\n` +
                `To enable location permissions for this site:\n` +
                `1. Tap the three-dot menu (⋮) in the top-right corner of Chrome.\n` +
                `2. From the dropdown menu, select "Settings".\n` +
                `3. Scroll down and tap "Site settings".\n` +
                `4. Under the "Permissions" section, tap "Location".\n` +
                `5. In the "Blocked" section, find and tap on the site: https://jobs.factorykaam.com\n` +
                `6. Select "Allow" to grant location permissions.\n` +
                `7. Go back to the site and refresh the page to try again.\n`;
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = 'Failed to get location';
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const markAttendance = async (userId, currentDay, status, busStatus, haveFood) => {
    try {
      const payload = {
        userId,
        date: currentDay,
        status,
      };

      if (status === 'entry') {
        payload.busEntry = Boolean(busStatus);
      } else if (status === 'exit') {
        payload.busExit = Boolean(busStatus);
        payload.haveFood = Boolean(haveFood);
      }

      const response = await axios.post(
        `${BASE_URL}/lenskart-admin/mark-attendance`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success === false) {
        throw new Error(response.data.message || response.data.error || 'Operation failed');
      }

      return response.data.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Server error occurred');
      } else if (error.request) {
        throw new Error('Attendance is already marked');
      } else {
        throw new Error(error.message || 'Failed to send request. Please try again.');
      }
    }
  };

  useEffect(() => {
    const processInitialData = async () => {
      if (apiCallMade.current || state.status !== 'idle') return;
      if (authLoading) return;

      if (!user) {
        const currentPath = encodeURIComponent(location.pathname + location.search);
        navigate(`/lkart/admin?returnUrl=${currentPath}`);
        return;
      }

      if (!user.isAdmin) {
        setState({
          status: 'error',
          error: 'Unauthorized access. Admin privileges required.',
          attendanceData: null
        });
        return;
      }

      const searchParams = new URLSearchParams(location.search);
      const userId = searchParams.get('userId');
      const currentDay = searchParams.get('currentDay');
      const status = searchParams.get('status');

      if (!userId || !currentDay || !status) {
        setState({
          status: 'error',
          error: 'Invalid parameters provided.',
          attendanceData: null
        });
        return;
      }

      try {
        apiCallMade.current = true;
        setState(prev => ({ ...prev, status: 'loading' }));

        const profileData = await fetchUserProfile(userId);

        setState({
          status: 'pending',
          error: null,
          attendanceData: null,
          userProfile: profileData,
          showConfirmation: true,
          params: { userId, currentDay, status }
        });
      } catch (error) {
        setState({
          status: 'error',
          error: error.message || 'Failed to fetch user data. Please try again.',
          attendanceData: null
        });
      }
    };

    processInitialData();
  }, [authLoading, location, navigate, user, token]);

  const handleLocationProcess = async () => {
    try {
      setState(prev => ({ ...prev, isGettingLocation: true, locationError: null }));

      const locationData = await getLocation();
      const queryParams = new URLSearchParams({
        latitude: locationData.latitude,
        longitude: locationData.longitude
      });

      const apiUrl = `${BASE_URL}/lenskart/location?${queryParams.toString()}`;
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const response = await fetch(apiUrl, requestOptions);

      if (!response.ok) {
        throw new Error('Failed to validate location with server');
      }

      const data = await response.json();
      const isValid = data.inRange;

      // if (!isValid) {
      //   throw new Error('You must be near to the office location to mark attendance');
      // }

      setState(prev => ({
        ...prev,
        userLocation: locationData,
        locationValidated: true,
        isGettingLocation: false
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        locationError: error.message,
        isGettingLocation: false
      }));

      return false;
    }
  };

  const handleAccept = async () => {
    try {
      // Check if profile status matches URL parameter status
      if (state.userProfile?.status === state.params?.status) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'Please check your QR code. QR code is invalid'
        }));
        return;
      }

      let locationValidated = state.locationValidated;
      if (!locationValidated) {
        locationValidated = await handleLocationProcess();
        if (!locationValidated) return;
      }

      setState(prev => ({ ...prev, status: 'loading' }));

      const message = await markAttendance(
        state.params.userId,
        state.params.currentDay,
        state.params.status,
        state.busStatus,
        state.haveFood,
      );

      setState(prev => ({
        ...prev,
        status: 'success',
        attendanceData: {
          name: message.name,
          date: message.attendanceRecord.date,
          time: message.attendanceRecord.time,
          location: state.userLocation,
          status: state.params.status
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }));
    }
  };

  const handleReject = () => {
    setState(prev => ({
      ...prev,
      status: 'rejected',
      rejected: true
    }));
  };

  const handleBusStatusChange = () => {
    setState(prev => ({
      ...prev,
      busStatus: !prev.busStatus
    }));
  };

  const handleFoodStatusChange = () => {
    setState(prev => ({
      ...prev,
      haveFood: !prev.haveFood
    }));
  };

  useEffect(() => {
    if (state.userLocation) {
      // console.log("User location updated:", state.userLocation);
    }
  }, [state.userLocation]);

  if (state.status === 'loading' || state.isGettingLocation) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <div className="text-lg font-medium text-gray-700">
            {state.isGettingLocation ? 'Getting location...' : 'Processing...'}
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error' || state.locationError) {
    return (
      <div className="h-screen overflow-y-auto pt-16 pb-16 mb-16 mt-14 fixed inset-0 flex items-center justify-center bg-white">
        <div className="max-w-md w-full mx-4 p-6 bg-red-50 rounded-lg shadow-sm">
          <div className="text-red-600 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p style={{
              whiteSpace: 'pre-line',
              textAlign: state.error ? 'center' : 'left',
              margin: 0
            }}>
              {state.error || state.locationError}
            </p>
            {(state.error !== 'Please check your qr code. qr code is invalid') && (
              <button
                onClick={handleAccept}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'rejected') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white p-4">
        <div className="max-w-md w-full bg-red-50 rounded-lg shadow-lg p-6">
          <div className="text-red-600 text-center text-xl">
            Attendance is not marked.
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'pending' && state.showConfirmation) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col items-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Mark {state.params?.status === 'entry' ? 'Entry' : 'Exit'}
              </h2>
              {state.userProfile?.profile_photo ? (
                <div className="relative">
                  <img
                    src={
                      state.userProfile.profile_photo.startsWith("data:image") ||
                      state.userProfile.profile_photo.startsWith("https://fk-offerletters.s3.ap-south-1.amazonaws.com/")
                        ? state.userProfile.profile_photo
                        : `data:image/jpeg;base64,${state.userProfile.profile_photo}`
                    }
                    alt="Profile"
                    className="w-62 h-64 object-cover mb-4"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <span className="text-2xl text-gray-500">
                    {state.userProfile?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-semibold text-gray-800">
                Name: {state.userProfile?.name}
              </h2>
              <h2 className="text-xl font-semibold text-gray-800">
                Department: {state.userProfile?.department}
              </h2>
             
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  checked={state.busStatus}
                  onChange={handleBusStatusChange}
                  className="h-5 w-5 text-green-600 rounded"
                />
                <span className="ml-2 text-gray-700">
                  {state.params?.status === 'entry' 
                    ? 'Taken Factorykaam Bus Service' 
                    : 'Taken Factorykaam Bus Service'}
                </span>
              </div>
              
              {/* Only show food checkbox for exit status */}
              {state.params?.status === 'exit' && (
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    checked={state.haveFood}
                    onChange={handleFoodStatusChange}
                    className="h-5 w-5 text-green-600 rounded"
                  />
                  <span className="ml-2 text-gray-700">
                  Availed Food in Factory
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleAccept}
                className="px-8 py-3 text-lg bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                Accept
              </button>

              <button
                onClick={handleReject}
                className="px-8 py-3 text-lg bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'success' && state.attendanceData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
          <div className="bg-green-100 p-4">
            <h2 className="text-center text-green-700 text-xl font-semibold">
              {state.attendanceData.status === 'entry' 
                ? 'Entry Marked Successfully' 
                : 'Exit Marked Successfully'}
            </h2>
          </div>

          <div className="p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-200 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-600">Name</th>
                  <th className="border border-gray-200 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                  <th className="border border-gray-200 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-2">{state.attendanceData.name}</td>
                  <td className="border border-gray-200 px-4 py-2">{state.attendanceData.date}</td>
                  <td className="border border-gray-200 px-4 py-2">
                    {new Date(state.attendanceData.time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'UTC'
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MarkAttendance;