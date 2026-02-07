import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthProvider'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Products from './pages/Products'
import Supply from './pages/Supply'
import InventoryDashboard from './pages/InventoryDashboard'
import Sales from './pages/Sales'
import BusinessOwners from './pages/BusinessOwners'
import Settings from './pages/Settings'
import Traspasos from './pages/Traspasos'
import Login from './pages/Login'
import UpdatePassword from './pages/UpdatePassword'
import Users from './pages/Admin/Users'

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

const AdminRoute = ({ children }) => {
  const { profile } = useAuth()
  // Wait for profile to load? AuthProvider handles loading state globally.
  // If profile is null but user exists (rare race condition?), we might want to wait or fail safe.
  // But AuthProvider sets loading=false only after fetch. So profile should be there if it exists.
  if (profile?.rol !== 'admin') {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Home />} />
              <Route path="productos" element={<Products />} />
              <Route path="abastecimiento" element={<Supply />} />
              <Route path="inventario" element={<InventoryDashboard />} />
              <Route path="ventas" element={<Sales />} />
              <Route path="traspasos" element={<Traspasos />} />
              <Route path="empresarios" element={
                <AdminRoute>
                  <BusinessOwners />
                </AdminRoute>
              } />
              <Route path="configuracion" element={
                <AdminRoute>
                  <Settings />
                </AdminRoute>
              } />
              <Route path="admin/users" element={
                <AdminRoute>
                  <Users />
                </AdminRoute>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App