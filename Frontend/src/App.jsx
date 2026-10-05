import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';

import Login from './auth/Login';
import DashboardLayout from './Pages/DashboardLayout';
import Dashboard from './Pages/Dashboard';
import Placeholder from './Pages/Placeholder';
import Upload from './Pages/Upload';
import Workflow from './Pages/Workflow';
import Documents from './Pages/Documents';
import AuditLog from './Pages/AuditLog';
import Analytics from './Pages/Analytics';

const isAuthenticated = () => {
  try {
    return !!localStorage.getItem('docflow_auth');
  } catch {
    return false;
  }
};

const ProtectedRoute = () => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const PublicRoute = ({ children }) => {
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="documents" element={<Documents />} />
            <Route path="upload" element={<Upload />} />
            <Route path="review" element={<Placeholder title="Review" />} />
            <Route path="workflows" element={<Workflow />} />
            <Route path="templates" element={<Placeholder title="Templates" />} />
            <Route path="integrations" element={<Placeholder title="Integrations" />} />
            <Route path="audit-logs" element={<AuditLog />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Placeholder title="Settings" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;