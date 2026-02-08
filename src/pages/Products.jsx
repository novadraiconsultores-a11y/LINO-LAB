import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Copy } from 'lucide-react'
import { supabase } from '../supabaseClient'
import ProductModal from '../components/ProductModal'

export default function Products() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchProducts()
    }, [])

    async function fetchProducts() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('productos')
                .select(`
                  *,
                  empresario:empresarios(nombre_empresario)
                `)
                .order('nombre_producto', { ascending: true })

            if (error) throw error
            setProducts(data || [])
        } catch (error) {
            console.error('Error al cargar productos:', error.message)
        } finally {
            setLoading(false)
        }
    }

    // Helper: Convert to WebP
    const convertImageToWebP = (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        reject(new Error('Falló la conversión de imagen'))
                    }
                }, 'image/webp', 0.8) // Quality 0.8
            }
            img.onerror = (err) => reject(err)
            img.src = URL.createObjectURL(file)
        })
    }

    const handleSaveProduct = async (formData, imageFile) => {
        try {
            let imageUrl = formData.imagen_producto_url

            // Handle Image Upload
            if (imageFile) {
                try {
                    // 1. Convert to WebP
                    const webpBlob = await convertImageToWebP(imageFile)
                    const fileName = `${Date.now()}.webp`
                    const filePath = `${fileName}`

                    // 2. Upload to Supabase
                    const { error: uploadError } = await supabase.storage
                        .from('fotos-productos')
                        .upload(filePath, webpBlob, {
                            contentType: 'image/webp',
                            upsert: false
                        })

                    if (uploadError) {
                        console.error('Supabase Storage Error:', uploadError)
                        throw new Error(uploadError.message || 'Error desconocido en Storage')
                    }

                    // 3. Get Public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('fotos-productos')
                        .getPublicUrl(filePath)

                    imageUrl = publicUrl
                } catch (imgError) {
                    console.error('Error procesando imagen:', imgError)
                    alert(`Error al subir la imagen: ${imgError.message}`)
                    return // Stop save if upload fails
                }
            }

            const payload = {
                sku_producto: formData.sku_producto,
                nombre_producto: formData.nombre_producto,
                descripcion_producto: formData.descripcion_producto,
                categoria_producto: formData.categoria_producto,
                genero_producto: formData.genero_producto,
                calidad_producto: formData.calidad_producto,
                talla_producto: formData.talla_producto,
                color_producto: formData.color_producto,
                imagen_producto_url: imageUrl,
                precio_venta: parseFloat(formData.precio_venta) || 0,
                costo_producto: parseFloat(formData.costo_producto) || 0,
                ref_empresario_id: formData.ref_empresario_id || null
                // Note: stock_actual is NOT updated here in Edit/Create Catalog
            }

            if (editingProduct && editingProduct.id_producto) {
                // Update
                const { error } = await supabase
                    .from('productos')
                    .update(payload)
                    .eq('id_producto', editingProduct.id_producto)
                if (error) throw error
            } else {
                // Create
                const { error } = await supabase
                    .from('productos')
                    .insert([payload])
                if (error) throw error
            }

            fetchProducts() // Refresh list
            setIsModalOpen(false) // Close modal
            setEditingProduct(null)
        } catch (error) {
            console.error('Error al guardar producto:', error.message)
            throw error
        }
    }

    const openNewModal = () => {
        setEditingProduct(null)
        setIsModalOpen(true)
    }

    const openEditModal = (product) => {
        setEditingProduct(product)
        setIsModalOpen(true)
    }

    const handleClone = (product) => {
        const clonedData = {
            ...product,
            id_producto: null,
            sku_producto: '',
            stock_actual: 0
        }
        setEditingProduct(clonedData)
        setIsModalOpen(true)
    }

    const filteredProducts = products.filter(product =>
        product.nombre_producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku_producto?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Catálogo de Productos</h1>
                    <p className="text-slate-400 mt-1">Gestión de Fichas Técnicas (Sin Stock)</p>
                </div>
                <button
                    onClick={openNewModal}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                    <Plus size={20} />
                    Nuevo Producto
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6 flex items-center gap-3 shadow-sm backdrop-blur-sm">
                <Search className="text-slate-500" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-white w-full placeholder-slate-600"
                />
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="overflow-x-auto table-responsive">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-slate-200 uppercase font-medium bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4">Producto</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Detalles</th>
                                <th className="px-6 py-4 text-right">Precio</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        Cargando catálogo...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 mb-2">
                                                <Search size={24} />
                                            </div>
                                            <h3 className="text-white font-medium">No hay productos encontrados</h3>
                                            <p className="text-slate-500">Crea un nuevo producto para comenzar.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id_producto} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            <div className="flex items-center gap-3">
                                                {/* Thumbnail */}
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-slate-600">
                                                    {product.imagen_producto_url ? (
                                                        <img src={product.imagen_producto_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-xs">IMG</div>
                                                    )}
                                                </div>

                                                <div>
                                                    <div>{product.nombre_producto}</div>
                                                    {product.empresario && (
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                                            {product.empresario.nombre_empresario}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">
                                            <span className="bg-gray-100 dark:bg-slate-800/50 px-2 py-1 rounded text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-transparent">
                                                {product.sku_producto}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-gray-600 dark:text-slate-300">{product.categoria_producto}</span>
                                                <div className="flex gap-2">
                                                    <span className="bg-gray-100 dark:bg-slate-800 px-1.5 rounded text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-transparent">{product.talla_producto}</span>
                                                    <span className="bg-gray-100 dark:bg-slate-800 px-1.5 rounded text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-transparent">{product.color_producto}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900 dark:text-slate-200 font-medium">
                                            ${product.precio_venta?.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleClone(product)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                                                    title="Duplicar / Clonar Ficha"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                                                    title="Editar Ficha"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveProduct}
                initialData={editingProduct}
            />
        </div>
    )
}
