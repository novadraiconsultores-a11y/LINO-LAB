import { useState, useEffect } from 'react'
import { X, User, Mail, Lock, Shield, Building2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function UserModal({ isOpen, onClose, onSave, initialData = null }) {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        confirmPassword: '',
        rol: 'vendedor',
        sucursal_id: ''
    })
    const [adminPassword, setAdminPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [showAdminPassword, setShowAdminPassword] = useState(false)
    const [branches, setBranches] = useState([])
    const [loadingBranches, setLoadingBranches] = useState(false)
    const [isSecurityCheck, setIsSecurityCheck] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchBranches()
            setIsSecurityCheck(false)
            setAdminPassword('')
            setShowPassword(false)
            setShowConfirmPassword(false)
            setFormData({
                nombre: '',
                email: '',
                password: '',
                confirmPassword: '',
                rol: 'vendedor',
                sucursal_id: ''
            })
        }
    }, [isOpen])

    useEffect(() => {
        if (initialData) {
            setFormData({
                nombre: initialData.nombre_completo || '',
                email: initialData.email || '',
                password: '',
                confirmPassword: '',
                rol: initialData.rol || 'vendedor',
                sucursal_id: initialData.sucursal_asignada_id || ''
            })
        } else {
            // Reset logic handled in isOpen effect mostly, but ensure clean slate
            // Keep existing formData structure
        }
    }, [initialData])

    async function fetchBranches() {
        try {
            setLoadingBranches(true)
            const { data, error } = await supabase
                .from('sucursales')
                .select('id_sucursal, nombre')
                .order('id_sucursal')

            if (error) throw error
            setBranches(data || [])

            // Set default branch if creating new and none selected
            if (!initialData && data?.length > 0 && !formData.sucursal_id) {
                setFormData(prev => ({ ...prev, sucursal_id: data[0].id_sucursal }))
            }
        } catch (error) {
            console.error('Error fetching branches:', error)
        } finally {
            setLoadingBranches(false)
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleInitialSubmit = (e) => {
        e.preventDefault()

        // Validation for new users
        if (!initialData) {
            if (formData.password !== formData.confirmPassword) {
                alert("Las contraseñas no coinciden")
                return
            }
        }

        if (initialData) {
            // Switch to security check mode for edits
            setIsSecurityCheck(true)
        } else {
            // Create user directly
            onSave(formData)
        }
    }

    const handleSecuritySubmit = (e) => {
        e.preventDefault()
        if (!adminPassword) return

        onSave(formData, adminPassword)
    }

    if (!isOpen) return null

    const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors pl-9"
    const selectClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors pl-9 appearance-none"
    const labelClass = "block text-slate-400 text-xs mb-1 uppercase font-semibold"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    {initialData ?
                        (isSecurityCheck ?
                            <div className="p-1.5 bg-red-500/20 rounded-lg"><Lock className="text-red-500" size={20} /></div> :
                            <div className="p-1.5 bg-blue-500/20 rounded-lg"><User className="text-blue-500" size={20} /></div>
                        ) :
                        <div className="p-1.5 bg-emerald-500/20 rounded-lg"><User className="text-emerald-500" size={20} /></div>
                    }
                    {initialData ? (isSecurityCheck ? 'Confirmar Cambios' : 'Editar Usuario') : 'Nuevo Usuario'}
                </h2>

                {!isSecurityCheck ? (
                    <form onSubmit={handleInitialSubmit} className="space-y-4">
                        {/* Nombre */}
                        <div>
                            <label className={labelClass}>Nombre Completo</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    name="nombre"
                                    required
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Ej. Juan Pérez"
                                    disabled={!!initialData} // Name disabled on edit as per instructions? Prompt said "edit Name, Role, Branch" BUT technically instructions said "No permitas editar el email ni la contraseña aquí, solo Rol y Sucursal". Wait.
                                    // Let's re-read: "abre un modal precargado con los datos del usuario (Nombre, Rol, Sucursal). Nota: No permitas editar el email ni la contraseña aquí, solo Rol y Sucursal."
                                    // So Name is editable? "solo Rol y Sucursal" usually implies ONLY those. But it lists "Nombre, Rol, Sucursal" as data to load.
                                    // "solo Rol y Sucursal" is explicit. I will disable Name to be safe or maybe enable it? 
                                    // "No permitas editar el email ni la contraseña aquí, solo Rol y Sucursal." -> This usually means exclude email/pass. Name might be allowed.
                                    // I'll leave Name editable but Email disabled. If User wants Name disabled, they'd say "solo Rol y Sucursal" exclusively.
                                    // Actually, if it says "Only Role and Branch", then Name should be disabled.
                                    // Decision: Disable Name based on "solo Rol y Sucursal".
                                    // Wait, "Nombre" is likely just for display context.
                                    // I'll disable Name for now to be strictly compliant with "solo Rol y Sucursal".
                                    // Actually, let's keep it editable but non-required change? 
                                    // Re-reading: "No permitas editar el email ni la contraseña aquí, solo Rol y Sucursal." -> This implies Name is NOT editable.
                                    // Okay, I will disable "nombre" input if initialData exists.
                                    readOnly={!!initialData}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className={labelClass}>Correo Electrónico</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    disabled={!!initialData}
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`${inputClass} ${initialData ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    placeholder="usuario@linolab.com"
                                />
                            </div>
                        </div>

                        {/* Password (Only required if creating new) */}
                        {!initialData && (
                            <>
                                <div>
                                    <label className={labelClass}>Contraseña</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            required={!initialData}
                                            minLength={6}
                                            value={formData.password}
                                            onChange={handleChange}
                                            className={inputClass}
                                            placeholder="******"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Confirmar Contraseña</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            required={!initialData}
                                            minLength={6}
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className={inputClass}
                                            placeholder="******"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* Rol */}
                            <div>
                                <label className={labelClass}>Rol</label>
                                <div className="relative">
                                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <select
                                        name="rol"
                                        value={formData.rol}
                                        onChange={handleChange}
                                        className={selectClass}
                                    >
                                        <option value="vendedor">Vendedor</option>
                                        <option value="gerente">Gerente</option>
                                    </select>
                                </div>
                            </div>

                            {/* Sucursal */}
                            <div>
                                <label className={labelClass}>Sucursal</label>
                                <div className="relative">
                                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <select
                                        name="sucursal_id"
                                        value={formData.sucursal_id}
                                        onChange={handleChange}
                                        className={selectClass}
                                        disabled={loadingBranches}
                                    >
                                        {loadingBranches ? (
                                            <option>Cargando...</option>
                                        ) : (
                                            <>
                                                <option value="">Seleccionar Sucursal</option>
                                                {branches.map(branch => (
                                                    <option key={branch.id_sucursal} value={branch.id_sucursal}>
                                                        {branch.nombre}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <Check size={18} />
                                {initialData ? 'Guardar Cambios' : 'Crear Usuario'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleSecuritySubmit} className="space-y-4">
                        <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 mb-4">
                            <p className="text-sm text-slate-300">
                                Por seguridad, ingresa <span className="font-bold text-white">TU contraseña de administrador</span> para confirmar estos cambios.
                            </p>
                        </div>

                        <div>
                            <label className={labelClass}>Contraseña de Administrador</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type={showAdminPassword ? "text" : "password"}
                                    required
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    className={inputClass}
                                    placeholder="Contraseña Actual"
                                    autoComplete="current-password"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsSecurityCheck(false)}
                                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                            >
                                Volver
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <Lock size={18} />
                                Confirmar Edición
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
