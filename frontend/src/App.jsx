import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import LandingPage from './Pages/Landingpage';
import LoginPage from './Pages/LoginPage';
import RegisterPage from './Pages/RegisterPage';
import ClientPortalPage from './Pages/ClientPortalPage';

// Revendeur Pages
import RevendeurLayout from './components/RevendeurLayout';
import DashboardPage from './Pages/revendeur/DashboardPage';  
import ClientsPage from './Pages/revendeur/ClientsPage';
import CarteGrisePage from './Pages/revendeur/CarteGrisePage';
import InvoicesPage from './Pages/revendeur/InvoicesPage';
import MotorcyclesPage from './Pages/revendeur/MotorcyclesPage';
import FournisseursPage from './Pages/revendeur/FournisseursPage';
import ProfilePage from './Pages/revendeur/ProfilePage';
import MessagingPage from './Pages/revendeur/MessagingPage';

// Fournisseur Pages
import FournisseurLayout from './components/FournisseurLayout';
import FournisseurDashboardPage from './Pages/fournisseur/FournisseurDashboardPage';
import RevendeursPage from './Pages/fournisseur/RevendeursPage';
import FournisseurCarteGrisePage from './Pages/fournisseur/FournisseurCarteGrisePage';
import FournisseurMessagingPage from './Pages/fournisseur/MessagingPage';
import FournisseurProfilePage from './Pages/fournisseur/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ========== PUBLIC ROUTES ========== */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/client-portal" element={<ClientPortalPage />} />
          
          {/* Client Portal - TOKEN-BASED (NO AUTH NEEDED) */}

          {/* ========== REVENDEUR PROTECTED ROUTES ========== */}
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
            <Route path="profile" element={<ProfilePage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="fournisseurs" element={<FournisseursPage />} />
            <Route path="motorcycles" element={<MotorcyclesPage />} />
            <Route path="carte-grise" element={<CarteGrisePage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="archive" element={<div className="text-2xl font-bold p-8">Archive Page (Coming soon...)</div>} />
            <Route path="stats" element={<div className="text-2xl font-bold p-8">Stats Page (Coming soon...)</div>} />
            <Route path="settings" element={<div className="text-2xl font-bold p-8">Settings Page (Coming soon...)</div>} />
          </Route>

          {/* ========== FOURNISSEUR PROTECTED ROUTES ========== */}
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
            <Route path="catalog" element={<div className="text-2xl font-bold p-8">Catalog (Coming soon...)</div>} />
            <Route path="orders" element={<div className="text-2xl font-bold p-8">Orders (Coming soon...)</div>} />
            <Route path="stats" element={<div className="text-2xl font-bold p-8">Stats (Coming soon...)</div>} />
            <Route path="settings" element={<div className="text-2xl font-bold p-8">Settings (Coming soon...)</div>} />
          </Route>

          {/* ========== FALLBACK ========== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
