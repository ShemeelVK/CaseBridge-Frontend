import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import VerifyEmail from './pages/public/VerifyEmail';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';
import { GoogleOAuthProvider } from '@react-oauth/google';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ClientDashboard from './pages/client/ClientDashboard';
import LawyerDashboard from './pages/lawyer/LawyerDashboard';
import JuniorDashboard from './pages/junior/JuniorDashboard';
import Marketplace from './pages/shared/Marketplace'; 
import CaseDetailsPage from './pages/shared/CaseDetailsPage';
import AssociatesPage from './pages/lawyer/AssociatesPage';
import ClientCasesPage from './pages/client/ClientCasesPage';
import PostCasePage from './pages/client/PostCasePage';
import FirmCasesPage from './pages/shared/FirmCasesPage';
import FirmSettingsPage from './pages/lawyer/FirmSettingsPage';
import MessagesPage from './pages/shared/MessagesPage';
import AuthCaseDetailPage from './pages/shared/AuthCaseDetailPage';

const GOOGLE_CLIENT_ID = "396025464451-hf47j93c1ce9pf694j80vpj480dt6ih7.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Landing / Default */}
            <Route path="/" element={
              <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-primary-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                  <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-law-navy opacity-[0.03] rounded-full blur-3xl"></div>
                </div>
                <h1 className="text-6xl font-serif text-law-navy z-10">CaseBridge</h1>
                <p className="text-xl text-law-slate z-10">Modern Legal Case Management</p>
                <div className="flex space-x-4 z-10">
                  <button className="btn-primary py-3 px-8 text-lg" onClick={() => window.location.href='/login'}>Sign In</button>
                  <button className="btn-gold py-3 px-8 text-lg" onClick={() => window.location.href='/register'}>Get Started</button>
                </div>
              </div>
            } />

            {/* Dashboard Routes wrapped in Layout and Protection */}
            <Route path="/" element={<DashboardLayout />}>
              
              {/* Shared Protected Routes */}
              <Route path="marketplace" element={
                <ProtectedRoute allowedRoles={['Client', 'Lawyer', 'Junior']}>
                  <Marketplace />
                </ProtectedRoute>
              } />
              
              <Route path="marketplace/case/:id" element={
                <ProtectedRoute allowedRoles={['Client', 'Lawyer', 'Junior']}>
                  <CaseDetailsPage />
                </ProtectedRoute>
              } />

              {/* Role Specific Routes */}
              <Route path="client/dashboard" element={
                <ProtectedRoute allowedRoles={['Client']}>
                  <ClientDashboard />
                </ProtectedRoute>
              } />

              <Route path="client/cases" element={
                <ProtectedRoute allowedRoles={['Client']}>
                  <ClientCasesPage />
                </ProtectedRoute>
              } />

              <Route path="client/post-case" element={
                <ProtectedRoute allowedRoles={['Client']}>
                  <PostCasePage />
                </ProtectedRoute>
              } />

              <Route path="client/cases/:id" element={
                <ProtectedRoute allowedRoles={['Client']}>
                  <AuthCaseDetailPage />
                </ProtectedRoute>
              } />
              
              <Route path="client/messages" element={
                <ProtectedRoute allowedRoles={['Client']}>
                  <MessagesPage />
                </ProtectedRoute>
              } />
              
              <Route path="lawyer/dashboard" element={
                <ProtectedRoute allowedRoles={['Lawyer']}>
                  <LawyerDashboard />
                </ProtectedRoute>
              } />
              <Route path="lawyer/associates" element={
                <ProtectedRoute allowedRoles={['Lawyer']}>
                  <AssociatesPage />
                </ProtectedRoute>
              } />

              <Route path="lawyer/cases" element={
                <ProtectedRoute allowedRoles={['Lawyer']}>
                  <FirmCasesPage />
                </ProtectedRoute>
              } />

              <Route path="lawyer/cases/:id" element={
                <ProtectedRoute allowedRoles={['Lawyer']}>
                  <AuthCaseDetailPage />
                </ProtectedRoute>
              } />

              <Route path="lawyer/settings" element={
                <ProtectedRoute allowedRoles={['Lawyer']}>
                  <FirmSettingsPage />
                </ProtectedRoute>
              } />

              <Route path="lawyer/messages" element={
                <ProtectedRoute allowedRoles={['Lawyer']}>
                  <MessagesPage />
                </ProtectedRoute>
              } />

              <Route path="junior/dashboard" element={
                <ProtectedRoute allowedRoles={['Junior']}>
                  <JuniorDashboard />
                </ProtectedRoute>
              } />

              <Route path="junior/cases" element={
                <ProtectedRoute allowedRoles={['Junior']}>
                  <FirmCasesPage />
                </ProtectedRoute>
              } />

              <Route path="junior/cases/:id" element={
                <ProtectedRoute allowedRoles={['Junior']}>
                  <AuthCaseDetailPage />
                </ProtectedRoute>
              } />

              <Route path="junior/messages" element={
                <ProtectedRoute allowedRoles={['Junior']}>
                  <MessagesPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
