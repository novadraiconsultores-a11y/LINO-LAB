import { useEffect, useState } from 'react'
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../supabaseClient'
import PaymentModal from '../components/PaymentModal'

export default function Sales() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [cart, setCart] = useState([])
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [showOutOfStock, setShowOutOfStock] = useState(false)
    const [activeBranchName, setActiveBranchName] = useState('')

    // New state to hold receipt data after cart is cleared
    const [lastSaleDetails, setLastSaleDetails] = useState(null)

    useEffect(() => {
        fetchProducts()
    }, [])

    async function fetchProducts() {
        try {
            setLoading(true)

            // 1. Resolve Branch
            let branchId = localStorage.getItem('sucursal_activa')
            let branchName = ''

            let branchQuery = supabase.from('sucursales').select('id_sucursal, nombre, es_matriz')

            if (branchId) {
                branchQuery = branchQuery.eq('id_sucursal', branchId)
            } else {
                branchQuery = branchQuery.eq('es_matriz', true)
            }

            const { data: branchData } = await branchQuery.limit(1).maybeSingle()

            if (branchData) {
                branchId = branchData.id_sucursal
                branchName = branchData.nombre
                if (!localStorage.getItem('sucursal_activa')) localStorage.setItem('sucursal_activa', branchId)
            } else {
                branchId = null
                console.warn('No active branch found')
            }

            setActiveBranchName(branchName)

            if (!branchId) {
                setProducts([])
                setLoading(false)
                return
            }

            // 2. Fetch Inventory for POS (Filtered by Branch)
            // Requirement: "Solo muestra productos ... que tengan cantidad > 0"
            const { data, error } = await supabase
                .from('inventario')
                .select(`
                    cantidad,
                    producto:ref_producto_id (*)
                `)
                .eq('ref_sucursal_id', branchId)
                .gt('cantidad', 0) // Explicit requirement to show only available items

            if (error) throw error

            // 3. Map to Products structure
            const mappedProducts = (data || []).map(item => {
                const p = item.producto || {}
                return {
                    ...p,
                    stock_actual: item.cantidad // Data source is the inventory record
                }
            })
            // Sort
            mappedProducts.sort((a, b) => (a.nombre_producto || '').localeCompare(b.nombre_producto || ''))

            setProducts(mappedProducts)
        } catch (error) {
            console.error('Error al cargar productos:', error.message)
        } finally {
            setLoading(false)
        }
    }

    // Cart Management
    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id_producto === product.id_producto)

        // Check global stock
        // Check global stock
        if (product.stock_actual <= 0) return // Prevent adding empty stock

        const currentQtyInCart = existingItem ? existingItem.qty : 0
        if (currentQtyInCart + 1 > product.stock_actual) {
            alert(`No hay suficiente stock. Disponible: ${product.stock_actual}`)
            return
        }

        if (existingItem) {
            setCart(cart.map(item =>
                item.id_producto === product.id_producto ? { ...item, qty: item.qty + 1 } : item
            ))
        } else {
            setCart([...cart, { ...product, qty: 1 }])
        }
    }

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id_producto !== id))
    }

    const updateQty = (id, delta) => {
        setCart(cart.map(item => {
            if (item.id_producto === id) {
                const newQty = Math.max(1, item.qty + delta)
                // Check stock limit for increase
                if (delta > 0 && newQty > item.stock_actual) {
                    return item
                }
                return { ...item, qty: newQty }
            }
            return item
        }))
    }

    // Calculations
    const cartTotal = cart.reduce((sum, item) => sum + (item.precio_venta * item.qty), 0)
    const subtotal = cartTotal / 1.16
    const tax = cartTotal - subtotal

    // Handlers
    const handlePaymentConfirm = async (paymentDetails) => {
        try {
            // 0. Validation & Branch Resolution
            const branchId = localStorage.getItem('sucursal_activa')
            if (!branchId) {
                alert("Error CRÍTICO: Sucursal no detectada. Por favor recargue la página.")
                return
            }

            // 1. Capture Sale Details for Receipt BEFORE clearing cart
            const currentSaleDetails = {
                items: [...cart],
                subtotal: subtotal,
                tax: tax,
                total: cartTotal,
                method: paymentDetails.method,
                date: new Date(),
                clientEmail: paymentDetails.clientEmail
            }

            // 2. Insert Sale Header (ventas_cabecera)
            const { data: saleData, error: saleError } = await supabase
                .from('ventas_cabecera')
                .insert([{
                    total_venta: cartTotal,
                    metodo_pago: paymentDetails.method,
                    fecha_venta: new Date().toISOString(),
                    ref_sucursal_id: branchId // Explicit Persistence
                }])
                .select()
                .single()

            if (saleError) throw saleError

            const saleId = saleData.id_venta

            // Inject sale ID into receipt details
            currentSaleDetails.id = saleId
            setLastSaleDetails(currentSaleDetails)

            // 3. Prepare Detailed Lines & Update Stock List (ventas_detalle)
            const saleDetails = cart.map(item => ({
                ref_venta_id: saleId,
                ref_producto_id: item.id_producto,
                cantidad_vendida: item.qty,
                precio_unitario_aplicado: item.precio_venta,
                subtotal_renglon: item.precio_venta * item.qty
            }))

            // 4. Insert Sale Details
            const { error: detailsError } = await supabase
                .from('ventas_detalle')
                .insert(saleDetails)

            if (detailsError) throw detailsError

            // 5. Update Inventory Stock (Specific Branch)
            for (const item of cart) {
                const newStock = item.stock_actual - item.qty
                await supabase
                    .from('inventario')
                    .update({ cantidad: newStock })
                    .eq('ref_producto_id', item.id_producto)
                    .eq('ref_sucursal_id', branchId)
            }

            // 6. Reset & Refresh
            setCart([])
            fetchProducts() // Refresh catalog stock

        } catch (error) {
            console.error('Error al procesar venta:', error.message)
            alert('Error en la transacción: ' + error.message)
        }
    }

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.nombre_producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku_producto?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStock = showOutOfStock ? true : product.stock_actual > 0

        return matchesSearch && matchesStock
    })

    return (
        <div className="h-screen flex flex-col md:flex-row bg-slate-950 overflow-hidden">

            {/* Left: Catalog (60-70%) */}
            <div className="flex-1 flex flex-col p-6 min-w-0">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2 flex items-center justify-between">
                        Catálogo
                        {activeBranchName && (
                            <span className="text-xs font-normal text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-500/20">
                                📍 {activeBranchName}
                            </span>
                        )}
                    </h1>
                    <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl flex items-center gap-3 shadow-sm">
                        <Search className="text-slate-500" size={24} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-white w-full text-lg placeholder-slate-600"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Stock Toggle Filter */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => setShowOutOfStock(!showOutOfStock)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showOutOfStock
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                            }`}
                    >
                        {showOutOfStock ? <Eye size={14} /> : <EyeOff size={14} />}
                        {showOutOfStock ? 'Ocultar Agotados' : 'Mostrar Agotados'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <p className="text-slate-500">Cargando catálogo...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No se encontraron productos disponibles.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id_producto}
                                    onClick={() => addToCart(product)}
                                    className="bg-gray-800/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/20 transition-all group flex flex-col h-full backdrop-blur-sm"
                                >
                                    {/* Image Area */}
                                    <div className="aspect-[4/3] w-full bg-slate-800 relative overflow-hidden">
                                        {product.imagen_producto_url ? (
                                            <img
                                                src={product.imagen_producto_url}
                                                alt={product.nombre_producto}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                                                <span className="text-xs font-bold uppercase tracking-widest">Sin Imagen</span>
                                            </div>
                                        )}

                                        <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-mono font-bold border ${product.stock_actual > 0
                                            ? 'bg-black/60 backdrop-blur-md text-white border-white/10'
                                            : 'bg-red-900/80 text-red-200 border-red-500/30'
                                            }`}>
                                            {product.stock_actual > 0 ? product.stock_actual : 'AGOTADO'}
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-4 flex flex-col flex-1 relative">
                                        {product.stock_actual === 0 && (
                                            <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 z-10 cursor-not-allowed"></div>
                                        )}
                                        <h3 className="text-gray-900 dark:text-white font-medium leading-tight text-sm mb-auto group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                            {product.nombre_producto}
                                        </h3>

                                        <div className="mt-3 flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] text-gray-500 dark:text-slate-500 mb-0.5 font-mono">{product.sku_producto}</p>
                                                <p className="text-lg font-bold text-blue-600 dark:text-emerald-400">
                                                    ${product.precio_venta.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all transform shadow-lg ${product.stock_actual > 0
                                                ? 'bg-blue-600 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 shadow-blue-600/30'
                                                : 'bg-gray-400 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                                                }`}>
                                                <Plus size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Virtual Ticket (30-40%) */}
            <div className="w-full md:w-[400px] xl:w-[450px] bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col shadow-2xl relative z-10">
                <div className="p-6 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <ShoppingCart size={24} className="text-blue-600 dark:text-blue-500" />
                        Ticket de Venta
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                        {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
                    </p>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-950/50">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-600 opacity-60">
                            <ShoppingCart size={48} className="mb-2" />
                            <p>El carrito está vacío</p>
                        </div>
                    ) : (
                        cart.map(item => {
                            const unitPriceBase = item.precio_venta / 1.16
                            return (
                                <div key={item.id_producto} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex gap-3 group hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-tight mb-1">
                                            {item.nombre_producto}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-slate-400">
                                            <span className="bg-gray-100 dark:bg-slate-900 px-1 rounded border border-gray-200 dark:border-slate-700">Base: ${unitPriceBase.toFixed(2)}</span>
                                            <span>x {item.qty}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <span className="font-bold text-blue-600 dark:text-emerald-400">
                                            ${(item.precio_venta * item.qty).toFixed(2)}
                                        </span>

                                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900 rounded-lg p-0.5 border border-gray-200 dark:border-slate-700">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateQty(item.id_producto, -1); }}
                                                className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="text-xs font-bold w-6 text-center text-gray-900 dark:text-white">{item.qty}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateQty(item.id_producto, 1); }}
                                                className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => removeFromCart(item.id_producto)}
                                            className="text-red-600 hover:text-red-500 text-xs flex items-center gap-1 mt-1 transition-colors group-hover:text-red-400"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Totals Section */}
                <div className="p-6 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] relative z-20">
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-gray-500 dark:text-slate-400 text-sm">
                            <span>Subtotal (Base)</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 dark:text-slate-400 text-sm">
                            <span>IVA (16%)</span>
                            <span>${tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-end border-t border-dashed border-gray-300 dark:border-slate-700 pt-3 mt-2">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">Total</span>
                            <span className="text-3xl font-bold text-blue-600 dark:text-emerald-400 font-mono drop-shadow-sm">
                                ${cartTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={cart.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2"
                    >
                        <CreditCard size={20} />
                        Cobrar
                    </button>
                </div>
            </div>

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                total={cartTotal}
                onConfirm={handlePaymentConfirm}
                saleDetails={lastSaleDetails}
            />
        </div>
    )
}
