import { useState, useEffect } from 'react'
import { X, Key, Lock, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react'

export default function ResetPasswordModal({ isOpen, onClose, onConfirm, user }) {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [adminPassword, setAdminPassword] = useState('')

    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [showAdmin, setShowAdmin] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setNewPassword('')
            setConfirmPassword('')
            setAdminPassword('')
            setShowNew(false)
            setShowConfirm(false)
            setShowAdmin(false)
        }
    }, [isOpen])

    if (!isOpen || !user) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            alert('Las contraseñas no coinciden')
            return
        }
        if (newPassword.length < 6) {
            alert('La nueva contraseña debe tener al menos 6 caracteres')
            return
        }
        onConfirm(user.id_perfil, newPassword, adminPassword)
    }

    const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 transition-colors pl-9"
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

                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-3">
                        <Key className="text-yellow-500" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Cambiar Contraseña</h2>
                    <p className="text-slate-400 text-sm mt-1">Para el usuario: <span className="text-white font-medium">{user.nombre_completo}</span></p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* New Password */}
                    <div>
                        <label className={labelClass}>Nueva Contraseña</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type={showNew ? "text" : "password"}
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={inputClass}
                                placeholder="******"
                                autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                        <label className={labelClass}>Confirmar Nueva Contraseña</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type={showConfirm ? "text" : "password"}
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={inputClass}
                                placeholder="******"
                                autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 my-4"></div>

                    {/* Admin Check */}
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 mb-3">
                        <p className="text-xs text-yellow-500/90 flex items-start gap-2">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            Seguridad: Ingresa TU contraseña de administrador para autorizar este cambio.
                        </p>
                    </div>

                    <div>
                        <label className={labelClass}>Tu Contraseña (Admin)</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type={showAdmin ? "text" : "password"}
                                required
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className={inputClass}
                                placeholder="Contraseña de Administrador"
                                autoComplete="current-password"
                            />
                            <button type="button" onClick={() => setShowAdmin(!showAdmin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                {showAdmin ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 shadow-lg shadow-yellow-900/20"
                        >
                            <Check size={18} />
                            Confirmar Cambio
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
