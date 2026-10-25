import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { AiChatDrawer } from './components/common/AiChatDrawer';

// Lazy-loaded Pages for Route Code-Splitting and Optimal TTI
const SetupWizardPage = lazy(() => import('./pages/SetupWizardPage').then((m) => ({ default: m.SetupWizardPage })));
const RegisterCompanyPage = lazy(() => import('./pages/RegisterCompanyPage').then((m) => ({ default: m.RegisterCompanyPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const HrDashboardPage = lazy(() => import('./pages/HrDashboardPage').then((m) => ({ default: m.HrDashboardPage })));
const EmployeeDashboardPage = lazy(() => import('./pages/EmployeeDashboardPage').then((m) => ({ default: m.EmployeeDashboardPage })));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const AttendancePage = lazy(() => import('./pages/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const LeavesPage = lazy(() => import('./pages/LeavesPage').then((m) => ({ default: m.LeavesPage })));
const PayrollPage = lazy(() => import('./pages/PayrollPage').then((m) => ({ default: m.PayrollPage })));
const OrganizationSettingsPage = lazy(() => import('./pages/OrganizationSettingsPage').then((m) => ({ default: m.OrganizationSettingsPage })));
const CommsAuditPage = lazy(() => import('./pages/CommsAuditPage').then((m) => ({ default: m.CommsAuditPage })));

const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, token, isLoading, isSetupComplete } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If first-run setup is not completed, redirect to wizard
  if (!isSetupComplete) {
    return <Navigate to="/setup" replace />;
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force password change on temporary passwords
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's permitted dashboard
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main App Layout with Sidebar, Navbar, and AI Drawer
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col flex-1 transition-all">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenAiChat={() => setIsAiDrawerOpen(true)}
        />

        <main className="flex-1 pb-16">{children}</main>
      </div>

      <AiChatDrawer isOpen={isAiDrawerOpen} onClose={() => setIsAiDrawerOpen(false)} />
    </div>
  );
};

// Role-based Root Redirector
const RootRedirect: React.FC = () => {
  const { user, token, isSetupComplete } = useAuth();
  if (!isSetupComplete) return <Navigate to="/setup" replace />;
  if (!token || !user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public & Auth Routes */}
          <Route path="/setup" element={<SetupWizardPage />} />
          <Route path="/register-company" element={<RegisterCompanyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Admin Dashboard */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <AdminDashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* HR Dashboard */}
          <Route
            path="/hr/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr']}>
                <AppLayout>
                  <HrDashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Employee Dashboard */}
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <EmployeeDashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Employees Directory */}
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <EmployeesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Attendance Management */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AttendancePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Leaves Management */}
          <Route
            path="/leaves"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <LeavesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Payroll Lite */}
          <Route
            path="/payroll"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PayrollPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Organization Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hr']}>
                <AppLayout>
                  <OrganizationSettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Communications & Audit */}
          <Route
            path="/comms"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CommsAuditPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
