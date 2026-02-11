import { X, Banknote, CreditCard, Building2, Terminal } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function PaymentModal({ isOpen, onClose, total, onConfirm }) {
    const [method, setMethod] = useState('Efectivo') // Efectivo, Tarjeta, Transferencia
    const [amountReceived, setAmountReceived] = useState('')
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setMethod('Efectivo')
            setAmountReceived('')
            setProcessing(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    // Ensure total is valid before calculating change
    const currentTotal = total || 0
    const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - currentTotal) : 0
    const canConfirm = method === 'Efectivo' ? parseFloat(amountReceived) >= currentTotal : true

    const handleConfirm = async () => {
        setProcessing(true)
        // Simulate small UI delay
        await new Promise(resolve => setTimeout(resolve, 500))

        onConfirm({
            method,
            amountReceived: method === 'Efectivo' ? parseFloat(amountReceived) : currentTotal,
            change
        })
        setProcessing(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 relative">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-1">Cobrar Venta</h2>
                <p className="text-slate-400 mb-8">Total a cobrar: <span className="text-emerald-400 font-mono text-xl font-bold">${currentTotal.toFixed(2)}</span></p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Payment Methods */}
                    <div className="space-y-4">
                        <h3 className="text-sm uppercase font-bold text-slate-500 tracking-wider">Método de Pago</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => setMethod('Efectivo')}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${method === 'Efectivo'
                                    ? 'border-blue-500 bg-blue-900/20 text-white shadow-lg shadow-blue-900/10'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-750'
                                    }`}
                            >
                                <Banknote size={24} className={method === 'Efectivo' ? 'text-blue-400' : ''} />
                                <span className="font-medium text-lg">Efectivo</span>
                            </button>

                            <button
                                onClick={() => setMethod('Tarjeta')}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${method === 'Tarjeta'
                                    ? 'border-blue-500 bg-blue-900/20 text-white shadow-lg shadow-blue-900/10'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-750'
                                    }`}
                            >
                                <CreditCard size={24} className={method === 'Tarjeta' ? 'text-blue-400' : ''} />
                                <span className="font-medium text-lg">Tarjeta</span>
                            </button>

                            <button
                                onClick={() => setMethod('Transferencia')}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${method === 'Transferencia'
                                    ? 'border-blue-500 bg-blue-900/20 text-white shadow-lg shadow-blue-900/10'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-750'
                                    }`}
                            >
                                <Building2 size={24} className={method === 'Transferencia' ? 'text-blue-400' : ''} />
                                <span className="font-medium text-lg">Transferencia</span>
                            </button>
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="flex flex-col h-full">
                        <h3 className="text-sm uppercase font-bold text-slate-500 tracking-wider mb-4">Detalles</h3>
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex-1 flex flex-col justify-between">

                            {method === 'Efectivo' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-2">Monto Recibido</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">$</span>
                                            <input
                                                type="number"
                                                value={amountReceived}
                                                onChange={(e) => setAmountReceived(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 pl-8 pr-4 text-white text-2xl font-mono focus:outline-none focus:border-blue-500"
                                                placeholder="0.00"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end border-t border-slate-700 pt-4">
                                        <span className="text-slate-400">Cambio:</span>
                                        <span className={`text-2xl font-mono font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            ${change.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {(method === 'Tarjeta' || method === 'Transferencia') && (
                                <div className="h-full flex items-center justify-center text-center text-slate-500">
                                    <p>No se requiere ingreso de cambio para pagos electrónicos.</p>
                                </div>
                            )}

                            <div className="mt-8 pt-4 space-y-4 border-t border-slate-700/50">
                                <button
                                    onClick={handleConfirm}
                                    disabled={!canConfirm || processing}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-lg uppercase tracking-wide shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {processing ? 'Procesando...' : 'Confirmar Cobro'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
