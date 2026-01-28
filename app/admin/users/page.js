'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabaseClient'
import { useAuth } from '../../../components/AuthProvider'
import Link from 'next/link'

export default function AdminPage() {
  const { role } = useAuth()
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (role === 'admin') fetchUsers()
  }, [role])

  async function fetchUsers() {
    const { data } = await supabase.from('app_users').select('*').order('id')
    setUsers(data || [])
  }

  async function addUser(e) {
    e.preventDefault()
    if (!newUser.username || !newUser.password) return alert('Please fill all fields')
    setLoading(true)
    
    const { error } = await supabase.from('app_users').insert([newUser])
    
    if (error) alert(error.message)
    else {
      setNewUser({ username: '', password: '', role: 'user' })
      fetchUsers()
    }
    setLoading(false)
  }
  
  async function deleteUser(id) {
    if(!confirm('Are you sure you want to delete this user?')) return;
    await supabase.from('app_users').delete().eq('id', id)
    fetchUsers()
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You do not have permission to view this page.</p>
          <Link href="/" className="text-blue-600 hover:underline">Return Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <Link href="/">
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium">
              &larr; Back to Dashboard
            </button>
          </Link>
        </div>

        {/* Add User Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Create New User</h2>
          <form onSubmit={addUser} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Username</label>
              <input 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. john_doe" 
                value={newUser.username} 
                onChange={e=>setNewUser({...newUser, username: e.target.value})} 
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Password</label>
              <input 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Password" 
                value={newUser.password} 
                onChange={e=>setNewUser({...newUser, password: e.target.value})} 
              />
            </div>
            <div className="w-full md:w-40">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Role</label>
              <select 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newUser.role} 
                onChange={e=>setNewUser({...newUser, role: e.target.value})}
              >
                 <option value="user">User</option>
                 <option value="admin">Admin</option>
              </select>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all shadow-sm hover:shadow"
            >
              {loading ? 'Adding...' : '+ Add User'}
            </button>
          </form>
        </div>
        
        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">ID</th>
                <th className="p-4 font-semibold">Username</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Password</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-500 text-sm">#{u.id}</td>
                  <td className="p-4 font-medium text-gray-900">{u.username}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 font-mono text-sm">{u.password}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => deleteUser(u.id)} 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 italic">
                    No users found. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}