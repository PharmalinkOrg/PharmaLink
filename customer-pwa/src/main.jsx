// PharmaLink Customer PWA entry point

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import App from './App.jsx'

import { AuthProvider } from './context/AuthContext.jsx'
import { AppSettingsProvider } from './context/AppSettingsContext.jsx'
import { queryClient } from './lib/queryClient.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppSettingsProvider>
        <BrowserRouter basename="/">
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </AppSettingsProvider>
    </QueryClientProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.error(
          'Service worker registration failed:',
          error,
        )
      })
  })
}