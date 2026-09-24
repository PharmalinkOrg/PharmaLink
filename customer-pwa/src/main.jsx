// PharmaLink Customer PWA entry point

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import App from './App.jsx'

import { AuthProvider } from './context/AuthContext.jsx'
import { AppSettingsProvider } from './context/AppSettingsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppSettingsProvider>
      <BrowserRouter basename="/">
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </AppSettingsProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.error('Service worker registration failed:', error)
      })
  })
}