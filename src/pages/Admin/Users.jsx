import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function Users() {
    const [users, setUsers] = useState([])
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('perfiles')
                .select('*')

            if (error) throw error

            setUsers(data || [])
        } catch (err) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-10 text-white">Cargando...</div>

    if (error) return (
        <div className="p-10 text-red-500 text-2xl font-bold border border-red-500 bg-red-900/20 m-4 rounded">
            ERROR CRÍTICO: {error}
        </div>
    )

    if (users.length === 0) return (
        <div className="p-20 text-center text-white text-4xl font-bold bg-slate-800 m-4 rounded-xl">
            HAY 0 USUARIOS EN LA DB
        </div>
    )

    return (
        <div className="p-8 text-white">
            <h1 className="text-2xl font-bold mb-4">Debug Usuarios (Modo Simple)</h1>
            <div className="overflow-x-auto">
                <table className="min-w-full border border-slate-700">
                    <thead className="bg-slate-800 text-slate-300">
                        <tr>
                            <th className="p-2 border border-slate-700 text-left">ID</th>
                            <th className="p-2 border border-slate-700 text-left">Email</th>
                            <th className="p-2 border border-slate-700 text-left">Nombre</th>
                            <th className="p-2 border border-slate-700 text-left">Rol</th>
                            <th className="p-2 border border-slate-700 text-left">Sucursal ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id_perfil} className="hover:bg-slate-800/50">
                                <td className="p-2 border border-slate-700 font-mono text-xs">{u.id_perfil}</td>
                                <td className="p-2 border border-slate-700">{u.email}</td>
                                <td className="p-2 border border-slate-700">{u.nombre_completo}</td>
                                <td className="p-2 border border-slate-700">{u.rol}</td>
                                <td className="p-2 border border-slate-700">{u.sucursal_id || 'NULL'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                onClick={fetchUsers}
                className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
            >
                Recargar Datos
            </button>
        </div>
    )
}
