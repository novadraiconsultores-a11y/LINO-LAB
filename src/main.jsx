import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { ThemeProvider } from './context/ThemeContext'

// 🔥 NUCLEAR DARK MODE ENFORCEMENT
// Force dark mode ALWAYS - no exceptions, no localStorage, no system preferences
document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

import './force-dark-button.css'
