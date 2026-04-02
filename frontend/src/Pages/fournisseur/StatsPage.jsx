import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../../api/axios';
import { useI18n } from '../../context/I18nContext';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Aujourd hui' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette annee' }
];

const BASE_ANALYTICS = {
  receivedCurrent: 0,
  receivedPrevious: 0,
  completedCurrent: 0,
  completedPrevious: 0,
  completionRateCurrent: 0,
  completionRatePrevious: 0,
  documentsCoverageCurrent: 0,
  documentsCoveragePrevious: 0,
  averageTurnaroundDaysCurrent: 0,
  averageTurnaroundDaysPrevious: 0,
  amountCurrent: 0,
  amountPrevious: 0,
  totalDossiers: 0,
  backlogOpen: 0,
  statusPending: 0,
  statusDocumentsReceived: 0,
  statusInProgress: 0,
  statusCompleted: 0,
  statusRejected: 0,
  connectedRevendeurs: 0,
  incomingPendingPartnerships: 0,
  outgoingPendingPartnerships: 0,
  slaAtRiskOpen: 0,
  slaStuckOpen: 0,
  timeline: [],
  revendeurs: []
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractObject(response) {
  return response?.data?.data && typeof response.data.data === 'object' ? response.data.data : null;
}

function extractArray(response) {
  return Array.isArray(response?.data?.data) ? response.data.data : [];
}

function formatMoney(value, locale) {
  return `${toNumber(value).toLocaleString(locale || 'fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} TND`;
}

function delta(current, previous, digits = 0) {
  const diff = toNumber(current) - toNumber(previous);
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(digits)}`;
}

function toneClass(isPositive) {
  return isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
}

function normalizeCarteStatus(status) {
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'pendingdocuments' || normalized === 'pending') return 'pending';
    if (normalized === 'documentsreceived' || normalized === 'docs_received') return 'docs';
    if (normalized === 'inprogress' || normalized === 'in_progress' || normalized === 'depotantt' || normalized === 'depot_antt') return 'progress';
    if (normalized === 'ready' || normalized === 'completed' || normalized === 'delivered' || normalized === 'livree') return 'done';
    if (normalized === 'rejected') return 'rejected';
  }

  const value = toNumber(status);
  if (value === 1) return 'docs';
  if (value === 2 || value === 6) return 'progress';
  if (value === 3 || value === 5) return 'done';
  if (value === 4) return 'rejected';
  return 'pending';
}

function statusLabel(status) {
  if (status === 'done') return 'Termine';
  if (status === 'progress') return 'En cours';
  if (status === 'docs') return 'Docs recus';
  if (status === 'rejected') return 'Rejete';
  return 'En attente';
}

function statusTone(status) {
  if (status === 'done') return 'bg-emerald-100 text-emerald-700';
  if (status === 'progress') return 'bg-blue-100 text-blue-700';
  if (status === 'docs') return 'bg-cyan-100 text-cyan-700';
  if (status === 'rejected') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
}

function StatsPage() {
  const { locale } = useI18n();
  const [range, setRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsRaw, setAnalyticsRaw] = useState(null);
  const [dossiersRaw, setDossiersRaw] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [analyticsRes, dossiersRes] = await Promise.all([
        api.get(`/Invoices/fournisseur/dashboard?range=${range}`),
        api.get('/Invoices/fournisseur/carte-grise')
      ]);

      setAnalyticsRaw(extractObject(analyticsRes));
      setDossiersRaw(extractArray(dossiersRes));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Impossible de charger les statistiques fournisseur.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const analytics = useMemo(() => ({ ...BASE_ANALYTICS, ...(analyticsRaw || {}) }), [analyticsRaw]);

  const kpis = useMemo(() => ({
    received: toNumber(analytics.receivedCurrent),
    receivedPrev: toNumber(analytics.receivedPrevious),
    completed: toNumber(analytics.completedCurrent),
    completedPrev: toNumber(analytics.completedPrevious),
    completionRate: toNumber(analytics.completionRateCurrent),
    completionRatePrev: toNumber(analytics.completionRatePrevious),
    coverage: toNumber(analytics.documentsCoverageCurrent),
    coveragePrev: toNumber(analytics.documentsCoveragePrevious),
    turnaround: toNumber(analytics.averageTurnaroundDaysCurrent),
    turnaroundPrev: toNumber(analytics.averageTurnaroundDaysPrevious),
    amount: toNumber(analytics.amountCurrent),
    amountPrev: toNumber(analytics.amountPrevious),
    connected: toNumber(analytics.connectedRevendeurs),
    backlog: toNumber(analytics.backlogOpen),
    atRisk: toNumber(analytics.slaAtRiskOpen),
    stuck: toNumber(analytics.slaStuckOpen),
    incoming: toNumber(analytics.incomingPendingPartnerships),
    outgoing: toNumber(analytics.outgoingPendingPartnerships)
  }), [analytics]);

  const trendData = useMemo(
    () =>
      (Array.isArray(analytics.timeline) ? analytics.timeline : []).map((point, index) => ({
        id: index,
        label: parseDate(point?.bucketStartUtc)?.toLocaleDateString(locale || 'fr-FR', {
          month: 'short',
          day: 'numeric'
        }) || '-',
        received: toNumber(point?.receivedCount),
        completed: toNumber(point?.completedCount),
        rejected: toNumber(point?.rejectedCount),
        amount: toNumber(point?.amountReceived)
      })),
    [analytics.timeline, locale]
  );

  const workflowData = useMemo(
    () => [
      { label: 'En attente', value: toNumber(analytics.statusPending), color: '#f59e0b' },
      { label: 'Docs recus', value: toNumber(analytics.statusDocumentsReceived), color: '#06b6d4' },
      { label: 'En cours', value: toNumber(analytics.statusInProgress), color: '#6366f1' },
      { label: 'Termines', value: toNumber(analytics.statusCompleted), color: '#10b981' },
      { label: 'Rejetes', value: toNumber(analytics.statusRejected), color: '#ef4444' }
    ],
    [analytics]
  );

  const topRevendeurs = useMemo(
    () =>
      (Array.isArray(analytics.revendeurs) ? analytics.revendeurs : [])
        .map((item) => ({
          revendeurId: toNumber(item?.revendeurId),
          businessName: item?.businessName || `Revendeur #${toNumber(item?.revendeurId)}`,
          city: item?.city || '-',
          totalDossiers: toNumber(item?.totalDossiers),
          totalAmount: toNumber(item?.totalAmount),
          completionRate: toNumber(item?.completionRate)
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 7),
    [analytics.revendeurs]
  );

  const recentDossiers = useMemo(
    () =>
      dossiersRaw
        .map((invoice) => {
          const sold = Array.isArray(invoice?.soldMotorcycles) ? invoice.soldMotorcycles[0] : null;
          return {
            invoiceId: toNumber(invoice?.invoiceId),
            invoiceNumber: invoice?.invoiceNumber || '-',
            revendeurName: invoice?.revendeurBusinessName || `Revendeur #${toNumber(invoice?.revendeurId)}`,
            clientName: invoice?.clientFullName || '-',
            motorcycle: sold ? `${sold.brand || '-'} ${sold.model || '-'}`.trim() : '-',
            status: normalizeCarteStatus(invoice?.carteGriseStatus),
            totalAmount: toNumber(invoice?.totalAmount),
            updatedAt: parseDate(invoice?.updatedAt || invoice?.invoiceDate || invoice?.createdAt)
          };
        })
        .sort((a, b) => {
          const left = a.updatedAt ? a.updatedAt.getTime() : 0;
          const right = b.updatedAt ? b.updatedAt.getTime() : 0;
          return right - left;
        })
        .slice(0, 8),
    [dossiersRaw]
  );

  return (
    <div className="space-y-5 rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-emerald-50/30 to-cyan-50/30 p-5 sm:p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Fournisseur analytics</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Stats Hub</h1>
          <p className="mt-1 text-sm text-slate-600">Vue analytique du reseau revendeurs et du pipeline cartes grises.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:w-auto"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadData}
            className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto"
          >
            Rafraichir
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Dossiers recus" value={loading ? '...' : String(kpis.received)} deltaLabel={delta(kpis.received, kpis.receivedPrev)} positive={kpis.received >= kpis.receivedPrev} />
        <MetricCard label="Dossiers termines" value={loading ? '...' : String(kpis.completed)} deltaLabel={delta(kpis.completed, kpis.completedPrev)} positive={kpis.completed >= kpis.completedPrev} />
        <MetricCard label="Completion rate" value={loading ? '...' : `${Math.round(kpis.completionRate)}%`} deltaLabel={`${delta(kpis.completionRate, kpis.completionRatePrev)} pts`} positive={kpis.completionRate >= kpis.completionRatePrev} />
        <MetricCard label="Montant traite" value={loading ? '...' : formatMoney(kpis.amount, locale)} deltaLabel={formatMoney(kpis.amount - kpis.amountPrev, locale)} positive={kpis.amount >= kpis.amountPrev} />
        <MetricCard label="Couverture docs" value={loading ? '...' : `${Math.round(kpis.coverage)}%`} deltaLabel={`${delta(kpis.coverage, kpis.coveragePrev)} pts`} positive={kpis.coverage >= kpis.coveragePrev} />
        <MetricCard label="Temps moyen" value={loading ? '...' : `${kpis.turnaround.toFixed(1)} j`} deltaLabel={`${delta(kpis.turnaround, kpis.turnaroundPrev, 1)} j`} positive={kpis.turnaround <= kpis.turnaroundPrev} />
        <MetricCard label="Revendeurs connectes" value={loading ? '...' : String(kpis.connected)} deltaLabel={`${kpis.incoming} entrant / ${kpis.outgoing} sortant`} positive />
        <MetricCard label="Risque SLA" value={loading ? '...' : `${kpis.atRisk + kpis.stuck}`} deltaLabel={`${kpis.atRisk} a risque, ${kpis.stuck} bloques`} positive={kpis.atRisk + kpis.stuck === 0} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Timeline operationnelle</h2>
          <div className="mt-3 h-[280px]">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">Aucune donnee timeline</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="received" stroke="#0ea5e9" fill="url(#receivedFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#completedFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Workflow dossiers</h2>
          <div className="mt-3 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workflowData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {workflowData.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Top revendeurs (montant)</h2>
          <div className="mt-3 h-[280px]">
            {topRevendeurs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">Aucun revendeur a afficher</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRevendeurs} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="businessName" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-22} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip formatter={(value) => [formatMoney(value, locale), 'Montant']} />
                  <Bar dataKey="totalAmount" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Dossiers recents</h2>
          <div className="mt-3 space-y-2">
            {recentDossiers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm font-medium text-slate-500">
                Aucun dossier recent.
              </div>
            ) : (
              recentDossiers.map((dossier) => (
                <div key={dossier.invoiceId} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 px-3 py-2.5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{dossier.invoiceNumber} - {dossier.clientName}</p>
                    <p className="truncate text-xs text-slate-500">{dossier.revendeurName} | {dossier.motorcycle}</p>
                    <p className="text-[11px] text-slate-400">{dossier.updatedAt ? dossier.updatedAt.toLocaleString(locale || 'fr-FR') : '-'}</p>
                  </div>
                  <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusTone(dossier.status)}`}>{statusLabel(dossier.status)}</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{formatMoney(dossier.totalAmount, locale)}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricCard({ label, value, deltaLabel, positive }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${toneClass(positive)}`}>{deltaLabel}</span>
      </div>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </article>
  );
}

export default StatsPage;
