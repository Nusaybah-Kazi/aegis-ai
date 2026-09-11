// frontend/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) return null   // still rehydrating — don't flash redirect

  if (!user) return <Navigate to="/login" replace />

  if (requiredRole && user.role !== requiredRole)
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/chat'} replace />

  return children
}