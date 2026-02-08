import React, { useState, useEffect, useMemo } from 'react'
import {
    BarChart3, TrendingUp, Users, ShoppingBag, Calendar,
    ArrowUpRight, ArrowDownRight, DollarSign, CreditCard,
    Activity, Package, History, LayoutDashboard, Clock, Filter, ArrowRight, Truck
} from 'lucide-react'
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts'
import { supabase } from '../supabaseClient'

// Date & Timezone Imports
import DatePicker, { registerLocale } from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { es } from 'date-fns/locale'
import {
    format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    startOfDay, endOfDay, subMonths, isWithinInterval, startOfYear, endOfYear
} from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

registerLocale('es', es)

const TIMEZONE = 'America/Mazatlan'

export default function Home() {
    // === STATE ===
    const [viewMode, setViewMode] = useState('current') // 'current' | 'history'
    const [loading, setLoading] = useState(true)
    const [salesData, setSalesData] = useState([])
    const [salesDetails, setSalesDetails] = useState([])
    const [inventoryData, setInventoryData] = useState([])
    const [recentTransfers, setRecentTransfers] = useState([]) // New State
    const [activeBranchName, setActiveBranchName] = useState('')

    // View A State (Operational)
    const [currentFilter, setCurrentFilter] = useState('today')

    // View B State (Strategic)
    const [historyGranularity, setHistoryGranularity] = useState('month') // 'day', 'week', 'month', 'year'
    const [startDate, setStartDate] = useState(subMonths(new Date(), 3))
    const [endDate, setEndDate] = useState(new Date())

    // === GLOBAL FILTERS ===
    const [selectedOwner, setSelectedOwner] = useState('all')
    const [selectedCategory, setSelectedCategory] = useState('all')

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

            // 1. Resolve Branch Selection
            let branchId = localStorage.getItem('sucursal_activa')
            let branchName = ''
            const isGlobal = branchId === 'global'
            let branchData = null

            if (!isGlobal) {
                // Fetch branch info (verify ID or get default Matriz)
                let branchQuery = supabase.from('sucursales').select('id_sucursal, nombre, es_matriz')

                if (branchId) {
                    branchQuery = branchQuery.eq('id_sucursal', branchId)
                } else {
                    branchQuery = branchQuery.eq('es_matriz', true)
                }

                const { data } = await branchQuery.limit(1).maybeSingle()
                branchData = data

                if (data) {
                    branchId = data.id_sucursal
                    branchName = data.nombre

                    // Sync to storage if missing (e.g. first load)
                    if (!localStorage.getItem('sucursal_activa')) {
                        localStorage.setItem('sucursal_activa', branchId)
                    }
                } else {
                    console.warn("Could not resolve active branch.")
                }
            } else {
                branchName = 'Vista Global'
            }

            setActiveBranchName(branchName)

            if (!branchId && !isGlobal) {
                setSalesData([])
                setSalesDetails([])
                setInventoryData([])
                setLoading(false)
                return
            }

            // 2. Fetch Sales Headers (Filtered by Branch unless Global)
            let headersQuery = supabase
                .from('ventas_cabecera')
                .select('*')
                .order('fecha_venta', { ascending: false })

            if (!isGlobal) headersQuery = headersQuery.eq('ref_sucursal_id', branchId)

            const headersPromise = headersQuery

            // 3. Fetch Details (Unfiltered at DB, filtered in memory by valid headers)
            const detailsPromise = supabase
                .from('ventas_detalle')
                .select(`
                    cantidad_vendida, 
                    subtotal_renglon, 
                    ref_venta_id, 
                    producto:productos (
                        nombre_producto,
                        categoria_producto,
                        empresario:empresarios (nombre_empresario)
                    )
                `)

            // 4. Fetch Inventory Data (Filtered by Branch unless Global)
            let inventoryQuery = supabase
                .from('inventario')
                .select(`
                    cantidad,
                    producto:ref_producto_id (
                        costo_producto
                    )
                `)

            if (!isGlobal) inventoryQuery = inventoryQuery.eq('ref_sucursal_id', branchId)

            const inventoryPromise = inventoryQuery

            // 5. Fetch Recent Logistics (Transfers)
            let transfersQuery = supabase
                .from('traspasos_cabecera')
                .select('*, origin:ref_sucursal_origen_id(nombre), dest:ref_sucursal_destino_id(nombre)')
                .order('fecha_envio', { ascending: false })
                .limit(5)

            // If NOT matrix AND NOT global, filter by participation
            if (!isGlobal && branchData && !branchData.es_matriz) {
                transfersQuery = transfersQuery.or(`ref_sucursal_origen_id.eq.${branchId},ref_sucursal_destino_id.eq.${branchId}`)
            }

            const transfersPromise = transfersQuery

            const [headersRes, detailsRes, inventoryRes, transfersRes] = await Promise.all([headersPromise, detailsPromise, inventoryPromise, transfersPromise])

            if (headersRes.error) console.error("Headers error", headersRes.error)
            if (detailsRes.error) console.error("Details error", detailsRes.error)
            if (inventoryRes.error) console.error("Inventory error", inventoryRes.error)

            setSalesData(headersRes.data || [])
            setSalesDetails(detailsRes.data || [])
            setRecentTransfers(transfersRes.data || [])

            // Map Inventory to common format for Widgets
            const mappedInventory = (inventoryRes.data || []).map(item => ({
                stock_actual: item.cantidad,
                costo_producto: item.producto?.costo_producto || 0
            }))
            setInventoryData(mappedInventory)

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    // === INVENTORY HEALTH (Fixed Logic) ===
    const inventoryHealth = useMemo(() => {
        if (!inventoryData || !inventoryData.length) {
            return { outOfStock: 0, lowStock: 0, inventoryValue: 0 }
        }

        let outOfStock = 0
        let lowStock = 0
        let inventoryValue = 0

        inventoryData.forEach(p => {
            // 1. Validate Column Names (Fallbacks)
            const stock = Number(p.stock_actual !== undefined ? p.stock_actual : (p.stock || 0))
            const cost = Number(p.costo_producto !== undefined ? p.costo_producto : (p.costo || 0))

            // 2. Metrics Calculation
            if (stock === 0) {
                outOfStock++
            } else if (stock > 0 && stock < 5) {
                lowStock++
            }

            inventoryValue += (stock * cost)
        })

        return { outOfStock, lowStock, inventoryValue }
    }, [inventoryData])

    // === FILTER OPTIONS DERIVATION ===
    const { uniqueOwners, uniqueCategories } = useMemo(() => {
        const owners = new Set()
        const categories = new Set()

        if (!salesDetails) return { uniqueOwners: [], uniqueCategories: [] }

        salesDetails.forEach(item => {
            const p = item.producto
            if (!p || p.nombre_producto === 'Producto Eliminado') return

            const ownerName = p.empresario?.nombre_empresario
            if (ownerName) owners.add(ownerName)

            const catName = p.categoria_producto
            if (catName) categories.add(catName)
        })

        return {
            uniqueOwners: Array.from(owners).sort(),
            uniqueCategories: Array.from(categories).sort()
        }
    }, [salesDetails])


    // === PROCESSED DATA (MEMOIZED) ===
    const currentViewData = useMemo(() => {
        const zeroState = {
            totalSales: 0,
            txnCount: 0,
            avgTicket: 0,
            itemsSold: 0,
            paymentMethods: [],
            salesByOwner: [],
            salesByCategory: [],
            bestSellers: []
        }

        if (!salesData || !salesData.length) return zeroState

        const nowZoned = toZonedTime(new Date(), TIMEZONE)
        let intervalStart, intervalEnd

        // Time Filter Logic
        if (currentFilter === 'today') {
            intervalStart = startOfDay(nowZoned)
            intervalEnd = endOfDay(nowZoned)
        } else if (currentFilter === 'week') {
            intervalStart = startOfWeek(nowZoned, { weekStartsOn: 1 })
            intervalEnd = endOfWeek(nowZoned, { weekStartsOn: 1 })
        } else if (currentFilter === 'month') {
            intervalStart = startOfMonth(nowZoned)
            intervalEnd = endOfMonth(nowZoned)
        } else if (currentFilter === '3m') {
            intervalStart = subMonths(startOfDay(nowZoned), 3)
            intervalEnd = endOfDay(nowZoned)
        } else if (currentFilter === '6m') {
            intervalStart = subMonths(startOfDay(nowZoned), 6)
            intervalEnd = endOfDay(nowZoned)
        } else if (currentFilter === '12m') {
            intervalStart = subMonths(startOfDay(nowZoned), 12)
            intervalEnd = endOfDay(nowZoned)
        } else {
            intervalStart = startOfDay(nowZoned)
            intervalEnd = endOfDay(nowZoned)
        }

        // 1. Identify Valid Sale IDs & Headers
        const validSalesInRange = salesData.filter(s => {
            const sDateZoned = toZonedTime(s.fecha_venta, TIMEZONE)
            return isWithinInterval(sDateZoned, { start: intervalStart, end: intervalEnd })
        })
        const validSaleIds = new Set(validSalesInRange.map(s => s.id_venta))

        // 2. Filter Details 
        const filteredDetails = salesDetails.filter(d => {
            if (!validSaleIds.has(d.ref_venta_id)) return false
            if (selectedOwner !== 'all') {
                const ownerName = d.producto?.empresario?.nombre_empresario
                if (ownerName !== selectedOwner) return false
            }
            if (selectedCategory !== 'all') {
                const catName = d.producto?.categoria_producto
                if (catName !== selectedCategory) return false
            }
            return true
        })

        // 3. Compute Metrics
        const totalSales = filteredDetails.reduce((acc, d) => acc + (d.subtotal_renglon || 0), 0)
        const itemsSold = filteredDetails.reduce((acc, d) => acc + (d.cantidad_vendida || 0), 0)
        const uniqueTxIds = new Set(filteredDetails.map(d => d.ref_venta_id))
        const txnCount = uniqueTxIds.size
        const avgTicket = txnCount > 0 ? totalSales / txnCount : 0

        // 4. Payment Methods (REVENUE BASED LOGIC)
        // Filter headers to match the *filtered* transactions
        const matchingSales = validSalesInRange.filter(s => uniqueTxIds.has(s.id_venta))

        const paymentMap = matchingSales.reduce((acc, s) => {
            const m = s.metodo_pago || 'Otros'
            acc[m] = (acc[m] || 0) + (Number(s.total_venta) || 0) // Sum Revenue
            return acc
        }, {})
        const paymentMethods = Object.entries(paymentMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        // 5. Build Charts Data
        const ownerMap = {}
        filteredDetails.forEach(d => {
            const name = d.producto?.empresario?.nombre_empresario || 'Sin Asignar'
            ownerMap[name] = (ownerMap[name] || 0) + (d.subtotal_renglon || 0)
        })
        const salesByOwner = Object.entries(ownerMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        const catMap = {}
        filteredDetails.forEach(d => {
            const name = d.producto?.categoria_producto || 'Sin Categoría'
            catMap[name] = (catMap[name] || 0) + (d.subtotal_renglon || 0)
        })
        const salesByCategory = Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        // Best Sellers
        const productMap = {}
        filteredDetails.forEach(d => {
            const name = d.producto?.nombre_producto || 'Desconocido'
            if (!productMap[name]) productMap[name] = { name, qty: 0, amount: 0 }
            productMap[name].qty += (d.cantidad_vendida || 0)
            productMap[name].amount += (d.subtotal_renglon || 0)
        })
        const bestSellers = Object.values(productMap)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5)

        return { totalSales, txnCount, avgTicket, itemsSold, paymentMethods, salesByOwner, salesByCategory, bestSellers }
    }, [salesData, salesDetails, currentFilter, selectedOwner, selectedCategory])

    // VIEW B: History Data (No modifications needed here for this request)
    // ... [Preserving History Logic for Brevity in this step, but we need to ensure it's not deleted if I replace everything] ...
    // Note: Since I am replacing lines 78-657, I must include History View Logic if it falls in that range.
    // Checking file: Lines 78 to around 270 are Logic. 
    // Lines 357ish down are Render.
    // I will split this into two edits to be safe. 
    // This edit handles Logic (Fetch + Memo).

    // Returning just the logic part first.

    // VIEW B: History Data (Custom Range & Grouping) - Re-including to match replacement block
    const historyViewData = useMemo(() => {
        if (!salesData.length || !startDate || !endDate) return []

        const effectiveEnd = endOfDay(endDate)
        const effectiveStart = startOfDay(startDate)

        const validSalesInRange = salesData.filter(s => {
            const sDateZoned = toZonedTime(s.fecha_venta, TIMEZONE)
            return isWithinInterval(sDateZoned, { start: effectiveStart, end: effectiveEnd })
        })
        const validSaleIds = new Set(validSalesInRange.map(s => s.id_venta))

        const filteredDetails = salesDetails.filter(d => {
            if (!validSaleIds.has(d.ref_venta_id)) return false
            if (selectedOwner !== 'all') {
                const ownerName = d.producto?.empresario?.nombre_empresario
                if (ownerName !== selectedOwner) return false
            }
            if (selectedCategory !== 'all') {
                const catName = d.producto?.categoria_producto
                if (catName !== selectedCategory) return false
            }
            return true
        })

        const saleDateMap = {}
        validSalesInRange.forEach(s => {
            saleDateMap[s.id_venta] = s.fecha_venta
        })

        const aggMap = {}

        filteredDetails.forEach(d => {
            const dateStr = saleDateMap[d.ref_venta_id]
            if (!dateStr) return
            try {
                const dateZoned = toZonedTime(dateStr, TIMEZONE)
                if (isNaN(dateZoned.getTime())) return

                let key = ''
                let sortKey = ''

                if (historyGranularity === 'day') {
                    key = format(dateZoned, 'dd MMM', { locale: es })
                    sortKey = format(dateZoned, 'yyyyMMdd')
                } else if (historyGranularity === 'week') {
                    const start = startOfWeek(dateZoned, { weekStartsOn: 1 })
                    const weekNum = format(dateZoned, 'wo', { locale: es })
                    const month = format(dateZoned, 'MMM', { locale: es })
                    key = `Sem ${weekNum} - ${month}`
                    sortKey = start.getTime()
                } else if (historyGranularity === 'month') {
                    key = format(dateZoned, 'MMMM yyyy', { locale: es })
                    sortKey = format(dateZoned, 'yyyyMM')
                } else if (historyGranularity === 'year') {
                    key = format(dateZoned, 'yyyy')
                    sortKey = format(dateZoned, 'yyyy')
                }

                if (!aggMap[key]) aggMap[key] = { date: key, amount: 0, count: 0, sortKey }
                aggMap[key].amount += (d.subtotal_renglon || 0)
            } catch (error) {
                console.error("Error processing history detail:", error)
            }
        })
        return Object.values(aggMap).sort((a, b) => a.sortKey - b.sortKey)
    }, [salesData, salesDetails, startDate, endDate, historyGranularity, selectedOwner, selectedCategory])

    // --- RENDER ---
    const PAYMENT_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#6366F1', '#EC4899']

    return (
        <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-4 md:p-6 overflow-y-auto custom-scrollbar transition-colors duration-200">

            {/* TOP NAVIGATION */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-sm">
                    <button
                        onClick={() => setViewMode('current')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${viewMode === 'current'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <LayoutDashboard size={18} />
                        Resumen Actual
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${viewMode === 'history'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <History size={18} />
                        Análisis Histórico
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            ) : viewMode === 'current' ? (
                // === VIEW A: PANEL DE CONTROL ===
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Controls & Super Filters */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                            <Activity className="text-emerald-500" size={20} />
                            <div className="flex items-center gap-3">
                                Panel de Control
                                {activeBranchName && (
                                    <span className="hidden sm:inline-block text-[10px] uppercase font-extrabold tracking-widest text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                                        {activeBranchName}
                                    </span>
                                )}
                            </div>
                        </h2>

                        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                            {/* Filters remain the same */}
                            <select
                                value={selectedOwner}
                                onChange={(e) => setSelectedOwner(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white text-sm font-bold rounded-lg px-4 py-2 outline-none focus:border-blue-500 flex-1 xl:flex-none xl:w-48 shadow-sm"
                            >
                                <option value="all">Todos los Dueños</option>
                                {uniqueOwners.map(owner => (
                                    <option key={owner} value={owner}>{owner}</option>
                                ))}
                            </select>

                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white text-sm font-bold rounded-lg px-4 py-2 outline-none focus:border-purple-500 flex-1 xl:flex-none xl:w-48 shadow-sm"
                            >
                                <option value="all">Todas las Categorías</option>
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            <select
                                value={currentFilter}
                                onChange={(e) => setCurrentFilter(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white text-sm font-bold rounded-lg px-4 py-2 outline-none focus:border-emerald-500 flex-1 xl:flex-none xl:w-40 shadow-sm"
                            >
                                <option value="today">Hoy</option>
                                <option value="week">Esta Semana</option>
                                <option value="month">Este Mes</option>
                                <option value="3m">Últimos 3 Meses</option>
                                <option value="6m">Últimos 6 Meses</option>
                                <option value="12m">Últimos 12 Meses</option>
                            </select>
                        </div>
                    </div>

                    {/* KPI Cards (Same as before) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <KPICard
                            title="Venta Total"
                            value={(currentViewData?.totalSales || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                            icon={<DollarSign size={24} className="text-emerald-400" />}
                            trend="Ingresos Brutos"
                            color="emerald"
                        />
                        <KPICard
                            title="Transacciones"
                            value={currentViewData?.txnCount || 0}
                            icon={<Users size={24} className="text-blue-400" />}
                            trend="Tickets Generados"
                            color="blue"
                        />
                        <KPICard
                            title="Ticket Promedio"
                            value={(currentViewData?.avgTicket || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                            icon={<TrendingUp size={24} className="text-purple-400" />}
                            trend="Promedio / Venta"
                            color="purple"
                        />
                        <KPICard
                            title="Piezas Vendidas"
                            value={currentViewData?.itemsSold || 0}
                            icon={<Package size={24} className="text-orange-400" />}
                            trend="Rotación de Stock"
                            color="orange"
                        />
                    </div>

                    {/* Main Charts Grid (Row 2) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        {/* 1. Sales by Owner */}
                        {/* 1. Sales by Owner */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Users size={18} className="text-blue-500" />
                                Ventas por Empresario
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={currentViewData?.salesByOwner || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                                        <RechartsTooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                            itemStyle={{ color: '#f3f4f6' }}
                                            formatter={(value) => [`$${value.toLocaleString('es-MX')}`, 'Venta Total']}
                                        />
                                        <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]}>
                                            {(currentViewData?.salesByOwner || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0ea5e9' : '#3b82f6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Sales by Category */}
                        {/* 2. Sales by Category */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <ShoppingBag size={18} className="text-purple-500" />
                                Ventas por Categoría
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={currentViewData?.salesByCategory || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                                        <RechartsTooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                            itemStyle={{ color: '#f3f4f6' }}
                                            formatter={(value) => [`$${value.toLocaleString('es-MX')}`, 'Venta Total']}
                                        />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                                            {(currentViewData?.salesByCategory || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8b5cf6' : '#a855f7'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* NEW ROW 3: COCKPIT LAYOUT (3 COLUMNS) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6 mb-6 sm:mb-8">

                        {/* Col 1: Top 5 Best Sellers (Span 5) */}
                        {/* Col 1: Top 5 Best Sellers (Span 5) */}
                        <div className="md:col-span-2 lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-emerald-400" />
                                Top 5 Productos Estrella
                            </h3>
                            <div className="overflow-x-auto flex-1 table-responsive">
                                <table className="w-full text-sm text-left text-slate-400">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Producto</th>
                                            <th className="px-4 py-3 text-center">Vendidos</th>
                                            <th className="px-4 py-3 text-right rounded-r-lg">Ingreso</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(currentViewData?.bestSellers || []).map((item, index) => (
                                            <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white max-w-[150px] truncate" title={item.name}>
                                                    {item.name}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-emerald-400">
                                                    {item.qty}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-300">
                                                    {(item.amount || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}
                                                </td>
                                            </tr>
                                        ))}
                                        {!(currentViewData?.bestSellers?.length) && (
                                            <tr><td colSpan="3" className="text-center py-4 text-slate-500">Sin datos</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Col 2: Payment Methods (Span 4) */}
                        {/* Col 2: Payment Methods (Span 4) */}
                        <div className="md:col-span-1 lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <CreditCard size={18} className="text-blue-500" />
                                Métodos de Pago
                            </h3>
                            <div className="flex-1 min-h-[250px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={currentViewData?.paymentMethods || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                            stroke="none"
                                        >
                                            {(currentViewData?.paymentMethods || []).map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
                                                    stroke="#0f172a"
                                                    strokeWidth={2}
                                                />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#374151', color: '#f3f4f6' }}
                                            itemStyle={{ color: '#f3f4f6' }}
                                            formatter={(value) => [`${value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`, 'Total Recaudado']}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                    <div className="text-center">
                                        <DollarSign size={24} className="text-slate-600 mx-auto opacity-50" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Col 3: Inventory Health (Span 3) */}
                        <div className="md:col-span-1 lg:col-span-3 flex flex-col gap-3 sm:gap-4">
                            {/* Widget 1: Out of Stock */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden flex-1 backdrop-blur-sm">
                                <div>
                                    <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Agotados</p>
                                    <p className="text-3xl font-bold text-white">{inventoryHealth.outOfStock}</p>
                                </div>
                                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                    <Activity size={24} className="text-red-500" />
                                </div>
                            </div>
                            {/* Widget 2: Low Stock */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden flex-1 backdrop-blur-sm">
                                <div>
                                    <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Stock Bajo</p>
                                    <p className="text-3xl font-bold text-white">{inventoryHealth.lowStock}</p>
                                </div>
                                <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                                    <Activity size={24} className="text-orange-500" />
                                </div>
                            </div>
                            {/* Widget 3: Inventory Value */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden flex-1 backdrop-blur-sm">
                                <div>
                                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Valor Almacén</p>
                                    <p className="text-xl font-bold text-white font-mono leading-none">{(inventoryHealth.inventoryValue || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}</p>
                                </div>
                                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <DollarSign size={24} className="text-emerald-500" />
                                </div>
                            </div>
                        </div>

                    </div>




                    {/* NEW ROW 4: LOGISTICS PULSE */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl mb-8 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Truck size={18} className="text-indigo-400" /> Ritmo Logístico
                            <span className="text-xs font-normal text-slate-500 uppercase tracking-widest ml-2">Últimos Movimientos</span>
                        </h3>
                        <div className="space-y-1">
                            {recentTransfers.length === 0 && <p className="text-slate-500 italic text-sm">Sin movimientos recientes.</p>}
                            {recentTransfers.map(t => (
                                <div key={t.id_traspaso} className="flex justify-between items-center p-3 hover:bg-slate-800/40 rounded-lg transition-colors border-b border-slate-800/50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="text-slate-400 font-mono text-xs bg-slate-800 px-2 py-1 rounded">
                                            {new Date(t.fecha_envio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <span className="font-bold text-white">{t.origin?.nombre}</span>
                                            <ArrowRight size={12} className="text-slate-500" />
                                            <span className="font-bold text-white">{t.dest?.nombre}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Status Pill */}
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${t.estado === 'COMPLETADO' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20' :
                                            t.estado === 'EN_TRANSITO' ? 'bg-blue-900/20 text-blue-400 border-blue-500/20' :
                                                'bg-slate-800 text-slate-400 border-slate-600'
                                            }`}>
                                            {t.estado}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            ) : (
                // === VIEW B: ANALYSIS HISTORICO ===
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Controls Row (SPLIT INPUTS) */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-6 bg-slate-900/50 p-6 rounded-xl border border-slate-800">

                        <div className="flex flex-col md:flex-row gap-6 w-full xl:w-auto">
                            {/* Start Date */}
                            <div className="flex flex-col gap-2 flex-1">
                                <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} /> Desde
                                </h4>
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date) => setStartDate(date)}
                                    selectsStart
                                    startDate={startDate}
                                    endDate={endDate}
                                    className="bg-slate-800 border border-slate-700 text-white text-sm font-medium rounded-lg px-4 py-2 w-full cursor-pointer hover:border-blue-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    dateFormat="dd MMM yyyy"
                                    locale="es"
                                />
                            </div>

                            {/* End Date */}
                            <div className="flex flex-col gap-2 flex-1">
                                <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} /> Hasta
                                </h4>
                                <DatePicker
                                    selected={endDate}
                                    onChange={(date) => setEndDate(date)}
                                    selectsEnd
                                    startDate={startDate}
                                    endDate={endDate}
                                    minDate={startDate}
                                    className="bg-slate-800 border border-slate-700 text-white text-sm font-medium rounded-lg px-4 py-2 w-full cursor-pointer hover:border-blue-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    dateFormat="dd MMM yyyy"
                                    locale="es"
                                />
                            </div>
                        </div>

                        {/* Granularity Selector */}
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Filter size={14} /> Agrupación
                            </h4>
                            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 overflow-x-auto">
                                {['day', 'week', 'month', 'year'].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setHistoryGranularity(g)}
                                        className={`px-4 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap ${historyGranularity === g ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                    >
                                        {g === 'day' ? 'Días' : g === 'week' ? 'Semanas' : g === 'month' ? 'Meses' : 'Años'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary for Range */}
                        <div className="flex-1 text-right border-l border-slate-700 pl-6 hidden xl:block self-center">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total en Periodo</p>
                            <p className="text-3xl font-bold text-white font-mono tracking-tight text-emerald-400">
                                {historyViewData.reduce((acc, d) => acc + d.amount, 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>

                    {/* Main Trend Chart */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-500" />
                            Tendencia de Ingresos
                        </h3>
                        {historyViewData.length > 0 ? (
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={historyViewData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#94a3b8"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `$${value / 1000}k`}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                                            formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="#3B82F6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorHistory)"
                                            animationDuration={500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[400px] w-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                                <Calendar size={48} className="mb-4 opacity-50" />
                                <p>Selecciona un rango de fechas para ver datos.</p>
                            </div>
                        )}
                    </div>

                </div>
            )
            }
        </div >
    )
}

// Reuse KPI Card Component
function KPICard({ title, value, icon, trend, color }) {
    const hoverStyles = {
        emerald: "hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]",
        blue: "hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]",
        purple: "hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)]",
        orange: "hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)]",
    }

    const textStyles = {
        emerald: "text-emerald-600 dark:text-emerald-400",
        blue: "text-blue-600 dark:text-blue-400",
        purple: "text-purple-600 dark:text-purple-400",
        orange: "text-orange-600 dark:text-orange-400",
    }

    const iconBgStyles = {
        emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
        blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-500/30 text-blue-600 dark:text-blue-400",
        purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-500/30 text-purple-600 dark:text-purple-400",
        orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-500/30 text-orange-600 dark:text-orange-400",
    }

    return (
        <div className={`bg-white dark:bg-[#0f172a] rounded-xl p-6 relative overflow-hidden group shadow-sm border border-gray-200 dark:border-gray-800 transition-all duration-300 ${hoverStyles[color]}`}>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-xl border shadow-inner ${iconBgStyles[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="relative z-10">
                <h4 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>
                <div className="text-3xl font-bold text-white tracking-tight mb-2">
                    {value}
                </div>
                <p className={`text-xs font-medium opacity-80 ${textStyles[color]}`}>
                    {trend}
                </p>
            </div>
        </div>
    )
}
