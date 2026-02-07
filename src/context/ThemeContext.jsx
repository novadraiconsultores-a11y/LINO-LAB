import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Initialize from localStorage or default to 'dark'
        const storedTheme = localStorage.getItem('theme')
        return storedTheme || 'dark'
    })

    useEffect(() => {
        const root = window.document.documentElement
        const body = window.document.body

        // 1. Gestionar la clase para Tailwind
        root.classList.remove('light', 'dark')
        root.classList.add(theme)

        // 2. FUERZA BRUTA: Pintar el body directamente (Bypasseando CSS)
        if (theme === 'dark') {
            body.style.backgroundColor = '#111827'; // gray-900 force
            body.style.color = '#ffffff';
        } else {
            body.style.backgroundColor = '#f9fafb'; // gray-50 force
            body.style.color = '#111827';
        }

        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
