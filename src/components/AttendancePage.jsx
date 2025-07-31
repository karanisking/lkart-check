import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Loader2, Bus, UtensilsCrossed } from 'lucide-react';
import { AuthContext } from '../context/auth-context';
import axios from "axios";

const BASE_URL = process.env.REACT_APP_BASE_URL;

const AttendancePage = () => {
  const navigate = useNavigate();
  const { token, setToken } = useContext(AuthContext);
  const scrollContainerRef = useRef(null);
  const currentDate = new Date();
  
  // Function to get current month-year in "M-YYYY" format
  const getCurrentMonthYear = () => {
    return `${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
  };

  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentMonthYear());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalWorkingHours, setTotalWorkingHours] = useState('0');
  const fetchingRef = useRef(false); // To prevent multiple simultaneous requests

  const verifyTokenWithAuth = useCallback(async (authToken) => {
    console.log(token);
    try {
      const response = await axios.get(`${BASE_URL}/lenskart/verify-token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if(response.data?.error?.name === "TokenExpiredError"){
        localStorage.removeItem('auth_token');
        return false;
       }
      
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      return false;
    }
  }, [setToken]);
  
  useEffect(() => {
    const checkTokenValidity = async () => {
      if (!token) {
        navigate("/lkart");
        return;
      }
      
      const isTokenValid = await verifyTokenWithAuth(token);
      if (!isTokenValid) {
        navigate("/lkart");
      }
    };
    
    checkTokenValidity();
  }, [token, navigate, verifyTokenWithAuth]);

  const generateMonthYearOptions = () => {
    const options = [{ value: 'all', label: 'All Periods' }];
    const startYear = 2025;
    
    for (let year = startYear; year <= currentDate.getFullYear(); year++) {
      for (let month = 0; month < 12; month++) {
        if (year === currentDate.getFullYear() && month > currentDate.getMonth()) break;
        options.push({
          value: `${month + 1}-${year}`,
          label: `${new Date(year, month).toLocaleString('default', { month: 'short' })}, ${year}`
        });
      }
    }
    return options;
  };

  const monthYearOptions = generateMonthYearOptions();

  const fetchAttendanceData = useCallback(async (reset = false) => {
    if (fetchingRef.current || loading || (!reset && currentPage > totalPages)) return;
    
    fetchingRef.current = true;
    setLoading(true);
    
    try {
      const pageToFetch = reset ? 1 : currentPage;
      let params = { page: pageToFetch };
  
      if (selectedPeriod !== 'all') {
        const [month, year] = selectedPeriod.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA'); 
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');
        params = { ...params, startDate, endDate };
      }

      console.log(params);
  
      const response = await axios.get(`${BASE_URL}/lenskart/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
  
      const result = response.data;
      const newRecords = result.data.attendanceHistory || [];
  
      const transformedRecords = [];
      
      newRecords.forEach(record => {
        if (record.entries && record.entries.length > 0) {
          record.entries.forEach((entry, index) => {
            const entryDate = record.date;
            const exitDate = entry.exitDate || record.date;
            
            transformedRecords.push({
              id: `${record.date}-${index}`,
              entryDate: entryDate,
              entryTime: entry.entryTime,
              exitDate: exitDate,
              exitTime: entry.exitTime,
              workingHours: entry.hours ? entry.hours.toFixed(2) : '0.00',
              busEntry: entry.busEntry || false,
              busExit: entry.busExit || false,
              haveFood: entry.haveFood || false,
            });
          });
        } else {
          transformedRecords.push({
            id: record.date,
            entryDate: record.date,
            entryTime: record.firstEntry,
            exitDate: record.date,
            exitTime: record.lastExit,
            workingHours: record.workingHours ? record.workingHours.toFixed(2) : '0.00',
            busEntry: record.busEntry || false,
            busExit: record.busExit || false,
            haveFood: record.haveFood || false,
          });
        }
      });
  
      setAttendanceData(prev => reset ? transformedRecords : [...prev, ...transformedRecords]);
      setTotalWorkingHours(result.data.totalWorkingHours);
      setTotalPages(result.data.pagination.totalPages);
      
      if (!reset) {
        setCurrentPage(prev => prev + 1);
      } else {
        setCurrentPage(2);
      }
      
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [loading, currentPage, totalPages, selectedPeriod, token]);

  useEffect(() => {
    setAttendanceData([]);
    setCurrentPage(1);
    setTotalPages(1);
    fetchingRef.current = false;
    fetchAttendanceData(true);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedPeriod]);

  const handleScroll = useCallback((e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    const scrollThreshold = 100;
    
    if (scrollHeight - scrollTop - clientHeight < scrollThreshold && 
        !fetchingRef.current && 
        currentPage <= totalPages) {
      fetchAttendanceData();
    }
  }, [fetchAttendanceData, currentPage, totalPages]);

  return (
    <div className="min-h-screen overflow-y-auto pt-16 bg-gray-100 p-0">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Attendance History</h2>
        
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-800">
            Total Working Hours: {totalWorkingHours} Hr
          </div>
          
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {monthYearOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div 
          ref={scrollContainerRef} 
          className="w-full max-h-[70vh] overflow-y-auto"
          onScroll={handleScroll}
        >
          {loading && attendanceData.length === 0 ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-white shadow-md">
                <tr className="bg-gray-100">
                  <th className="p-1 pt-3 pb-3 text-center">Entry Date & Time</th>
                  <th className="p-1 pt-3 pb-3 text-center">Exit Date & Time</th>
                  <th className="p-1 pt-3 pb-3 text-center">Working Hours</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.length > 0 ? (
                  attendanceData.map(record => (
                    <tr key={record.id} className="border-b">
                      <td className="p-1 pt-3 pb-3 text-center">
                        <div className="flex items-center justify-center">
                          <span>{record.entryDate}</span>
                          {record.busEntry && (
                            <Bus className="ml-1 h-4 w-4 text-[#3D5A80]" title="Used bus service for entry" />
                          )}
                        </div>
                        <span className="text-xs text-gray-600">{record.entryTime}</span>
                      </td>
                      <td className="p-1 pt-3 pb-3 text-center">
                        {record.exitTime ? (
                          <>
                            <div className="flex items-center justify-center">
                              <span>{record.exitDate}</span>
                              {record.busExit && (
                                <Bus className="ml-1 h-4 w-4 text-[#3D5A80]" title="Used bus service for exit" />
                              )}
                            </div>
                            <div className="flex items-center justify-center">
                              <span className="text-xs text-gray-600">{record.exitTime}</span>
                              {record.haveFood && (
                                <UtensilsCrossed className="ml-1 h-4 w-4 text-[#F4A261]" title="Availed food service" />
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-red-500 font-medium">No exit</span>
                        )}
                      </td>
                      <td className="p-1 pt-3 pb-3 text-center">
                        <span>{record.workingHours} Hr</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center p-4 text-gray-500">No records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {loading && attendanceData.length > 0 && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;