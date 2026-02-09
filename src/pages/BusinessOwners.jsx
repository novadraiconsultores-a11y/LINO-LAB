import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, Building2, Wallet, Phone } from 'lucide-react'
import { supabase } from '../supabaseClient'
import ProviderModal from '../components/ProviderModal'
import SecurityConfirmModal from '../components/SecurityConfirmModal'

export default function BusinessOwners() {
    const [providers, setProviders] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProvider, setEditingProvider] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Security State
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState(null) // { type: 'UPDATE' | 'DELETE', data: ... }

    useEffect(() => {
        fetchProviders()
    }, [])

    async function fetchProviders() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('empresarios')
                .select('*')
                .order('nombre_empresario', { ascending: true })

            if (error) throw error
            setProviders(data || [])
        } catch (error) {
            console.error('Error al cargar empresarios:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveProvider = async (formData) => {
        // Clean data first
        const {
            prefijo_numerico,
            id_ean_global,
            ...cleanData
        } = formData

        if (editingProvider) {
            // UPDATE: REQUIRES SECURITY CONFIRMATION
            setPendingAction({
                type: 'UPDATE',
                data: cleanData,
                id: editingProvider.id_empresario
            })
            setIsSecurityModalOpen(true)
        } else {
            // CREATE: DIRECT (No password needed for creation usually, unless requested. User said "Editar/Eliminar")
            try {
                const { error } = await supabase
                    .from('empresarios')
                    .insert([cleanData])
                if (error) throw error

                fetchProviders()
                setIsModalOpen(false)
                setEditingProvider(null)
            } catch (error) {
                console.error('Error al crear:', error.message)
                alert('Error al crear: ' + error.message)
            }
        }
    }

    const handleDelete = (id) => {
        // DELETE: REQUIRES SECURITY CONFIRMATION
        setPendingAction({
            type: 'DELETE',
            id: id
        })
        setIsSecurityModalOpen(true)
    }

    const handleSecurityConfirm = async () => {
        if (!pendingAction) return

        try {
            if (pendingAction.type === 'UPDATE') {
                const { error } = await supabase
                    .from('empresarios')
                    .update(pendingAction.data)
                    .eq('id_empresario', pendingAction.id)
                if (error) throw error

                // Success: Close both modals
                setIsModalOpen(false)
                setEditingProvider(null)
            }
            else if (pendingAction.type === 'DELETE') {
                const { error } = await supabase
                    .from('empresarios')
                    .delete()
                    .eq('id_empresario', pendingAction.id)
                if (error) throw error
            }

            // Refresh and reset
            fetchProviders()
            setPendingAction(null)
            setIsSecurityModalOpen(false) // This is closed by the modal itself onConfirm success? 
            // Actually the modal calls onConfirm and then closes. 
            // We should ensure we don't double close or leave open if error.
            // The modal handles Close. We just handle logic here.

        } catch (error) {
            console.error('Error en acción segura:', error.message)
            alert('Error comando: ' + error.message)
            // Rethrow to let modal show error? 
            // The modal catches errors in onConfirm if we return a Promise that rejects.
            throw error
        }
    }

    const openEditModal = (provider) => {
        setEditingProvider(provider)
        setIsModalOpen(true)
    }

    // ... rest of existing functions

    const openNewModal = () => {
        setEditingProvider(null)
        setIsModalOpen(true)
    }

    const filteredProviders = providers.filter(p =>
        p.nombre_empresario?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Empresarios</h1>
                    <p className="text-slate-400 mt-1">Gestión de socios y comisiones</p>
                </div>
                <button
                    onClick={openNewModal}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                    <Plus size={20} />
                    Nuevo Empresario
                </button>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6 flex items-center gap-3 shadow-sm relative group">
                <input
                    type="text"
                    placeholder="Buscar empresario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-slate-200 w-full placeholder-slate-600 px-3"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-slate-500 col-span-full text-center py-12">Cargando empresarios...</p>
                ) : filteredProviders.length === 0 ? (
                    <div className="col-span-full text-center py-12 flex flex-col items-center">
                        <Building2 className="text-slate-700 mb-3" size={48} />
                        <h3 className="text-white font-medium">No hay empresarios registrados</h3>
                        <p className="text-slate-500 text-sm mt-1">Agrega tu primer empresario para empezar.</p>
                    </div>
                ) : (
                    filteredProviders.map(provider => (
                        <div key={provider.id_empresario} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500 dark:hover:border-slate-700 transition-all shadow-sm group relative">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(provider)}
                                    className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-800 rounded-lg hover:bg-slate-700"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(provider.id_empresario)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 rounded-lg hover:bg-slate-700"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-900/20 flex items-center justify-center text-blue-500">
                                    <Building2 size={24} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-white text-lg leading-tight truncate">{provider.nombre_empresario}</h3>
                                    {provider.telefono_empresario ? (
                                        <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                                            <Phone size={12} />
                                            <span className="text-xs font-mono">{provider.telefono_empresario}</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-600 font-mono mt-1">Sin teléfono</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-emerald-400 font-bold font-mono" title="Código Visual">
                                            {provider.codigo_visual || '?'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 border-t border-slate-800 pt-3">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Wallet size={16} className="text-emerald-500" />
                                        <span>Comisión Pactada:</span>
                                    </div>
                                    <span className="font-bold text-emerald-400">
                                        {provider.comision_pactada}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ProviderModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveProvider}
                initialData={editingProvider}
            />

            <SecurityConfirmModal
                isOpen={isSecurityModalOpen}
                onClose={() => {
                    setIsSecurityModalOpen(false)
                    setPendingAction(null)
                }}
                onConfirm={handleSecurityConfirm}
                title={pendingAction?.type === 'DELETE' ? 'Eliminar Empresario' : 'Guardar Cambios'}
                message={pendingAction?.type === 'DELETE'
                    ? 'Esta acción eliminará permanentemente al empresario y es irreversible. ¿Confirmas la eliminación?'
                    : 'Estás a punto de modificar información sensible de un empresario. ¿Confirmas los cambios?'}
                warningType={pendingAction?.type === 'DELETE' ? 'danger' : 'info'}
            />
        </div>
    )
}
