import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { HeaderActionSkeleton, HeaderGreetingSkeleton } from './loading/RouteSkeletons';
import { prefetchDataForPath } from '../lib/appQueries';
import { preloadRouteModule } from '../lib/routePreloaders';
import { resolveAvatarUrl } from '../utils/avatar';

const NotificationsCenter = lazy(() => import('./NotificationsCenter'));
const HeaderGreetingWeatherCard = lazy(() => import('./HeaderGreetingWeatherCard'));

function renderNavIcon(icon) {
  const common = 'h-4 w-4';

  switch (icon) {
    case 'dashboard':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 13h8V3H3v10zM13 21h8v-6h-8v6zM13 11h8V3h-8v8zM3 21h8v-6H3v6z" />
        </svg>
      );
    case 'revendeurs':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'carteGrise':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );
    case 'stats':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <rect x="7" y="11" width="3" height="6" />
          <rect x="12" y="8" width="3" height="9" />
          <rect x="17" y="5" width="3" height="12" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15.4a1.65 1.65 0 0 0-1.51-1H3.4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5 8.89a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9.11 5c.67-.28 1.11-.93 1.11-1.65V3.4a2 2 0 1 1 4 0v.09c0 .72.44 1.37 1.11 1.65.67.28 1.44.13 1.95-.38l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.51.51-.66 1.28-.38 1.95.28.67.93 1.11 1.65 1.11h.09a2 2 0 1 1 0 4h-.09c-.72 0-1.37.44-1.65 1.11z" />
        </svg>
      );
    case 'support':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 1.9-2.9 2.3-2.9 4" />
          <path d="M12 17h.01" />
        </svg>
      );
    default:
      return null;
  }
}

function FournisseurLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout, user } = useAuth();
  const { t, isArabic } = useI18n();

  const menuItems = [
    { icon: 'dashboard', label: t('nav.dashboard'), path: '/fournisseur/dashboard' },
    { icon: 'revendeurs', label: t('nav.revendeurs'), path: '/fournisseur/revendeurs', badge: '24' },
    { icon: 'carteGrise', label: t('nav.cartesGrises'), path: '/fournisseur/carte-grise', badge: '12' }
  ];

  const secondaryMenuItems = [
    { icon: 'stats', label: t('nav.stats'), path: '/fournisseur/stats' },
    { icon: 'settings', label: t('nav.settings'), path: '/fournisseur/settings' },
    { icon: 'support', label: 'Support', path: '/fournisseur/support' }
  ];

  const isActiveRoute = (path) => location.pathname === path;

  const prefetchRouteIntent = useCallback((path) => {
    void preloadRouteModule(path);
    void prefetchDataForPath(queryClient, path);
  }, [queryClient]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getUserInitials = () => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      return names.length >= 2
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : user.fullName.substring(0, 2).toUpperCase();
    }
    return 'FR';
  };

  const userAvatarUrl = resolveAvatarUrl(user?.avatar || user?.profile?.avatar);
  const revendeurCount = menuItems.find((item) => item.path === '/fournisseur/revendeurs')?.badge || '24';
  const dossierCount = menuItems.find((item) => item.path === '/fournisseur/carte-grise')?.badge || '12';
  const displayName = (() => {
    const fullName = String(user?.fullName || '').trim();
    if (fullName) return fullName;

    const firstName = String(user?.firstName || '').trim();
    const lastName = String(user?.lastName || '').trim();
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) return combined;

    return String(user?.businessName || t('nav.fournisseur')).trim();
  })();
  const userCity = String(user?.city || user?.profile?.city || '').trim();
  const canRenderAvatarImage = Boolean(userAvatarUrl) && failedAvatarUrl !== userAvatarUrl;

  const sidebarDesktopWidth = isSidebarCollapsed ? 'lg:w-[5.5rem]' : 'lg:w-[20rem]';
  const mobileSidebarHidden = isArabic ? 'translate-x-full' : '-translate-x-full';
  const contentOffset = isSidebarCollapsed
    ? (isArabic ? 'lg:mr-[5.5rem]' : 'lg:ml-[5.5rem]')
    : (isArabic ? 'lg:mr-[20rem]' : 'lg:ml-[20rem]');

  useEffect(() => {
    if (!isMobileSidebarOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-[#f3f5fb] flex">
      <aside
        role="dialog"
        aria-modal={isMobileSidebarOpen ? 'true' : undefined}
        aria-label="Fournisseur navigation"
        className={`fixed top-0 z-40 h-[100dvh] w-[88vw] max-w-[22rem] transform transition-transform duration-300 ease-out lg:h-screen lg:max-w-none ${sidebarDesktopWidth} ${isArabic ? 'right-0' : 'left-0'} ${isMobileSidebarOpen ? 'translate-x-0' : mobileSidebarHidden} lg:translate-x-0`}
      >
        <div className="m-2.5 h-[calc(100dvh-1.25rem)] overflow-hidden lg:m-3 lg:h-[calc(100vh-1.5rem)]">
          <div className="flex h-full flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] lg:hidden">
          <div className={`border-b border-slate-200 ${isSidebarCollapsed ? 'px-2 py-3 lg:px-2' : 'px-4 py-4'}`}>
            <div className="relative mb-3 flex items-center justify-center lg:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`absolute ${isArabic ? 'left-0' : 'right-0'} rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50`}
                title="close-sidebar"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isSidebarCollapsed ? (
              <div className="flex justify-center">
                <button
                  onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                  className="hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 lg:inline-flex"
                  title="toggle-sidebar"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <Link to="/" className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600/90">
                      Workspace fournisseur
                    </p>
                    <p className="mt-1 truncate text-lg font-black tracking-tight text-slate-950">
                      {user?.businessName || user?.fullName || 'Tunimoto'}
                    </p>
                    <p className="mt-1 hidden truncate text-xs text-slate-500 lg:block">
                      Traitement des dossiers et coordination revendeurs
                    </p>
                  </Link>

                  <button
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    className="hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 lg:inline-flex"
                    title="toggle-sidebar"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white shadow-sm">
                    {canRenderAvatarImage ? (
                      <img
                        src={userAvatarUrl}
                        alt={user?.fullName || 'Avatar'}
                        className="h-full w-full object-cover"
                        loading="eager"
                        decoding="async"
                        onError={() => setFailedAvatarUrl(userAvatarUrl || '')}
                      />
                    ) : (
                      getUserInitials()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-slate-900">{user?.fullName || user?.businessName || t('nav.fournisseur')}</p>
                    <p className="truncate text-[13px] text-slate-500">{user?.city || 'Tunisia'}</p>
                  </div>
                </div>

                <div className="mt-3 hidden rounded-[24px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(236,253,245,0.96),_rgba(255,255,255,0.99)_55%,_rgba(236,253,245,0.92))] px-4 py-4 shadow-[0_18px_40px_rgba(5,150,105,0.10)] lg:block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600">
                        Operations center
                      </p>
                      <p className="mt-1 text-base font-black tracking-tight text-slate-950">
                        Pilotage des dossiers fournisseurs
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                      Active
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white bg-white/90 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Revendeurs</p>
                      <p className="mt-1 text-lg font-black text-slate-950">{revendeurCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white bg-white/90 px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Dossiers</p>
                      <p className="mt-1 text-lg font-black text-slate-950">{dossierCount}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-600">
                    Organisez les workspaces revendeurs, suivez les dossiers a traiter et gardez une vision nette des flux entrants.
                  </p>
                </div>

              </>
            )}
          </div>

          <nav className={`flex-1 overflow-y-auto py-4 ${isSidebarCollapsed ? 'px-2' : 'px-3 pb-6'}`}>
            {!isSidebarCollapsed && (
              <div className="mb-3 flex items-center gap-3 px-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Navigation
                </p>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            )}
            <div className="space-y-2">
              {menuItems.map((item) => {
                const active = isActiveRoute(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    onMouseEnter={() => prefetchRouteIntent(item.path)}
                    onFocus={() => prefetchRouteIntent(item.path)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`group flex items-center rounded-2xl border transition-all ${
                      isSidebarCollapsed ? 'justify-center px-0 py-1.5' : 'min-h-[56px] gap-3 px-3 py-3 lg:min-h-0 lg:py-2.5'
                    } ${
                      active
                        ? 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 text-slate-900 shadow-[0_10px_24px_rgba(5,150,105,0.14)]'
                        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                        active
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 group-hover:text-slate-800'
                      }`}
                    >
                      {renderNavIcon(item.icon)}
                    </span>

                    {!isSidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate text-sm font-semibold">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className={`my-5 border-t border-slate-200 ${isSidebarCollapsed ? 'mx-2' : 'mx-1'}`} />

            {!isSidebarCollapsed && (
              <div className="mb-3 flex items-center gap-3 px-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  More
                </p>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            )}
            <div className="space-y-2">
              {secondaryMenuItems.map((item) => {
                const active = isActiveRoute(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    onMouseEnter={() => prefetchRouteIntent(item.path)}
                    onFocus={() => prefetchRouteIntent(item.path)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`group flex items-center rounded-2xl border transition-all ${
                      isSidebarCollapsed ? 'justify-center px-0 py-1.5' : 'min-h-[56px] gap-3 px-3 py-3 lg:min-h-0 lg:py-2.5'
                    } ${
                      active
                        ? 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 text-slate-900 shadow-[0_10px_24px_rgba(5,150,105,0.14)]'
                        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                        active
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 group-hover:text-slate-800'
                      }`}
                    >
                      {renderNavIcon(item.icon)}
                    </span>
                    {!isSidebarCollapsed && <span className="truncate text-sm font-semibold">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className={`border-t border-slate-200 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 ${isSidebarCollapsed ? 'px-2' : 'px-3'}`}>
            {!isSidebarCollapsed && (
              <Link
                to="/fournisseur/support"
                className="mb-3 hidden items-start gap-3 rounded-[24px] border border-slate-200 bg-white px-3 py-3 text-left shadow-[0_16px_28px_rgba(15,23,42,0.06)] transition-colors hover:bg-slate-50 lg:flex"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 1.9-2.9 2.3-2.9 4" />
                    <path d="M12 17h.01" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">Support fournisseur</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">Ouvrez un ticket ou suivez les reponses de l’equipe admin.</span>
                </span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className={`group flex w-full items-center rounded-2xl border border-transparent text-slate-600 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700 ${
                isSidebarCollapsed ? 'justify-center px-0 py-1.5' : 'min-h-[56px] gap-3 px-3 py-3 lg:min-h-0 lg:py-2.5'
              }`}
              title={isSidebarCollapsed ? t('common.logout') : undefined}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors group-hover:text-rose-700">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </span>
              {!isSidebarCollapsed && <span className="text-sm font-medium">{t('common.logout')}</span>}
            </button>
          </div>

          </div>

          <div className="hidden h-full gap-3 lg:flex">
            <div className="flex h-full w-[5.5rem] flex-col items-center rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-950">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3.5l1.8 4.7L18.5 10l-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8L12 3.5z" />
                </svg>
              </div>

              <button
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                title={isSidebarCollapsed ? 'expand-sidebar' : 'collapse-sidebar'}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
                </svg>
              </button>

              <div className="mt-5 flex flex-1 flex-col items-center">
                <div className="flex w-full flex-col items-center gap-2">
                  {menuItems.map((item) => {
                    const active = isActiveRoute(item.path);
                    return (
                      <Link
                        key={`rail-${item.path}`}
                        to={item.path}
                        onMouseEnter={() => prefetchRouteIntent(item.path)}
                        onFocus={() => prefetchRouteIntent(item.path)}
                        title={item.label}
                        className={`group relative flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950'
                        }`}
                      >
                        {renderNavIcon(item.icon)}
                        {item.badge && (
                          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-sky-500 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>

                <div className="my-4 h-10 w-px bg-slate-200" />

                <div className="flex w-full flex-col items-center gap-2">
                  {secondaryMenuItems.map((item) => {
                    const active = isActiveRoute(item.path);
                    return (
                      <Link
                        key={`rail-${item.path}`}
                        to={item.path}
                        onMouseEnter={() => prefetchRouteIntent(item.path)}
                        onFocus={() => prefetchRouteIntent(item.path)}
                        title={item.label}
                        className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950'
                        }`}
                      >
                        {renderNavIcon(item.icon)}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleLogout}
                title={t('common.logout')}
                className="mt-3 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>

              <div className="mt-3 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-700">
                {canRenderAvatarImage ? (
                  <img
                    src={userAvatarUrl}
                    alt={user?.fullName || 'Avatar'}
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                    onError={() => setFailedAvatarUrl(userAvatarUrl || '')}
                  />
                ) : (
                  getUserInitials()
                )}
              </div>
            </div>

            {!isSidebarCollapsed && (
              <div className="flex min-w-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3 pb-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Menu fournisseur</p>
                    <p className="mt-1 truncate text-lg font-bold text-slate-900">Navigation</p>
                  </div>
                  <button
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    title="collapse-sidebar"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <button
                    onClick={() => setShowUserMenu((prev) => !prev)}
                    className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
                  >
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold text-white">
                      {canRenderAvatarImage ? (
                        <img
                          src={userAvatarUrl}
                          alt={user?.fullName || 'Avatar'}
                          className="h-full w-full object-cover"
                          loading="eager"
                          decoding="async"
                          onError={() => setFailedAvatarUrl(userAvatarUrl || '')}
                        />
                      ) : (
                        getUserInitials()
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{displayName}</span>
                      <span className="block truncate text-xs text-slate-500">{userCity || 'Tunisia'}</span>
                    </span>
                    <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <div className="my-3 h-px bg-slate-200" />

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-1.5">
                    {menuItems.map((item) => {
                      const active = isActiveRoute(item.path);
                      return (
                        <Link
                          key={`panel-${item.path}`}
                          to={item.path}
                          onMouseEnter={() => prefetchRouteIntent(item.path)}
                          onFocus={() => prefetchRouteIntent(item.path)}
                          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                            active
                              ? 'bg-slate-100 text-slate-900'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                            {renderNavIcon(item.icon)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="my-3 h-px bg-slate-200" />

                  <div className="space-y-1.5">
                    {secondaryMenuItems.map((item) => {
                      const active = isActiveRoute(item.path);
                      return (
                        <Link
                          key={`panel-${item.path}`}
                          to={item.path}
                          onMouseEnter={() => prefetchRouteIntent(item.path)}
                          onFocus={() => prefetchRouteIntent(item.path)}
                          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                            active
                              ? 'bg-slate-100 text-slate-900'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                            {renderNavIcon(item.icon)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <path d="M16 17l5-5-5-5" />
                        <path d="M21 12H9" />
                      </svg>
                    </span>
                    <span className="text-sm font-medium">{t('common.logout')}</span>
                  </button>

                  <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2">
                    <p className="truncate text-xs font-semibold text-slate-900">{displayName}</p>
                    <p className="truncate text-[11px] text-slate-500">{userCity || 'Tunisia'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className={`min-h-screen flex-1 bg-gradient-to-br from-slate-50 via-[#f8fdfb] to-emerald-50/45 transition-all duration-300 ${contentOffset}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex w-full min-w-0 items-start gap-2 sm:items-center">
              <button
                onClick={() => {
                  if (isSidebarCollapsed) setIsSidebarCollapsed(false);
                  setIsMobileSidebarOpen(true);
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
                title="open-sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="w-full min-w-0 flex-1 sm:max-w-[470px]">
                <Suspense fallback={<HeaderGreetingSkeleton />}>
                  <HeaderGreetingWeatherCard
                    displayName={displayName}
                    city={userCity}
                    isArabic={isArabic}
                    accent="emerald"
                  />
                </Suspense>
              </div>
            </div>

            <div className={`flex w-full items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-end sm:gap-3 ${isArabic ? 'pr-0.5 sm:pr-1' : 'pl-0.5 sm:pl-1'}`}>
              <Link
                to="/fournisseur/support"
                className="hidden h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 sm:inline-flex"
                title="Support"
                aria-label="Support"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6.2 8a6 6 0 0 1 11.6 0" />
                  <path d="M4 10.5A2.5 2.5 0 0 1 6.5 8h.2v6h-.2A2.5 2.5 0 0 1 4 11.5v-1z" />
                  <path d="M20 10.5A2.5 2.5 0 0 0 17.5 8h-.2v6h.2a2.5 2.5 0 0 0 2.5-2.5v-1z" />
                  <path d="M12 18v1a2 2 0 0 1-2 2h-1" />
                </svg>
              </Link>

              <Suspense fallback={<HeaderActionSkeleton />}>
                <NotificationsCenter userType="fournisseur" />
              </Suspense>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                    {canRenderAvatarImage ? (
                      <img
                        src={userAvatarUrl}
                        alt={user?.fullName || 'Avatar'}
                        className="h-full w-full object-cover"
                        loading="eager"
                        decoding="async"
                        onError={() => setFailedAvatarUrl(userAvatarUrl || '')}
                      />
                    ) : (
                      getUserInitials()
                    )}
                  </div>
                  <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className={`absolute mt-2 w-[min(14rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white py-2 shadow-xl ${isArabic ? 'left-0' : 'right-0'}`}>
                    <Link
                      to="/fournisseur/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      {t('common.profile')}
                    </Link>
                    <Link
                      to="/fournisseur/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      {t('common.settings')}
                    </Link>
                    <div className="my-2 border-t border-slate-200" />
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      {t('common.logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-6">
          <Outlet />
        </main>
      </div>

      {isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="close sidebar overlay"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      {showUserMenu && <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />}
    </div>
  );
}

export default FournisseurLayout;
