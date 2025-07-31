import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from "axios";
import { Navigate, useNavigate } from 'react-router';
import { Loader2, Star, Plus, X } from 'lucide-react';

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [dateError, setDateError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [reviewData, setReviewData] = useState({
    id: null,
    stars: 0,
    discipline: '',
    qualityOfWork: '',
    behaviour: '',
    isEditing: false,
    profilePhotoUrl: null
  });
  
  const observer = useRef();
  const loadingRef = useRef(null);
  const BASE_URL = process.env.REACT_APP_BASE_URL;
  
  const verifyTokenWithAuth = useCallback(async (authToken) => {
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      localStorage.setItem("department", response.data.user.department);
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('supervisor_token');
      return false;
    }
  }, [BASE_URL]);
  
  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem("supervisor_token");
      if (!token) {
        navigate("/lkart/supervisor-login");
        return;
      }
      
      const isTokenValid = await verifyTokenWithAuth(token);
      if (!isTokenValid) {
        navigate("/lkart/supervisor-login");
      }
    };
    
    checkTokenValidity();
  }, [navigate, verifyTokenWithAuth]);

  const calculateWorkingHours = (entryTime, exitTime) => {
    if (!entryTime || !exitTime) return null;
    
    try {
      let entry, exit;
      
      if (entryTime.includes('T') && entryTime.endsWith('Z')) {
        entry = new Date(entryTime);
      } else {
        const [entryHours, entryMinutes] = entryTime.split(':');
        entry = new Date();
        entry.setHours(parseInt(entryHours), parseInt(entryMinutes || 0), 0, 0);
      }
      
      if (exitTime.includes('T') && exitTime.endsWith('Z')) {
        exit = new Date(exitTime);
      } else {
        const [exitHours, exitMinutes] = exitTime.split(':');
        exit = new Date();
        exit.setHours(parseInt(exitHours), parseInt(exitMinutes || 0), 0, 0);
      }
      
      let diff = exit - entry;
      if (diff < 0) {
        exit.setDate(exit.getDate() + 1);
        diff = exit - entry;
      }

      const hours = diff / (1000 * 60 * 60);
      const roundedHours = Math.ceil(hours * 100) / 100;

      return roundedHours.toFixed(2);
    } catch (e) {
      console.error('Error calculating working hours:', e);
      return null;
    }
  };

  const fetchAttendanceData = async (page = 1, isNewSearch = false) => {
    setLoading(true);
    try {
      const department = localStorage.getItem("department");
      const encodedDepartment = encodeURIComponent(department);
      const response = await axios.get(`${BASE_URL}/rating-lenskart/all?department=${encodedDepartment}`, {
        params: {
          page: page
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("supervisor_token")}`
        }
      });
      
      const { workers, totalPages, currentPage } = response.data;
      
      const transformedData = workers.map(worker => ({
        id: worker._id,
        name: worker.name,
        phone: worker.phone,
        profilePhotoUrl: worker.profilePhotoUrl || null,
        date: response.data.currentDate,
        entryTime: worker.attendance?.entryTime || null,
        exitTime: worker.attendance?.exitTime || null,
        workingHours: worker.attendance?.workingHours || 
                     calculateWorkingHours(worker.attendance?.entryTime, worker.attendance?.exitTime),
        review: worker.rating || null
      }));
      
      setTotalPages(totalPages);
      
      if (isNewSearch) {
        setAttendanceData(transformedData);
      } else {
        setAttendanceData(prev => [...prev, ...transformedData]);
      }
      
      setHasMore(currentPage < totalPages);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    
    try {
      if (timeString.includes('T') && timeString.endsWith('Z')) {
        const timePart = timeString.split('T')[1].split('.')[0];
        const [hours, minutes] = timePart.split(':');
        
        const hourNum = parseInt(hours);
        const ampm = hourNum >= 12 ? 'pm' : 'am';
        const hour12 = hourNum % 12 || 12;
        
        return `${hour12}:${minutes} ${ampm}`;
      }
      
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':');
        const hourNum = parseInt(hours);
        const ampm = hourNum >= 12 ? 'pm' : 'am';
        const hour12 = hourNum % 12 || 12;
        
        return `${hour12}:${minutes} ${ampm}`;
      }
      
      return timeString;
    } catch (e) {
      console.error('Error formatting time:', e);
      return timeString;
    }
  };

  const getCommentValue = (comments, key) => {
    if (!comments || !Array.isArray(comments)) return '';
    
    const commentObj = comments.find(c => c[key] !== undefined);
    if (commentObj) return commentObj[key];
    
    const keyValueComment = comments.find(c => c.key === key);
    return keyValueComment ? keyValueComment.value : '';
  };

  const handlePhotoClick = (photoUrl) => {
    setSelectedPhoto(photoUrl);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhoto('');
  };

  const openReviewModal = (id, isEditing = false) => {
    const recordToEdit = isEditing ? 
      attendanceData.find(record => record.id === id) : 
      null;
    
    const currentRecord = attendanceData.find(record => record.id === id);
    
    setReviewData({
      id,
      stars: isEditing && recordToEdit.review ? recordToEdit.review.stars : 0,
      discipline: isEditing && recordToEdit.review ? getCommentValue(recordToEdit.review.comment, 'Discipline') : '',
      qualityOfWork: isEditing && recordToEdit.review ? getCommentValue(recordToEdit.review.comment, 'Quality of Work') : '',
      behaviour: isEditing && recordToEdit.review ? getCommentValue(recordToEdit.review.comment, 'Behaviour') : '',
      isEditing,
      profilePhotoUrl: currentRecord?.profilePhotoUrl || null
    });
    
    setShowReviewModal(true);
  };

  const handleStarClick = (rating) => {
    setReviewData({
      ...reviewData,
      stars: rating,
    });
  };

  const handleInputChange = (e, field) => {
    setReviewData({
      ...reviewData,
      [field]: e.target.value,
    });
  };

  const submitReview = async () => {
    try {
      let comment = [];

      if (reviewData.stars <= 3) {
        if (reviewData.discipline) {
          comment.push({ "Discipline": reviewData.discipline });
        }
        if (reviewData.qualityOfWork) {
          comment.push({ "Quality of Work": reviewData.qualityOfWork });
        }
        if (reviewData.behaviour) {
          comment.push({ "Behaviour": reviewData.behaviour });
        }
      }
      
      const requestData = {
        workerId: reviewData.id,
        stars: reviewData.stars,
        ...(comment.length > 0 && { comment })
      };

      const endpoint = `${BASE_URL}/rating-lenskart/add`;
      
      await axios.post(endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("supervisor_token")}`
        }
      });
      
      setAttendanceData(prev => 
        prev.map(record => 
          record.id === reviewData.id 
            ? {
                ...record,
                review: {
                  stars: reviewData.stars,
                  comment: comment,
                  submitted: true
                }
              }
            : record
        )
      );
      
      setShowReviewModal(false);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 1000);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  useEffect(() => {
    if (currentPage > 1 && hasMore) {
      fetchAttendanceData(currentPage);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchAttendanceData(1, true);
  }, []);

  return (
    <div className="min-h-screen overflow-y-auto pt-16 bg-gray-100 p-0">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-4">
      
        <h2 className="text-2xl font-bold text-center mb-4">Supervisor Dashboard</h2>
        
        {/* Second row - Right-aligned button */}
        <div className="flex justify-end mb-5">
          <button
            onClick={() => navigate("/lkart/supervisor/requirements")}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <span>Add/View Requirement</span>
          </button>
        </div>
        
        <div className="w-full max-h-[75vh] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-white shadow-md">
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name <br /> (Phone No.)</th>
                <th className="p-2 text-center">Date</th>
                <th className="p-2 text-center">Entry Time</th>
                <th className="p-2 text-center">Exit Time</th>
                <th className="p-2 text-center">Working Hour</th>
                <th className="p-2 text-center">Rating</th>
              </tr>
            </thead>
            <tbody>
              {loading && currentPage === 1 ? (
                <tr>
                  <td colSpan="6" className="text-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : attendanceData.length > 0 ? (
                attendanceData.map((record, index) => (
                  <tr 
                    key={index} 
                    ref={index === attendanceData.length - 1 ? lastElementRef : null}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-2 text-left min-w-[140px]">
                      <div className="flex items-center">
                      {record.profilePhotoUrl && (
                          <img
                            src={record.profilePhotoUrl}
                            alt="Profile"
                            className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handlePhotoClick(record.profilePhotoUrl)}
                          />
                        )}
                        <div className="ml-2 ">
                          <div className="font-medium">{record.name}</div>
                          <div className="text-xs text-gray-500">{record.phone}</div>
                        </div>
                      
                      </div>
                    </td>
                    <td className="p-2 text-center">{formatDate(record.date)}</td>
                    <td className="p-2 text-center">{formatTime(record.entryTime)}</td>
                    <td className="p-2 text-center">{formatTime(record.exitTime)}</td>
                    <td className="p-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs">
                          {record.workingHours !== null ? `${record.workingHours} hrs` : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      {record.review ? (
                        <div className="flex justify-center gap-0.5" >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={16}
                              onClick={() => openReviewModal(record.id, true)}
                              fill={star <= record.review.stars ? "#FFD700" : "none"}
                              color={star <= record.review.stars ? "#FFD700" : "#D1D5DB"}
                              className='cursor-pointer'
                            />
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => openReviewModal(record.id, false)}
                          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Add Rating
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center p-4 text-gray-500">
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
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
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

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">
              {reviewData.isEditing ? "Update Worker Rating" : "Add Worker Rating"}
            </h3>
            
            {/* Show profile photo in review modal */}
            {reviewData.profilePhotoUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={reviewData.profilePhotoUrl}
                  alt="Worker Profile"
                  className="w-full h-auto rounded-lg max-h-[80vh] object-contain"
                  onClick={() => handlePhotoClick(reviewData.profilePhotoUrl)}
                />
              </div>
            )}
            
            <div className="flex justify-center mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={32}
                  className="cursor-pointer"
                  onClick={() => handleStarClick(star)}
                  fill={star <= reviewData.stars ? "#FFD700" : "none"}
                  color={star <= reviewData.stars ? "#FFD700" : "#D1D5DB"}
                />
              ))}
            </div>
            
            {reviewData.stars > 0 && reviewData.stars <= 3 && (
              <div className="mb-4 space-y-3">
                <div className="grid grid-cols-6 items-center">
                  <label className="col-span-2 text-sm font-medium text-gray-700">
                    Discipline:
                  </label>
                  <input
                    type="text"
                    value={reviewData.discipline}
                    onChange={(e) => handleInputChange(e, 'discipline')}
                    className="col-span-4 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter discipline feedback"
                  />
                </div>
                
                <div className="grid grid-cols-6 items-center">
                  <label className="col-span-2 text-sm font-medium text-gray-700">
                    Quality of Work:
                  </label>
                  <input
                    type="text"
                    value={reviewData.qualityOfWork}
                    onChange={(e) => handleInputChange(e, 'qualityOfWork')}
                    className="col-span-4 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter quality feedback"
                  />
                </div>
                
                <div className="grid grid-cols-6 items-center">
                  <label className="col-span-2 text-sm font-medium text-gray-700">
                    Behaviour:
                  </label>
                  <input
                    type="text"
                    value={reviewData.behaviour}
                    onChange={(e) => handleInputChange(e, 'behaviour')}
                    className="col-span-4 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter behaviour feedback"
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={reviewData.stars === 0 || (reviewData.stars <= 3 && !reviewData.discipline && !reviewData.qualityOfWork && !reviewData.behaviour)}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {reviewData.isEditing ? "Update" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-green-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">
              {reviewData.isEditing ? "Rating updated successfully!" : "Rating recorded successfully!"}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboard;