// Importaciones necesarias
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UsersProvider } from './shared/contexts/UsersContext.jsx'
import { AppointmentProvider } from './shared/contexts/AppointmentContext.jsx'
import { AuthProvider } from './shared/contexts/AuthContext.jsx'
import { AdministrativosProvider } from './shared/contexts/AdministrativosContext.jsx'
import RealtimeBridge from './shared/components/realtime/RealtimeBridge.jsx'
import { Toaster } from './shared/components/ui/toaster.jsx'
import App from './App.jsx'
import './shared/styles/globals.css'
import './shared/styles/animations.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <RealtimeBridge />
        <AppointmentProvider>
          <AdministrativosProvider>
            <UsersProvider>
              <App />
              <Toaster />
            </UsersProvider>
          </AdministrativosProvider>
        </AppointmentProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
