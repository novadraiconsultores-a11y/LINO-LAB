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
    const getProfile = async (userId) => {
        try {
            console.log("INTENTANDO FETCH PERFIL PARA:", userId); // Debug

            const { data, error } = await supabase
                .from('perfiles') // Tabla correcta
                .select('*, sucursales(nombre)') // Join w/ sucursales directly if possible
                .eq('id_perfil', userId) // ID correcto
                .single();

            if (error) {
                console.error("ERROR SUPABASE:", error);
                throw error;
            }

            if (data) {
                console.log("PERFIL ENCONTRADO:", data); // Debug
                // Normalize data structure for consistency
                const userProfile = {
                    ...data,
                    rol: data.rol ? data.rol.trim().toLowerCase() : 'vendedor'
                }
                setProfile(userProfile);

                // FORCE SYNC: Merge DB profile into User state to override stale token metadata
                setUser(prev => ({ ...prev, ...userProfile }));
            }
        } catch (error) {
            console.error("Error cargando perfil:", error.message);
            // Fallback opcional si falla la DB (Critical for debugging visibility)
            setProfile({
                rol: 'vendedor',
                nombre: 'Usuario (Fallback)',
                id_perfil: userId
            });
            // Don't merge fallback into user to avoid overwriting session data with junk if just net error
            setAuthError(error)
        }
    }

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                getProfile(currentUser.id).finally(() => setLoading(false))
            } else {
                setLoading(false)
            }
        })

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                getProfile(currentUser.id).finally(() => setLoading(false))
            } else {
                setProfile(null)
                setAuthError(null)
                setLoading(false)
            }
        })

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
