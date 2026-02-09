import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { UserPlus, Search, Shield, MapPin, Mail, User, Edit2, X, Lock, Save, Trash2 } from 'lucide-react'
import Swal from 'sweetalert2'

export default function Users() {
    const [users, setUsers] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState({
        nombre_completo: '',
        email: '',
        password: '',
        rol: 'vendedor',
        sucursal_id: ''
    })
    const [confirmPassword, setConfirmPassword] = useState('')

    useEffect(() => {
        fetchUsers()
        fetchSucursales()
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

    const fetchSucursales = async () => {
        const { data } = await supabase.from('sucursales').select('*').order('nombre')
        setSucursales(data || [])
    }

    const handleOpenModal = (user = null) => {
        setConfirmPassword('') // Reset confirm password
        if (user) {
            setEditingUser(user)
            setFormData({
                nombre_completo: user.nombre_completo || '',
                email: user.email || '',
                password: '',
                rol: user.rol || 'vendedor',
                sucursal_id: user.sucursal_asignada_id || '' // FIXED: DB Field ID
            })
        } else {
            setEditingUser(null)
            setFormData({
                nombre_completo: '',
                email: '',
                password: '',
                rol: 'vendedor',
                sucursal_id: ''
            })
        }
        setIsModalOpen(true)
    }

    const handleSaveUser = async (e) => {
        e.preventDefault()

        // 1. Validate Password Match
        if (formData.password && formData.password !== confirmPassword) {
            return Swal.fire({
                icon: 'error',
                title: 'Error de Validación',
                text: 'Las contraseñas no coinciden.',
                background: '#0f172a',
                color: '#fff'
            })
        }

        try {
            if (editingUser) {
                // Update Logic
                const updates = {
                    nombre_completo: formData.nombre_completo,
                    rol: formData.rol,
                    sucursal_asignada_id: formData.sucursal_id || null // FIXED: DB Field Name
                }

                const { error } = await supabase
                    .from('perfiles')
                    .update(updates)
                    .eq('id_perfil', editingUser.id_perfil) // FIXED: Primary Key

                if (error) throw error

                if (formData.password) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Nota',
                        text: 'La actualización de contraseña requiere re-autenticación o permisos administrativos avanzados. El perfil ha sido actualizado.',
                        background: '#0f172a',
                        color: '#fff'
                    })
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Usuario Actualizado',
                        background: '#0f172a',
                        color: '#fff',
                        timer: 1500,
                        showConfirmButton: false
                    })
                }

            } else {
                // Create Logic (RPC)
                const { data, error } = await supabase.rpc('registrar_usuario_admin', {
                    email_input: formData.email,
                    password_input: formData.password,
                    nombre_input: formData.nombre_completo,
                    rol_input: formData.rol,
                    sucursal_id_input: formData.sucursal_id || null
                })

                if (error) throw error

                Swal.fire({
                    icon: 'success',
                    title: 'Usuario Creado',
                    text: 'El usuario ha sido registrado exitosamente.',
                    background: '#0f172a',
                    color: '#fff'
                })
            }

            setIsModalOpen(false)
            fetchUsers()

        } catch (error) {
            console.error('Error saving user:', error)
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo guardar el usuario.',
                background: '#0f172a',
                color: '#fff'
            })
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
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-900/20 hover:scale-105"
                >
                    <UserPlus size={20} />
                    Agregar Miembro
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 shadow-sm relative group max-w-lg">
                <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-slate-200 w-full placeholder-slate-600 px-3"
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
                                            <button
                                                onClick={() => handleOpenModal(user)}
                                                className="text-blue-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                                                title="Editar Usuario"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Usuario (Crear / Editar) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingUser ? <Edit2 className="text-blue-500" /> : <UserPlus className="text-emerald-500" />}
                                {editingUser ? 'Editar Miembro' : 'Nuevo Miembro'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveUser} className="p-6 space-y-4" autoComplete="off">

                            {/* Nombre */}
                            <div>
                                <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Nombre Completo</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        autoComplete="off"
                                        value={formData.nombre_completo}
                                        onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Correo Electrónico</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        autoComplete="new-email"
                                        disabled={!!editingUser}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${editingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        placeholder="usuario@empresa.com"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-slate-400 text-xs uppercase font-bold mb-2">
                                    {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        minLength={6}
                                        autoComplete="new-password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder={editingUser ? "Dejar en blanco para mantener" : "Mínimo 6 caracteres"}
                                    />
                                </div>
                            </div>

                            {/* Confirmar Password (New) */}
                            <div>
                                <label className="block text-slate-400 text-xs uppercase font-bold mb-2">
                                    Confirmar Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        required={!editingUser && formData.password.length > 0}
                                        minLength={6}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder="Repite la contraseña"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Rol */}
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Rol</label>
                                    <div className="relative">
                                        <select
                                            value={formData.rol}
                                            onChange={e => setFormData({ ...formData, rol: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 appearance-none"
                                        >
                                            <option value="vendedor">Vendedor</option>
                                            <option value="inventario">Inventario</option>
                                            <option value="gerente">Gerente</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Sucursal */}
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Sucursal</label>
                                    <div className="relative">
                                        <select
                                            value={formData.sucursal_id}
                                            onChange={e => setFormData({ ...formData, sucursal_id: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 appearance-none"
                                        >
                                            <option value="">-- Asignar --</option>
                                            {sucursales.map(s => (
                                                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all flex justify-center items-center gap-2"
                                >
                                    <Save size={18} />
                                    {editingUser ? 'Guardar Cambios' : 'Registrar'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
