import { Routes, Route } from 'react-router-dom'
import { dashboardRoutes } from './routes/index'
import Navbar from './shared/components/Navbar'
import Footer from './shared/components/Footer'
import ScrollToTop from './shared/components/ScrollToTop'
import BackToTopButton from './shared/components/BackToTopButton'
import { Toaster } from './shared/components/ui/toaster'
import DashboardLayout from './shared/components/dashboard/Layout/DashboardLayout'
import ProtectedRoute, { AdminRoute, DashboardRoute, ModulePermissionRoute, PublicRoute } from './shared/components/ProtectedRoute'

// Pages
import HomePage from './features/properties/pages/HomePage'
import PropertiesPage from './features/properties/pages/PropertiesPage'
import PropertyDetailsPage from './features/properties/pages/PropertyDetailsPage'
import ContactPage from './features/contact/pages/ContactPage'
import AboutPage from './features/about/pages/AboutPage'
import ServicesPage from './features/services/pages/ServicesPage'
import LoginPage from './features/auth/pages/LoginPage'
import UserAppointmentsPage from './features/appointments/pages/UserAppointmentsPage'
import ActivateAccountPage from './features/auth/pages/ActivateAccountPage'

// Dashboard pages
import DashboardPage from './features/dashboard/DashboardPage'
import { SalesManagementPage } from './features/dashboard/pages/sales/SalesManagementPage'
import { BuyersManagementPage } from './features/dashboard/pages/sales/BuyerManagementPage'
import { LeasesManagementPage } from './features/dashboard/pages/leases/LeasesManagementPage'
import { RenantManagementPage } from './features/dashboard/pages/leases/RenantManagementPage'
import AppointmentPage from './features/dashboard/pages/appointment/AppointmentPage'
import Reports from './features/dashboard/pages/reports/Reports'
import Roles from './features/dashboard/pages/roles/Roles'
import InmueblesDashboardPage from './features/dashboard/pages/Inmuebles/InmueblesDashboardPage'
import OwnerDashboardPage from './features/dashboard/pages/propertyOwner/OwnerDashboardPage'
import AdministrativosPage from './features/dashboard/pages/administrativos/AdministrativosPage'
import UsersPage from './features/dashboard/pages/users/UsersPage'
import ProfilePage from './features/dashboard/pages/Profile/ProfilePage'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <BackToTopButton />
      <Routes>

        {/* Public routes with navbar and footer */}
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <HomePage />
              <Footer />
            </>
          }
        />
        <Route
          path="/inmuebles"
          element={
            <>
              <Navbar />
              <PropertiesPage />
              <Footer />
            </>
          }
        />
        <Route
          path="/inmuebles/:id"
          element={
            <>
              <Navbar />
              <PropertyDetailsPage />
              <Footer />
            </>
          }
        />
        <Route
          path="/contáctanos"
          element={
            <>
              <Navbar />
              <ContactPage />
              <Footer />
            </>
          }
        />
        <Route
          path="/nosotros"
          element={
            <>
              <Navbar />
              <AboutPage />
              <Footer />
            </>
          }
        />
        <Route
          path="/servicios"
          element={
            <>
              <Navbar />
              <ServicesPage />
              <Footer />
            </>
          }
        />

        {/* Auth routes with navbar/footer */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Navbar />
              <LoginPage />
              <Footer />
            </PublicRoute>
          }
        />
        <Route
          path="/activar"
          element={<ActivateAccountPage />}
        />

        {/* Authenticated user routes with navbar/footer */}
        <Route
          path="/mis-citas"
          element={
            <ProtectedRoute>
              <Navbar />
              <UserAppointmentsPage />
              <Footer />
            </ProtectedRoute>
          }
        />

        {/* Dashboard routes with sidebar layout */}
        <Route
          path="/dashboard"
          element={
            <DashboardRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </DashboardRoute>
          }
        />
        <Route
          path={dashboardRoutes.properties}
          element={
            <DashboardRoute>
              <ModulePermissionRoute moduleName="inmuebles" action="ver">
                <DashboardLayout>
                  <InmueblesDashboardPage />
                </DashboardLayout>
              </ModulePermissionRoute>
            </DashboardRoute>
          }
        />
        <Route
          path={dashboardRoutes.owners}
          element={
            <DashboardRoute>
              <ModulePermissionRoute moduleName="inmuebles" action="ver">
                <DashboardLayout>
                  <OwnerDashboardPage />
                </DashboardLayout>
              </ModulePermissionRoute>
            </DashboardRoute>
          }
        />
        <Route
          path="/dashboard/salesManagement"
          element={
            <DashboardRoute>
              <ModulePermissionRoute moduleName="ventas" action="ver">
                <DashboardLayout>
                  <SalesManagementPage />
                </DashboardLayout>
              </ModulePermissionRoute>
            </DashboardRoute>
          }
        />
        <Route
          path="/dashboard/buyersManagement"
          element={
            <DashboardRoute>
              <ModulePermissionRoute moduleName="ventas" action="ver">
                <DashboardLayout>
                  <BuyersManagementPage />
                </DashboardLayout>
              </ModulePermissionRoute>
            </DashboardRoute>
          }
        />
        <Route
          path="/dashboard/leasesManagement"
          element={
            <DashboardRoute>
              <ModulePermissionRoute moduleName="arriendos" action="ver">
                <DashboardLayout>
                  <LeasesManagementPage />
                </DashboardLayout>
              </ModulePermissionRoute>
            </DashboardRoute>
          }
        />
        <Route
          path="/dashboard/renantManagement"
          element={
            <DashboardRoute>
              <ModulePermissionRoute moduleName="arriendos" action="ver">
                <DashboardLayout>
                  <RenantManagementPage />
                </DashboardLayout>
              </ModulePermissionRoute>
            </DashboardRoute>
          }
        />
        <Route
          path="/dashboard/citas"
          element={
            <DashboardRoute>
              <ModulePermissionRoute moduleName="citas" action="ver">
                <DashboardLayout>
                  <AppointmentPage />
                </DashboardLayout>
              </ModulePermissionRoute>
            </DashboardRoute>
          }
        />
        <Route
          path="/reportes/gestion"
          element={
            <DashboardRoute>
              <ModulePermissionRoute moduleName="reportes" action="ver">
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ModulePermissionRoute>
            </DashboardRoute>
          }
        />
        <Route
          path="/seguridad/roles"
          element={
            <DashboardRoute>
              <AdminRoute>
                <DashboardLayout>
                  <Roles />
                </DashboardLayout>
              </AdminRoute>
            </DashboardRoute>
          }
        />
        <Route
          path="/seguridad/administrativos"
          element={
            <DashboardRoute>
              <AdminRoute>
                <DashboardLayout>
                  <AdministrativosPage />
                </DashboardLayout>
              </AdminRoute>
            </DashboardRoute>
          }
        />
        <Route
          path="/seguridad/usuarios"
          element={
            <DashboardRoute>
              <AdminRoute>
                <DashboardLayout>
                  <UsersPage />
                </DashboardLayout>
              </AdminRoute>
            </DashboardRoute>
          }
        />
        <Route
          path={dashboardRoutes.profile}
          element={
            <DashboardRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </DashboardRoute>
          }
        />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
