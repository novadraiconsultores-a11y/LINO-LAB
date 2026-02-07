/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Manual control of dark mode
    theme: {
        extend: {
            colors: {
                slate: {
                    850: '#1a202c',
                }
            }
        },
    },
    plugins: [],
}
