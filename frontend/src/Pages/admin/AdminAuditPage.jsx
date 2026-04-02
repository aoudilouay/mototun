import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '../../api/axios';

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes actions' },
  { value: '0', label: 'InvoiceCreated' },
  { value: '1', label: 'InvoiceStatusUpdated' },
  { value: '2', label: 'CarteGriseStatusUpdated' },
  { value: '3', label: 'DossierSentToFournisseur' },
  { value: '4', label: 'DocumentUploadedByRevendeur' },
  { value: '5', label: 'DocumentUploadedByFournisseur' },
  { value: '6', label: 'DocumentIssueUpdated' },
  { value: '7', label: 'ClientMessageUpdated' },
  { value: '8', label: 'DossierEmailSent' },
  { value: '9', label: 'DocumentValidationChecklistUpdated' },
  { value: '10', label: 'DocumentValidationChecklistPublishedToClient' }
];

const ROLE_OPTIONS = [
  { value: '', label: 'Tous roles' },
  { value: 'Revendeur', label: 'Revendeur' },
  { value: 'Fournisseur', label: 'Fournisseur' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Client', label: 'Client' }
];

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('fr-FR');
}

function buildParams(filters) {
  const params = {};
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.userId.trim()) params.userId = Number(filters.userId);
  if (filters.invoiceId.trim()) params.invoiceId = Number(filters.invoiceId);
  if (filters.action) params.action = Number(filters.action);
  if (filters.actorRole) params.actorRole = filters.actorRole;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  params.take = Number(filters.take) || 200;
  return params;
}

function AdminAuditPage() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    invoiceId: '',
    action: '',
    actorRole: '',
    from: '',
    to: '',
    take: '200'
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/audit', { params: buildParams(filters) });
      const payload = response?.data?.data ?? {};
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setSummary(payload.summary || null);
    } catch (error) {
      const message = error?.response?.data?.message || 'Impossible de charger l audit.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await api.get('/admin/audit/export', {
        params: buildParams(filters),
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-audit-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export audit telecharge.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Export audit impossible.';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const cards = useMemo(() => ([
    { label: 'Total events', value: summary?.totalEvents ?? 0 },
    { label: 'Returned', value: summary?.returnedEvents ?? 0 },
    { label: 'Distinct invoices', value: summary?.distinctInvoices ?? 0 },
    { label: 'Distinct actors', value: summary?.distinctActors ?? 0 }
  ]), [summary]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Audit Dossiers</h2>
            <p className="text-sm text-slate-600">Historique complet des actions sur les dossiers carte grise.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {loading ? 'Chargement...' : 'Rafraichir'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {exporting ? 'Export...' : 'Exporter CSV'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
              <p className="mt-1 text-xl font-black text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 md:grid-cols-2">
          <p>Premier event: {formatDateTime(summary?.firstEventAt)}</p>
          <p>Dernier event: {formatDateTime(summary?.lastEventAt)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <input
            type="text"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Recherche titre, message, client, invoice..."
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={filters.userId}
            onChange={(event) => setFilters((prev) => ({ ...prev, userId: event.target.value }))}
            placeholder="Actor user ID"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={filters.invoiceId}
            onChange={(event) => setFilters((prev) => ({ ...prev, invoiceId: event.target.value }))}
            placeholder="Invoice ID"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={filters.actorRole}
            onChange={(event) => setFilters((prev) => ({ ...prev, actorRole: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={filters.action}
            onChange={(event) => setFilters((prev) => ({ ...prev, action: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm lg:col-span-2"
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={filters.take}
            onChange={(event) => setFilters((prev) => ({ ...prev, take: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="100">100 lignes</option>
            <option value="200">200 lignes</option>
            <option value="500">500 lignes</option>
            <option value="1000">1000 lignes</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Filtrer
          </button>
          <button
            type="button"
            onClick={() => setFilters({
              search: '',
              userId: '',
              invoiceId: '',
              action: '',
              actorRole: '',
              from: '',
              to: '',
              take: '200'
            })}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reinitialiser
          </button>
        </div>

        <div className="mt-4 space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Chargement...</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Aucun event.</div>
          ) : items.map((item) => (
            <article key={`mobile-${item.eventId}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.eventType}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                  #{item.invoiceId}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span>Date</span>
                  <span className="text-right font-semibold text-slate-900">{formatDateTime(item.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Actor</span>
                  <span className="text-right font-semibold text-slate-900">{item.actorFullName || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Role</span>
                  <span className="text-right font-semibold text-slate-900">{item.actorRole || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Client</span>
                  <span className="text-right font-semibold text-slate-900">{item.clientName || '-'}</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Message</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{item.message || '-'}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Date</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Action</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Actor</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Invoice</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Chargement...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Aucun event.</td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.eventId}>
                  <td className="px-3 py-3 align-top text-xs text-slate-600">
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="text-xs font-bold text-slate-900">{item.eventType}</p>
                    <p className="text-xs text-slate-600">{item.title}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="text-xs font-semibold text-slate-900">{item.actorFullName || '-'}</p>
                    <p className="text-xs text-slate-500">{item.actorEmail || '-'}</p>
                    <p className="text-xs text-slate-500">ID {item.actorUserId || '-'} | {item.actorRole || '-'}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="text-xs font-semibold text-slate-900">#{item.invoiceId} ({item.invoiceNumber})</p>
                    <p className="text-xs text-slate-500">{item.clientName || '-'}</p>
                    <p className="text-xs text-slate-500">{item.revendeurBusinessName || '-'} / {item.fournisseurBusinessName || '-'}</p>
                  </td>
                  <td className="px-3 py-3 align-top text-xs text-slate-700">
                    <p className="max-w-xl whitespace-pre-wrap break-words">{item.message || '-'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminAuditPage;
