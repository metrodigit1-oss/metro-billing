'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabaseClient'
import { useAuth } from '../../../components/AuthProvider'

export default function AdminPage() {
  const { role } = useAuth()
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' })

  useEffect(() => {
    if (role === 'admin') fetchUsers()
  }, [role])

  async function fetchUsers() {
    const { data } = await supabase.from('app_users').select('*').order('id')
    setUsers(data || [])
  }

  async function addUser() {
    if (!newUser.username || !newUser.password) return alert('Fill details')
    
    // SIMPLE INSERT
    const { error } = await supabase.from('app_users').insert([newUser])
    
    if (error) alert(error.message)
    else {
      setNewUser({ username: '', password: '', role: 'user' })
      fetchUsers()
    }
  }
  
  // DELETE USER
  async function deleteUser(id) {
    if(!confirm('Delete user?')) return;
    await supabase.from('app_users').delete().eq('id', id)
    fetchUsers()
  }

  if (role !== 'admin') return <div style={{padding: 20}}>Access Denied</div>

  return (
    <div style={{ padding: '20px' }}>
      <h1>Manage Users</h1>
      <div style={{ background: '#eee', padding: '10px', marginBottom: '20px' }}>
        <input placeholder="Username" value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} style={{ marginRight: 5 }} />
        <input placeholder="Password" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} style={{ marginRight: 5 }} />
        <select value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})}>
           <option value="user">User</option>
           <option value="admin">Admin</option>
        </select>
        <button onClick={addUser} style={{ marginLeft: 5 }}>Add</button>
      </div>
      
      <ul>
        {users.map(u => (
          <li key={u.id} style={{ marginBottom: 5 }}>
            <strong>{u.username}</strong> ({u.role}) - Password: {u.password}
            <button onClick={() => deleteUser(u.id)} style={{ marginLeft: 10, color: 'red' }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}