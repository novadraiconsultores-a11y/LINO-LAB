import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    useEffect(() => {
        // 🔥 HARDCORE FIX: Solo existe la oscuridad
        document.documentElement.classList.add('dark')

        // MutationObserver: Si alguna extensión o código intenta quitar 'dark', lo restauramos
        const observer = new MutationObserver(() => {
            if (!document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.add('dark')
                console.warn('⚠️ Dark mode protection: Restored dark class')
            }
        })

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })

        // Cleanup
        return () => observer.disconnect()
    }, [])

    // No theme state, no toggle function - just a shell
    return (
        <ThemeContext.Provider value={{ theme: 'dark' }}>
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
