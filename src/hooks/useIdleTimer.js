import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'

// Events that reset the idle timer
const EVENTS = [
    'mousemove',
    'click',
    'keydown',
    'scroll',
    'touchstart'
]

export const useIdleTimer = ({
    timeout = 1000 * 60 * 14, // 14 Minutes (Silent)
    promptBeforeIdle = 1000 * 60 * 1, // 1 Minute (Warning)
    onIdle,
    isEnabled = true
}) => {
    const [isIdle, setIsIdle] = useState(false)
    const [remaining, setRemaining] = useState(0)

    // Refs to hold timer IDs and state without triggering re-renders
    const timerRef = useRef(null)
    const promptTimerRef = useRef(null)
    const startTimeRef = useRef(Date.now())
    const intervalRef = useRef(null)
    const isMockingRef = useRef(false) // To prevent double triggers if user interacts during prompt

    const resetTimer = () => {
        if (!isEnabled || isMockingRef.current) return

        // Clear existing timers
        if (timerRef.current) clearTimeout(timerRef.current)
        if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)

        setIsIdle(false)
        setRemaining(0)
        startTimeRef.current = Date.now()

        // Start Warning Timer
        timerRef.current = setTimeout(() => {
            // WARN USER
            isMockingRef.current = true // Stop resetting on movement while prompt is open

            let timeLeft = promptBeforeIdle / 1000;

            Swal.fire({
                title: '¿Sigues ahí?',
                html: `Tu sesión expirará en <b>${timeLeft}</b> segundos por inactividad.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, continuar',
                cancelButtonText: 'Cerrar sesión',
                background: '#0f172a', // Deep Universe Dark
                color: '#f8fafc', // Light text
                timer: promptBeforeIdle,
                timerProgressBar: true,
                allowOutsideClick: false,
                didOpen: () => {
                    const content = Swal.getHtmlContainer()
                    const b = content.querySelector('b')

                    intervalRef.current = setInterval(() => {
                        timeLeft -= 1;
                        if (b) {
                            b.textContent = timeLeft;
                        }
                    }, 1000)
                },
                willClose: () => {
                    clearInterval(intervalRef.current)
                }
            }).then((result) => {
                isMockingRef.current = false

                if (result.isConfirmed) {
                    // Create continuity
                    resetTimer()
                } else if (result.dismiss === Swal.DismissReason.timer || result.dismiss === Swal.DismissReason.cancel) {
                    // Time ran out OR user clicked cancel/logout
                    handleIdle()
                }
            })

            // Setup a rigorous fail-safe timeout in case Swal is blocked or fails
            promptTimerRef.current = setTimeout(() => {
                if (Swal.isVisible()) {
                    Swal.close() // This will trigger willClose and handleIdle via dismiss logic if needed, 
                    // but to be safe we call handleIdle directly if the promise doesn't resolve fast enough
                }
                handleIdle()
            }, promptBeforeIdle)

        }, timeout)
    }

    const handleIdle = () => {
        setIsIdle(true)
        if (onIdle) onIdle()
    }

    useEffect(() => {
        if (!isEnabled) return

        // Initial setup
        resetTimer()

        const handleEvent = () => resetTimer()

        // Attach listeners
        EVENTS.forEach(event => {
            window.addEventListener(event, handleEvent)
        })

        return () => {
            // Cleanup
            if (timerRef.current) clearTimeout(timerRef.current)
            if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
            if (intervalRef.current) clearInterval(intervalRef.current)

            EVENTS.forEach(event => {
                window.removeEventListener(event, handleEvent)
            })
        }
    }, [isEnabled, timeout, promptBeforeIdle, onIdle])

    return {
        isIdle
    }
}
