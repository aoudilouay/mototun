import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationsCenter from './NotificationsCenter';

function FournisseurLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth(); // 🔥 Get logout function and user from AuthContext

  const menuItems = [
    { icon: '📊', label: 'Dashboard', path: '/fournisseur/dashboard' },
    { icon: '🏪', label: 'Mes Revendeurs', path: '/fournisseur/revendeurs', badge: '24' },
    { icon: '📄', label: 'Cartes Grises', path: '/fournisseur/carte-grise', badge: '12' },
    { icon: '🏍️', label: 'Catalogue Motos', path: '/fournisseur/catalog' },
    { icon: '📦', label: 'Commandes', path: '/fournisseur/orders', badge: '5' },
  ];

  const secondaryMenuItems = [
    { icon: '📊', label: 'Statistiques', path: '/fournisseur/stats' },
    { icon: '⚙️', label: 'Paramètres', path: '/fournisseur/settings' },
  ];

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // 🔥 UPDATED LOGOUT HANDLER
  const handleLogout = () => {
    logout(); // Clear auth state and localStorage
    navigate('/login', { replace: true }); // Redirect to login and prevent going back
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      return names.length >= 2 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : user.fullName.substring(0, 2).toUpperCase();
    }
    return 'FR';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* Sidebar */}
      <aside className={`bg-gradient-to-br from-purple-600 to-indigo-700 transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } flex flex-col fixed h-full z-30 shadow-2xl`}>
        
        {/* Logo */}
        <div className="h-16 border-b border-white/20 flex items-center justify-between px-4">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shadow-lg">
                <span className="text-purple-600 font-bold text-sm">🏢</span>
              </div>
              <span className="text-lg font-bold text-white">Fournisseur</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${
                  isActiveRoute(item.path)
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                {!isSidebarCollapsed && (
                  <>
                    <span className="font-medium flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isActiveRoute(item.path)
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-white/30 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-white/20" />

          {/* Secondary Navigation */}
          {!isSidebarCollapsed && (
            <div className="mb-3 px-3">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Autres
              </p>
            </div>
          )}
          
          <div className="space-y-1">
            {secondaryMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isActiveRoute(item.path)
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                {!isSidebarCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="border-t border-white/20 p-4">
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-purple-600 flex-shrink-0">
              {getUserInitials()}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.businessName || 'Fournisseur'}
                </p>
                <p className="text-xs text-white/70 truncate">
                  Fournisseur Premium
                </p>
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${
        isSidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-6">
          
          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Rechercher revendeur, dossier..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4 ml-6">
            
            {/* Messages */}
            <Link to="/fournisseur/messages" className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Link>

            {/* Notifications */}
            <NotificationsCenter userType="fournisseur" />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {getUserInitials()}
                </div>
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2">
                  <Link 
                    to="/fournisseur/profile" 
                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Mon Profil</span>
                  </Link>
                  <Link 
                    to="/fournisseur/settings" 
                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Paramètres</span>
                  </Link>
                  <div className="border-t border-slate-200 my-2"></div>
                  <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm font-medium text-red-600">Déconnexion</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>

      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowUserMenu(false)}
        />
      )}

    </div>
  );
}

export default FournisseurLayout;
