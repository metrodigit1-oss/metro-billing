'use client'
import { useState } from 'react'
import { supabase } from '../../utils/supabaseClient'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider'
import Link from 'next/link'

export default function Profile() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [pass, setPass] = useState('')
  const [loading,HfLoading] = useState(false)

  // NOTE: This uses the Auth logic from your file. 
  // If you switch to Supabase Auth completely, use supabase.auth.updateUser()
  async function updatePass() {
    if(!pass) return alert("Please enter a new password")
    setLoading(true)
    
    // Assuming you are updating the 'app_users' table based on your previous code
    const { error } = await supabase
      .from('app_users')
      .update({ password: pass })
      .eq('id', user.id) // Ensure 'user' object has an ID

    if (error) alert('Error: ' + error.message)
    else { alert('Password Updated Successfully!'); setPass('') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500">Manage your account settings</p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{user?.username || 'User'}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                {user?.role || 'Staff'}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">Update Password</label>
              <div className="flex gap-3">
                <input 
                  type="password" 
                  placeholder="Enter new password" 
                  value={pass} 
                  onChange={e=>setPass(e.target.value)} 
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  onClick={updatePass} 
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-medium text-red-600 mb-2">Sign Out</h3>
            <p className="text-gray-600 text-sm mb-4">You will be returned to the login screen.</p>
            <button 
              onClick={logout} 
              className="px-6 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}