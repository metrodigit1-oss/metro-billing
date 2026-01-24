'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null) // Stores { username: 'admin', role: 'admin' }
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // 1. Check if user is saved in browser (Local Storage)
    const storedUser = localStorage.getItem('metro_user')
    
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else if (pathname !== '/login') {
      // If not logged in, go to login
      router.push('/login')
    }
    setLoading(false)
  }, [pathname])

  // LOGIN FUNCTION
  const login = (userData) => {
    localStorage.setItem('metro_user', JSON.stringify(userData))
    setUser(userData)
    router.push('/')
  }

  // LOGOUT FUNCTION
  const logout = () => {
    localStorage.removeItem('metro_user')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, role: user?.role, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)