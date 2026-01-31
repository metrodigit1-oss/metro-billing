'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function LayoutWrapper({ children }) {
  const pathname = usePathname()
  
  // Don't show sidebar on Login page or any Print page
  const isFullScreen = pathname === '/login' || pathname.startsWith('/print/')

  if (isFullScreen) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto h-screen">
        {children}
      </main>
    </div>
  )
}