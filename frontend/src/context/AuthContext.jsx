// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)   // { id, name, email, role }
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Rehydrate from localStorage on first load
  useEffect(() => {
    const stored = localStorage.getItem('aegis_token')
    const storedUser = localStorage.getItem('aegis_user')
    if (stored && storedUser) {
      setToken(stored)
      setUser(JSON.parse(storedUser))
      api.defaults.headers.common['Authorization'] = `Bearer ${stored}`
    }
    setLoading(false)
  }, [])

  function login(tokenStr, userObj) {
    localStorage.setItem('aegis_token', tokenStr)
    localStorage.setItem('aegis_user', JSON.stringify(userObj))
    api.defaults.headers.common['Authorization'] = `Bearer ${tokenStr}`
    setToken(tokenStr)
    setUser(userObj)
  }

  function logout() {
    localStorage.removeItem('aegis_token')
    localStorage.removeItem('aegis_user')
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}