import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';

// Pages
import BookingPage from './pages/BookingPage';
import BookingConfirmation from './pages/BookingConfirmation';
import CheckBooking from './pages/CheckBooking';
import Login from './pages/Login';
import SetupWizard from './pages/SetupWizard';
import Dashboard from './pages/Dashboard';
import BookingsList from './pages/BookingsList';
import BookingDetail from './pages/BookingDetail';
import NewBooking from './pages/NewBooking';
import EquipmentPage from './pages/EquipmentPage';
import SettingsPage from './pages/SettingsPage';
import PaymentsPage from './pages/PaymentsPage';
import ServicesPage from './pages/ServicesPage';
import AdminLayout from './components/admin/AdminLayout';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  return isAuthenticated ? children : <Navigate to="/admin/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfigProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '10px', background: '#333', color: '#fff' } }} />
          <Routes>
            {/* Public - Client Routes */}
            <Route path="/" element={<BookingPage />} />
            <Route path="/booking/confirmation/:bookingNumber" element={<BookingConfirmation />} />
            <Route path="/booking/check" element={<CheckBooking />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin/setup" element={<SetupWizard />} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="bookings" element={<BookingsList />} />
              <Route path="bookings/new" element={<NewBooking />} />
              <Route path="bookings/:id" element={<BookingDetail />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="equipment" element={<EquipmentPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
