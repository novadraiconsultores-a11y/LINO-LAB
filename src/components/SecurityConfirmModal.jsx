import { useState } from 'react'
import { X, Lock, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function SecurityConfirmModal({ isOpen, onClose, onConfirm, title, message, warningType = 'info' }) {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No hay sesión activa')

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: password
            })

            if (signInError) throw new Error('Contraseña incorrecta')

            // If success, call onConfirm
            await onConfirm()

            // Cleanup
            setPassword('')
            onClose()

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 relative">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${warningType === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                        {warningType === 'danger' ? <AlertTriangle size={32} /> : <Lock size={32} />}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{title || 'Confirmación de Seguridad'}</h3>
                    <p className="text-slate-400 text-sm">
                        {message || 'Esta acción requiere permisos de administrador. Por favor ingresa tu contraseña para continuar.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                            Contraseña de Administrador
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="••••••••"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !password}
                            className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors shadow-lg ${warningType === 'danger'
                                    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Verificando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
