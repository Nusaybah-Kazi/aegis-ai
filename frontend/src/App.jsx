import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard       from './pages/Dashboard'
import AgentInventory  from './pages/AgentInventory'
import AgentDetail     from './pages/AgentDetail'
import RuntimeGateway  from './pages/RuntimeGateway'
import AuditTrail      from './pages/AuditTrail'
import ComplianceChat  from './pages/ComplianceChat'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-void">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"           element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/agents"     element={<AgentInventory />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/gateway"    element={<RuntimeGateway />} />
            <Route path="/audit"      element={<AuditTrail />} />
            <Route path="/compliance" element={<ComplianceChat />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
