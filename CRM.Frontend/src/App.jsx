import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ChatPage from './pages/Chat/ChatPage'
import ContactosList from './pages/Contactos/ContactosList'
import ContactoDetalle from './pages/Contactos/ContactoDetalle'
import EmpresasList from './pages/Empresas/EmpresasList'
import EmpresaDetalle from './pages/Empresas/EmpresaDetalle'
import Pipeline from './pages/Pipeline/Pipeline'
import OportunidadDetalle from './pages/Pipeline/OportunidadDetalle'
import Actividades from './pages/Actividades/Actividades'
import Productos from './pages/Productos/Productos'
import Plantillas from './pages/Plantillas/Plantillas'
import Campanas from './pages/Campanas/Campanas'
import EncuestasList from './pages/Encuestas/EncuestasList'
import EncuestaDisenar from './pages/Encuestas/EncuestaDisenar'
import EncuestaResultados from './pages/Encuestas/EncuestaResultados'
import FormularioPublico from './pages/Encuesta/FormularioPublico'
import Reportes from './pages/Reportes/Reportes'
import Configuracion from './pages/Configuracion/Configuracion'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/encuesta/:token" element={<FormularioPublico />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:id" element={<ChatPage />} />
                <Route path="/contactos" element={<ContactosList />} />
                <Route path="/contactos/:id" element={<ContactoDetalle />} />
                <Route path="/empresas" element={<EmpresasList />} />
                <Route path="/empresas/:id" element={<EmpresaDetalle />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/oportunidades/:id" element={<OportunidadDetalle />} />
                <Route path="/actividades" element={<Actividades />} />
                <Route path="/productos" element={<Productos />} />
                <Route path="/plantillas" element={<Plantillas />} />
                <Route path="/campanas" element={<Campanas />} />
                <Route path="/encuestas" element={<EncuestasList />} />
                <Route path="/encuestas/:id/disenar" element={<EncuestaDisenar />} />
                <Route path="/encuestas/:id/resultados" element={<EncuestaResultados />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="/configuracion" element={<Configuracion />} />
              </Routes>
            </AppLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
