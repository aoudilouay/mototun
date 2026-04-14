import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppErrorBoundary from './components/AppErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { AppPageSkeleton, AppShellSkeleton, PublicRouteSkeleton } from './components/loading/RouteSkeletons';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { scheduleIdleTask } from './lib/browserScheduling';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Lazy load Analytics for better initial paint
const Analytics = lazy(() => import('@vercel/analytics/react').then(mod => ({ default: mod.Analytics })));

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

function withSuspense(element, fallback) {
  return <Suspense fallback={fallback}>{element}</Suspense>;
}

function renderPublicRoute(element) {
  return withSuspense(element, <PublicRouteSkeleton />);
}

function renderAppShell(element, accent) {
  return withSuspense(element, <AppShellSkeleton accent={accent} />);
}

function renderAppPage(element, accent) {
  return withSuspense(element, <AppPageSkeleton accent={accent} />);
}

function AppRoutes() {
  const { t, language } = useI18n();

  return (
    <Routes key={language}>
      <Route path="/" element={renderPublicRoute(<LandingPage />)} />
      <Route path="/login" element={renderPublicRoute(<LoginPage />)} />
      <Route path="/register" element={renderPublicRoute(<RegisterPage />)} />
      <Route path="/forgot-password" element={renderPublicRoute(<ForgotPasswordPage />)} />
      <Route path="/reset-password" element={renderPublicRoute(<ResetPasswordPage />)} />
      <Route path="/client-portal" element={renderPublicRoute(<ClientPortalPage />)} />
      <Route path="/legal" element={renderPublicRoute(<LegalPage />)} />
      <Route path="/privacy-policy" element={renderPublicRoute(<PrivacyPolicyPage />)} />

      <Route
        path="/revendeur"
        element={
          <ProtectedRoute allowedRoles={['Revendeur']}>
            {renderAppShell(<RevendeurLayout />, 'cyan')}
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/revendeur/dashboard" replace />} />
        <Route path="dashboard" element={renderAppPage(<DashboardPage />, 'cyan')} />
        <Route path="messages" element={renderAppPage(<MessagingPage />, 'cyan')} />
        <Route path="profile" element={renderAppPage(<RevendeurProfilePage />, 'cyan')} />
        <Route path="clients" element={renderAppPage(<ClientsPage />, 'cyan')} />
        <Route path="fournisseurs" element={renderAppPage(<FournisseursPage />, 'cyan')} />
        <Route path="motorcycles" element={renderAppPage(<MotorcyclesPage />, 'cyan')} />
        <Route path="carte-grise" element={renderAppPage(<CarteGrisePage />, 'cyan')} />
        <Route path="invoices" element={renderAppPage(<InvoicesPage />, 'cyan')} />
        <Route path="archive" element={renderAppPage(<CarteGrisePage initialViewMode="archive" />, 'cyan')} />
        <Route path="stats" element={renderAppPage(<RevendeurStatsPage />, 'cyan')} />
        <Route path="settings" element={<Navigate to="/revendeur/dashboard" replace />} />
        <Route path="support" element={renderAppPage(<SupportCenterPage mode="revendeur" />, 'cyan')} />
      </Route>

      <Route
        path="/fournisseur"
        element={
          <ProtectedRoute allowedRoles={['Fournisseur']}>
            {renderAppShell(<FournisseurLayout />, 'emerald')}
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/fournisseur/dashboard" replace />} />
        <Route path="dashboard" element={renderAppPage(<FournisseurDashboardPage />, 'emerald')} />
        <Route path="revendeurs" element={renderAppPage(<RevendeursPage />, 'emerald')} />
        <Route path="carte-grise" element={renderAppPage(<FournisseurCarteGrisePage />, 'emerald')} />
        <Route path="messages" element={renderAppPage(<FournisseurMessagingPage />, 'emerald')} />
        <Route path="profile" element={renderAppPage(<FournisseurProfilePage />, 'emerald')} />
        <Route path="stats" element={renderAppPage(<FournisseurStatsPage />, 'emerald')} />
        <Route path="settings" element={<ComingSoonPage label={t('common.comingSoonSettings')} />} />
        <Route path="support" element={renderAppPage(<SupportCenterPage mode="fournisseur" />, 'emerald')} />
      </Route>

      <Route
        path="/admin"
        element={(
          <ProtectedRoute allowedRoles={['Admin']}>
            {renderAppShell(<AdminLayout />, 'slate')}
          </ProtectedRoute>
        )}
      >
        <Route index element={<Navigate to="/admin/users" replace />} />
        <Route path="users" element={renderAppPage(<AdminUsersPage />, 'slate')} />
        <Route path="audit" element={renderAppPage(<AdminAuditPage />, 'slate')} />
        <Route path="support" element={renderAppPage(<SupportCenterPage mode="admin" />, 'slate')} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ComingSoonPage({ label }) {
  return <div className="p-8 text-2xl font-bold">{label}</div>;
}

function AnalyticsWrapper() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Defer Analytics initialization until after route is rendered
    const cancelIdleTask = scheduleIdleTask(() => {
      setIsReady(true);
    }, { timeout: 2000, fallbackDelay: 250 });

    return () => {
      cancelIdleTask();
    };
  }, []);

  if (!isReady) return null;
  return <Suspense fallback={null}><Analytics /></Suspense>;
}

function SpeedInsightsWrapper() {
  const location = useLocation();
  return <SpeedInsights route={location.pathname} />;
}

function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <AppErrorBoundary>
          <Router>
            <AppRoutes />
            <Toaster richColors position="bottom-right" />
            <AnalyticsWrapper />
            <SpeedInsightsWrapper />
          </Router>
        </AppErrorBoundary>
      </I18nProvider>
    </AuthProvider>
  );
}

export default App;
