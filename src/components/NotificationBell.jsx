import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthProvider'

export default function NotificationBell() {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const dropdownRef = useRef(null)

    // Sound effect (optional subtle beep)
    const playNotificationSound = () => {
        // Implementation pending audio file availability
        // For now, we rely on visual cues
    }

    const fetchNotifications = async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20) // Initial limit

            if (data) {
                setNotifications(data)
                setUnreadCount(data.filter(n => !n.read).length)
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (id) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id)

            if (!error) {
                setNotifications(prev => prev.map(n =>
                    n.id === id ? { ...n, read: true } : n
                ))
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
        } catch (err) {
            console.error('Error marking as read', err)
        }
    }

    const markAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
            if (unreadIds.length === 0) return

            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .in('id', unreadIds)

            if (!error) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                setUnreadCount(0)
            }
        } catch (err) {
            console.error('Error marking all as read', err)
        }
    }

    // Realtime Subscription
    useEffect(() => {
        if (!user) return

        fetchNotifications()

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    // New notification received
                    const newNotification = payload.new
                    setNotifications(prev => [newNotification, ...prev])
                    setUnreadCount(prev => prev + 1)
                    playNotificationSound()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Auto-mark as read when opening dropdown
    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            markAllAsRead()
        }
    }, [isOpen])

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={16} className="text-emerald-400" />
            case 'error': return <AlertCircle size={16} className="text-red-400" />
            case 'warning': return <AlertTriangle size={16} className="text-amber-400" />
            default: return <Info size={16} className="text-blue-400" />
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800 focus:outline-none"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-slate-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="fixed inset-x-4 top-16 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 w-auto md:w-80 max-w-[90vw] mx-auto md:mx-0 bg-slate-900 border border-slate-700 rounded-xl shadow-xl shadow-black overflow-hidden z-[100] backdrop-blur-md">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/90">
                        <h3 className="text-sm font-bold text-slate-200">Notificaciones</h3>
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                <Bell className="mx-auto mb-2 opacity-20" size={32} />
                                <p>No tienes notificaciones</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                    className={`
                                        p-4 border-b border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer group relative
                                        ${!notification.read ? 'bg-slate-800/40' : ''}
                                    `}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 shrink-0">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-slate-400'}`}>
                                                    {notification.title}
                                                </h4>
                                                {!notification.read && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                {notification.message}
                                            </p>
                                            <span className="text-[10px] text-slate-600 mt-2 block font-mono">
                                                {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
