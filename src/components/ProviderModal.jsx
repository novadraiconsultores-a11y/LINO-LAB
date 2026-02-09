import { X, Phone, Mail, Tag, Eye } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function ProviderModal({ isOpen, onClose, onSave, initialData = null }) {
    const [formData, setFormData] = useState({
        nombre_empresario: '',
        telefono_empresario: '',
        email_empresario: '',
        comision_pactada: '0',
        prefijo_letra: '',
        consecutivo_letra: 0,
        codigo_visual: ''
    })

    const [calculating, setCalculating] = useState(false)

    // Generate alphabet options A-Z
    const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))

    useEffect(() => {
        if (initialData) {
            setFormData({
                nombre_empresario: initialData.nombre_empresario || '',
                telefono_empresario: initialData.telefono_empresario || '',
                email_empresario: initialData.email_empresario || '',
                comision_pactada: initialData.comision_pactada || '0',
                prefijo_letra: initialData.prefijo_letra || '',
                consecutivo_letra: initialData.consecutivo_letra || 0,
                codigo_visual: initialData.codigo_visual || ''
            })
        } else {
            setFormData({
                nombre_empresario: '',
                telefono_empresario: '',
                email_empresario: '',
                comision_pactada: '0',
                prefijo_letra: '',
                consecutivo_letra: 0,
                codigo_visual: ''
            })
        }
    }, [initialData, isOpen])

    // Auto-calculate consecutive when letter changes (ONLY FOR NEW RECORDS)
    const handleLetterChange = async (e) => {
        const letter = e.target.value

        if (!letter) {
            setFormData(prev => ({ ...prev, prefijo_letra: '', consecutivo_letra: 0, codigo_visual: '' }))
            return
        }

        // EDIT MODE PROTECTION: 
        // If we are editing and the user selects the SAME letter they started with,
        // we must RESTORE the original code, NOT calculate a new one (creating gaps).
        if (initialData && letter === initialData.prefijo_letra) {
            setFormData(prev => ({
                ...prev,
                prefijo_letra: initialData.prefijo_letra,
                consecutivo_letra: initialData.consecutivo_letra,
                codigo_visual: initialData.codigo_visual
            }))
            return
        }

        // Otherwise (New Record OR Changed Letter in Edit), calculate next available
        setCalculating(true)
        try {
            // Fetch max consecutive for this letter
            // We use a raw query or select with order
            const { data, error } = await supabase
                .from('empresarios')
                .select('consecutivo_letra')
                .eq('prefijo_letra', letter)
                .order('consecutivo_letra', { ascending: false })
                .limit(1)

            if (error) throw error

            let nextConsecutive = 1
            if (data && data.length > 0 && data[0].consecutivo_letra) {
                nextConsecutive = data[0].consecutivo_letra + 1
            }

            // Generate Visual Code: [LETRA][000]
            const visual = `${letter}${nextConsecutive.toString().padStart(3, '0')}`

            setFormData(prev => ({
                ...prev,
                prefijo_letra: letter,
                consecutivo_letra: nextConsecutive,
                codigo_visual: visual
            }))

        } catch (error) {
            console.error('Error calculating consecutive:', error)
            alert('Error al calcular consecutivo: ' + error.message)
        } finally {
            setCalculating(false)
        }
    }

    if (!isOpen) return null

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(formData)
    }

    const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors pl-9"
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

                <h2 className="text-xl font-bold text-white mb-6">
                    {initialData ? 'Editar Empresario' : 'Nuevo Empresario'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className={labelClass}>Nombre del Empresario</label>
                        <div className="relative">
                            <input
                                name="nombre_empresario"
                                required
                                value={formData.nombre_empresario}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Ej. Lino Lab"
                            />
                        </div>
                    </div>

                    {/* Series Config: Letter & Visual Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Prefijo Letra</label>
                            <div className="relative">
                                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <select
                                    name="prefijo_letra"
                                    value={formData.prefijo_letra}
                                    onChange={handleLetterChange}
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                    style={{ paddingLeft: '3.5rem' }}
                                >
                                    <option value="">Seleccionar</option>
                                    {alphabet.map(letter => (
                                        <option key={letter} value={letter}>{letter}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Código Visual</label>
                            <div className="relative">
                                <Eye size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                                <input
                                    type="text"
                                    value={formData.codigo_visual}
                                    readOnly
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-bold font-mono focus:outline-none cursor-not-allowed"
                                    style={{ paddingLeft: '3.5rem' }}
                                    placeholder={calculating ? "Calculando..." : "Ej. A001"}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contacto: Teléfono y Email */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className={labelClass}>Teléfono</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    name="telefono_empresario"
                                    type="tel"
                                    value={formData.telefono_empresario || ''}
                                    onChange={handleChange}
                                    className={inputClass}
                                    style={{ paddingLeft: '3.5rem' }}
                                    placeholder="55 1234 5678"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    name="email_empresario"
                                    type="email"
                                    value={formData.email_empresario || ''}
                                    onChange={handleChange}
                                    className={inputClass}
                                    style={{ paddingLeft: '3.5rem' }}
                                    placeholder="contacto@ejemplo.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Comisión */}
                    <div>
                        <label className={labelClass}>Comisión Pactada (%)</label>
                        <div className="relative">
                            <input
                                name="comision_pactada"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                required
                                value={formData.comision_pactada}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="10"
                            />
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
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                        >
                            {initialData ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
