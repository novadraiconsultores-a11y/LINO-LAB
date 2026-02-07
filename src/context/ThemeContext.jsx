import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    // Always true
    const theme = 'dark'

    useEffect(() => {
        // FORCE DARK MODE
        const root = window.document.documentElement
        root.classList.remove('light')
        root.classList.add('dark')

        // Force body background
        document.body.style.backgroundColor = '#020617' // slate-950
        document.body.style.color = '#ffffff'

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
