import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Loader2 } from 'lucide-react';
import axios from 'axios';

const ViewWorkerRating = () => {
    const navigate = useNavigate();
    const [workerData, setWorkerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const BASE_URL = process.env.REACT_APP_BASE_URL;
    
    const verifyTokenWithAuth = useCallback(async (authToken) => {
 
        try {
          // Simplified request that only checks token validity
          const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });

          if(response.data?.error?.name === "TokenExpiredError"){
            localStorage.removeItem('superadmintoken');
            return false;
           }
          
          // Only check if the request was successful, indicating a valid token
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
          
          // Verify token validity
          const isTokenValid = await verifyTokenWithAuth(token);
          
          if (!isTokenValid) {
            // Token is invalid/expired - already removed in verifyTokenWithAuth
            navigate("/lkart/superadmin/");
          }
          // If token is valid, stay on current page
        };
        
        checkTokenValidity();
      }, [navigate, verifyTokenWithAuth]);

    // Extract userId from URL using window.location
    const urlPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const limit = 30;
    
    // Extract userId from the path that looks like "lkart/superadmin/view-rating/${userId}"
    const pathParts = urlPath.split('/');
    const userId = pathParts[pathParts.length - 1];

    useEffect(() => {
        const fetchWorkerRatings = async () => {
          
            try {
                const token = localStorage.getItem("superadmintoken");
                if (!token) {
                    navigate("/lkart/superadmin/");
                    return;
                }

                const response = await axios.get(`${BASE_URL}/rating-lenskart/worker/${userId}?limit=${limit}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                
                
                
                const data = await response.data;
                console.log("Data is",data);
                if (response.data.success) {
                    setWorkerData(response.data.worker);
                } else {
                    setError("Failed to fetch worker data");
                }
            } catch (err) {
                setError("An error occurred while fetching data");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkerRatings();
    }, [userId, navigate, limit]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const renderStars = (rating) => {
        return Array(5).fill(0).map((_, index) => (
            <Star
                key={index}
                className={`h-5 w-5 ${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
        ));
    };

    const renderFeedbackCategories = (stars, comment) => {
        // Check if comment is an array with the new structure
        const isNewCommentFormat = Array.isArray(comment) && comment.length > 0;
        
        // For ratings of 3 stars and above with new structure, show the feedback
        if (stars >= 3 && isNewCommentFormat) {
            return (
                <div className="space-y-1">
                    {comment.map((commentItem, index) => (
                        <div key={index} className="space-y-0 pb-0  border-gray-200">
                            {Object.entries(commentItem).map(([category, value]) => (
                                <div key={category}>
                                    <span className="font-semibold">{category}:</span> {value}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            );
        }
        
        // For ratings of 3 stars and above with old structure (string comment)
        if (stars >= 3 && !isNewCommentFormat) {
            return <span>{comment || '-'}</span>;
        }

        // For ratings below 3 stars with new structure
        if (isNewCommentFormat) {
            return (
                <div className="space-y-3">
                    {comment.map((commentItem, index) => (
                        <div key={index} className="space-y-1 pb-2 border-b border-gray-200 last:border-0">
                            {Object.entries(commentItem).map(([category, value]) => (
                                <div key={category}>
                                    <span className="font-semibold">{category}:</span> {value}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            );
        }

        // For ratings below 3 stars with old structure, use the updated categories
        return (
            <div className="space-y-1">
                <div>
                    <span className="font-semibold">Discipline:</span> {stars <= 1 ? 'Needs significant improvement' : 'Below average'}
                </div>
                <div>
                    <span className="font-semibold">Quality of Work:</span> {stars <= 2 ? 'Below expectations' : 'Average'}
                </div>
                <div>
                    <span className="font-semibold">Behaviour:</span> {stars === 1 ? 'Poor' : 'Needs improvement'}
                </div>
                <div>
                    <span className="font-semibold">Comment:</span> {comment || '-'}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen overflow-y-auto pt-16 bg-gray-100 p-0">
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-4">
                <h2 className="text-2xl font-bold mb-4 text-center">View Worker Ratings</h2>

                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center p-4 text-red-500">
                        {error}
                    </div>
                ) : workerData ? (
                    <>
                        <div className="mb-4 p-4 rounded-lg">
                            <h3 className="text-xl font-medium">Name: {workerData.name}</h3>
                            <p className="text-x; font-medium">Phone No.: {workerData.phone}</p>
                            {workerData.department && (
                                <p className="text-x; font-medium">Department: {workerData.department}</p>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-3 text-left w-[27%] md:w-[30%]">Date</th>
                                        <th className="p-3 text-left w-[18%] md:w-[30%]">Rating</th>
                                        <th className="p-3 text-left w-[55%] md:w-[40%]">Feedback</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workerData.ratings && workerData.ratings.data && workerData.ratings.data.length > 0 ? (
                                        workerData.ratings.data.map((rating, index) => (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="p-3 w-[27%] md:w-[30%]">{formatDate(rating.date)}</td>
                                                <td className="p-3 w-[18%] md:w-[30%]">
                                                    <div className="flex">{renderStars(rating.stars)}</div>
                                                </td>
                                                <td className="p-3 w-[55%] md:w-[40%]">
                                                    {renderFeedbackCategories(rating.stars, rating.comment)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="text-center p-4 text-gray-500">
                                                No ratings found for this worker
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {workerData.ratings && workerData.ratings.totalPages > 1 && (
                            <div className="mt-4 flex justify-center">
                                <div className="flex space-x-2">
                                    {Array.from({ length: workerData.ratings.totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => {
                                                // Handle pagination - you may need to update this logic
                                                const newUrl = `/lkart/superadmin/view-rating/${userId}?limit=${limit}&page=${page}`;
                                                navigate(newUrl);
                                            }}
                                            className={`px-3 py-1 rounded ${
                                                page === workerData.ratings.currentPage
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-200'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center p-4 text-gray-500">
                        Worker not found
                    </div>
                )}
            </div>
        </div>
    );
};

export default ViewWorkerRating;