import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SpeedInsights } from '@vercel/speed-insights/react';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider, useI18n } from './context/I18nContext';

const LandingPage = lazy(() => import('./Pages/Landingpage'));
const LoginPage = lazy(() => import('./Pages/LoginPage'));
const RegisterPage = lazy(() => import('./Pages/RegisterPage'));
const ClientPortalPage = lazy(() => import('./Pages/ClientPortalPage'));
const ForgotPasswordPage = lazy(() => import('./Pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./Pages/ResetPasswordPage'));
const LegalPage = lazy(() => import('./Pages/LegalPage'));
const PrivacyPolicyPage = lazy(() => import('./Pages/PrivacyPolicyPage'));
const SupportCenterPage = lazy(() => import('./Pages/SupportCenterPage'));

const RevendeurLayout = lazy(() => import('./components/RevendeurLayout'));
const DashboardPage = lazy(() => import('./Pages/revendeur/DashboardPage'));
const RevendeurStatsPage = lazy(() => import('./Pages/revendeur/StatsPage'));
const MessagingPage = lazy(() => import('./Pages/revendeur/MessagingPage'));
const RevendeurProfilePage = lazy(() => import('./Pages/revendeur/ProfilePage'));
const ClientsPage = lazy(() => import('./Pages/revendeur/ClientsPage'));
const FournisseursPage = lazy(() => import('./Pages/revendeur/FournisseursPage'));
const MotorcyclesPage = lazy(() => import('./Pages/revendeur/MotorcyclesPage'));
const CarteGrisePage = lazy(() => import('./Pages/revendeur/CarteGrisePage'));
const InvoicesPage = lazy(() => import('./Pages/revendeur/InvoicesPage'));

const FournisseurLayout = lazy(() => import('./components/FournisseurLayout'));
const FournisseurDashboardPage = lazy(() => import('./Pages/fournisseur/FournisseurDashboardPage'));
const FournisseurStatsPage = lazy(() => import('./Pages/fournisseur/StatsPage'));
const RevendeursPage = lazy(() => import('./Pages/fournisseur/RevendeursPage'));
const FournisseurCarteGrisePage = lazy(() => import('./Pages/fournisseur/FournisseurCarteGrisePage'));
const FournisseurMessagingPage = lazy(() => import('./Pages/fournisseur/MessagingPage'));
const FournisseurProfilePage = lazy(() => import('./Pages/fournisseur/ProfilePage'));

const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminUsersPage = lazy(() => import('./Pages/admin/AdminUsersPage'));
const AdminAuditPage = lazy(() => import('./Pages/admin/AdminAuditPage'));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-slate-500">
      Loading page...
    </div>
  );
}

function AppRoutes() {
  const { t, language } = useI18n();

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes key={language}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/client-portal" element={<ClientPortalPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

        <Route
          path="/revendeur"
          element={
            <ProtectedRoute allowedRoles={['Revendeur']}>
              <RevendeurLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/revendeur/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="messages" element={<MessagingPage />} />
          <Route path="profile" element={<RevendeurProfilePage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="fournisseurs" element={<FournisseursPage />} />
          <Route path="motorcycles" element={<MotorcyclesPage />} />
          <Route path="carte-grise" element={<CarteGrisePage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="archive" element={<CarteGrisePage initialViewMode="archive" />} />
          <Route path="stats" element={<RevendeurStatsPage />} />
          <Route path="settings" element={<Navigate to="/revendeur/dashboard" replace />} />
          <Route path="support" element={<SupportCenterPage mode="revendeur" />} />
        </Route>

        <Route
          path="/fournisseur"
          element={
            <ProtectedRoute allowedRoles={['Fournisseur']}>
              <FournisseurLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/fournisseur/dashboard" replace />} />
          <Route path="dashboard" element={<FournisseurDashboardPage />} />
          <Route path="revendeurs" element={<RevendeursPage />} />
          <Route path="carte-grise" element={<FournisseurCarteGrisePage />} />
          <Route path="messages" element={<FournisseurMessagingPage />} />
          <Route path="profile" element={<FournisseurProfilePage />} />
          <Route path="stats" element={<FournisseurStatsPage />} />
          <Route path="settings" element={<ComingSoonPage label={t('common.comingSoonSettings')} />} />
          <Route path="support" element={<SupportCenterPage mode="fournisseur" />} />
        </Route>

        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<Navigate to="/admin/users" replace />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="support" element={<SupportCenterPage mode="admin" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function ComingSoonPage({ label }) {
  return <div className="p-8 text-2xl font-bold">{label}</div>;
}

function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <Router>
          <AppRoutes />
          <Toaster richColors position="bottom-right" />
          <SpeedInsights />
        </Router>
      </I18nProvider>
    </AuthProvider>
  );
}

export default App;
