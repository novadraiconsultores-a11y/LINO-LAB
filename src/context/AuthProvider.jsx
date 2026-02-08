import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState(null)

    // Helper: Explicit Profile Fetch (Simplified & Aggressive)
    const getProfile = async (currentUser) => {
        if (!currentUser) return;
        const userId = currentUser.id;

        try {
            // console.log("INTENTANDO FETCH PERFIL PARA:", userId); 

            const { data, error } = await supabase
                .from('perfiles')
                .select('*, sucursales(nombre)')
                .eq('id_perfil', userId)
                .single();

            if (error) {
                console.warn("Error cargando perfil (Auth):", error.message);
                throw error;
            }

            if (data) {
                // console.log("PERFIL ENCONTRADO DB:", data); 

                // Normalización de Rol
                const dbRole = data.rol ? data.rol.trim().toLowerCase() : 'vendedor'

                const userProfile = {
                    ...data,
                    rol: dbRole
                }

                setProfile(userProfile);

                // CRITICAL: Force overwriting the user state with DB data
                // This ensures 'user.rol' is exactly what is in the DB, ignoring session metadata
                setUser({
                    ...currentUser,
                    ...userProfile, // This puts 'rol', 'sucursal_id', etc. at top level
                    user_metadata: {
                        ...currentUser.user_metadata,
                        rol: dbRole // Also update metadata mirror just in case
                    }
                });
            }
        } catch (error) {
            // Fallback: If DB fails, keep session user but mark as Vendedor for safety
            setAuthError(error)
            // Optional: Enforce safest role on error
            /* setUser(prev => ({ ...prev, rol: 'vendedor' })) */
        }
    }

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            const currentUser = session?.user ?? null

            // Initial set (might be stale role from token)
            setUser(currentUser)

            if (currentUser) {
                // Immediately fetch DB truth
                getProfile(currentUser).finally(() => setLoading(false))
            } else {
                setLoading(false)
            }
        })

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            const currentUser = session?.user ?? null

            // Set based on session first
            setUser(currentUser)

            if (currentUser) {
                // Then override with DB truth
                getProfile(currentUser).finally(() => setLoading(false))
            } else {
                setProfile(null)
                setAuthError(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    return () => subscription.unsubscribe()
}, [])

const value = {
    session,
    user,
    profile,
    authError,
    signOut: () => supabase.auth.signOut()
}

if (loading) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                <p className="text-slate-400 text-sm font-mono animate-pulse">Cargando perfil...</p>
            </div>
        </div>
    )
}

return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
)
}
