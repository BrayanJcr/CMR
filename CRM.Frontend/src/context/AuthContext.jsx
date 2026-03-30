import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('crm_token')
    const storedUser = localStorage.getItem('crm_user')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('crm_token')
        localStorage.removeItem('crm_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (usuario, clave) => {
    const response = await axios.post('/api/Autenticacion/Login', { usuario, clave })
    const data = response.data
    const tokenValue = data.token
    const userObj = {
      nombreUsuario: data.nombreUsuario || usuario,
      nombres: data.nombres || '',
      apellidos: data.apellidos || '',
      idUsuario: data.idUsuario || null
    }
    localStorage.setItem('crm_token', tokenValue)
    localStorage.setItem('crm_user', JSON.stringify(userObj))
    setToken(tokenValue)
    setUser(userObj)
    return data
  }

  const logout = () => {
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
    setToken(null)
    setUser(null)
  }

  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
