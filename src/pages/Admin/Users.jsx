import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Shield, Building2, Mail, User, Key, X, Check } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthProvider'
import { sendEmailNotification } from '../../utils/emailService'
import UserModal from '../../components/UserModal'
import ResetPasswordModal from '../../components/ResetPasswordModal'
import Toast from '../../components/ui/Toast'

export default function Users() {
    const { user } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [isResetModalOpen, setIsResetModalOpen] = useState(false)
    const [resettingUser, setResettingUser] = useState(null)
    const [toast, setToast] = useState(null)

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('perfiles')
                .select('*, sucursales(nombre)')
                .order('nombre_completo', { ascending: true })

            if (error) throw error
            console.log('Data Equipo:', data, error) // Debug solicitado
            setUsers(data || [])
        } catch (error) {
            console.error('Error fetching users:', error)
            showToast('Error cargando usuarios', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveUser = async (formData, adminPassword = null) => {
        try {
            if (editingUser) {
                // ... update logic
                if (!adminPassword) {
                    throw new Error('Se requiere contraseña de administrador')
                }

                // Verify Admin Password
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: (await supabase.auth.getUser()).data.user.email,
                    password: adminPassword
                })

                if (signInError) throw new Error('Contraseña de administrador incorrecta')

                // Call Update RPC
                const { error } = await supabase.rpc('actualizar_usuario_admin', {
                    target_user_id: editingUser.id_perfil,
                    nuevo_rol: formData.rol,
                    nueva_sucursal: (formData.sucursal_id && formData.sucursal_id !== "") ? formData.sucursal_id : null
                })

                if (error) throw error
                showToast('Usuario actualizado correctamente', 'success')
            } else {
                // CREATE new user via RPC
                const { error } = await supabase.rpc('registrar_usuario_admin', {
                    email_input: formData.email,
                    password_input: formData.password,
                    nombre_input: formData.nombre,
                    rol_input: formData.rol,
                    sucursal_input: (formData.rol === 'admin' || !formData.sucursal_id || formData.sucursal_id === "") ? null : formData.sucursal_id
                })

                if (error) throw error

                // Send Email Notification
                try {
                    await sendEmailNotification(
                        formData.email,
                        'Bienvenido a LinoLab - Credenciales de Acceso',
                        `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h1 style="color: #2563eb;">Bienvenido a LinoLab</h1>
                            <p>Hola <strong>${formData.nombre}</strong>,</p>
                            <p>Tu cuenta ha sido creada exitosamente. Aquí están tus credenciales de acceso:</p>
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Correo:</strong> ${formData.email}</p>
                                <p style="margin: 5px 0;"><strong>Contraseña Temporal:</strong> ${formData.password}</p>
                            </div>
                            <p>Por favor, cambia tu contraseña al iniciar sesión por primera vez.</p>
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                            <p style="font-size: 12px; color: #6b7280;">Este mensaje fue enviado automáticamente por el sistema LinoLab.</p>
                        </div>
                        `
                    )
                    showToast('Usuario creado y notificado por correo', 'success')
                } catch (emailError) {
                    console.error('Error enviando correo:', emailError)
                    showToast('Usuario creado, pero falló el envío del correo', 'warning')
                }
            }

            fetchUsers()
            setIsModalOpen(false)
            setEditingUser(null)
        } catch (error) {
            console.error('Error saving user:', error)
            showToast('Error: ' + error.message, 'error')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return

        try {
            const { error } = await supabase
                .from('perfiles')
                .delete()
                .eq('id_perfil', id)

            if (error) throw error
            fetchUsers()
            showToast('Usuario eliminado correctamente', 'success')
        } catch (error) {
            console.error('Error deleting user:', error)
            showToast('Error al eliminar: ' + error.message, 'error')
        }
    }

    const handleOpenResetModal = (user) => {
        setResettingUser(user)
        setIsResetModalOpen(true)
    }

    const handleAdminResetPassword = async (userId, newPassword, adminPassword) => {
        try {
            // 1. Verify Admin Password (Security Check)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: (await supabase.auth.getUser()).data.user.email,
                password: adminPassword
            })

            if (signInError) throw new Error('Contraseña de administrador incorrecta')

            // 2. Call RPC to change password
            const { error } = await supabase.rpc('cambiar_password_admin', {
                target_user_id: userId,
                new_password: newPassword
            })

            if (error) throw error

            showToast('Contraseña actualizada correctamente', 'success')
            setIsResetModalOpen(false)
            setResettingUser(null)

        } catch (error) {
            console.error('Error resetting password:', error)
            showToast('Error: ' + error.message, 'error')
        }
    }

    const openEditModal = (user) => {
        setEditingUser(user)
        setIsModalOpen(true)
    }

    const openNewModal = () => {
        setEditingUser(null)
        setIsModalOpen(true)
    }

    const filteredUsers = users.filter(user =>
        user.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // STRICT ACCESS GUARD
    if (user?.rol !== 'admin') {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                    <Shield className="text-red-500" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
                <p className="text-slate-400 max-w-md mx-auto">
                    Tu rol actual es <span className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded">{user?.rol || 'Desconocido'}</span>.
                    Se requieren privilegios de <span className="text-purple-400 font-bold">ADMIN</span> para ver este módulo.
                </p>
                <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs text-left text-slate-500 font-mono w-full max-w-md">
                    <p>Debug Info:</p>
                    <p>ID: {user?.id}</p>
                    <p>Email: {user?.email}</p>
                    <p>MetaRol: {user?.user_metadata?.rol || 'N/A'}</p>
                    <p>DBRol: {user?.rol || 'N/A'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gestión de Equipo</h1>
                    <p className="text-slate-400 mt-1">Administra los usuarios y sus permisos de acceso.</p>
                </div>
                <button
                    onClick={openNewModal}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                    <Plus size={20} />
                    Nuevo Usuario
                </button>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6 flex items-center gap-3 shadow-sm relative group">
                <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-center pointer-events-none z-10">
                    <Search className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nombre o correo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-slate-200 w-full placeholder-slate-600"
                    style={{ paddingLeft: '40px' }}
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                    <User className="text-slate-600 mx-auto mb-4" size={48} />
                    <h3 className="text-white font-medium text-lg">No hay usuarios encontrados</h3>
                    <p className="text-slate-500 mt-1">Intenta con otro término de búsqueda o crea uno nuevo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {/* Desktop Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase px-6 pb-2 border-b border-slate-800 select-none">
                        <div className="col-span-4">Usuario</div>
                        <div className="col-span-3">Rol</div>
                        <div className="col-span-3">Sucursal</div>
                        <div className="col-span-2 text-right">Acciones</div>
                    </div>

                    {/* Users List */}
                    {(!filteredUsers || filteredUsers.length === 0) ? (
                        <div className="p-6 text-slate-400 text-center">Cargando equipo o no hay datos...</div>
                    ) : (filteredUsers.map(user => (
                        <div key={user.id_perfil} className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:px-6 md:py-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center hover:border-slate-700 transition-colors group">

                            {/* User Info */}
                            <div className="col-span-4 flex items-center gap-3 w-full">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-lg border border-slate-700">
                                    {user.nombre_completo?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium text-white truncate">{user.nombre_completo}</div>
                                    <div className="text-sm text-slate-500 flex items-center gap-1.5 truncate">
                                        <Mail size={12} />
                                        {user.email}
                                    </div>
                                </div>
                            </div>

                            {/* Role */}
                            <div className="col-span-3 w-full">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.rol)}`}>
                                    <Shield size={10} />
                                    {user.rol?.toUpperCase() || 'SIN ROL'}
                                </span>
                            </div>

                            {/* Branch */}
                            <div className="col-span-3 w-full">
                                <div className="text-sm text-slate-400 flex items-center gap-2">
                                    <Building2 size={14} className="text-slate-600" />
                                    {user.sucursales?.nombre || 'Sin Sucursal'}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="col-span-2 flex justify-end gap-2 w-full md:w-auto mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(user)}
                                    className="p-2 text-slate-400 hover:text-blue-400 bg-slate-800 hover:bg-slate-800/80 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleOpenResetModal(user)}
                                    className="p-2 text-slate-400 hover:text-yellow-400 bg-slate-800 hover:bg-slate-800/80 rounded-lg transition-colors"
                                    title="Reset Contraseña"
                                >
                                    <Key size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(user.id_perfil)}
                                    className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-800/80 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )))}
                </div>
            )}

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveUser}
                initialData={editingUser}
            />

            <ResetPasswordModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleAdminResetPassword}
                user={resettingUser}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}
