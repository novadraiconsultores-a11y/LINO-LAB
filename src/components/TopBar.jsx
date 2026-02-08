import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, User, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthProvider'
import NotificationBell from './NotificationBell'

export default function TopBar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
    const location = useLocation()
    const { user, profile, signOut } = useAuth()
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const profileRef = useRef(null)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const getPageTitle = (pathname) => {
        switch (pathname) {
            case '/': return 'Panel de Control'
            case '/productos': return 'Catálogo de Productos'
            case '/abastecimiento': return 'Abastecimiento'
            case '/inventario': return 'Inventario'
            case '/traspasos': return 'Traspasos'
            case '/ventas': return 'Punto de Venta'
            case '/empresarios': return 'Empresarios'
            case '/admin/users': return 'Gestión de Equipo'
            case '/configuracion': return 'Configuración'
            default: return 'Lino Lab'
        }
    }

    return (
        <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center px-6 z-40 sticky top-0 w-full">
            {/* Left: Mobile Toggle & Title */}
            <div className="flex items-center gap-4">
                <button
                    className="lg:hidden p-2 text-slate-400 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <Menu size={24} />
                </button>

                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent hidden sm:block">
                    {getPageTitle(location.pathname)}
                </h2>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <NotificationBell />

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-slate-800 mx-1"></div>

                {/* User Profile */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 p-1 pr-2 rounded-full hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg text-sm">
                            {profile?.nombre_completo?.charAt(0).toUpperCase() || <User size={14} />}
                        </div>
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-sm font-bold text-slate-200 leading-none">
                                {profile?.nombre_completo?.split(' ')[0]}
                            </span>
                            <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider leading-none mt-1">
                                {profile?.rol || 'Usuario'}
                            </span>
                        </div>
                        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Profile Dropdown */}
                    {isProfileOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl shadow-black overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-2">
                                <button
                                    onClick={signOut}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
