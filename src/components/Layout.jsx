import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthProvider'
import { useIdleTimer } from '../hooks/useIdleTimer'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
    const navigate = useNavigate()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { signOut, user } = useAuth()

    // Auto-Logout Logic
    const handleIdleLogout = async () => {
        await signOut()
        localStorage.clear() // Safety clear
        navigate('/login')
    }

    useIdleTimer({
        timeout: 1000 * 60 * 14, // 14 Minutes
        promptBeforeIdle: 1000 * 60 * 1, // 1 Minute
        onIdle: handleIdleLogout,
        isEnabled: !!user
    })

    return (
        <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
            {/* Sidebar (Left) */}
            <Sidebar
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />

            {/* Main Content Area (Right) */}
            <div className="flex flex-col flex-1 overflow-hidden relative w-full">

                {/* TopBar (Header) */}
                <TopBar
                    isMobileMenuOpen={isMobileMenuOpen}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                />

                {/* Page Content (Scrollable) */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
                    <Outlet />

                    {/* Branding Footer */}
                    <div className="flex justify-center md:justify-end px-6 py-8 opacity-30 text-xs font-light tracking-wider pointer-events-none select-none mt-auto">
                        Lino Lab - Sistema por NovaDRAI
                    </div>
                </main>
            </div>
        </div>
    )
}
