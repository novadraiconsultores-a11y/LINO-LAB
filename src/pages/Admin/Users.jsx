import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { UserPlus, Search, Shield, MapPin, Mail, User } from 'lucide-react'
import Swal from 'sweetalert2'

export default function Users() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('perfiles')
                .select('*, sucursales(nombre)')

            if (error) throw error
            setUsers(data || [])
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = users.filter(user =>
        user.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-pink-500/10 text-pink-500 border border-pink-500/20 uppercase tracking-wider">Admin</span>
            case 'gerente':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 uppercase tracking-wider">Gerente</span>
            case 'vendedor':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">Vendedor</span>
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600 uppercase tracking-wider">{role || 'Sin Rol'}</span>
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen text-slate-100">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <User className="text-blue-500" size={32} />
                        Equipo de Trabajo
                    </h1>
                    <p className="text-slate-400 mt-1">Gestión de usuarios y permisos de acceso</p>
                </div>
                <button
                    onClick={() => Swal.fire('Próximamente', 'La creación de usuarios se habilitará en la siguiente fase.', 'info')}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-900/20 hover:scale-105"
                >
                    <UserPlus size={20} />
                    Agregar Miembro
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 shadow-sm relative group max-w-lg">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="text-slate-500" size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-slate-200 w-full placeholder-slate-600 pl-10"
                />
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-bold tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="p-6">Usuario</th>
                                <th className="p-6 text-center">Rol</th>
                                <th className="p-6">Sucursal</th>
                                <th className="p-6 text-center">Estado</th>
                                <th className="p-6 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500 animate-pulse">Cargando equipo...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <div className="bg-slate-800/50 p-4 rounded-full mb-3">
                                                <User className="text-slate-600" size={32} />
                                            </div>
                                            <p className="font-medium text-slate-400">No se encontraron usuarios.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id_perfil} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-slate-800">
                                                    {user.nombre_completo?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{user.nombre_completo || 'Sin Nombre'}</p>
                                                    <div className="flex items-center gap-1.5 text-slate-500 mt-0.5 text-xs">
                                                        <Mail size={12} />
                                                        <span>{user.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            {getRoleBadge(user.rol)}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 text-slate-300 text-sm">
                                                <MapPin size={16} className="text-slate-500" />
                                                <span className="font-medium">{user.sucursales?.nombre || 'Sin Asignar'}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                Activo
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <button className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
                                                <Shield size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
