import React, { useState, useEffect } from 'react'
import { Save, Building, Plus, MapPin, Edit2, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Settings() {
    const [branches, setBranches] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form State (New or Edit)
    const [editingBranch, setEditingBranch] = useState(null) // null = new
    const [formData, setFormData] = useState({ nombre: '', direccion: '' })
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        fetchBranches()
    }, [])

    async function fetchBranches() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('sucursales')
                .select('*')
                .order('es_matriz', { ascending: false }) // Matriz first

            if (error) throw error
            setBranches(data || [])
        } catch (error) {
            console.error('Error fetching branches:', error)
        } finally {
            setLoading(false)
        }
    }

    const openNewModal = () => {
        setEditingBranch(null)
        setFormData({ nombre: '', direccion: '' })
        setIsModalOpen(true)
        setMessage(null)
    }

    const openEditModal = (branch) => {
        setEditingBranch(branch)
        setFormData({ nombre: branch.nombre, direccion: branch.direccion || '' })
        setIsModalOpen(true)
        setMessage(null)
    }

    const handleSave = async () => {
        if (!formData.nombre.trim()) return

        try {
            setSaving(true)
            setMessage(null)

            if (editingBranch) {
                // UPDATE
                const { error } = await supabase
                    .from('sucursales')
                    .update({ nombre: formData.nombre, direccion: formData.direccion })
                    .eq('id_sucursal', editingBranch.id_sucursal)

                if (error) throw error
                // Optimistic Update
                setBranches(prev => prev.map(b => b.id_sucursal === editingBranch.id_sucursal ? { ...b, ...formData } : b))
                setMessage({ type: 'success', text: 'Sucursal actualizada.' })
            } else {
                // INSERT
                const { data, error } = await supabase
                    .from('sucursales')
                    .insert([{ nombre: formData.nombre, direccion: formData.direccion, es_matriz: false }])
                    .select()

                if (error) throw error
                // Add to list
                if (data) setBranches(prev => [...prev, data[0]])
                setMessage({ type: 'success', text: 'Sucursal creada con éxito.' })
                setFormData({ nombre: '', direccion: '' }) // Reset form for next add
            }

            setTimeout(() => {
                setIsModalOpen(false)
                setMessage(null)
            }, 1000)

        } catch (error) {
            console.error('Error saving branch:', error)
            setMessage({ type: 'error', text: 'Error al guardar.' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">Configuración</h1>
                    <p className="text-slate-400 mt-1">Gestión de Sucursales y Ajustes.</p>
                </div>
            </div>

            {/* Branch List Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Building className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Gestión de Sucursales</h2>
                            <p className="text-sm text-slate-400">Administra tus puntos de venta.</p>
                        </div>
                    </div>
                    <button
                        onClick={openNewModal}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                    >
                        <Plus size={18} />
                        Nueva Sucursal
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-slate-500">Cargando sucursales...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400 text-sm uppercased">
                                    <th className="py-3 px-4 font-semibold">Nombre</th>
                                    <th className="py-3 px-4 font-semibold">Dirección</th>
                                    <th className="py-3 px-4 font-semibold text-center">Tipo</th>
                                    <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches.map(branch => (
                                    <tr key={branch.id_sucursal} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-4 px-4 font-medium text-slate-200">{branch.nombre}</td>
                                        <td className="py-4 px-4 text-slate-400 text-sm flex items-center gap-2">
                                            {branch.direccion ? (
                                                <>
                                                    <MapPin size={14} />
                                                    {branch.direccion}
                                                </>
                                            ) : <span className="text-slate-600 italic">Sin dirección</span>}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {branch.es_matriz ? (
                                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                                    Matriz
                                                </span>
                                            ) : (
                                                <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded text-xs font-medium">
                                                    Sucursal
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <button
                                                onClick={() => openEditModal(branch)}
                                                className="text-slate-400 hover:text-blue-400 transition-colors p-2 hover:bg-blue-500/10 rounded-lg"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-6">
                            {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                                    placeholder="Ej. Sucursal Centro"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Dirección</label>
                                <input
                                    type="text"
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                                    placeholder="Calle principal #123"
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`mt-4 p-3 rounded-lg text-sm text-center ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formData.nombre.trim()}
                                className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-bold disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
