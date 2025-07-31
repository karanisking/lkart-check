import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, LogOut, X, CheckCircle2, AlertCircle, Bus, UtensilsCrossed } from 'lucide-react';
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ViewAttendance = () => {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [dateError, setDateError] = useState('');

  // Photo modal states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState('');

  // Exit modal states
  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exitDate, setExitDate] = useState('');
  const [timeInput, setTimeInput] = useState({
    hours: '',
    minutes: '',
    period: 'PM'
  });
  const [busExit, setBusExit] = useState(false);
  const [haveFood, setHaveFood] = useState(false);
  // Feedback modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // New state for fetch errors
  const [fetchError, setFetchError] = useState('');

  // New state for exit time validation error
  const [exitTimeError, setExitTimeError] = useState('');

  const observer = useRef();
  const loadingRef = useRef(null);
  const isInitialMount = useRef(true);

  const BASE_URL = process.env.REACT_APP_BASE_URL;

  const openPhotoModal = (photoUrl) => {
    setSelectedPhoto(photoUrl);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhoto('');
  };

  const saveStateToStorage = (userId) => {
    const stateToSave = {
      fromDate,
      toDate,
      attendanceData,
      currentPage,
      hasMore,
      showTable
    };
    localStorage.setItem('attendanceFilterState', JSON.stringify(stateToSave));
    navigate(`/lkart/superadmin/view-rating/${userId}`);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const savedState = localStorage.getItem('attendanceFilterState');

      if (savedState) {
        const parsedState = JSON.parse(savedState);

        setFromDate(parsedState.fromDate);
        setToDate(parsedState.toDate);
        setAttendanceData(parsedState.attendanceData);
        setCurrentPage(parsedState.currentPage);
        setHasMore(parsedState.hasMore);
        setShowTable(parsedState.showTable);

        localStorage.removeItem('attendanceFilterState');
      }
    }
  }, [navigate]);

  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const verifyTokenWithAuth = useCallback(async (authToken) => {
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data?.error?.name === "TokenExpiredError") {
        localStorage.removeItem('superadmintoken');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('superadmintoken');
      return false;
    }
  }, [BASE_URL]);

  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem("superadmintoken");

      if (!token) {
        navigate("/lkart/superadmin/");
        return;
      }

      const isTokenValid = await verifyTokenWithAuth(token);

      if (!isTokenValid) {
        navigate("/lkart/superadmin/");
      }
    };

    checkTokenValidity();
  }, [navigate, verifyTokenWithAuth]);

  const validateDates = () => {
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (start > end) {
        setDateError('From date cannot be later than To date');
        return false;
      }
      setDateError('');
      return true;
    }
    return false;
  };

  const validateExitDateTime = () => {
    if (!selectedRecord || !exitDate || !timeInput.hours || !timeInput.minutes) {
      return false;
    }
  
    const entryDateTime = new Date(selectedRecord.entryTime);
  
    const time24h = convertTo24HourWithSeconds(
      timeInput.hours,
      timeInput.minutes.padStart(2, '0'),
      timeInput.period
    );
    const exitDateTime = new Date(`${exitDate}T${time24h}.000Z`);
  
    if (exitDateTime <= entryDateTime) {
      setExitTimeError(`Exit time must be after entry time`);
      return false;
    }
  
    const diffInHours = (exitDateTime - entryDateTime) / (1000 * 60 * 60);
  
    if (diffInHours > 14) {
      setExitTimeError(`Exit time cannot be more than 14 hours after entry time`);
      return false;
    }
  
    setExitTimeError('');
    return true;
  };

  const fetchAttendanceData = async (page, isNewSearch = false) => {
    try {
      setLoading(true);
      setFetchError('');

      const token = localStorage.getItem("superadmintoken");

      const response = await axios.get(
        `${BASE_URL}/lenskart-admin/attendance/history`,
        {
          params: {
            page: page,
            startDate: fromDate,
            endDate: toDate,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data;

      if (result.success) {
        if (isNewSearch) {
          setAttendanceData(result.data);
          setShowTable(true);
        } else {
          setAttendanceData((prev) => [...prev, ...result.data]);
        }
        setHasMore(result.data.length > 0 && page < result.pagination.totalPages);
      } else {
        console.error("Failed to fetch attendance data");
        const errorMsg = result.message || "Failed to fetch attendance data";
        setFetchError(errorMsg);

        if (isNewSearch) {
          setAttendanceData([]);
          setShowTable(false);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);

      let errorMsg = "Error fetching attendance data. Please try again.";

      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }

      setFetchError(errorMsg);

      if (isNewSearch) {
        setAttendanceData([]);
        setShowTable(false);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const handleApply = () => {
    if (validateDates()) {
      setCurrentPage(1);
      setHasMore(true);
      setFetchError('');
      fetchAttendanceData(1, true);
    }
  };

  const formatDateToDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTimeToIST = (isoString) => {
    if (!isoString) return '-';

    const timePart = isoString.split('T')[1].split('.')[0];
    const [hours, minutes] = timePart.split(':');

    let hour = parseInt(hours);
    const minute = parseInt(minutes);
    const period = hour >= 12 ? 'PM' : 'AM';

    if (hour > 12) {
      hour -= 12;
    } else if (hour === 0) {
      hour = 12;
    }

    return `${hour}:${minutes} ${period}`;
  };

  const convertTo24HourWithSeconds = (hours, minutes, period) => {
    let hourNum = parseInt(hours);

    if (period === 'AM' && hourNum === 12) {
      hourNum = 0;
    } else if (period === 'PM' && hourNum !== 12) {
      hourNum += 12;
    }

    const formattedHour = hourNum.toString().padStart(2, '0');
    const formattedMinute = minutes.padStart(2, '0');

    return `${formattedHour}:${formattedMinute}:00`;
  };

  const handleExitClick = (record, e) => {
    e.stopPropagation();
    setSelectedRecord(record);

    const defaultDate = record.exitDate ? record.exitDate.split('T')[0] : record.entryDate.split('T')[0];
    setExitDate(defaultDate);

    setShowExitModal(true);
    setTimeInput({
      hours: '',
      minutes: '',
      period: 'PM'
    });
    setBusExit(false);
    setHaveFood(false);

    setExitTimeError('');
  };

  const handleTimeChange = (e) => {
    const { name, value } = e.target;

    if (name === 'hours' && value !== '') {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > 12) return;
    }

    if (name === 'minutes' && value !== '') {
      const num = parseInt(value);
      if (isNaN(num) || num < 0 || num > 59) return;
    }

    setTimeInput(prev => ({
      ...prev,
      [name]: value
    }));

    if (exitTimeError) {
      setExitTimeError('');
    }
  };

  const handleExitDateChange = (e) => {
    setExitDate(e.target.value);
    if (exitTimeError) {
      setExitTimeError('');
    }
  };

  const handleExitSubmit = async () => {
    if (!timeInput.hours || !timeInput.minutes) {
      setErrorMessage('Please enter both hours and minutes');
      setShowErrorModal(true);
      return;
    }

    if (!exitDate) {
      setErrorMessage('Please select an exit date');
      setShowErrorModal(true);
      return;
    }

    if (!validateExitDateTime()) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("superadmintoken");

      const time24h = convertTo24HourWithSeconds(
        timeInput.hours,
        timeInput.minutes.padStart(2, '0'),
        timeInput.period
      );

      const exitDateTime = new Date(`${exitDate}T${time24h}.000Z`).toISOString();

      const payload = {
        userId: selectedRecord.userId,
        date: exitDate,
        status: 'exit',
        adminPhone: selectedRecord.adminPhone,
        exitTime: exitDateTime,
        busExit: busExit,
        haveFood: haveFood
      };

      const response = await axios.post(
        `${BASE_URL}/lenskart-admin/mark-entry-exit`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setShowSuccessModal(true);
        setShowExitModal(false);
        fetchAttendanceData(1, true);
      } else {
        setErrorMessage(response.data.message || 'Failed to record exit time');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error recording exit time:', error);
      setErrorMessage(error.response?.data?.message || 'Error recording exit time. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (userId) => {
    saveStateToStorage(userId);
  };

  useEffect(() => {
    if (fromDate && toDate && currentPage > 1 && showTable && hasMore) {
      fetchAttendanceData(currentPage);
    }
  }, [currentPage]);

  return (
    <div className="min-h-screen overflow-y-auto pt-16 bg-gray-100 p-0">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-lg p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">View Attendance</h2>

        {/* Date Selection */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex flex-1 gap-2">
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1 block">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDateError('');
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1 block">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDateError('');
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <button
            onClick={handleApply}
            disabled={!fromDate || !toDate || loading}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed self-end"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
          </button>
        </div>

        {dateError && (
          <div className="text-red-500 text-sm mb-2">{dateError}</div>
        )}

        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">{fetchError}</span>
            </div>
          </div>
        )}

        {showTable && !fetchError && (
          <div className="w-full max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-white shadow-md">
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Name <br /> (Phone No.)</th>
                  <th className="p-2 text-center">Entry Date <br /> & Time</th>
                  <th className="p-2 text-center">Exit Date <br /> & Time</th>
                  <th className="p-2 text-center">Payment <br /> (Working Hr.)</th>
                </tr>
              </thead>
              <tbody>
                {loading && currentPage === 1 ? (
                  <tr>
                    <td colSpan="4" className="text-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : attendanceData.length > 0 ? (
                  attendanceData.map((record, index) => (
                    <tr
                      key={index}
                      ref={index === attendanceData.length - 1 ? lastElementRef : null}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(record.userId)}
                    >
                      <td className="p-2 text-left min-w-[140px]">
                        <div className="flex items-center">
                          {record.profilePhotoUrl && (
                            <img
                              src={record.profilePhotoUrl}
                              alt="Profile"
                              className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPhotoModal(record.profilePhotoUrl);
                              }}
                            />
                          )}
                          <div className="ml-2">
                            <div className="font-medium">{record.name}</div>
                            <div className="text-xs text-gray-500">{record.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="font-medium">{formatDateToDisplay(record.entryDate)}</div>
                          {record.busEntry && (
                            <Bus className=" h-4 w-4 text-[#3D5A80]" title="Used bus service for entry" />
                          )}
                        </div>
                        <div className=" ml-2 text-xs text-gray-600">{formatTimeToIST(record.entryTime)}</div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-1">
                            <div className="font-medium">{formatDateToDisplay(record.exitDate)}</div>
                            {record.exitTime && record.busExit && (
                              <Bus className="ml-1 h-4 w-4 text-[#3D5A80]" title="Used bus service for exit" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {record.exitTime ? (
                              <>
                                <span className="text-xs text-gray-600">{formatTimeToIST(record.exitTime)}</span>
                                {record.haveFood && (
                                  <UtensilsCrossed className="ml-1 h-4 w-4 text-[#F4A261]" title="Availed food service" />
                                )}
                              </>
                            ) : (
                              <LogOut
                                className="h-4 w-4 text-black cursor-pointer hover:text-gray-700"
                                onClick={(e) => handleExitClick(record, e)}
                                title="Mark Exit Time"
                              />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getPaymentStatusColor(record.payment?.status)}`}>
                            ₹{record.payment?.amount}
                          </span>
                          <span className="text-xs text-gray-500">
                            {record.workingHours?.toFixed(2) || '0.00'} hrs
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center p-4 text-gray-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {loading && currentPage > 1 && (
              <div className="flex justify-center items-center py-4" ref={loadingRef}>
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Photo Modal */}
        {showPhotoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
            <div className="relative max-w-md w-full">
              <button
                onClick={closePhotoModal}
                className="absolute -top-4 -right-4 bg-white rounded-full p-2 hover:bg-gray-100 z-10"
              >
                <X size={24} className="text-gray-600" />
              </button>
              <img
                src={selectedPhoto}
                alt="Profile"
                className="w-full h-auto rounded-lg max-h-[80vh] object-contain"
              />
            </div>
          </div>
        )}

        {/* Exit Time Modal */}
        {showExitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Mark Exit Time</h3>
                <X
                  className="h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setShowExitModal(false);
                    setBusExit(false);
                    setHaveFood(false);
                  }}
                />
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Worker Name: <span className="font-medium">{selectedRecord?.name}</span>
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exit Date
                  </label>
                  <input
                    type="date"
                    value={exitDate}
                    onChange={handleExitDateChange}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                  />
                </div>

                <div className="flex flex-col items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Exit Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="hours"
                      value={timeInput.hours}
                      onChange={handleTimeChange}
                      placeholder="HH"
                      min="1"
                      max="12"
                      className="w-16 px-3 py-2 border border-gray-300 rounded-md text-center"
                    />
                    <span>:</span>
                    <input
                      type="number"
                      name="minutes"
                      value={timeInput.minutes}
                      onChange={handleTimeChange}
                      placeholder="MM"
                      min="0"
                      max="59"
                      className="w-16 px-3 py-2 border border-gray-300 rounded-md text-center"
                    />
                    <select
                      name="period"
                      value={timeInput.period}
                      onChange={handleTimeChange}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-center mb-4">
                  <input
                    type="checkbox"
                    id="busExit"
                    checked={busExit}
                    onChange={(e) => setBusExit(e.target.checked)}
                    className="h-6 w-6 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="busExit" className="ml-2 block text-lg text-gray-700">
                    Taken Factorykaam Bus Service
                  </label>
                </div>

                <div className="flex items-center justify-center mb-4">
                  <input
                    type="checkbox"
                    id="havefood"
                    checked={haveFood}
                    onChange={(e) => setHaveFood(e.target.checked)}
                    className="h-6 w-6 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="haveFood" className="ml-2 block text-lg text-gray-700">
                    Availed Food in Factory
                  </label>
                </div>


                {exitTimeError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md mb-4">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{exitTimeError}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowExitModal(false);
                    setBusExit(false);
                    setHaveFood(false);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExitSubmit}
                  disabled={loading || !timeInput.hours || !timeInput.minutes || !exitDate}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <div className="flex flex-col items-center text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Success!</h3>
                <p className="text-gray-600 mb-6">Exit time has been updated successfully.</p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error</h3>
                <p className="text-gray-600 mb-6">{errorMessage}</p>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAttendance;