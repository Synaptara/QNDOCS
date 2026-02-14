/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary': '#0f172a',
                'secondary': '#1e293b',
                'accent': '#3b82f6',
                'light': '#f8fafc',
                'dark': '#020617',
            },
        },
    },
    plugins: [],
}
