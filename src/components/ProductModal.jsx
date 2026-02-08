import { X, ExternalLink, Upload, Image as ImageIcon, AlertTriangle, ArrowRight, Copy, Save, Eye, RefreshCw, Printer } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { CATEGORIAS, TALLAS, CALIDADES, DEPORTES, EQUIPOS_POR_DEPORTE } from '../constants'
import ProductLabel from './ProductLabel'

export default function ProductModal({ isOpen, onClose, onSave, initialData = null }) {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        nombre_producto: '',
        sku_producto: '',
        descripcion_producto: '',
        categoria_producto: '',
        deporte_producto: '',
        equipo_producto: '',
        genero_producto: '',
        calidad_producto: '',
        talla_producto: '',
        color_producto: '',
        costo_producto: '',
        precio_venta: '',
        stock_actual: 0,
        ref_empresario_id: '',
        imagen_producto_url: ''
    })

    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [providers, setProviders] = useState([])
    const [loadingProviders, setLoadingProviders] = useState(false)

    // Duplicate Detection State
    const [checkingDuplicates, setCheckingDuplicates] = useState(false)
    const [potentialDuplicate, setPotentialDuplicate] = useState(null)
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchProviders()
            setImageFile(null)
            setImagePreview(null)
            setPotentialDuplicate(null)
            setShowDuplicateWarning(false)
        }

        if (initialData) {
            setFormData(initialData)
            if (initialData.imagen_producto_url) {
                setImagePreview(initialData.imagen_producto_url)
            }
        } else {
            setFormData({
                nombre_producto: '', sku_producto: '', descripcion_producto: '',
                categoria_producto: '', deporte_producto: '', equipo_producto: '',
                genero_producto: '', calidad_producto: '',
                talla_producto: '', color_producto: '',
                costo_producto: '', precio_venta: '',
                stock_actual: 0, ref_empresario_id: '', imagen_producto_url: '',
                codigo_barras: ''
            })
        }
    }, [isOpen, initialData])

    async function fetchProviders() {
        try {
            setLoadingProviders(true)
            const { data, error } = await supabase
                .from('empresarios')
                .select('id_empresario, nombre_empresario')
                .order('nombre_empresario', { ascending: true })

            if (error) throw error
            setProviders(data || [])
        } catch (error) {
            console.error('Error al cargar empresarios:', error.message)
        } finally {
            setLoadingProviders(false)
        }
    }

    if (!isOpen) return null

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    // Helper to calculate EAN-13 Checksum
    const calculateEAN13Checksum = (codeWithoutChecksum) => {
        if (codeWithoutChecksum.length !== 12) return null

        let sum = 0
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(codeWithoutChecksum[i])
            sum += (i % 2 === 0) ? digit : digit * 3
        }

        const remainder = sum % 10
        return (10 - remainder) % 10
    }

    const generateCodes = async () => {
        const { ref_empresario_id } = formData

        if (!ref_empresario_id) {
            alert('Selecciona un Empresario primero.')
            return
        }

        try {
            // 1. Get Entrepreneur Details
            const { data: provider, error } = await supabase
                .from('empresarios')
                .select('codigo_visual, id_ean_global, ultimo_consecutivo')
                .eq('id_empresario', ref_empresario_id)
                .single()

            if (error) throw error

            // Validate
            if (!provider.codigo_visual || !provider.id_ean_global) {
                alert('El empresario seleccionado no tiene configurado el Código Visual o ID Global.')
                return
            }

            // 2. Calculate New Consecutive
            const newConsecutive = (provider.ultimo_consecutivo || 0) + 1
            const consecutiveStr = newConsecutive.toString().padStart(5, '0') // 00005

            // 3. Generate SKU Hybrid: [CODIGO_VISUAL]-[00005] -> B001-00005
            const sku = `${provider.codigo_visual}-${consecutiveStr}`

            // 4. Generate EAN-13
            // Structure: 20 (2) + EntrepreneurID (3) + Product (5) + Filler (2) + Checksum (1) = 13
            const prefixFixed = '20'
            const entrepreneurId = provider.id_ean_global.toString().padStart(3, '0') // 055
            const filler = '00'

            const baseCode = `${prefixFixed}${entrepreneurId}${consecutiveStr}${filler}`
            const checksum = calculateEAN13Checksum(baseCode)
            const ean13 = `${baseCode}${checksum}`

            // 5. Set State
            setFormData(prev => ({
                ...prev,
                sku_producto: sku,
                codigo_barras: ean13
            }))

        } catch (error) {
            console.error('Error generating codes:', error)
            alert('Error al generar códigos: ' + error.message)
        }
    }

    const checkForDuplicates = async () => {
        // Validation Criteria:
        // ref_empresario_id, nombre_producto (ilike), talla_producto, color_producto, categoria_producto, calidad_producto

        const { ref_empresario_id, nombre_producto, talla_producto, color_producto, categoria_producto, calidad_producto } = formData

        if (!ref_empresario_id || !nombre_producto || !talla_producto || !color_producto || !categoria_producto || !calidad_producto) {
            // Can't check if fields are missing, proceed to validation errors in onSave usually, or just return false here
            return null
        }

        setCheckingDuplicates(true)
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('ref_empresario_id', ref_empresario_id)
                .ilike('nombre_producto', nombre_producto) // Case insensitive match
                .eq('talla_producto', talla_producto)
                .eq('color_producto', color_producto)
                .eq('categoria_producto', categoria_producto)
                .eq('calidad_producto', calidad_producto)
                .maybeSingle() // Expecting at most one, or we just take the first one found

            if (error) throw error
            return data
        } catch (err) {
            console.error("Error checking duplicates:", err)
            return null
        } finally {
            setCheckingDuplicates(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // 1. Check for duplicates (ONLY FOR NEW PRODUCTS)
        if (!initialData) {
            const duplicate = await checkForDuplicates()
            if (duplicate) {
                setPotentialDuplicate(duplicate)
                setShowDuplicateWarning(true)
                return // HALT SAVE
            }
        }

        // 2. Proceed if no duplicate or editing
        finalizeSave()
    }

    const finalizeSave = async () => {
        // Prepare data
        let finalData = { ...formData }

        // FORCED CREATION LOGIC
        // With the new Hybrid SKU format (which includes random HEX), collision is unlikely.
        // We removed the mandatory extra suffix here to respect the clean format.
        // If a collision DOES happen (Error 23505), the catch block below will handle it.

        if (showDuplicateWarning) {
            setShowDuplicateWarning(false)
        }

        try {
            await onSave(finalData, imageFile)

            // NEW: Update Entrepreneur Sequential IF this is a new product and has our generated SKU format
            if (!initialData && finalData.ref_empresario_id && finalData.sku_producto.includes('-')) {
                const parts = finalData.sku_producto.split('-')
                if (parts.length === 2) {
                    const consecutive = parseInt(parts[1])
                    if (!isNaN(consecutive)) {
                        // Direct update
                        await supabase
                            .from('empresarios')
                            .update({ ultimo_consecutivo: consecutive })
                            .eq('id_empresario', finalData.ref_empresario_id)
                            .lt('ultimo_consecutivo', consecutive) // Only update if greater
                    }
                }
            }

        } catch (error) {
            console.error("Save Error caught in Modal:", error)

            // "Safety Net": Catch Duplicate Key Error (23505)
            if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('violates unique constraint')) {
                // Determine which product caused the conflict
                if (!potentialDuplicate) {
                    // Try to find the duplicate to show detailed info
                    const { data } = await supabase.from('productos')
                        .select('*')
                        .eq('sku_producto', finalData.sku_producto)
                        .maybeSingle()

                    setPotentialDuplicate(data || {
                        nombre_producto: finalData.nombre_producto,
                        sku_producto: finalData.sku_producto,
                        stock_actual: '?'
                    })
                }

                setCheckingDuplicates(false) // Reset loading state
                setShowDuplicateWarning(true) // Re-open duplicate warning

                // Optional: We could regenerate SKU here automatically if we wanted to be super helpful?
                // But for now, just letting them know it failed is safer.
                alert("El SKU generado ya existe. Por favor intenta generar uno nuevo (Click en 'Auto').")
            } else {
                alert("Error al guardar: " + error.message)
            }
        }
    }

    const handleGoToSupply = () => {
        // Redirect to Supply module with the found product pre-selected
        if (potentialDuplicate) {
            onClose() // Close modal
            navigate('/abastecimiento', {
                state: {
                    preSelectedProduct: potentialDuplicate
                }
            })
        }
    }

    const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
    const labelClass = "block text-slate-400 text-xs mb-1 uppercase font-semibold"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto h-screen">
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200 my-auto">

                {/* DUPLICATE WARNING OVERLAY */}
                {showDuplicateWarning && potentialDuplicate && (
                    <div className="absolute inset-0 z-10 bg-slate-900/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-8 animate-in fade-in">
                        <div className="bg-yellow-500/10 border border-yellow-500/50 p-6 rounded-2xl max-w-lg w-full text-center shadow-2xl">
                            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500 animate-pulse">
                                <AlertTriangle size={32} />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">⚠️ Posible Duplicado Detectado</h3>
                            <p className="text-slate-300 text-sm mb-6">
                                Ya existe un producto con características idénticas en tu catálogo:
                            </p>

                            <div className="bg-slate-800 rounded-lg p-4 mb-6 flex items-start gap-4 text-left border border-slate-700">
                                <div className="w-16 h-16 bg-slate-700 rounded-md overflow-hidden flex-shrink-0">
                                    {potentialDuplicate.imagen_producto_url ? (
                                        <img src={potentialDuplicate.imagen_producto_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="w-full h-full p-4 text-slate-500" />
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-white">{potentialDuplicate.nombre_producto}</div>
                                    <div className="text-xs text-yellow-500 font-mono mt-1">{potentialDuplicate.sku_producto}</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Stock actual: <span className="text-emerald-400 font-bold">{potentialDuplicate.stock_actual}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleGoToSupply}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                                >
                                    <ArrowRight size={18} /> Es el mismo (Ir a Abastecer)
                                </button>

                                <button
                                    onClick={finalizeSave} // "Es Diferente" -> Force Save
                                    className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Copy size={18} /> Es Diferente (Crear Nuevo)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">
                    {initialData ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section: Basic Info & Image */}
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Image Upload */}
                        <div className="w-full md:w-1/3 flex flex-col items-center">
                            <div className="w-full aspect-square bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden relative group">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <div className="text-center p-4">
                                        <ImageIcon className="mx-auto text-slate-600 mb-2" size={32} />
                                        <span className="text-xs text-slate-500">Sin imagen</span>
                                    </div>
                                )}
                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                    <span className="text-white text-xs font-bold flex items-center gap-1">
                                        <Upload size={14} /> Cambiar
                                    </span>
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">Click para subir foto</p>

                            {/* SKU & Barcode Generator & Label Preview */}
                            <div className="w-full mt-4 space-y-4 border-t border-slate-700 pt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Etiquetado
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={generateCodes}
                                        className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-slate-600 uppercase font-bold tracking-wide"
                                        title="Generar SKU y EAN-13 automáticos"
                                    >
                                        <RefreshCw size={12} />
                                        Generar
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {/* SKU Field */}
                                    <div>
                                        <label className={labelClass}>SKU (Híbrido)</label>
                                        <input
                                            name="sku_producto"
                                            value={formData.sku_producto}
                                            readOnly
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-mono text-xs focus:outline-none"
                                            placeholder="Ej. B001-00005"
                                        />
                                    </div>

                                    {/* Barcode Field */}
                                    <div>
                                        <label className={labelClass}>Código de Barras (EAN-13)</label>
                                        <input
                                            name="codigo_barras"
                                            value={formData.codigo_barras || ''}
                                            readOnly
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-blue-400 font-mono text-xs focus:outline-none tracking-widest"
                                            placeholder="20XX00001000C"
                                        />
                                    </div>
                                </div>

                                {/* Label Preview */}
                                {(formData.sku_producto || formData.codigo_barras) && (
                                    <div className="mt-2">
                                        <label className={labelClass}>Vista Previa Etiqueta</label>
                                        <div className="flex justify-center bg-slate-900/50 p-3 rounded-lg border border-slate-800 border-dashed">
                                            <div className="scale-75 origin-top">
                                                <ProductLabel
                                                    product={{
                                                        ...formData,
                                                        precio_venta: formData.precio_venta || 0
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Basic Fields */}
                        <div className="w-full md:w-2/3 space-y-4">
                            <div>
                                <label className={labelClass}>Empresario / Dueño</label>
                                <select
                                    name="ref_empresario_id"
                                    value={formData.ref_empresario_id || ''}
                                    onChange={handleChange}
                                    className={inputClass}
                                    required
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {providers.map(p => (
                                        <option key={p.id_empresario} value={p.id_empresario}>{p.nombre_empresario}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Nombre del Producto</label>
                                <input
                                    name="nombre_producto"
                                    required
                                    value={formData.nombre_producto}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Ej. Jersey Real Madrid Local 24/25"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Categoría</label>
                                    <select
                                        name="categoria_producto"
                                        value={formData.categoria_producto}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {CATEGORIAS.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Género</label>
                                    <select
                                        name="genero_producto"
                                        value={formData.genero_producto}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        <option value="HOMBRE">Hombre</option>
                                        <option value="MUJER">Mujer</option>
                                        <option value="UNISEX">Unisex</option>
                                        <option value="NIÑO">Niño</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Deporte</label>
                                    <select
                                        name="deporte_producto"
                                        value={formData.deporte_producto || ''}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            const isNA = val === 'NA'
                                            setFormData({
                                                ...formData,
                                                deporte_producto: val,
                                                equipo_producto: isNA ? 'NA' : ''
                                            })
                                        }}
                                        className={inputClass}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {DEPORTES.map(dep => (
                                            <option key={dep} value={dep}>{dep}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Equipo</label>
                                    <select
                                        name="equipo_producto"
                                        value={formData.equipo_producto || ''}
                                        onChange={handleChange}
                                        className={inputClass}
                                        disabled={!formData.deporte_producto || formData.deporte_producto === 'NA'}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {formData.deporte_producto && EQUIPOS_POR_DEPORTE[formData.deporte_producto]?.map(eq => (
                                            <option key={eq} value={eq}>{eq}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                <div>
                                    <label className={labelClass}>Calidad</label>
                                    <select
                                        name="calidad_producto"
                                        value={formData.calidad_producto}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">-- Sel --</option>
                                        {CALIDADES.map(q => (
                                            <option key={q} value={q}>{q}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Talla</label>
                                    <select
                                        name="talla_producto"
                                        value={formData.talla_producto}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">-- Sel --</option>
                                        {TALLAS.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Color</label>
                                    <input
                                        name="color_producto"
                                        value={formData.color_producto}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="Ej. AZUL"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Costo Producto</label>
                                    <input
                                        name="costo_producto"
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.costo_producto}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Precio Venta</label>
                                    <input
                                        name="precio_venta"
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.precio_venta}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Descripción (Opcional)</label>
                        <textarea
                            name="descripcion_producto"
                            rows="2"
                            value={formData.descripcion_producto}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Detalles adicionales..."
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-bold uppercase text-sm tracking-wide"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={checkingDuplicates}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg transition-all shadow-lg font-bold uppercase text-sm tracking-wide disabled:opacity-50"
                        >
                            {checkingDuplicates ? 'Validando...' : (initialData ? 'Actualizar Ficha' : 'Guardar en Catálogo')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
