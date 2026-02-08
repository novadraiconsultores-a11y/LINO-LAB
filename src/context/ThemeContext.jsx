import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    // FORCE DARK MODE: Always 'dark', ignoring localStorage/system
    const [theme] = useState('dark')

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove('light')
        root.classList.add('dark')

        // Force body background as safety net
        document.body.style.backgroundColor = '#020617'
        document.body.style.color = '#ffffff'

        // Optionally update text in storage but NEVER read from it
        localStorage.setItem('theme', 'dark')
    }, [])

    const toggleTheme = () => {
        // Disabled
        console.log('Dark mode enforced')
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
