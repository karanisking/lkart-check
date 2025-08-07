import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, LogOut, X, CheckCircle2, AlertCircle, Bus, UtensilsCrossed, LogIn, Edit } from 'lucide-react';
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
  const [isModalImageLoading, setIsModalImageLoading] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState({});

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
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isDeptOpen, setIsDeptOpen] = useState(false);

  // Entry modal states
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [workerDetails, setWorkerDetails] = useState(null);
  const [entryDate, setEntryDate] = useState('');
  const [entryTimeInput, setEntryTimeInput] = useState({
    hours: '',
    minutes: '',
    period: 'AM'
  });
  const [busEntry, setBusEntry] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [workerError, setWorkerError] = useState('');

  // Feedback modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // New state for fetch errors
  const [fetchError, setFetchError] = useState('');

  // New state for exit time validation error
  const [exitTimeError, setExitTimeError] = useState('');
  const [entryTimeError, setEntryTimeError] = useState('');

  const observer = useRef();
  const loadingRef = useRef(null);
  const isInitialMount = useRef(true);

  const BASE_URL = process.env.REACT_APP_BASE_URL;

  const openPhotoModal = (photoUrl) => {
    setSelectedPhoto(photoUrl);
    setIsModalImageLoading(true);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhoto('');
    setIsModalImageLoading(false);
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

  const validateEntryDateTime = () => {
    if (!entryDate || !entryTimeInput.hours || !entryTimeInput.minutes) {
      return false;
    }

    const now = new Date();
    const selectedDate = new Date(entryDate);
    const todayDate = new Date(today);
    const yesterdayDate = new Date(yesterday);

    // Only allow today or yesterday's date
    if (selectedDate.getTime() !== todayDate.getTime() &&
      selectedDate.getTime() !== yesterdayDate.getTime()) {
      setEntryTimeError('Entry date must be today or yesterday');
      return false;
    }

    // Validate time is not in the future if date is today
    if (selectedDate.getTime() === todayDate.getTime()) {
      const time24h = convertTo24HourWithSeconds(
        entryTimeInput.hours,
        entryTimeInput.minutes.padStart(2, '0'),
        entryTimeInput.period
      );
      const entryDateTime = new Date(`${entryDate}T${time24h}.000Z`);
    }

    setEntryTimeError('');
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
          // Initialize loading states for new images
          const initialLoadingStates = {};
          result.data.forEach(record => {
            if (record.profilePhotoUrl) {
              initialLoadingStates[record.profilePhotoUrl] = true;
            }
          });
          setImageLoadingStates(initialLoadingStates);
        } else {
          setAttendanceData((prev) => [...prev, ...result.data]);
          // Add loading states for new images
          const newLoadingStates = {};
          result.data.forEach(record => {
            if (record.profilePhotoUrl) {
              newLoadingStates[record.profilePhotoUrl] = true;
            }
          });
          setImageLoadingStates(prev => ({ ...prev, ...newLoadingStates }));
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

  const handleExitClick = async (record, e) => {
    e.stopPropagation();

    try {
      setLoading(true);
      // Fetch departments first
      const token = localStorage.getItem("superadmintoken");
      const response = await axios.get(
        `${BASE_URL}/lenskart/department`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success && Array.isArray(response.data.departments)) {
        // Filter out "All" from departments
        const filteredDepartments = response.data.departments.filter(dept => dept !== "All");
        setDepartments(filteredDepartments);
      }

      // Set the record and open modal
      setSelectedRecord(record);
      setSelectedDepartment(record.department || '');

      // Pre-fill exit date and time if available
      setExitDate(record.exitDate || record.entryDate.split('T')[0]);

      if (record.exitTime) {
        // Extract time from exitTime (e.g., "2025-08-07T12:09:00.000Z" -> "12:09:00")
        const timePart = record.exitTime.split('T')[1].split('.')[0]; // "12:09:00"
        const [hours, minutes] = timePart.split(':'); // ["12", "09"]
        let hourNum = parseInt(hours);
        const period = hourNum >= 12 ? 'PM' : 'AM';
        if (hourNum > 12) {
          hourNum -= 12;
        } else if (hourNum === 0) {
          hourNum = 12;
        }
        setTimeInput({
          hours: hourNum.toString(),
          minutes: minutes,
          period: period
        });
      } else {
        setTimeInput({
          hours: '',
          minutes: '',
          period: 'PM'
        });
      }

      // Pre-fill busExit and haveFood
      setBusExit(record.busExit || false);
      setHaveFood(record.haveFood || false);
      setExitTimeError('');

      setShowExitModal(true);
    } catch (error) {
      console.error("Error fetching departments:", error);
      setErrorMessage("Failed to load departments");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phone) {
      setPhoneError('Please enter a phone number');
      return false;
    }
    if (!phoneRegex.test(phone)) {
      setPhoneError('Invalid phone number.');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleCheckPhone = async () => {
    if (!validatePhoneNumber(phoneInput)) {
      return;
    }

    try {
      setLoading(true);
      setWorkerError('');
      const token = localStorage.getItem("superadmintoken");

      const response = await axios.post(
        `${BASE_URL}/lenskart-admin/phone-details`,
        { phone: "91" + phoneInput },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setWorkerDetails({
          name: response.data.data.name,
          department: response.data.data.department,
          userId: response.data.data._id
        });
      } else {
        setWorkerError('Worker not signed up');
        setWorkerDetails(null);
      }
    } catch (error) {
      setWorkerError('Worker not signed up');
      setWorkerDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryTimeChange = (e) => {
    const { name, value } = e.target;

    if (name === 'hours' && value !== '') {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > 12) return;
    }

    if (name === 'minutes' && value !== '') {
      const num = parseInt(value);
      if (isNaN(num) || num < 0 || num > 59) return;
    }

    setEntryTimeInput(prev => ({
      ...prev,
      [name]: value
    }));

    if (entryTimeError) {
      setEntryTimeError('');
    }
  };

  const handleEntryDateChange = (e) => {
    setEntryDate(e.target.value);
    if (entryTimeError) {
      setEntryTimeError('');
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

  const handleDepartmentUpdate = async () => {
    if (!selectedDepartment) {
      setErrorMessage('Please select a department');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("superadmintoken");

      const response = await axios.post(
        `${BASE_URL}/lenskart-admin/update-department`,
        {
          attendanceId: selectedRecord.attendanceId,
          department: selectedDepartment
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setErrorMessage('Department has been updated successfully');
        setShowSuccessModal(true);

        fetchAttendanceData(1, true);
      } else {
        setErrorMessage(response.data.message || 'Failed to update department');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error updating department:', error);
      setErrorMessage(error.response?.data?.message || 'Error updating department. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
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
        attendanceId: selectedRecord.attendanceId,
        date: exitDate,
        status: 'exit',
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
        setErrorMessage('Exit time has been marked successfully');
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

  const handleEntrySubmit = async () => {
    if (!entryTimeInput.hours || !entryTimeInput.minutes) {
      setErrorMessage('Please enter both hours and minutes');
      setShowErrorModal(true);
      return;
    }

    if (!entryDate) {
      setErrorMessage('Please select an entry date');
      setShowErrorModal(true);
      return;
    }

    if (!validateEntryDateTime()) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("superadmintoken");

      const time24h = convertTo24HourWithSeconds(
        entryTimeInput.hours,
        entryTimeInput.minutes.padStart(2, '0'),
        entryTimeInput.period
      );

      const entryDateTime = new Date(`${entryDate}T${time24h}.000Z`).toISOString();

      const payload = {
        userId: workerDetails.userId,
        date: entryDate,
        status: 'entry',
        entryTime: entryDateTime,
        busEntry: busEntry
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
        setErrorMessage('Entry time has been marked successfully');
        setShowSuccessModal(true);
        setShowEntryModal(false);
        setWorkerDetails(null);
        setPhoneInput('');
        setBusEntry(false);
      } else {
        setErrorMessage(response.data.message || 'Failed to record entry time');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error recording entry time:', error);
      setErrorMessage(error.response?.data?.message || 'Error recording entry time. Please try again.');
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

  // Set default entry date when modal opens
  useEffect(() => {
    if (showEntryModal) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const currentHour = today.getHours();
      const defaultDate = currentHour < 12 ? today.toISOString().split('T')[0] : yesterday.toISOString().split('T')[0];
      setEntryDate(defaultDate);
    }
  }, [showEntryModal]);

  // Get today and yesterday dates for limiting calendar
  const getAllowedDates = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      today: today.toISOString().split('T')[0],
      yesterday: yesterday.toISOString().split('T')[0]
    };
  };

  const { today, yesterday } = getAllowedDates();

  // Set default entry date when modal opens
  useEffect(() => {
    if (showEntryModal) {
      // Always default to today's date
      setEntryDate(today);
    }
  }, [showEntryModal, today]);

  // Handle image load completion
  const handleImageLoad = (photoUrl) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [photoUrl]: false
    }));
  };

  return (
    <div className="min-h-screen overflow-y-auto pt-16 bg-gray-100 p-0">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-lg p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">View Attendance</h2>

        <div className="mb-4">
          {/* Desktop/Tablet Layout (sm and above) */}
          <div className="hidden sm:block">
            <div className="flex gap-2 mb-2">
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

              <div className="flex items-end">
                <button
                  onClick={handleApply}
                  disabled={!fromDate || !toDate || loading}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <span>Apply</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-start">
              <button
                onClick={() => setShowEntryModal(true)}
                className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center justify-center gap-1"
              >
                <LogIn className="h-4 w-4" />
                <span>Mark Entry</span>
              </button>
            </div>
          </div>

          {/* Mobile Layout (below sm) */}
          <div className="block sm:hidden">
            <div className="flex gap-2 mb-2">
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

            <div className="flex justify-between">
              <button
                onClick={() => setShowEntryModal(true)}
                className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center justify-center gap-1"
              >
                <span>Mark Entry</span>
              </button>

              <button
                onClick={handleApply}
                disabled={!fromDate || !toDate || loading}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <span>Apply</span>
                  </>
                )}
              </button>
            </div>
          </div>
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
              <thead className="sticky top-0 bg-white shadow-md z-10">
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
                            <div className="relative w-12 h-12">
                              {imageLoadingStates[record.profilePhotoUrl] && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-full">
                                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                </div>
                              )}
                              <img
                                src={record.profilePhotoUrl}
                                alt="Profile"
                                className={`w-12 h-12 rounded-full object-fill cursor-pointer border border-gray-300 hover:opacity-80 transition-opacity ${imageLoadingStates[record.profilePhotoUrl] ? 'opacity-0' : 'opacity-100'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPhotoModal(record.profilePhotoUrl);
                                }}
                                onLoad={() => handleImageLoad(record.profilePhotoUrl)}
                                onError={() => handleImageLoad(record.profilePhotoUrl)}
                              />
                            </div>
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
                            <Bus className="h-4 w-4 text-[#3D5A80]" title="Used bus service for entry" />
                          )}
                        </div>
                        <div className="ml-2 text-xs text-gray-600">{formatTimeToIST(record.entryTime)}</div>
                      </td>
                      <td className="p-2 text-center">
  <div className="flex items-center justify-center gap-2">
    {/* Left side - Date and Time rows */}
    <div className="flex flex-col items-center">
      {/* Date row with bus icon */}
      <div className="flex items-center justify-center gap-1">
        <div className="font-medium">{formatDateToDisplay(record.exitDate)}</div>
        {record.exitTime && record.busExit && (
          <Bus className="h-4 w-4 text-[#3D5A80]" title="Used bus service for exit" />
        )}
      </div>
      
      {/* Time row with food icon */}
      <div className="flex items-center justify-center gap-1">
        {record.exitTime ? (
          <>
            <span className="text-xs text-gray-600">{formatTimeToIST(record.exitTime)}</span>
            {record.haveFood && (
              <UtensilsCrossed className="h-4 w-4 text-[#F4A261]" title="Availed food service" />
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

    {/* Right side - Modify icon centered vertically */}
    {record.exitTime && record.payment?.status?.toLowerCase() === 'pending' && (
      <Edit
        className="h-4 w-4 text-black cursor-pointer hover:text-gray-700"
        onClick={(e) => handleExitClick(record, e)}
        title="Modify Exit Time"
      />
    )}
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
            <div className="relative max-w-md">
              <button
                onClick={closePhotoModal}
                className="absolute -top-4 -right-4 bg-white rounded-full p-2 hover:bg-gray-100 z-10"
              >
                <X size={24} className="text-gray-600" />
              </button>
              <div className="relative">
                {isModalImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                )}
                <img
                  src={selectedPhoto}
                  alt="Profile"
                  className={`w-full h-auto rounded-lg max-h-[80vh] object-fill ${isModalImageLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setIsModalImageLoading(false)}
                  onError={() => setIsModalImageLoading(false)}
                />
              </div>
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

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Worker Name: <span className="font-medium">{selectedRecord?.name}</span>
                  </p>

                  {/* Department Section */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <button
                          onClick={() => setIsDeptOpen(!isDeptOpen)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md text-left flex justify-between items-center"
                        >
                          {selectedDepartment || 'Select Department'}
                          <svg
                            className={`h-4 w-4 transform transition-transform ${isDeptOpen ? 'rotate-180' : ''}`}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {isDeptOpen && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-48 overflow-auto border border-gray-300">
                            {departments.map((dept, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setSelectedDepartment(dept);
                                  setIsDeptOpen(false);
                                }}
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-indigo-100 ${selectedDepartment === dept ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                              >
                                {dept}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDepartmentUpdate}
                      disabled={loading || !selectedDepartment}
                      className="mt-4 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                    >
                      Update Department
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exit Date
                    </label>
                    <input
                      type="date"
                      value={exitDate}
                      onChange={handleExitDateChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exit Time
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

                  <div className="flex items-start mb-3">
                    <input
                      type="checkbox"
                      id="busExit"
                      checked={busExit}
                      onChange={(e) => setBusExit(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="busExit" className="ml-2 block text-sm text-gray-700">
                      Taken Factorykaam Bus Service
                    </label>
                  </div>

                  <div className="flex items-start mb-4">
                    <input
                      type="checkbox"
                      id="havefood"
                      checked={haveFood}
                      onChange={(e) => setHaveFood(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="haveFood" className="ml-2 block text-sm text-gray-700">
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

                  <button
                    onClick={handleExitSubmit}
                    disabled={loading || !timeInput.hours || !timeInput.minutes || !exitDate}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Mark Exit Time'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entry Time Modal */}
        {showEntryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Mark Entry Time</h3>
                <X
                  className="h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setShowEntryModal(false);
                    setBusEntry(false);
                    setWorkerDetails(null);
                    setPhoneInput('');
                    setPhoneError('');
                    setWorkerError('');
                    setEntryDate('');
                    setEntryTimeInput({ hours: '', minutes: '', period: 'AM' });
                  }}
                />
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="mb-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={phoneInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d{0,10}$/.test(value)) {
                              setPhoneInput(value);
                              setPhoneError('');
                              setWorkerError('');
                            }
                          }}
                          placeholder="Enter worker phone number"
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex justify-start">
                        <button
                          onClick={handleCheckPhone}
                          disabled={!phoneInput || phoneInput.length !== 10}
                          className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                        >
                          Check
                        </button>
                      </div>
                      {phoneError && (
                        <div className="text-red-500 text-sm mt-1">{phoneError}</div>
                      )}
                      {workerError && (
                        <div className="text-red-500 text-sm mt-1">{workerError}</div>
                      )}
                    </div>
                  </div>

                  {workerDetails && (
                    <>
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          Worker Name: <span className="font-medium">{workerDetails.name}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Department: <span className="font-medium">{workerDetails.department}</span>
                        </p>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Entry Date
                        </label>
                        <input
                          type="date"
                          value={entryDate}
                          onChange={handleEntryDateChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                          min={yesterday}
                          max={today}
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Entry Time
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            name="hours"
                            value={entryTimeInput.hours}
                            onChange={handleEntryTimeChange}
                            placeholder="HH"
                            min="1"
                            max="12"
                            className="w-16 px-3 py-2 border border-gray-300 rounded-md text-center"
                          />
                          <span>:</span>
                          <input
                            type="number"
                            name="minutes"
                            value={entryTimeInput.minutes}
                            onChange={handleEntryTimeChange}
                            placeholder="MM"
                            min="0"
                            max="59"
                            className="w-16 px-3 py-2 border border-gray-300 rounded-md text-center"
                          />
                          <select
                            name="period"
                            value={entryTimeInput.period}
                            onChange={handleEntryTimeChange}
                            className="w-20 px-2 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-start mb-4">
                        <input
                          type="checkbox"
                          id="busEntry"
                          checked={busEntry}
                          onChange={(e) => setBusEntry(e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                        />
                        <label htmlFor="busEntry" className="ml-2 block text-sm text-gray-700">
                          Taken Factorykaam Bus Service
                        </label>
                      </div>

                      {entryTimeError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md mb-4">
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="text-sm">{entryTimeError}</span>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleEntrySubmit}
                        disabled={loading || !entryTimeInput.hours || !entryTimeInput.minutes || !entryDate}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Mark Entry Time'
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
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
                <p className="text-gray-600 mb-6">{errorMessage}</p>
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
