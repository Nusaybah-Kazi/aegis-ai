// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'

import MyRequests from './pages/MyRequests'
import Login          from './pages/Login'
import Register       from './pages/Register'
import Dashboard      from './pages/Dashboard'
import AgentInventory from './pages/AgentInventory'
import AgentDetail    from './pages/AgentDetail'
import RuntimeGateway from './pages/RuntimeGateway'
import AuditTrail     from './pages/AuditTrail'
import ComplianceChat from './pages/ComplianceChat'

function AppShell({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/dashboard' : '/chat'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Admin-only routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AppShell><Dashboard /></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/agents" element={
          <ProtectedRoute requiredRole="admin">
            <AppShell><AgentInventory /></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/agents/:id" element={
          <ProtectedRoute requiredRole="admin">
            <AppShell><AgentDetail /></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/gateway" element={
          <ProtectedRoute requiredRole="admin">
            <AppShell><RuntimeGateway /></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/audit" element={
          <ProtectedRoute requiredRole="admin">
            <AppShell><AuditTrail /></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/compliance" element={
          <ProtectedRoute requiredRole="admin">
            <AppShell><ComplianceChat /></AppShell>
          </ProtectedRoute>
        } />

        {/* Employee route — placeholder until Phase 11 */}
        <Route path="/chat" element={
          <ProtectedRoute>
            <AppShell>
              <div className="p-8 text-muted text-sm">
                Employee chat coming in Phase 11.
              </div>
            </AppShell>
          </ProtectedRoute>
        } />

        <Route path="/requests" element={
          <ProtectedRoute>
            <AppShell><MyRequests /></AppShell>
          </ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
