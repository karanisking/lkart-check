import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import SelfieImage from './SelfiImage';
import { toast } from 'react-toastify';

const BASE_URL = process.env.REACT_APP_BASE_URL;

// Custom Dropdown Component for Time Slots
const TimeSlotDropdown = ({ slots, selectedSlots, onToggle, isSlotDisabled, fetchingSlots, authUser }) => {
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

  // Convert backend format (1 PM - 5 PM) to display format (1 PM to 5 PM)
  const formatSlotForDisplay = (slot) => {
    if (!slot || !slot.start_time || !slot.end_time) return '';
    return `${slot.start_time} to ${slot.end_time}`;
  };

  // Convert to backend format (1 PM - 5 PM)
  const formatSlotForBackend = (slot) => {
    if (!slot || !slot.start_time || !slot.end_time) return '';
    return `${slot.start_time} - ${slot.end_time}`;
  };

  const getDisplayText = () => {
    if (selectedSlots.length === 0) return 'Select time slots';
    if (selectedSlots.length === 1) return formatSlotForDisplay({ start_time: selectedSlots[0].split(' - ')[0], end_time: selectedSlots[0].split(' - ')[1] });
    return `${selectedSlots.length} slots selected`;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-colors ${
          isOpen ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 bg-white hover:bg-gray-50'
        }`}
        onClick={() => !fetchingSlots && setIsOpen(!isOpen)}
      >
        <div className="flex-1">
          <div className="text-sm text-gray-600 mt-1">
            {fetchingSlots ? 'Loading slots...' : getDisplayText()}
          </div>
        </div>
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

      {isOpen && !fetchingSlots && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="max-h-[240px] overflow-y-auto">
            {slots.length > 0 ? (
              <div className="p-2">
                {slots.map((slot, index) => {
                  const slotDisplay = formatSlotForDisplay(slot);
                  const slotBackend = formatSlotForBackend(slot);
                  const isSelected = selectedSlots.includes(slotBackend);
                  const isDisabled = isSlotDisabled(slot);

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                        isSelected
                          ? 'bg-indigo-50 border border-indigo-300'
                          : isDisabled
                          ? 'bg-gray-50 border border-gray-200 cursor-not-allowed opacity-50'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => !isDisabled && onToggle(slot)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => {}} // Handled by div onClick
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {slotDisplay}
                            </div>
                            <div className="text-xs text-gray-500">
                              {slot.slot_type || 'All days'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No time slots available for your department
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TimeSlotButton = ({ jobId, token, setUser, disabled, user }) => {
  const { user: authUser, showAadhaarModal, setShowAadhaarModal } = useAuth();
  const isFirstTime = !user?.selectedSlot || (Array.isArray(user?.selectedSlot) && user.selectedSlot.length === 0) || (typeof user?.selectedSlot === 'string' && user.selectedSlot === '0 - 0');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isEditing, setIsEditing] = useState(isFirstTime);
  const [loading, setLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [pendingSlotSubmission, setPendingSlotSubmission] = useState(false);
  const [pendingSlots, setPendingSlots] = useState('');

  // Normalize slot string for comparison
  const normalizeSlot = (slot) => {
    if (!slot) return '';
    return slot
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/\s*to\s*/g, ' - ') // Replace "to" with " - "
      .replace(/\s*-\s*/g, ' - ') // Standardize separator
      .trim()
      .replace(/^(\d+)(?=\s*(AM|PM))/, '$1:00'); // Ensure hours have :00 (e.g., "1 PM" -> "1:00 PM")
  };

  // Convert time string to minutes for comparison
  const convertTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;

    try {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes = 0] = time.split(':').map(Number);

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    } catch (error) {
      console.error('Error converting time:', error, timeStr);
      return 0;
    }
  };

  // Validate minimum shift duration (1 hour)
  const validateShiftDuration = (slot) => {
    if (!slot) return false;
    const [startStr, endStr] = slot.split(/\s+-\s+/);
    if (!startStr || !endStr) return false;
    const startMinutes = convertTimeToMinutes(startStr);
    const endMinutes = convertTimeToMinutes(endStr);

    const isOvernight = endMinutes < startMinutes;
    const duration = isOvernight ? (1440 - startMinutes) + endMinutes : endMinutes - startMinutes;

    return duration >= 60; // Minimum 1 hour
  };

  // Fetch available time slots from API
  const fetchTimeSlots = async () => {
    if (!authUser?.department) {
      setError('Department information not available');
      return;
    }

    try {
      setFetchingSlots(true);
      setError(null);

      const response = await fetch(`${BASE_URL}/lenskart/department-dropdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          department: authUser.department
        })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      if (data.success && data.timeSlots) {
       
        setAvailableSlots(data.timeSlots);
      } else {
        setError('No time slots available for your department');
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      setError('Failed to load time slots. Please try again.');
    } finally {
      setFetchingSlots(false);
    }
  };

  // Initialize selectedSlots for returning users or fetch slots for first-time users
  useEffect(() => {
    if (isFirstTime) {
      // First-time user: fetch available slots immediately
      if (authUser?.department) {
        fetchTimeSlots();
      }
      setSelectedSlots([]); // Initialize empty for first-time users
    } else {
      // Returning user: load selectedSlot directly without filtering
      const parseSlots = (slotData) => {
        try {
          let slots = [];
          if (!slotData) return slots;

          if (typeof slotData === 'string') {
            if (slotData.startsWith('[')) {
              try {
                slots = JSON.parse(slotData.replace(/'/g, '"'));
              } catch (e) {
                slots = slotData.split(',').map(s => normalizeSlot(s)).filter(s => s && s !== '0 - 0' && s !== '00 - 00');
              }
            } else {
              slots = slotData.split(',').map(s => normalizeSlot(s)).filter(s => s && s !== '0 - 0' && s !== '00 - 00');
            }
          } else if (Array.isArray(slotData)) {
            slots = slotData.map(s => normalizeSlot(s)).filter(s => s && s !== '0 - 0' && s !== '00 - 00');
          }

          return slots.filter(slot => slot && validateShiftDuration(slot));
        } catch (error) {
          console.error('Error parsing slots:', error, slotData);
          return [];
        }
      };

      const allSlots = [
        ...parseSlots(user?.selectedSlot),
        ...parseSlots(user?.selectedWeekendSlot)
      ];

  
      setSelectedSlots([...new Set(allSlots)]); // Set without filtering for returning users
      if (allSlots.length > 0) {
        setShowAadhaarModal(true);
      }
    }
  }, [user?.selectedSlot, user?.selectedWeekendSlot, isFirstTime, authUser?.department]);

  // Fetch available slots when entering edit mode for returning users
  useEffect(() => {
    if (!isFirstTime && isEditing && availableSlots.length === 0) {
      if (authUser?.department) {
        fetchTimeSlots();
      }
    }
  }, [isEditing, authUser?.department, isFirstTime]);

  // Update selectedSlots when entering edit mode to only include valid slots
  useEffect(() => {
    if (isEditing && availableSlots.length > 0) {
      const validSlots = selectedSlots.flatMap(slot => {
        // Handle case where slot is a comma-separated string
        const individualSlots = slot.split(',').map(s => normalizeSlot(s.trim())).filter(s => s);
        return individualSlots.filter(normalizedSlot =>
          availableSlots.some(availSlot => {
            const availSlotString = normalizeSlot(`${availSlot.start_time} - ${availSlot.end_time}`);
            const isValid = availSlotString === normalizedSlot;
          
            return isValid;
          })
        );
      });

   
      setSelectedSlots([...new Set(validSlots)]);
    }
  }, [isEditing, availableSlots]);

  // Check if two time slots overlap (allowing same end/start times)
  const slotsOverlap = (slot1, slot2) => {
    if (!slot1 || !slot2) return false;

    try {
      const [start1Str, end1Str] = slot1.split(/\s+-\s+/);
      const [start2Str, end2Str] = slot2.split(/\s+-\s+/);

      if (!start1Str || !end1Str || !start2Str || !end2Str) return false;

      const start1 = convertTimeToMinutes(start1Str);
      const end1 = convertTimeToMinutes(end1Str);
      const start2 = convertTimeToMinutes(start2Str);
      const end2 = convertTimeToMinutes(end2Str);

      const isOvernight1 = end1 < start1;
      const isOvernight2 = end2 < start2;

      if (isOvernight1 && isOvernight2) {
        return true;
      } else if (isOvernight1) {
        return !(end1 <= start2 && start1 >= end2);
      } else if (isOvernight2) {
        return !(end2 <= start1 && start2 >= end1);
      } else {
        return !(end1 <= start2 || start1 >= end2);
      }
    } catch (error) {
      console.error('Error checking slot overlap:', error);
      return false;
    }
  };

  // Handle slot selection
  const handleSlotToggle = (slot) => {
    const slotString = normalizeSlot(`${slot.start_time} - ${slot.end_time}`);
    if (!slotString) return;

    if (selectedSlots.includes(slotString)) {
      setSelectedSlots(prev => prev.filter(s => s !== slotString));
      setValidationError(null);
    } else {
      // Validate minimum shift duration
      if (!validateShiftDuration(slotString)) {
        setValidationError('Shift duration must be at least 1 hour');
        return;
      }

      // Check for overlaps with existing selected slots
      const hasOverlap = selectedSlots.some(existingSlot => {
        if (slotString.endsWith(existingSlot.split(/\s+-\s+/)[0])) return false;
        if (existingSlot.endsWith(slotString.split(/\s+-\s+/)[0])) return false;
        return slotsOverlap(slotString, existingSlot);
      });

      if (hasOverlap) {
        setValidationError('Selected time slots cannot overlap (except when end time matches start time)');
        return;
      }

      setSelectedSlots(prev => [...prev, slotString]);
      setValidationError(null);
    }
  };

  // Validate selections
  const validateTimeSlots = () => {
    setValidationError(null);

    if (selectedSlots.length === 0) {
      setValidationError('Please select at least one time slot');
      return false;
    }

    // Validate minimum shift duration for all selected slots
    for (const slot of selectedSlots) {
      if (!validateShiftDuration(slot)) {
        setValidationError('All shifts must be at least 1 hour long');
        return false;
      }
    }

    // Check for overlaps
    for (let i = 0; i < selectedSlots.length; i++) {
      for (let j = i + 1; j < selectedSlots.length; j++) {
        const slot1 = selectedSlots[i];
        const slot2 = selectedSlots[j];

        if ((slot1.endsWith(slot2.split(/\s+-\s+/)[0])) || (slot2.endsWith(slot1.split(/\s+-\s+/)[0]))) {
          continue;
        }

        if (slotsOverlap(slot1, slot2)) {
          setValidationError('Selected time slots cannot overlap (except when end time matches start time)');
          return false;
        }
      }
    }

    return true;
  };

  const handleSelfieSuccess = () => {
    setShowSelfieModal(false);
    toast.success('Selfie uploaded successfully!');
    if (pendingSlotSubmission) {
      submitTimeSlots(pendingSlots);
    }
  };

  const submitTimeSlots = async (shifttime) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${BASE_URL}/lenskart/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shifttime,
          job_id: jobId
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setShowAadhaarModal(true);

      if (setUser) {
        setUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            selectedSlot: data.shifttime || prev.selectedSlot,
            selectedWeekendSlot: prev.selectedWeekendSlot || '0 - 0',
            currentStatus: data.status || prev.currentStatus
          };
        });
      }

      return data;
    } catch (error) {
      console.error('Job application failed:', error);
      setError(
        error instanceof TypeError
          ? 'Network error. Please check your connection.'
          : error.name === 'SyntaxError'
          ? 'Server sent invalid data. Please try again.'
          : error.message.includes('HTTP error!')
          ? 'Server error. Please try again later.'
          : 'Failed to save time slots. Please try again.'
      );
      throw error;
    } finally {
      setLoading(false);
      setPendingSlotSubmission(false);
    }
  };

  const handleSave = async () => {
    if (!validateTimeSlots()) return;

    try {
      const validSelectedSlots = selectedSlots.filter(slot =>
        availableSlots.some(availSlot => {
          const availSlotString = normalizeSlot(`${availSlot.start_time} - ${availSlot.end_time}`);
          return availSlotString === normalizeSlot(slot);
        })
      );

      const shifttimeString = validSelectedSlots.length > 0 ? validSelectedSlots.join(', ') : '';
      
      // Check if profile photo exists
      if (!user?.profilePhotoUrl) {
        setPendingSlotSubmission(true);
        setPendingSlots(shifttimeString);
        setShowSelfieModal(true);
        return;
      }

      await submitTimeSlots(shifttimeString);
      setSelectedSlots(validSelectedSlots);
      setIsEditing(false);
    } catch (error) {
      return;
    }
  };

  // Check if slot is disabled due to overlap
  const isSlotDisabled = (slot) => {
    const slotString = normalizeSlot(`${slot.start_time} - ${slot.end_time}`);
    if (!slotString || selectedSlots.includes(slotString)) return false;

    return selectedSlots.some(existingSlot => {
      if (slotString.endsWith(existingSlot.split(/\s+-\s+/)[0])) return false;
      if (existingSlot.endsWith(slotString.split(/\s+-\s+/)[0])) return false;
      return slotsOverlap(slotString, existingSlot);
    });
  };

  // Get heading text
  const getHeadingText = () => (isEditing ? (isFirstTime ? 'Please select your preferred time slots' : 'Please select your modified time slots') : 'Selected time slots');

  // Format slot for display
  const formatSlotForDisplay = (slot) => {
    if (!slot) return '';
    return slot.replace(/\s*-\s*/g, ' to ');
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">{getHeadingText()}</h2>
        <div className="space-y-4 bg-white rounded-lg border p-4">
          {!isEditing ? (
            <>
              <div className="space-y-3">
                <div className="flex flex-col justify-between">
                  <div className="flex items-center pb-2">
                    <Clock className="h-5 w-5 text-indigo-600 mr-2" />
                    <span className="font-medium text-gray-900">Selected Shifts</span>
                  </div>
                  <div className="space-y-2">
                    {selectedSlots.length > 0 ? (
                      selectedSlots.map((slot, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {formatSlotForDisplay(slot)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No slots selected</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                disabled={disabled || loading}
                className="w-full mt-4 py-2 px-4 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {selectedSlots.length > 0 ? 'Modify Time Slots' : 'Select Time Slots'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              {fetchingSlots ? (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-600">Loading available time slots...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <TimeSlotDropdown
                    slots={availableSlots}
                    selectedSlots={selectedSlots}
                    onToggle={handleSlotToggle}
                    isSlotDisabled={isSlotDisabled}
                    fetchingSlots={fetchingSlots}
                    authUser={authUser}
                  />

                  {selectedSlots.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-1">
                        Selected Slots ({selectedSlots.length}):
                      </div>
                      <div className="text-sm text-blue-700">
                        {selectedSlots.map(s => formatSlotForDisplay(s)).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(error || validationError) && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error || validationError}
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={loading || fetchingSlots || selectedSlots.length === 0}
                  className="flex-1 bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                {!isFirstTime && (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                      setValidationError(null);
                      const allSlots = [
                        ...parseSlots(user?.selectedSlot),
                        ...parseSlots(user?.selectedWeekendSlot)
                      ];
                      setSelectedSlots([...new Set(allSlots)]);
                    }}
                    disabled={loading || fetchingSlots}
                    className="flex-1 border border-gray-300 p-2 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selfie Modal */}
      {showSelfieModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md relative">
            <SelfieImage 
              onSuccess={handleSelfieSuccess}
              onClose={() => {
                setShowSelfieModal(false);
                if (pendingSlotSubmission) {
                  setPendingSlotSubmission(false);
                }
              }}
              mandatory={true}
            />
          </div>
        </div>
      )}
    </>
  );

  function parseSlots(slotData) {
    try {
      let slots = [];
      if (!slotData) return slots;

      if (typeof slotData === 'string') {
        if (slotData.startsWith('[')) {
          try {
            slots = JSON.parse(slotData.replace(/'/g, '"'));
          } catch (e) {
            slots = slotData.split(',').map(s => normalizeSlot(s)).filter(s => s && s !== '0 - 0' && s !== '00 - 00');
          }
        } else {
          slots = slotData.split(',').map(s => normalizeSlot(s)).filter(s => s && s !== '0 - 0' && s !== '00 - 00');
        }
      } else if (Array.isArray(slotData)) {
        slots = slotData.map(s => normalizeSlot(s)).filter(s => s && s !== '0 - 0' && s !== '00 - 00');
      }

      return slots.filter(slot => slot && validateShiftDuration(slot));
    } catch (error) {
      console.error('Error parsing slots:', error, slotData);
      return [];
    }
  }
};

export default TimeSlotButton;