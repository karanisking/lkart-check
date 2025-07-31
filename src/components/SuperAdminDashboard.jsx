import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios"
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";

const BASE_URL = process.env.REACT_APP_BASE_URL;

// Custom Modal Component
const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

const CustomDropdown = ({ options, selected, onSelect, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={`p-2 border border-gray-300 rounded cursor-pointer flex justify-between items-center ${
          disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span>{selected || placeholder}</span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full max-h-[200px] overflow-y-auto border border-gray-300 rounded-md bg-white shadow-lg">
          {options.map((option, index) => (
            <div
              key={index}
              className={`px-3 py-2 cursor-pointer ${selected === option ? 'bg-[#c37feb]' : 'hover:bg-gray-100'}`}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [workers, setWorkers] = useState({ attendance: [], totalWorkers: -1 });
  const [showInterested, setShowInterested] = useState(false);
  const [filterApplied, setFilterApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [showWorkersModal, setShowWorkersModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [csvDownloaded, setCsvDownloaded] = useState(false);
  
  const modalContentRef = useRef(null);

  // Function to format slot for display
  const formatSlotForDisplay = (slot) => {
    return `${slot.start_time} to ${slot.end_time}`;
  };

  // Function to format slot for backend (URL encoding)
  const formatSlotForBackend = (slot) => {
    return slot.replace(/ to /g, ' - ').replace(/ /g, '%20');
  };

  // Fetch time slots based on selected department
  const fetchTimeSlots = async (department) => {
    if (!department) {
      setTimeSlots([]);
      return;
    }

    try {
      setFetchingSlots(true);
      const response = await fetch(`${BASE_URL}/lenskart/department-dropdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          department: department
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      if (data.success && data.timeSlots) {
        // Format slots for display
        const formattedSlots = data.timeSlots.map(slot => formatSlotForDisplay(slot));
        setTimeSlots(formattedSlots);
      } else {
        setTimeSlots([]);
        toast.error('No time slots available for this department');
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      toast.error('Failed to load time slots. Please try again.');
      setTimeSlots([]);
    } finally {
      setFetchingSlots(false);
    }
  };

  const verifyTokenWithAuth = useCallback(async (authToken) => {
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if(response.data?.error?.name === "TokenExpiredError"){
        localStorage.removeItem('superadmintoken');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('superadmintoken');
      return false;
    }
  }, []); 

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

  const fetchDepartments = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/lenskart/department`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.departments)) {
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle department selection
  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    setSelectedSlot(""); // Reset slot selection
    setFilterApplied(false); // Reset filter status
    setWorkers({ attendance: [], totalWorkers: -1 }); // Reset workers data
    fetchTimeSlots(department);
  };

  const fetchWorkers = async (page = 1, append = false) => {
    const token = localStorage.getItem("superadmintoken");
    const formattedSlot = formatSlotForBackend(selectedSlot);
    
    try {
      const countResponse = await fetch(
        `${BASE_URL}/lenskart-admin/workers?date=${selectedDate}&shift=${formattedSlot}&department=${selectedDepartment}&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const countData = await countResponse.json();
      const totalItems = countData.pagination.totalItems || 1;
      
      const response = await fetch(
        `${BASE_URL}/lenskart-admin/workers?date=${selectedDate}&shift=${formattedSlot}&department=${selectedDepartment}&limit=${totalItems}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const data = await response.json();
      setMessageSent(false);
      setCsvDownloaded(false);
      
      if (append) {
        setWorkers(prev => ({
          ...data,
          attendance: [...prev.attendance, ...data.attendance]
        }));
      } else {
        setWorkers(data);
      }
      
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.currentPage);
      return data;
    } catch (error) {
      console.error("Error fetching workers:", error);
      toast.error("Failed to fetch workers");
    }
  };

  const handleDownloadCSV = async () => {
    if (!filterApplied) {
      toast.error("Please apply filters first.");
      return;
    }

    const token = localStorage.getItem("superadmintoken");
    const formattedSlot = formatSlotForBackend(selectedSlot);

    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/lenskart-admin/workers/export-csv?date=${selectedDate}&shift=${formattedSlot}&department=${selectedDepartment}&isPresent=false&sendWhatsapp=false`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const textData = await response.text();
      const blob = new Blob([textData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `workers_${selectedDate}_${selectedDepartment.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setCsvDownloaded(true);
      toast.success("Worker CSV downloaded successfully");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error(error.message || "Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!filterApplied) {
      toast.error("Please apply filters first.");
      return;
    }

    const token = localStorage.getItem("superadmintoken");
    const formattedSlot = formatSlotForBackend(selectedSlot);

    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/lenskart-admin/workers/export-csv?date=${selectedDate}&shift=${formattedSlot}&department=${selectedDepartment}&isPresent=false&sendWhatsapp=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send messages');
      }

      setMessageSent(true);
      toast.success("WhatsApp messages sent successfully");
    } catch (error) {
      console.error("Error sending messages:", error);
      toast.error(error.message || "Failed to send messages");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = async () => {
    if (!selectedDate || !selectedSlot || !selectedDepartment) {
      toast.error("Please fill all fields.");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchWorkers(0, false);
      setFilterApplied(true);
      toast.success("Filters applied successfully.");
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error(error.message || "An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = async (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      if (!loadingMore && currentPage < totalPages) {
        setLoadingMore(true);
        await fetchWorkers(currentPage + 1, true);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const modalContent = modalContentRef.current;
    if (modalContent) {
      modalContent.addEventListener('scroll', handleScroll);
      return () => modalContent.removeEventListener('scroll', handleScroll);
    }
  }, [currentPage, totalPages, loadingMore]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 pt-16">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-4xl">
        <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
          Super Admin Dashboard
        </h2>

        {/* Desktop layout - single row */}
        <div className="hidden sm:flex sm:space-x-6 mb-6">
          <div className="flex flex-col space-y-2 w-1/3">
            <label className="text-sm font-medium">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border border-gray-300 rounded"
            />
          </div>

          <div className="flex flex-col space-y-2 w-1/3">
            <label className="text-sm font-medium">Select Department:</label>
            <CustomDropdown
              options={departments}
              selected={selectedDepartment}
              onSelect={handleDepartmentSelect}
              placeholder="Select Department"
            />
          </div>

          <div className="flex flex-col space-y-2 w-1/3">
            <label className="text-sm font-medium">
              Select Time Slot:
              {fetchingSlots && (
                <span className="text-xs text-blue-600 ml-1">(Loading...)</span>
              )}
            </label>
            <CustomDropdown
              options={timeSlots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
              placeholder={
                !selectedDepartment 
                  ? "Select Time Slot" 
                  : fetchingSlots 
                    ? "Loading slots..." 
                    : timeSlots.length === 0 
                      ? "No slots available"
                      : "Select Time Slot"
              }
              disabled={!selectedDepartment || fetchingSlots || timeSlots.length === 0}
            />
          </div>
        </div>

        {/* Mobile layout - vertical */}
        <div className="flex flex-col space-y-4 sm:hidden mb-6">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border border-gray-300 rounded"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Select Department:</label>
            <CustomDropdown
              options={departments}
              selected={selectedDepartment}
              onSelect={handleDepartmentSelect}
              placeholder="Select Department"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">
              Select Time Slot:
              {fetchingSlots && (
                <span className="text-xs text-blue-600 ml-1">(Loading...)</span>
              )}
            </label>
            <CustomDropdown
              options={timeSlots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
              placeholder={
                !selectedDepartment 
                  ? "Select Time Slot" 
                  : fetchingSlots 
                    ? "Loading slots..." 
                    : timeSlots.length === 0 
                      ? "No slots available"
                      : "Select Time Slot"
              }
              disabled={!selectedDepartment || fetchingSlots || timeSlots.length === 0}
            />
          </div>
        </div>

        <div className="flex items-center justify-center mt-4 sm:mt-0 w-full sm:w-auto">
          <button
            onClick={handleFilterApply}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={loading || !selectedDate || !selectedDepartment || !selectedSlot}
          >
            {loading ? "Applying..." : "Apply Filters"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between mb-4 mt-4">
          <div className="flex flex-col items-start sm:w-1/2 w-full mb-4 sm:mb-0">
            {workers.totalWorkers >= 0 && (
              <>
                <p className="text-sm font-medium">
                  Total Workers: {workers.totalWorkers}
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() => setShowWorkersModal(true)}
                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                  >
                    View Workers
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-row items-center justify-center gap-4 mt-4">
          <button
            onClick={handleDownloadCSV}
            className="bg-green-500 text-white px-2 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            disabled={loading || csvDownloaded || !filterApplied}
          >
            {loading ? "Processing..." : csvDownloaded ? "CSV Downloaded" : "Download CSV"}
          </button>
          <button
            onClick={handleSendMessage}
            className="bg-[#25D366] text-white px-2 py-2 rounded hover:bg-[#128C7E] disabled:opacity-50"
            disabled={loading || messageSent || !filterApplied}
          >
            {loading ? "Processing..." : messageSent ? "Message Sent" : "Send Message"}
          </button>
        </div>

        {/* Show selected department info */}
      

        <Modal
          isOpen={showWorkersModal}
          onClose={() => setShowWorkersModal(false)}
          title="Workers List"
        >
          <div 
            ref={modalContentRef}
            className="overflow-y-auto p-4"
            style={{ maxHeight: "calc(80vh - 4rem)" }}
          >
            <div className="space-y-4">
              {workers.attendance.map((worker, index) => (
                <div
                  key={worker.workerId + index}
                  className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{worker.name}</h3>
                      <p className="text-sm text-gray-600">{worker.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
              {loadingMore && (
                <div className="text-center py-4">
                  <p>Loading more workers...</p>
                </div>
              )}
            </div>
          </div>
        </Modal>

        <ToastContainer
          position="top-left"
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
          toastClassName={() =>
            "relative bg-white text-black px-4 py-3 rounded-md shadow-lg border border-gray-300 w-[98%] max-w-[98%] sm:w-72 sm:max-w-[300px] overflow-hidden"
          }
          bodyClassName={() => "flex items-center"}
          progressClassName="bg-blue-500 h-1"
          className="w-[98%] max-w-[98%] sm:w-72 sm:max-w-[300px] left-4 top-4"
        />
      </div>
    </div>
  );
          
};

export default SuperAdminDashboard;