import React from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Header from './components/Header'
import Login from './components/Login'
import AuthProvider from './context/auth-provider';
import Dashboard from './components/Dashboard';
import MarkAttendance from './components/MarkAttendance';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdmin from './components/SuperAdmin';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import View from './components/View';
import AttendancePage from './components/AttendancePage';
import PaymentHistory from './components/PaymentHistory';
import VerifyJob from './components/verifyJob';
import ViewAttendance from './components/ViewAttendance';
import SupervisorLogin from './components/SupervisorLogin';
import SupervisorDashboard from './components/SupervisorDashboard';
import ViewWrokerRating from './components/ViewWrokerRating';
import AadharProcessing from './components/AadharProcessing';
import SupervisorRequirements from './components/SupervisorRequirements';
import SuperadminCSV from './components/SuperadminCSV';
import SuperAdminRequestHistory from './components/SuperAdminRequestHistory';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Aadhar processing route - completely outside any auth context */}
        <Route path="/aadhar-processing" element={<AadharProcessing />} />
        
        {/* All other routes with auth context */}
        <Route path="/*" element={
          <>
            <Header />
            <AuthProvider>
              <Routes>
                <Route path="/lkart/" element={<Login isAdmin={false} />} />
                <Route path="/lkart/admin" element={<Login isAdmin={true} />} />
                <Route path="/lkart/superadmin" element={<SuperAdmin />} />
              
                <Route
                  path="/lkart/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/lkart/dashboard/view-attendance" element={<AttendancePage />} />
                <Route path="/lkart/dashboard/payment-history" element={<PaymentHistory />} /> 
                <Route path="/lkart/superadmin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/lkart/superadmin/view" element={<View />} /> 
                <Route path="/lkart/superadmin/upload-csv" element={<SuperadminCSV />} /> 
                <Route path="/lkart/superadmin/view-attendance" element={<ViewAttendance />} />
                <Route path="/lkart/superadmin/request-history" element={<SuperAdminRequestHistory />} />
                <Route path="/lkart/superadmin/view-rating/:id" element={<ViewWrokerRating />} />
                <Route path="/lkart/supervisor-login" element={<SupervisorLogin />} />
                <Route path="/lkart/supervisor/dashboard" element={<SupervisorDashboard />} />
                <Route path="/lkart/attendance" element={<MarkAttendance />} />
                <Route path="/lkart/admin/attendance" element={<MarkAttendance />} />
                <Route path="/lkart/supervisor/requirements" element={<SupervisorRequirements />} />
              </Routes>
            </AuthProvider>
          </>
        } />
      </Routes>
    </Router>
  )
}

export default App