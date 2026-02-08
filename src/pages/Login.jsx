import { useState } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error

            // Success
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: '#0f172a',
                color: '#f8fafc',
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            })

            Toast.fire({
                icon: 'success',
                title: 'Bienvenido a LINO LAB'
            })

            navigate('/')

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Acceso',
                text: error.message === 'Invalid login credentials' ? 'Credenciales incorrectas.' : error.message,
                background: '#0f172a',
                color: '#f8fafc',
                confirmButtonColor: '#ef4444'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-lg shadow-emerald-500/10">
                        <Lock className="text-emerald-500" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Iniciar Sesión</h1>
                    <p className="text-slate-400 text-sm mt-2">Accede al Sistema de Inventarios LINO LAB</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Correo Electrónico</label>
                        <div className="relative group">
                            <div className={`absolute inset-y-0 left-0 w-12 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-200 ${email ? 'opacity-0' : 'opacity-100'}`}>
                                <Mail className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={`w-full bg-slate-950 border border-slate-800 text-white pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 shadow-sm ${!email ? 'force-icon-padding' : ''}`}
                                placeholder="usuario@linolab.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Contraseña</label>
                        <div className="relative group">
                            <div className={`absolute inset-y-0 left-0 w-12 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-200 ${password ? 'opacity-0' : 'opacity-100'}`}>
                                <Lock className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className={`w-full bg-slate-950 border border-slate-800 text-white pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 shadow-sm ${!password ? 'force-icon-padding' : ''}`}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <>Ingresar <ArrowRight size={20} /></>}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-600">
                        ¿Olvidaste tu contraseña? Contacta al administrador.
                    </p>
                </div>
            </div>
        </div>
    )
}
