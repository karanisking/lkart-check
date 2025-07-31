import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Mock data for attendance
const mockAttendance = [
  {
    id: '1',
    userPhone: '1234567890',
    jobTitle: 'Software Developer Position',
    timeSlot: '9:00 AM - 12:00 PM',
    date: '2024-03-10',
    verified: true,
  },
  // Add more mock data as needed
];

const AdminDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceList] = useState(mockAttendance);
  const navigate = useNavigate();  // Use useNavigate hook

  const handleApplyNow = (userId) => {
    navigate(`/lkart/attendance?userId=${userId}`); 
  };

  return (
    <div className="min-h-screen pt-16 bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
          <div className="flex items-center space-x-4 mb-6">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Attendance Records</h2>
          <div className="space-y-4">
            {attendanceList.map((record) => (
              <div
                key={record.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">{record.userPhone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">{record.timeSlot}</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      record.verified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {record.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <button
                  onClick={() => handleApplyNow(record.userPhone)} // Pass userPhone as userId to route
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base"
                >
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
