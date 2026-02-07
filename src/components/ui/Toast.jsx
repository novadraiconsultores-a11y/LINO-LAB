import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onClose, 300) // Wait for exit animation
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    if (!message) return null

    const isSuccess = type === 'success'

    return (
        <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                } ${isSuccess
                    ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-50'
                    : 'bg-slate-900/95 border-red-500/50 text-red-50'
                }`}
        >
            {isSuccess ? (
                <CheckCircle className="text-emerald-500" size={20} />
            ) : (
                <XCircle className="text-red-500" size={20} />
            )}

            <p className="text-sm font-medium">{message}</p>

            <button
                onClick={() => {
                    setIsVisible(false)
                    setTimeout(onClose, 300)
                }}
                className={`ml-4 p-1 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors ${isSuccess ? 'text-emerald-400' : 'text-red-400'
                    }`}
            >
                <X size={14} />
            </button>
        </div>
    )
}
