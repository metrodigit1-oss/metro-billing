'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

// Define simple SVG icons components
const Icons = {
  NewInvoice: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
  ),
  History: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  ),
  Cash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
  ),
  Bank: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="5" y1="21" x2="5" y2="10"></line><line x1="19" y1="21" x2="19" y2="10"></line><polyline points="5 10 12 3 19 10"></polyline><line x1="9" y1="21" x2="9" y2="10"></line><line x1="15" y1="21" x2="15" y2="10"></line><line x1="12" y1="21" x2="12" y2="10"></line></svg>
  ),
  Manage: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
  ),
  Profile: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  ),
  Admin: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { role } = useAuth()

  const navItems = [
    { name: 'New Invoice', href: '/', icon: Icons.NewInvoice },
    { name: 'Past Invoices', href: '/history', icon: Icons.History },
    { name: 'Cash Book', href: '/cash', icon: Icons.Cash },
    { name: 'Bank Book', href: '/bank', icon: Icons.Bank },
    { name: 'Manage Data', href: '/manage', icon: Icons.Manage },
    { name: 'My Profile', href: '/profile', icon: Icons.Profile },
  ]

  if (role === 'admin') {
    navItems.splice(5, 0, { name: 'Admin Panel', href: '/admin/users', icon: Icons.Admin })
  }

  return (
    <aside className="w-64 bg-[#1a1f2c] text-gray-300 flex flex-col h-screen sticky top-0 shadow-xl font-sans">
      
      {/* Brand / Logo Area */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white tracking-wide">METRO BILLING</h1>
        <p className="text-xs text-gray-500 mt-1">Digital Invoicing System</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const IconComponent = item.icon
          
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className={`mr-3 p-1 rounded ${
                   isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}>
                  <IconComponent />
                </span>
                <span className="font-medium text-sm">{item.name}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Info */}
      <div className="p-4 border-t border-gray-800 bg-[#151923]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-200">
            {role ? role.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="text-xs font-medium text-white capitalize">{role || 'User'}</p>
            <Link href="/login" className="text-[10px] text-gray-500 hover:text-red-400">Log Out</Link>
          </div>
        </div>
      </div>
    </aside>
  )
}