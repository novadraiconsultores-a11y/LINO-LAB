import React, { useState, useEffect } from 'react'
import { Search, Filter, BarChart3, DollarSign, Package, AlertTriangle, Shirt, Download } from 'lucide-react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient'

export default function InventoryDashboard() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [providers, setProviders] = useState([])
    const [filterMode, setFilterMode] = useState('all') // 'all' | 'alerts'
    const [activeBranchName, setActiveBranchName] = useState('')

    // Filters State
    const [filters, setFilters] = useState({
        search: '',
        empresario: '',
        categoria: '',
        genero: '',
        calidad: '',
        talla: '',
        color: ''
    })

    useEffect(() => {
        fetchInitialData()

        const handleBranchChange = () => fetchInitialData()
        window.addEventListener('branch-change', handleBranchChange)
        window.addEventListener('storage', handleBranchChange)

        return () => {
            window.removeEventListener('branch-change', handleBranchChange)
            window.removeEventListener('storage', handleBranchChange)
        }
    }, [])

    async function fetchInitialData() {
        try {
            setLoading(true)

            // 1. Resolve Branch (LocalStorage > Matriz)
            let branchId = localStorage.getItem('sucursal_activa')
            let branchName = ''
            const isGlobal = branchId === 'global'

            if (!isGlobal) {
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
                    // Sync first load
                    if (!localStorage.getItem('sucursal_activa')) localStorage.setItem('sucursal_activa', branchId)
                } else {
                    branchId = null
                    console.warn('No active branch found')
                }
            } else {
                branchName = 'Vista Global (Todas)'
            }

            setActiveBranchName(branchName)

            if (!branchId && !isGlobal) {
                setProducts([])
                setLoading(false)
                return
            }

            // 2. Fetch Inventory for this Branch (or Global)
            let invQuery = supabase
                .from('inventario')
                .select(`
                    cantidad,
                    producto:ref_producto_id (
                        *,
                        empresario:empresarios (nombre_empresario)
                    )
                `)

            if (!isGlobal) {
                invQuery = invQuery.eq('ref_sucursal_id', branchId)
            }

            const { data: invData, error: invError } = await invQuery

            if (invError) throw invError

            // 3. Map to Flat Structure (UI Compatibility)
            const mappedProducts = (invData || []).map(item => {
                const p = item.producto || {}
                return {
                    ...p, // Spread all product fields (id_producto, nombre, prices, etc.)
                    stock_actual: item.cantidad, // Override stock with inventory quantity
                    empresario: p.empresario // Ensure nested relation is preserved if needed
                }
            })
            // Sort by name
            mappedProducts.sort((a, b) => (a.nombre_producto || '').localeCompare(b.nombre_producto || ''))

            setProducts(mappedProducts)

            // 4. Fetch Providers (for filter)
            const { data: provData } = await supabase.from('empresarios').select('id_empresario, nombre_empresario')
            setProviders(provData || [])

        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    // Unique values for filter dropdowns (derived from current products)
    const uniqueCategories = [...new Set(products.map(p => p.categoria_producto).filter(Boolean))]
    const uniqueGenders = [...new Set(products.map(p => p.genero_producto).filter(Boolean))]
    const uniqueQualities = [...new Set(products.map(p => p.calidad_producto).filter(Boolean))]

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    // Filter Logic
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.nombre_producto?.toLowerCase().includes(filters.search.toLowerCase()) ||
            p.sku_producto?.toLowerCase().includes(filters.search.toLowerCase())
        const matchesProv = !filters.empresario || p.ref_empresario_id === filters.empresario
        const matchesCat = !filters.categoria || p.categoria_producto === filters.categoria
        const matchesGen = !filters.genero || p.genero_producto === filters.genero
        const matchesQual = !filters.calidad || p.calidad_producto === filters.calidad
        const matchesTalla = !filters.talla || p.talla_producto?.includes(filters.talla) // loose match for size
        const matchesColor = !filters.color || p.color_producto?.toLowerCase().includes(filters.color.toLowerCase())

        const matchesAlerts = filterMode === 'all' || (
            (p.stock_actual || 0) === 0 || ((p.stock_actual || 0) > 0 && (p.stock_actual || 0) < 5)
        )

        return matchesSearch && matchesProv && matchesCat && matchesGen && matchesQual && matchesTalla && matchesColor && matchesAlerts
    })

    const totalStock = filteredProducts.reduce((acc, curr) => acc + (curr.stock_actual || 0), 0)
    const totalValue = filteredProducts.reduce((acc, curr) => acc + ((curr.stock_actual || 0) * (curr.precio_venta || 0)), 0)
    // Low Stock Count Logic (Synchronized with Home.jsx: > 0 and < 5)
    const lowStockCount = filteredProducts.filter(p => (p.stock_actual || 0) > 0 && (p.stock_actual || 0) < 5).length

    // --- Chart Data Preparation ---
    // A) Pie Chart: Value by Provider
    const providerValueMap = filteredProducts.reduce((acc, curr) => {
        const providerName = curr.empresario?.nombre_empresario || 'Otros'
        const value = (curr.stock_actual || 0) * (curr.precio_venta || 0)
        acc[providerName] = (acc[providerName] || 0) + value
        return acc
    }, {})

    const chartDataProviders = Object.entries(providerValueMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value) // Highest value first

    // Custom Tooltip for Pie Chart
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            const percent = ((data.value / totalValue) * 100).toFixed(1)
            return (
                <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 p-3 rounded-lg shadow-xl">
                    <p className="text-white font-bold mb-1">{data.name}</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        {data.value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                    </p>
                    <p className="text-gray-500 dark:text-slate-400 text-xs text-right mt-1">{percent}% del total</p>
                </div>
            )
        }
        return null
    }

    // Colors for Pie Chart (Varied but Elegant)
    const PIE_COLORS = ['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#14B8A6']

    // B) Bar Chart: Distribution by Category
    const categoryCountMap = filteredProducts.reduce((acc, curr) => {
        const cat = curr.categoria_producto || 'Sin Categoría'
        acc[cat] = (acc[cat] || 0) + (curr.stock_actual || 0)
        return acc
    }, {})

    const chartDataCategories = Object.entries(categoryCountMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Limit to top 10 for readability

    // C) Pie Chart: Value by Quality
    const qualityValueMap = filteredProducts.reduce((acc, curr) => {
        const quality = curr.calidad_producto || 'N/A'
        const value = (curr.stock_actual || 0) * (curr.precio_venta || 0)
        acc[quality] = (acc[quality] || 0) + value
        return acc
    }, {})

    const chartDataQualities = Object.entries(qualityValueMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    // D) Pie Chart: Distribution by Gender
    const genderCountMap = filteredProducts.reduce((acc, curr) => {
        const gender = curr.genero_producto || 'N/A'
        acc[gender] = (acc[gender] || 0) + (curr.stock_actual || 0)
        return acc
    }, {})

    const chartDataGenders = Object.entries(genderCountMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    // Colors
    const COLORS_GENDER = ['#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B'] // Blue, Pink, Violet, Amber
    const COLORS_QUALITY = ['#10B981', '#F59E0B', '#F43F5E', '#64748B'] // Emerald, Amber, Rose, Slate

    const inputClass = "bg-[#0f172a] border border-slate-800 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 w-full transition-all hover:border-slate-500"

    const handleExportExcel = () => {
        const dataToExport = filteredProducts.map(p => {
            // Format Date DD/MM/YYYY
            const dateObj = new Date(p.created_at)
            const dateStr = !isNaN(dateObj)
                ? `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`
                : 'N/A'

            return {
                'ID / SKU': p.sku_producto || 'N/A',
                'Producto': p.nombre_producto,
                'Empresario': p.empresario?.nombre_empresario || 'N/A',
                'Categoría': p.categoria_producto || 'N/A',
                'Género': p.genero_producto || 'N/A',
                'Calidad': p.calidad_producto || 'N/A',
                'Talla': p.talla_producto || 'N/A',
                'Color': p.color_producto || 'N/A',
                'Costo Unit.': Number(p.costo_producto || 0),
                'Stock': Number(p.stock_actual || 0),
                'Valor Total': Number(p.stock_actual || 0) * Number(p.costo_producto || 0),
                'Fecha Alta': dateStr
            }
        })

        const ws = XLSX.utils.json_to_sheet(dataToExport)

        // Auto-width columns (simple estimation)
        const wscols = [
            { wch: 15 }, // SKU
            { wch: 30 }, // Producto
            { wch: 20 }, // Empresario
            { wch: 15 }, // Categoria
            { wch: 10 }, // Genero
            { wch: 10 }, // Calidad
            { wch: 10 }, // Talla
            { wch: 10 }, // Color
            { wch: 12 }, // Costo
            { wch: 8 },  // Stock
            { wch: 12 }, // Valor
            { wch: 12 }  // Fecha
        ]
        ws['!cols'] = wscols

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Inventario Detallado")

        const today = new Date().toISOString().split('T')[0]
        XLSX.writeFile(wb, `Inventario_LinoLab_${today}.xlsx`)
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <BarChart3 className="text-purple-600 dark:text-purple-500" />
                            <div>
                                Tablero de Inventario
                                {activeBranchName && (
                                    <div className="text-sm font-normal text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                        <span>📍 Viendo inventario de:</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{activeBranchName}</span>
                                    </div>
                                )}
                            </div>
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">Análisis y Consulta de Stock</p>
                        {filterMode === 'alerts' && (
                            <button
                                onClick={() => setFilterMode('all')}
                                className="force-dark-red"
                            >
                                <AlertTriangle size={12} />
                                <span>Filtro Activo: Alertas de Stock</span> (Click para ver todo)
                            </button>
                        )}
                    </div>

                    <div className="flex gap-4">
                        {/* Data is now shown below in grid */}
                    </div>
                </div>
            </div>

            {/* KPI CARDS SECTION (Neon Void Style) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 1. TOTAL VALUE (Subtle Glow Style) */}
                <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg">
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-900/20 rounded-lg">
                            <DollarSign size={28} />
                        </div>
                        <span className="text-xs font-bold uppercase text-emerald-400/80 tracking-widest border border-emerald-500/20 px-2 py-1 rounded bg-emerald-900/20">Valor Estimado</span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
                            {totalValue.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-emerald-600/80 dark:text-emerald-400/60 text-sm mt-2 font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            En inventario filtrado
                        </p>
                    </div>
                </div>

                {/* 2. TOTAL ITEMS (Subtle Glow Style) */}
                <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-blue-400 shadow-sm shadow-blue-900/20 rounded-lg">
                            <Shirt size={28} />
                        </div>
                        <span className="text-xs font-bold uppercase text-blue-400/80 tracking-widest border border-blue-500/20 px-2 py-1 rounded bg-blue-900/20">Prendas</span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
                            {totalStock.toLocaleString()}
                        </div>
                        <p className="text-blue-600/80 dark:text-blue-400/60 text-sm mt-2 font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Stock físico
                        </p>
                    </div>
                </div>

                {/* 3. LOW STOCK ALERT (Subtle Glow Style) */}
                <div
                    onClick={() => setFilterMode(filterMode === 'alerts' ? 'all' : 'alerts')}
                    className={`bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group transition-all duration-300 cursor-pointer hover:border-orange-500/30 hover:shadow-lg`}
                >
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className={`p-3 rounded-lg transition-colors ${lowStockCount > 0
                            ? 'bg-orange-500/5 border border-orange-500/20 text-orange-400 shadow-sm shadow-orange-900/20'
                            : 'bg-slate-500/5 border border-slate-700/20 text-slate-500 shadow-sm'
                            }`}>
                            <AlertTriangle className={lowStockCount > 0 ? "animate-pulse" : ""} size={28} />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-widest border px-2 py-1 rounded ${lowStockCount > 0
                            ? 'text-orange-600 dark:text-orange-400/80 border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-900/20'
                            : 'text-slate-600 border-slate-800 bg-slate-900'
                            }`}>Alertas</span>
                    </div>
                    <div className="relative z-10">
                        <div className={`text-4xl lg:text-5xl font-extrabold tracking-tight drop-shadow-md transition-colors ${lowStockCount > 0 ? 'text-white' : 'text-slate-600'
                            }`}>
                            {lowStockCount}
                        </div>
                        <p className={`text-sm mt-2 font-medium ${lowStockCount > 0 ? 'text-orange-600 dark:text-orange-400/60' : 'text-gray-400 dark:text-slate-500'}`}>
                            {lowStockCount > 0 ? 'Productos requieren atención' : 'Todo en orden'}
                        </p>
                    </div>
                </div>
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                {/* CHART A: Inventory Value by Provider (Pie) */}
                <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm relative group min-h-[320px]">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 self-start w-full border-b border-slate-800 pb-2">
                        <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
                        Valor por Proveedor
                    </h3>
                    <div className="w-full h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartDataProviders}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartDataProviders.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomPieTooltip />} />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', marginTop: '10px', color: '#94a3b8' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CHART C: Value by Quality (Pie) */}
                <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm relative group min-h-[320px]">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 self-start w-full border-b border-slate-800 pb-2">
                        <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
                        Valor por Calidad
                    </h3>
                    <div className="w-full h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartDataQualities}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartDataQualities.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS_QUALITY[index % COLORS_QUALITY.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomPieTooltip />} />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CHART D: Distribution by Gender (Pie) */}
                <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm relative group min-h-[320px]">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 self-start w-full border-b border-slate-800 pb-2">
                        <Shirt size={16} className="text-pink-600 dark:text-pink-400" />
                        Distribución por Género
                    </h3>
                    <div className="w-full h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartDataGenders}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartDataGenders.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS_GENDER[index % COLORS_GENDER.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                                    formatter={(value) => [`${value} pzas`, 'Cantidad']}
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CHART B: Distribution by Category (Horizontal Bar) */}
                <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm relative group min-h-[320px]">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 self-start w-full border-b border-slate-800 pb-2">
                        <BarChart3 size={16} className="text-purple-600 dark:text-purple-400" />
                        Stock por Categoría
                    </h3>
                    <div className="w-full h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={chartDataCategories}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={10} hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#cbd5e1"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    width={80}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#334155', opacity: 0.2 }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                                    formatter={(value) => [`${value} pzas`, 'Stock']}
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                    {chartDataCategories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="url(#colorGradientHorizontal)" />
                                    ))}
                                </Bar>
                                <defs>
                                    <linearGradient id="colorGradientHorizontal" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Advanced Filters Bar */}
            <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 p-4 rounded-xl mb-6 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <Filter size={12} /> Filtros
                    </div>
                    <button
                        onClick={handleExportExcel}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
                    >
                        <Download size={14} /> Descargar Excel
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="col-span-2 md:col-span-2 lg:col-span-2 relative group">
                        <input
                            placeholder="Buscar producto..."
                            className={`${inputClass}`}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <select className={inputClass} value={filters.empresario} onChange={e => handleFilterChange('empresario', e.target.value)}>
                        <option value="">Todos los Dueños</option>
                        {providers.map(p => <option key={p.id_empresario} value={p.id_empresario}>{p.nombre_empresario}</option>)}
                    </select>

                    <select className={inputClass} value={filters.categoria} onChange={e => handleFilterChange('categoria', e.target.value)}>
                        <option value="">Todas Categorías</option>
                        {uniqueCategories.sort().map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select className={inputClass} value={filters.genero} onChange={e => handleFilterChange('genero', e.target.value)}>
                        <option value="">Todos Géneros</option>
                        {uniqueGenders.sort().map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

                    <select className={inputClass} value={filters.calidad} onChange={e => handleFilterChange('calidad', e.target.value)}>
                        <option value="">Todas Calidades</option>
                        {uniqueQualities.sort().map(q => <option key={q} value={q}>{q}</option>)}
                    </select>

                    {/* Simple Text Inputs for Talla/Color as they vary a lot */}
                    <input
                        placeholder="Talla..."
                        className={inputClass}
                        value={filters.talla}
                        onChange={(e) => handleFilterChange('talla', e.target.value)}
                    />
                    <input
                        placeholder="Color..."
                        className={inputClass}
                        value={filters.color}
                        onChange={(e) => handleFilterChange('color', e.target.value)}
                    />
                </div>
            </div>

            {/* Read-Only Table */}
            <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500 dark:text-slate-400">
                        <thead className="bg-gray-100 dark:bg-slate-800/50 text-gray-700 dark:text-slate-200 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Producto</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Atributos</th>
                                <th className="px-6 py-4 text-center">Stock</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center">Cargando...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center">No hay datos.</td></tr>
                            ) : (
                                filteredProducts.map(p => (
                                    <tr key={p.id_producto} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-gray-100 dark:bg-slate-700 overflow-hidden border border-gray-200 dark:border-slate-600">
                                                    {p.imagen_producto_url && <img src={p.imagen_producto_url} className="w-full h-full object-cover" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{p.nombre_producto}</div>
                                                    <div className="text-xs text-gray-500 dark:text-slate-500">{p.empresario?.nombre_empresario}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{p.sku_producto}</td>
                                        <td className="px-6 py-4 text-xs">
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                <span className="text-gray-500 dark:text-slate-500">Cat: <span className="text-gray-700 dark:text-slate-300">{p.categoria_producto}</span></span>
                                                <span className="text-gray-500 dark:text-slate-500">Gen: <span className="text-gray-700 dark:text-slate-300">{p.genero_producto}</span></span>
                                                <span className="text-gray-500 dark:text-slate-500">Cal: <span className="text-gray-700 dark:text-slate-300">{p.calidad_producto}</span></span>
                                                <span className="text-gray-500 dark:text-slate-500">T/C: <span className="text-gray-700 dark:text-slate-300">{p.talla_producto} / {p.color_producto}</span></span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full font-bold text-sm border ${p.stock_actual > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-700/20'}`}>
                                                {p.stock_actual || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.stock_actual <= 5 ? (
                                                <span className="text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded">AGOTÁNDOSE</span>
                                            ) : (
                                                <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">OK</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
