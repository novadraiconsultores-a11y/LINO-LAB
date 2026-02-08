import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, Package, ShoppingCart, Users, Settings, Menu, ClipboardList, BarChart3, Tag, Building2, Truck, LogOut, Sun, Moon, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthProvider'
import { useTheme } from '../context/ThemeContext'
import { useIdleTimer } from '../hooks/useIdleTimer'
import NotificationBell from './NotificationBell'

export default function Layout() {
    const location = useLocation()
    const navigate = useNavigate()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [branches, setBranches] = useState([])
    const [activeBranch, setActiveBranch] = useState(() => localStorage.getItem('sucursal_activa') || '')
    const { signOut, profile, user, authError } = useAuth()
    const { theme, toggleTheme } = useTheme()

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

    useEffect(() => {
        if (profile && profile.rol !== 'admin') {
            // Force assigned branch
            const assigned = profile.ref_sucursal_id
            if (activeBranch !== assigned) {
                setActiveBranch(assigned)
                localStorage.setItem('sucursal_activa', assigned)
            }
        }
    }, [profile, activeBranch])

    useEffect(() => {
        fetchBranches()
    }, [])

    async function fetchBranches() {
        try {
            const { data, error } = await supabase
                .from('sucursales')
                .select('id_sucursal, nombre, es_matriz')
                .order('es_matriz', { ascending: false }) // Matrix first

            if (error) throw error

            if (data && data.length > 0) {
                setBranches(data)

                // Get stored branch locally to ensure latest value
                const storedBranch = localStorage.getItem('sucursal_activa')

                if (storedBranch && storedBranch !== 'global' && data.find(b => b.id_sucursal === storedBranch)) {
                    setActiveBranch(storedBranch)
                } else if (storedBranch === 'global') {
                    setActiveBranch('global')
                } else {
                    // Default to Matrix or first one if NOT global
                    const defaultBranch = data.find(b => b.es_matriz) || data[0]
                    setActiveBranch(defaultBranch?.id_sucursal || '')
                    localStorage.setItem('sucursal_activa', defaultBranch?.id_sucursal || '')
                }
            }
        } catch (error) {
            console.error('Error fetching branches:', error)
        }
    }

    const handleBranchChange = (e) => {
        const newBranchId = e.target.value
        if (newBranchId === 'global') {
            setActiveBranch('global')
            localStorage.setItem('sucursal_activa', 'global')
        } else {
            setActiveBranch(newBranchId)
            localStorage.setItem('sucursal_activa', newBranchId)
        }
        // Reload to force data refresh across all components
        window.location.reload()
    }

    const navigation = [
        { name: 'Panel de Control', href: '/', icon: Home },
        { name: 'Catálogo', href: '/productos', icon: Tag },
        { name: 'Abastecimiento', href: '/abastecimiento', icon: ClipboardList },
        { name: 'Inventario', href: '/inventario', icon: BarChart3 },
        { name: 'Traspasos', href: '/traspasos', icon: Truck },
        { name: 'Ventas', href: '/ventas', icon: ShoppingCart },
        { name: 'Empresarios', href: '/empresarios', icon: Users },
        { name: 'Equipo', href: '/admin/users', icon: Users },
        { name: 'Configuración', href: '/configuracion', icon: Settings },
    ]

    return (
        <div className="flex min-h-screen w-full transition-colors duration-300 bg-slate-950 text-white overflow-x-hidden">
            {/* Mobile Backdrop Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Menu Button - Hidden when sidebar is open */}
            <button
                className={`lg:hidden fixed top-4 left-4 z-[60] p-3 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all shadow-lg ${isMobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
            >
                <Menu size={20} />
            </button>

            {/* Sidebar */}
            <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col h-[100dvh]
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:shadow-none lg:h-screen
      `}>
                <div className="flex flex-col items-center justify-center border-b border-gray-200 dark:border-slate-800 p-4">

                    <h1 className="text-2xl font-bold tracking-widest bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-3">
                        LINO LAB
                    </h1>

                    {/* Branch Selector (RBAC Protected) */}
                    <div className="relative w-full">
                        {!profile ? (
                            <div className="h-8 bg-slate-800/50 animate-pulse rounded-lg border border-slate-700/50"></div>
                        ) : profile.rol === 'admin' ? (
                            <>
                                <div className="relative w-full">
                                    <select
                                        value={activeBranch || 'global'}
                                        onChange={handleBranchChange}
                                        className="w-full appearance-none rounded-xl border border-slate-800 bg-[#0b1120] px-4 py-3 text-sm font-medium text-slate-200 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    >
                                        <option value="global">🌍 Vista Global</option>
                                        {branches.map(branch => (
                                            <option key={branch.id_sucursal} value={branch.id_sucursal}>
                                                {branch.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div className="w-full bg-slate-800/50 text-slate-400 text-xs rounded-lg border border-slate-700/50 py-2 pl-3 pr-4 flex items-center gap-2 cursor-not-allowed">
                                <Building2 size={14} className="text-emerald-500" />
                                <span className="font-bold truncate" title={profile.sucursales?.nombre || 'Contactar Admin'}>
                                    📍 {profile.sucursales?.nombre || 'Sin Asignar'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex flex-col p-4 gap-2 flex-1 overflow-y-auto custom-scrollbar">
                    {navigation.filter(item => {
                        // Normalize safe
                        const role = profile?.rol ? profile.rol.toLowerCase() : ''
                        // Relaxed Admin Check
                        const isAdmin = role === 'admin'

                        if (!isAdmin && ['Configuración', 'Empresarios', 'Equipo'].includes(item.name)) return false
                        if (role === 'vendedor' && item.name === 'Traspasos') return false
                        return true
                    }).map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200
                  ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>


                <div className="p-4 border-t border-gray-200 dark:border-slate-800 mt-auto">
                    {/* Notifications (Desktop) */}
                    <div className="mb-4 flex justify-center w-full">
                        <NotificationBell />
                    </div>

                    {/* User Profile Info */}
                    {profile && (
                        <div className="flex items-center gap-3 mb-4 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                                {profile.nombre_completo?.charAt(0).toUpperCase() || <User size={18} />}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-white truncate w-32" title={profile.nombre_completo}>
                                    {profile.nombre_completo}
                                </p>
                                <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">
                                    {profile.rol || 'Usuario'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* DEBUGGER */}


                    <button
                        onClick={signOut}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-300 transition-colors duration-200 w-full"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>

                    {/* Version Marker - Visual Deployment Confirmation */}
                    <div className="mt-3 text-center">
                        <span className="text-[10px] text-slate-500 font-mono">
                            LinoLab v8
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto relative w-full">
                {/* Mobile top spacing for hamburger button */}
                <div className="lg:hidden h-16" />
                <Outlet />

                {/* Branding Footer */}
                <div className="flex justify-center md:justify-end px-6 py-2 pb-4 opacity-30 text-xs font-light tracking-wider pointer-events-none select-none">
                    Lino Lab - Sistema por NovaDRAI
                </div>
            </div>
        </div>
    )
}
