'use client'
import { useState } from 'react'
import { supabase } from '../../utils/supabaseClient'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider'

export default function Profile() {
  const { user } = useAuth()
  const router = useRouter()
  const [pass, setPass] = useState('')

  async function updatePass() {
    const { error } = await supabase.auth.updateUser({ password: pass })
    if (error) alert(error.message)
    else { alert('Password Updated!'); setPass('') }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>My Profile</h1>
      <p>Logged in as: <strong>{user?.email}</strong></p>
      
      <div style={{ margin: '20px 0', padding: '20px', background: '#f9f9f9' }}>
        <h3>Change Password</h3>
        <input type="password" placeholder="New Password" value={pass} onChange={e=>setPass(e.target.value)} style={{ padding: '8px', width: '100%', marginBottom: '10px' }} />
        <button onClick={updatePass} style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none' }}>Update Password</button>
      </div>

      <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ padding: '10px 20px', background: 'red', color: 'white', border: 'none' }}>Log Out</button>
      <br/><br/>
      <Link href="/">Back to Home</Link>
    </div>
  )
}