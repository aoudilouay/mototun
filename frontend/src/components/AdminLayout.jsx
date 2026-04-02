import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menu = [
    { path: '/admin/users', label: 'Utilisateurs' },
    { path: '/admin/audit', label: 'Audit dossiers' },
    { path: '/admin/support', label: 'Support' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo imageClassName="h-10 w-auto rounded-lg border border-slate-200" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">TuniMoto</p>
            </div>
          </div>
          <div className="min-w-0 flex-1 px-0 sm:px-2">
            <h1 className="text-xl font-black text-slate-900">Admin Console</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              {user?.fullName || user?.email || 'Admin'}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Deconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block lg:space-y-2 lg:overflow-visible">
            {menu.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
