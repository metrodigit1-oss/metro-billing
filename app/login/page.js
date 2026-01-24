'use client'
import { useState } from 'react'
import { supabase } from '../../utils/supabaseClient' // Direct DB access
import { useAuth } from '../../components/AuthProvider'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)

    // DIRECTLY CHECK YOUR CUSTOM TABLE
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .eq('password', password) // Checking plain password
      .single()


    if (error || !data) {
      alert('Invalid Username or Password')
      setLoading(false)
    } else {
      // Success! Save user to context
      login(data) 
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center' }}>Login</h2>
        <input 
          placeholder="Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
          style={{ display: 'block', width: '250px', padding: '10px', marginBottom: '10px' }} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          style={{ display: 'block', width: '250px', padding: '10px', marginBottom: '20px' }} 
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}