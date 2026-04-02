import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../../api/axios';
import { useI18n } from '../../context/I18nContext';

const STATUS_COLORS = {
  pending: '#f59e0b',
  docs: '#0ea5e9',
  progress: '#6366f1',
  ready: '#10b981',
  rejected: '#ef4444'
};

const RANGE_OPTIONS = [
  { value: 'today', label: 'Aujourd hui' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette annee' }
];

function extractArray(response) {
  return Array.isArray(response?.data?.data) ? response.data.data : [];
}

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

function formatMoney(value, locale) {
  return `${toNumber(value).toLocaleString(locale || 'fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} TND`;
}

function getRangeStart(range, now) {
  const start = new Date(now);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === 'week') {
    const day = start.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - mondayOffset);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function normalizeCarteStatus(status) {
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'pendingdocuments' || normalized === 'pending') return 'pending';
    if (normalized === 'documentsreceived' || normalized === 'docs_received') return 'docs';
    if (normalized === 'inprogress' || normalized === 'in_progress' || normalized === 'depotantt' || normalized === 'depot_antt') return 'progress';
    if (normalized === 'ready' || normalized === 'completed' || normalized === 'delivered' || normalized === 'livree') return 'ready';
    if (normalized === 'rejected') return 'rejected';
  }

  const value = toNumber(status);
  if (value === 1) return 'docs';
  if (value === 2 || value === 6) return 'progress';
  if (value === 3 || value === 5) return 'ready';
  if (value === 4) return 'rejected';
  return 'pending';
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildLastSixMonths(locale) {
  const now = new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(date),
      label: date.toLocaleDateString(locale || 'fr-FR', { month: 'short' }),
      revenue: 0,
      invoices: 0
    });
  }
  return buckets;
}

function StatsPage() {
  const { locale } = useI18n();
  const [range, setRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [motorcycles, setMotorcycles] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [invoiceRes, clientRes, motorcycleRes] = await Promise.all([
        api.get('/Invoices'),
        api.get('/Clients'),
        api.get('/Motorcycles')
      ]);

      setInvoices(extractArray(invoiceRes));
      setClients(extractArray(clientRes));
      setMotorcycles(extractArray(motorcycleRes));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const scopedInvoices = useMemo(() => {
    const now = new Date();
    const start = getRangeStart(range, now);
    return invoices.filter((invoice) => {
      const candidateDate = parseDate(invoice.invoiceDate || invoice.createdAt || invoice.updatedAt);
      return candidateDate && candidateDate >= start && candidateDate <= now;
    });
  }, [invoices, range]);

  const kpis = useMemo(() => {
    const revenue = scopedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);
    const totalInvoices = scopedInvoices.length;
    const ready = scopedInvoices.filter((invoice) => normalizeCarteStatus(invoice.carteGriseStatus) === 'ready').length;
    const pending = scopedInvoices.filter((invoice) => {
      const status = normalizeCarteStatus(invoice.carteGriseStatus);
      return status === 'pending' || status === 'docs' || status === 'progress';
    }).length;
    const averageTicket = totalInvoices > 0 ? revenue / totalInvoices : 0;
    const completionRate = totalInvoices > 0 ? (ready / totalInvoices) * 100 : 0;
    const activeClients = clients.filter((client) => toNumber(client.status) !== 1).length;
    const stockUnits = motorcycles.reduce((sum, motorcycle) => sum + toNumber(motorcycle.qty), 0);
    const lowStock = motorcycles.filter((motorcycle) => toNumber(motorcycle.qty) <= 2).length;

    return {
      revenue,
      totalInvoices,
      averageTicket,
      completionRate,
      pending,
      activeClients,
      stockUnits,
      lowStock
    };
  }, [clients, motorcycles, scopedInvoices]);

  const monthlyTrend = useMemo(() => {
    const buckets = buildLastSixMonths(locale);
    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    invoices.forEach((invoice) => {
      const date = parseDate(invoice.invoiceDate || invoice.createdAt);
      if (!date) return;
      const key = monthKey(date);
      const bucket = byKey.get(key);
      if (!bucket) return;
      bucket.revenue += toNumber(invoice.totalAmount);
      bucket.invoices += 1;
    });

    return buckets;
  }, [invoices, locale]);

  const statusDistribution = useMemo(() => {
    const totals = {
      pending: 0,
      docs: 0,
      progress: 0,
      ready: 0,
      rejected: 0
    };

    scopedInvoices.forEach((invoice) => {
      totals[normalizeCarteStatus(invoice.carteGriseStatus)] += 1;
    });

    return [
      { key: 'pending', name: 'En attente', value: totals.pending },
      { key: 'docs', name: 'Docs recus', value: totals.docs },
      { key: 'progress', name: 'En cours', value: totals.progress },
      { key: 'ready', name: 'Termines', value: totals.ready },
      { key: 'rejected', name: 'Rejetes', value: totals.rejected }
    ].filter((item) => item.value > 0);
  }, [scopedInvoices]);

  const topBrands = useMemo(() => {
    const counters = new Map();
    scopedInvoices.forEach((invoice) => {
      const sold = Array.isArray(invoice.soldMotorcycles) ? invoice.soldMotorcycles : [];
      sold.forEach((line) => {
        const brand = (line?.brand || line?.company || 'Sans marque').trim();
        counters.set(brand, (counters.get(brand) || 0) + 1);
      });
    });

    return [...counters.entries()]
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [scopedInvoices]);

  const topClients = useMemo(() => {
    const counters = new Map();
    scopedInvoices.forEach((invoice) => {
      const key = `${toNumber(invoice.clientId)}-${invoice.clientFullName || 'Client'}`;
      const current = counters.get(key) || { client: invoice.clientFullName || 'Client', invoices: 0, amount: 0 };
      current.invoices += 1;
      current.amount += toNumber(invoice.totalAmount);
      counters.set(key, current);
    });

    return [...counters.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [scopedInvoices]);

  return (
    <div className="space-y-5 rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40 p-5 sm:p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Revendeur analytics</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Stats Center</h1>
          <p className="mt-1 text-sm text-slate-600">Vue analytique dediee a la performance commerciale et dossiers.</p>
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
            className="w-full rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 sm:w-auto"
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
        <MetricCard label="CA periode" value={loading ? '...' : formatMoney(kpis.revenue, locale)} hint="Total ventes" />
        <MetricCard label="Ventes" value={loading ? '...' : String(kpis.totalInvoices)} hint="Dans la periode" />
        <MetricCard label="Panier moyen" value={loading ? '...' : formatMoney(kpis.averageTicket, locale)} hint="Montant/vente" />
        <MetricCard label="Completion" value={loading ? '...' : `${Math.round(kpis.completionRate)}%`} hint={`${kpis.pending} dossier(s) encore ouverts`} />
        <MetricCard label="Clients actifs" value={loading ? '...' : String(kpis.activeClients)} hint="Base client exploitable" />
        <MetricCard label="Stock total" value={loading ? '...' : String(kpis.stockUnits)} hint={`${kpis.lowStock} alerte(s) stock`} />
        <MetricCard label="Top clients" value={loading ? '...' : String(topClients.length)} hint="Par chiffre d affaires" />
        <MetricCard label="Top marques" value={loading ? '...' : String(topBrands.length)} hint="Par volume vendus" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Evolution 6 mois</h2>
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => value.toLocaleString(locale || 'fr-FR')} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'revenue') {
                      return [formatMoney(value, locale), 'CA'];
                    }
                    return [value, 'Ventes'];
                  }}
                />
                <Bar yAxisId="left" dataKey="invoices" name="invoices" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" name="revenue" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Repartition dossiers</h2>
          <div className="mt-3 h-[260px]">
            {statusDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">Aucune donnee sur la periode</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            {statusDistribution.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1.5">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.key] }} />
                  {entry.name}
                </span>
                <strong className="text-slate-800">{entry.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Top marques vendues</h2>
          <div className="mt-3 h-[260px]">
            {topBrands.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">Aucune vente sur la periode</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBrands} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="brand" width={100} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip formatter={(value) => [value, 'Volume']} />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Top clients (CA)</h2>
          <div className="mt-3 space-y-2">
            {topClients.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm font-medium text-slate-500">
                Aucun client actif sur la periode selectionnee.
              </div>
            ) : (
              topClients.map((client, index) => (
                <div key={`${client.client}-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 px-3 py-2.5 sm:grid-cols-[36px_1fr_auto_auto] sm:items-center sm:gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{client.client}</p>
                    <p className="text-xs text-slate-500">{client.invoices} vente(s)</p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{client.invoices}</span>
                  <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{formatMoney(client.amount, locale)}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

export default StatsPage;
