import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '../../api/axios';

const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '2', label: 'Inactive' },
  { value: '3', label: 'Suspended' }
];

const ROLE_OPTIONS = [
  { value: '', label: 'Tous roles' },
  { value: 'Revendeur', label: 'Revendeur' },
  { value: 'Fournisseur', label: 'Fournisseur' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Client', label: 'Client' }
];

function extractData(response, fallback) {
  return response?.data?.data ?? fallback;
}

function normalizeStatusLabel(value) {
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase();
    if (key === 'active') return 'Active';
    if (key === 'inactive') return 'Inactive';
    if (key === 'suspended') return 'Suspended';
  }

  if (Number(value) === 2) return 'Inactive';
  if (Number(value) === 3) return 'Suspended';
  return 'Active';
}

function statusToValue(statusLabel) {
  const normalized = normalizeStatusLabel(statusLabel);
  if (normalized === 'Inactive') return '2';
  if (normalized === 'Suspended') return '3';
  return '1';
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('fr-FR');
}

function AdminUsersPage() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    canLogin: ''
  });
  const [rowDrafts, setRowDrafts] = useState({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = Number(filters.status);
      if (filters.canLogin === 'yes') params.canLogin = true;
      if (filters.canLogin === 'no') params.canLogin = false;

      const [overviewRes, usersRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/users', { params })
      ]);

      setOverview(extractData(overviewRes, null));
      const loadedUsers = Array.isArray(extractData(usersRes, [])) ? extractData(usersRes, []) : [];
      setUsers(loadedUsers);
      setRowDrafts({});
    } catch (error) {
      const message = error?.response?.data?.message || 'Impossible de charger les donnees admin.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters.canLogin, filters.role, filters.search, filters.status]);

  useEffect(() => {
    load();
  }, [load]);

  const getDraft = (user) => {
    const existing = rowDrafts[user.userId];
    if (existing) return existing;
    return {
      status: statusToValue(user.status),
      canLogin: Boolean(user.canLogin)
    };
  };

  const updateDraft = (userId, patch) => {
    setRowDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        ...patch
      }
    }));
  };

  const saveUser = async (user) => {
    const draft = getDraft(user);
    try {
      setSavingUserId(user.userId);
      await api.patch(`/admin/users/${user.userId}`, {
        status: Number(draft.status),
        canLogin: Boolean(draft.canLogin)
      });
      toast.success(`Utilisateur ${user.fullName} mis a jour.`);
      await load();
    } catch (error) {
      const message = error?.response?.data?.message || 'Mise a jour impossible.';
      toast.error(message);
    } finally {
      setSavingUserId(null);
    }
  };

  const cards = useMemo(() => ([
    { label: 'Total users', value: overview?.totalUsers ?? 0 },
    { label: 'Active', value: overview?.activeUsers ?? 0 },
    { label: 'Suspended', value: overview?.suspendedUsers ?? 0 },
    { label: 'No login', value: overview?.usersCannotLogin ?? 0 },
    { label: 'Total invoices', value: overview?.totalInvoices ?? 0 },
    { label: 'Open dossiers', value: overview?.openCarteGriseDossiers ?? 0 }
  ]), [overview]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Gestion des utilisateurs</h2>
            <p className="text-sm text-slate-600">Controle des comptes, statut et acces login.</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {loading ? 'Chargement...' : 'Rafraichir'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
              <p className="mt-1 text-xl font-black text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <input
            type="text"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Rechercher nom, email, entreprise..."
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={filters.role}
            onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tous statuts</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={filters.canLogin}
            onChange={(event) => setFilters((prev) => ({ ...prev, canLogin: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Login: Tous</option>
            <option value="yes">Login autorise</option>
            <option value="no">Login bloque</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Filtrer
          </button>
        </div>

        <div className="mt-4 space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Chargement...</div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Aucun utilisateur.</div>
          ) : users.map((user) => {
            const draft = getDraft(user);
            return (
              <article key={`mobile-${user.userId}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-900">{user.fullName}</p>
                    <p className="truncate text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs text-slate-500">{user.phone || '-'}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {user.role}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Entreprise</span>
                    <span className="text-right font-semibold text-slate-900">{user.businessName || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Ville</span>
                    <span className="text-right font-semibold text-slate-900">{user.city || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Fiscal</span>
                    <span className="text-right font-semibold text-slate-900">{user.taxId || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Derniere connexion</span>
                    <span className="text-right font-semibold text-slate-900">{formatDateTime(user.lastLoginAt)}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <select
                    value={draft.status}
                    onChange={(event) => updateDraft(user.userId, { status: event.target.value })}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.canLogin)}
                      onChange={(event) => updateDraft(user.userId, { canLogin: event.target.checked })}
                    />
                    Autorise le login
                  </label>
                  <button
                    type="button"
                    onClick={() => saveUser(user)}
                    disabled={savingUserId === user.userId}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingUserId === user.userId ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Utilisateur</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Role</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Entreprise</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Statut</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Login</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Derniere connexion</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">Chargement...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">Aucun utilisateur.</td>
                </tr>
              ) : users.map((user) => {
                const draft = getDraft(user);
                return (
                  <tr key={user.userId}>
                    <td className="px-3 py-3 align-top">
                      <p className="font-semibold text-slate-900">{user.fullName}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      <p className="text-xs text-slate-500">{user.phone || '-'}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-slate-800">{user.businessName || '-'}</p>
                      <p className="text-xs text-slate-500">{user.city || '-'}</p>
                      <p className="text-xs text-slate-500">{user.taxId || '-'}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <select
                        value={draft.status}
                        onChange={(event) => updateDraft(user.userId, { status: event.target.value })}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.canLogin)}
                          onChange={(event) => updateDraft(user.userId, { canLogin: event.target.checked })}
                        />
                        Autorise
                      </label>
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-600">
                      {formatDateTime(user.lastLoginAt)}
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => saveUser(user)}
                        disabled={savingUserId === user.userId}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {savingUserId === user.userId ? 'Sauvegarde...' : 'Sauvegarder'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminUsersPage;
