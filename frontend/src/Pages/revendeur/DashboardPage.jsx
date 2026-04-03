import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  Wallet,
  RefreshCw,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Target,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import api from '../../api/axios';
import LiveCalendarPanel from '../../components/LiveCalendarPanel';
import { useI18n } from '../../context/I18nContext';
import {
  clientsQueryOptions,
  getApiErrorMessage,
  motorcyclesQueryOptions,
  revendeurFournisseursDirectoryQueryOptions,
  revendeurInvoicesQueryOptions,
} from '../../lib/appQueries';

const SALES_TARGET_MONTH = 20;

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} TND`;
}

function normalizeClientStatus(status) {
  if (typeof status === 'string') {
    return status.trim().toLowerCase() === 'missing' ? 'missing' : 'active';
  }

  return Number(status) === 1 ? 'missing' : 'active';
}

function normalizeCarteGriseStatus(status) {
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'pendingdocuments' || normalized === 'pending') return 'pending';
    if (normalized === 'documentsreceived' || normalized === 'docs_received') return 'docs_received';
    if (normalized === 'inprogress' || normalized === 'in_progress' || normalized === 'depotantt' || normalized === 'depot_antt') return 'in_progress';
    if (normalized === 'ready' || normalized === 'completed') return 'ready';
    if (normalized === 'delivered' || normalized === 'livree') return 'ready';
    if (normalized === 'rejected') return 'rejected';
  }

  switch (Number(status)) {
    case 1:
      return 'docs_received';
    case 2:
    case 6:
      return 'in_progress';
    case 3:
      return 'ready';
    case 4:
      return 'rejected';
    case 5:
      return 'ready';
    default:
      return 'pending';
  }
}

function normalizeInvoiceStatus(status) {
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'paid') return 'paid';
    if (normalized === 'cancelled') return 'cancelled';
    return 'draft';
  }

  if (Number(status) === 1) return 'paid';
  if (Number(status) === 2) return 'cancelled';
  return 'draft';
}

function normalizePartnershipStatus(status) {
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'accepted' || normalized === 'active' || normalized === 'connected') return 'accepted';
    if (normalized === 'pending') return 'pending';
    if (normalized === 'rejected') return 'rejected';
    if (normalized === 'blocked') return 'blocked';
    return 'unknown';
  }

  switch (Number(status)) {
    case 1:
      return 'accepted';
    case 0:
      return 'pending';
    case 2:
      return 'rejected';
    case 3:
      return 'blocked';
    default:
      return 'unknown';
  }
}

function getCurrentRangeStart(timeRange, now) {
  const start = new Date(now);

  if (timeRange === 'today') {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (timeRange === 'week') {
    const day = start.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - mondayOffset);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (timeRange === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getPreviousRangeStart(timeRange, currentRangeStart) {
  const previousStart = new Date(currentRangeStart);

  if (timeRange === 'today') {
    previousStart.setDate(previousStart.getDate() - 1);
    return previousStart;
  }

  if (timeRange === 'week') {
    previousStart.setDate(previousStart.getDate() - 7);
    return previousStart;
  }

  if (timeRange === 'year') {
    previousStart.setFullYear(previousStart.getFullYear() - 1);
    return previousStart;
  }

  previousStart.setMonth(previousStart.getMonth() - 1);
  return previousStart;
}

function inRange(dateValue, startInclusive, endExclusive) {
  const date = parseDate(dateValue);
  if (!date) return false;
  return date >= startInclusive && date < endExclusive;
}

function sumTotal(invoices) {
  return invoices.reduce((acc, item) => acc + (Number(item.totalAmount) || 0), 0);
}

function formatPercentDelta(current, previous) {
  if (previous <= 0) {
    if (current <= 0) return { label: '0%', positive: true };
    return { label: '+100%', positive: true };
  }

  const diff = ((current - previous) / previous) * 100;
  const rounded = Math.round(diff);
  return {
    label: `${rounded > 0 ? '+' : ''}${rounded}%`,
    positive: rounded >= 0
  };
}

function formatCountDelta(current, previous) {
  const diff = current - previous;
  return {
    label: `${diff > 0 ? '+' : ''}${diff}`,
    positive: diff >= 0
  };
}

function formatRelativeTime(value, t, locale) {
  const date = parseDate(value);
  if (!date) return '-';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return t('notifications.relative.now');
  if (diffMs < 60 * 60 * 1000) return t('notifications.relative.min', { count: Math.floor(diffMs / (60 * 1000)) });
  if (diffMs < 24 * 60 * 60 * 1000) return t('notifications.relative.hour', { count: Math.floor(diffMs / (60 * 60 * 1000)) });
  if (diffMs < 7 * 24 * 60 * 60 * 1000) return t('notifications.relative.day', { count: Math.floor(diffMs / (24 * 60 * 60 * 1000)) });

  return date.toLocaleDateString(locale);
}

function extractFileName(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(contentDisposition);
  if (!match?.[1]) return fallback;
  return decodeURIComponent(match[1].replace(/"/g, '').trim());
}

const HIGHLIGHT_STYLES = {
  paid: { icon: Building2, iconBg: 'bg-teal-100', iconColor: 'text-teal-600', border: 'border-teal-200', bg: 'bg-teal-50/50' },
  draft: { icon: FileText, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50/50' },
  ready: { icon: CheckCircle2, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50/50' },
  stock: { icon: AlertTriangle, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50/50' },
};

const HIGHLIGHT_FALLBACK = { icon: BarChart3, iconBg: 'bg-slate-100', iconColor: 'text-slate-600', border: 'border-slate-200', bg: 'bg-white' };

function getActionIcon(badgeClass) {
  if (badgeClass.includes('cyan')) return <FileText className="h-4 w-4 text-cyan-500" />;
  if (badgeClass.includes('emerald')) return <Wallet className="h-4 w-4 text-emerald-500" />;
  if (badgeClass.includes('blue')) return <Users className="h-4 w-4 text-blue-500" />;
  if (badgeClass.includes('rose')) return <XCircle className="h-4 w-4 text-rose-500" />;
  if (badgeClass.includes('amber')) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Clock className="h-4 w-4 text-slate-400" />;
}

function DashboardPage() {
  const [timeRange, setTimeRange] = useState('month');
  const [exporting, setExporting] = useState('');
  const { t, locale } = useI18n();
  const invoicesQuery = useQuery(revendeurInvoicesQueryOptions());
  const clientsQuery = useQuery(clientsQueryOptions());
  const motorcyclesQuery = useQuery(motorcyclesQueryOptions());
  const fournisseursQuery = useQuery(revendeurFournisseursDirectoryQueryOptions());

  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);
  const motorcycles = useMemo(() => motorcyclesQuery.data ?? [], [motorcyclesQuery.data]);
  const fournisseurs = useMemo(() => fournisseursQuery.data ?? [], [fournisseursQuery.data]);

  const loading = invoicesQuery.isLoading && clientsQuery.isLoading && motorcyclesQuery.isLoading && fournisseursQuery.isLoading;
  const invoicesReady = Boolean(invoicesQuery.data);
  const clientsReady = Boolean(clientsQuery.data);
  const motorcyclesReady = Boolean(motorcyclesQuery.data);
  const fournisseursReady = Boolean(fournisseursQuery.data);
  const invoiceDrivenLoading = !invoicesReady;
  const clientDrivenLoading = !clientsReady;
  const highlightLoading = !invoicesReady || !motorcyclesReady || !fournisseursReady;
  const activityLoading = !invoicesReady || !clientsReady || !motorcyclesReady;
  const error = (() => {
    const queryError = [invoicesQuery.error, clientsQuery.error, motorcyclesQuery.error, fournisseursQuery.error]
      .find(Boolean);

    return queryError ? getApiErrorMessage(queryError, 'Certaines informations du dashboard n ont pas pu etre chargees.') : '';
  })();

  const refreshDashboard = useCallback(async () => {
    await Promise.allSettled([
      invoicesQuery.refetch(),
      clientsQuery.refetch(),
      motorcyclesQuery.refetch(),
      fournisseursQuery.refetch(),
    ]);
  }, [clientsQuery, fournisseursQuery, invoicesQuery, motorcyclesQuery]);

  const handleExport = useCallback(async (type) => {
    try {
      setExporting(type);
      const response = await api.get('/Invoices/revendeur/dashboard/export', {
        params: { range: timeRange, type },
        responseType: 'blob'
      });

      const fallback = `revendeur_${type}_${timeRange}.csv`;
      const fileName = extractFileName(response.headers?.['content-disposition'], fallback);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = error?.response?.data?.message || "Export impossible pour l'instant.";
      toast.error(message);
    } finally {
      setExporting('');
    }
  }, [timeRange]);

  const rangeLabel = useMemo(() => {
    const map = {
      today: t('dashboard.range.today'),
      week: t('dashboard.range.week'),
      month: t('dashboard.range.month'),
      year: t('dashboard.range.year')
    };
    return map[timeRange] || map.month;
  }, [timeRange, t]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentStart = getCurrentRangeStart(timeRange, now);
    const previousStart = getPreviousRangeStart(timeRange, currentStart);

    const currentInvoices = invoices.filter((invoice) =>
      inRange(invoice.invoiceDate || invoice.createdAt, currentStart, now)
    );

    const previousInvoices = invoices.filter((invoice) =>
      inRange(invoice.invoiceDate || invoice.createdAt, previousStart, currentStart)
    );

    const pendingCurrent = invoices.filter((invoice) => {
      const status = normalizeCarteGriseStatus(invoice.carteGriseStatus);
      return status === 'pending' || status === 'docs_received' || status === 'in_progress';
    }).length;

    const pendingPrevious = invoices.filter((invoice) => {
      const updatedAt = invoice.updatedAt || invoice.createdAt || invoice.invoiceDate;
      const status = normalizeCarteGriseStatus(invoice.carteGriseStatus);
      const isPending = status === 'pending' || status === 'docs_received' || status === 'in_progress';
      return isPending && inRange(updatedAt, previousStart, currentStart);
    }).length;

    const activeClientsCurrent = clients.filter((client) => normalizeClientStatus(client.status) !== 'missing').length;
    const activeClientsPrevious = clients.filter((client) =>
      normalizeClientStatus(client.status) !== 'missing'
      && inRange(client.createdAt, previousStart, currentStart)
    ).length;

    const salesCurrent = currentInvoices.length;
    const salesPrevious = previousInvoices.length;

    const revenueCurrent = sumTotal(currentInvoices);
    const revenuePrevious = sumTotal(previousInvoices);

    return {
      salesCurrent,
      salesDelta: formatPercentDelta(salesCurrent, salesPrevious),
      activeClientsCurrent,
      activeClientsDelta: formatCountDelta(activeClientsCurrent, activeClientsPrevious),
      pendingCurrent,
      pendingDelta: formatCountDelta(pendingCurrent, pendingPrevious),
      revenueCurrent,
      revenueDelta: formatPercentDelta(revenueCurrent, revenuePrevious)
    };
  }, [clients, invoices, timeRange]);

  const monthPerformance = useMemo(() => {
    const now = new Date();
    const monthStart = getCurrentRangeStart('month', now);
    const monthSales = invoices.filter((invoice) => inRange(invoice.invoiceDate || invoice.createdAt, monthStart, now)).length;
    const progress = Math.min(100, Math.round((monthSales / SALES_TARGET_MONTH) * 100));

    return {
      monthSales,
      progress
    };
  }, [invoices]);

  const highlightCards = useMemo(() => {
    const draftInvoices = invoices.filter((invoice) => normalizeInvoiceStatus(invoice.status) === 'draft');
    const readyDossiers = invoices.filter((invoice) => normalizeCarteGriseStatus(invoice.carteGriseStatus) === 'ready');
    const lowStockCount = motorcycles.filter((motorcycle) => Number(motorcycle.qty || 0) <= 2).length;
    const hasPartnershipStatus = fournisseurs.some((item) => item?.status !== null && item?.status !== undefined && item?.status !== '');
    const connectedFournisseursCount = fournisseurs.filter((item) => normalizePartnershipStatus(item?.status) === 'accepted').length;
    const fournisseurCount = hasPartnershipStatus ? connectedFournisseursCount : fournisseurs.length;

    return [
      {
        id: 'paid',
        title: t('nav.fournisseurs'),
        value: String(fournisseurCount),
        subtitle: t('dashboard.metrics.operations', { count: fournisseurCount }),
        delta: { label: fournisseurCount > 0 ? `+${fournisseurCount}` : '0', positive: fournisseurCount > 0 }
      },
      {
        id: 'draft',
        title: t('dashboard.metrics.inProgressInvoices'),
        value: String(draftInvoices.length),
        subtitle: t('dashboard.metrics.toFinalize'),
        delta: stats.salesDelta
      },
      {
        id: 'ready',
        title: t('dashboard.metrics.readyCarteGrise'),
        value: String(readyDossiers.length),
        subtitle: t('dashboard.metrics.dossiersFinalized'),
        delta: stats.pendingDelta
      },
      {
        id: 'stock',
        title: t('dashboard.metrics.stockAlerts'),
        value: String(lowStockCount),
        subtitle: t('dashboard.metrics.lowStockCount'),
        delta: { label: lowStockCount > 0 ? `+${lowStockCount}` : '0', positive: lowStockCount === 0 }
      }
    ];
  }, [fournisseurs, invoices, motorcycles, stats.pendingDelta, stats.salesDelta, t]);

  const recentActions = useMemo(() => {
    const actions = [];

    invoices.forEach((invoice) => {
      const eventDate = parseDate(invoice.updatedAt || invoice.createdAt || invoice.invoiceDate);
      if (!eventDate) return;

      const invoiceStatus = normalizeInvoiceStatus(invoice.status);
      const carteStatus = normalizeCarteGriseStatus(invoice.carteGriseStatus);
      const clientName = invoice.clientFullName || 'Client';
      const invoiceNumber = invoice.invoiceNumber || `${invoice.invoiceId || invoice.id || '-'}`;

      if (carteStatus === 'ready') {
        actions.push({
          id: `cg-${invoice.invoiceId || invoice.id}`,
          date: eventDate,
          title: t('dashboard.actions.carteReady'),
          detail: `${clientName} - ${invoiceNumber}`,
          badge: t('dashboard.actionTypes.carteGrise'),
          badgeClass: 'bg-cyan-100 text-cyan-700',
          route: '/revendeur/carte-grise'
        });
        return;
      }

      if (invoiceStatus === 'paid') {
        actions.push({
          id: `paid-${invoice.invoiceId || invoice.id}`,
          date: eventDate,
          title: t('dashboard.actions.invoicePaid'),
          detail: `${invoiceNumber} - ${clientName}`,
          badge: t('dashboard.actionTypes.payment'),
          badgeClass: 'bg-emerald-100 text-emerald-700',
          route: '/revendeur/invoices'
        });
        return;
      }

      actions.push({
        id: `invoice-${invoice.invoiceId || invoice.id}`,
        date: eventDate,
        title: t('dashboard.actions.invoiceCreated'),
        detail: `${invoiceNumber} - ${clientName}`,
        badge: t('dashboard.actionTypes.invoice'),
        badgeClass: 'bg-slate-100 text-slate-700',
        route: '/revendeur/invoices'
      });
    });

    clients.forEach((client) => {
      const eventDate = parseDate(client.createdAt);
      if (!eventDate) return;

      actions.push({
        id: `client-${client.clientId || client.id}`,
        date: eventDate,
        title: t('dashboard.actions.clientAdded'),
        detail: `${client.fullName || '-'} (${client.cin || '-'})`,
        badge: t('dashboard.actionTypes.client'),
        badgeClass: 'bg-blue-100 text-blue-700',
        route: '/revendeur/clients'
      });
    });

    motorcycles.forEach((motorcycle) => {
      const qty = Number(motorcycle.qty || 0);
      if (qty > 2) return;

      const eventDate = parseDate(motorcycle.updatedAt || motorcycle.createdAt);
      if (!eventDate) return;

      actions.push({
        id: `stock-${motorcycle.motorcycleId || motorcycle.id}`,
        date: eventDate,
        title: qty <= 0 ? t('dashboard.actions.stockOut') : t('dashboard.actions.stockLow'),
        detail: `${motorcycle.company || '-'} ${motorcycle.brand || '-'} ${motorcycle.model || '-'} (qty: ${qty})`,
        badge: t('dashboard.actionTypes.stock'),
        badgeClass: qty <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700',
        route: '/revendeur/motorcycles'
      });
    });

    return actions
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 8);
  }, [clients, invoices, motorcycles, t]);

  const expensePanel = useMemo(() => {
    const buckets = {
      paid: 0,
      draft: 0,
      pending: 0,
      cancelled: 0
    };

    invoices.forEach((invoice) => {
      const amount = Math.abs(Number(invoice.totalAmount || 0));
      const invoiceStatus = normalizeInvoiceStatus(invoice.status);
      const carteStatus = normalizeCarteGriseStatus(invoice.carteGriseStatus);

      if (invoiceStatus === 'paid') {
        buckets.paid += amount;
        return;
      }

      if (invoiceStatus === 'cancelled') {
        buckets.cancelled += amount;
        return;
      }

      if (carteStatus === 'pending' || carteStatus === 'docs_received' || carteStatus === 'in_progress') {
        buckets.pending += amount;
        return;
      }

      buckets.draft += amount;
    });

    const items = [
      { id: 'paid', label: t('dashboard.expenseBuckets.paid'), value: buckets.paid, color: '#0f766e' },
      { id: 'draft', label: t('dashboard.expenseBuckets.draft'), value: buckets.draft, color: '#0284c7' },
      { id: 'pending', label: t('dashboard.expenseBuckets.pending'), value: buckets.pending, color: '#f59e0b' },
      { id: 'cancelled', label: t('dashboard.expenseBuckets.cancelled'), value: buckets.cancelled, color: '#ef4444' }
    ];

    const total = items.reduce((acc, item) => acc + item.value, 0);

    let cursor = 0;
    const parts = items.map((item) => {
      const percent = total > 0 ? (item.value / total) * 100 : 0;
      const start = cursor;
      cursor += percent;
      return {
        ...item,
        percent,
        gradient: `${item.color} ${start}% ${cursor}%`
      };
    });

    const now = new Date();
    const dayStart = getCurrentRangeStart('today', now);
    const weekStart = getCurrentRangeStart('week', now);
    const monthStart = getCurrentRangeStart('month', now);

    const daily = sumTotal(invoices.filter((invoice) => inRange(invoice.invoiceDate || invoice.createdAt, dayStart, now)));
    const weekly = sumTotal(invoices.filter((invoice) => inRange(invoice.invoiceDate || invoice.createdAt, weekStart, now)));
    const monthly = sumTotal(invoices.filter((invoice) => inRange(invoice.invoiceDate || invoice.createdAt, monthStart, now)));

    return {
      total,
      parts,
      gradient: total > 0 ? `conic-gradient(${parts.map((part) => part.gradient).join(', ')})` : 'conic-gradient(#cbd5e1 0 100%)',
      daily,
      weekly,
      monthly
    };
  }, [invoices, t]);

  const missingClientCount = useMemo(
    () => clients.filter((client) => normalizeClientStatus(client.status) === 'missing').length,
    [clients]
  );

  const calendarEvents = useMemo(
    () =>
      recentActions.map((action) => ({
        id: action.id,
        title: action.title,
        message: action.detail,
        at: action.date,
        link: action.route
      })),
    [recentActions]
  );

  const todayActionCount = useMemo(() => {
    const start = getCurrentRangeStart('today', new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return recentActions.filter((action) => action.date >= start && action.date < end).length;
  }, [recentActions]);

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes panel-enter {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header ── */}
      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        style={{ animation: 'panel-enter 400ms ease-out both' }}
      >
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-4 sm:px-6 py-6 sm:py-7 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t('dashboard.title')}</h1>
              <p className="mt-1.5 text-sm text-slate-300">
                {t('dashboard.subtitle', { range: rangeLabel })}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t('dashboard.availableFunds')}</p>
              {invoiceDrivenLoading ? (
                <div className="mt-1 h-9 w-40 animate-pulse rounded-lg bg-white/10" />
              ) : (
                <p className="mt-1 text-3xl font-black tracking-tight">{formatMoney(stats.revenueCurrent)}</p>
              )}
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                stats.revenueDelta.positive
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}>
                <TrendingUp className="h-3 w-3" />
                {stats.revenueDelta.label}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <FileText className="h-3 w-3" />
              {stats.salesCurrent} vente(s)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Users className="h-3 w-3" />
              {stats.activeClientsCurrent} client(s)
            </span>
            {stats.pendingCurrent > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-xs font-medium text-amber-200">
                <Clock className="h-3 w-3" />
                {stats.pendingCurrent} en cours
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-medium text-emerald-200">
              <Target className="h-3 w-3" />
              {t('dashboard.monthlyGoal', { value: monthPerformance.progress })}
            </span>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:text-slate-900"
            >
              <option value="today">{t('dashboard.select.today')}</option>
              <option value="week">{t('dashboard.select.week')}</option>
              <option value="month">{t('dashboard.select.month')}</option>
              <option value="year">{t('dashboard.select.year')}</option>
            </select>
            <button
              onClick={refreshDashboard}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${invoicesQuery.isFetching || clientsQuery.isFetching || motorcyclesQuery.isFetching || fournisseursQuery.isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </button>
            <button
              onClick={() => handleExport('kpi')}
              disabled={exporting === 'kpi'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
            >
              <Download className="h-3 w-3" />
              {exporting === 'kpi' ? 'Export...' : 'KPI CSV'}
            </button>
            <button
              onClick={() => handleExport('dossiers')}
              disabled={exporting === 'dossiers'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
            >
              <Download className="h-3 w-3" />
              {exporting === 'dossiers' ? 'Export...' : 'Dossiers CSV'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* ── KPI Stat Cards ── */}
      <div
        className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4"
        style={{ animation: 'panel-enter 480ms ease-out both' }}
      >
        {/* Ventes */}
        <article className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-4 w-4 text-blue-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-blue-400">Ventes</p>
              {invoiceDrivenLoading ? (
                <div className="h-5 w-12 animate-pulse rounded bg-blue-100" />
              ) : (
                <p className="text-lg font-bold text-blue-700 leading-tight">{stats.salesCurrent}</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">{rangeLabel}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              stats.salesDelta.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {stats.salesDelta.label}
            </span>
          </div>
        </article>

        {/* Clients */}
        <article className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Users className="h-4 w-4 text-slate-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Clients actifs</p>
              {clientDrivenLoading ? (
                <div className="h-5 w-12 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="text-lg font-bold text-slate-900 leading-tight">{stats.activeClientsCurrent}</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">{rangeLabel}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              stats.activeClientsDelta.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {stats.activeClientsDelta.label}
            </span>
          </div>
        </article>

        {/* En cours */}
        <article className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-4 w-4 text-amber-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-500">Dossiers en cours</p>
              {invoiceDrivenLoading ? (
                <div className="h-5 w-12 animate-pulse rounded bg-amber-100" />
              ) : (
                <p className="text-lg font-bold text-amber-700 leading-tight">{stats.pendingCurrent}</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">{rangeLabel}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              stats.pendingDelta.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {stats.pendingDelta.label}
            </span>
          </div>
        </article>

        {/* CA */}
        <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-500">CA periode</p>
              {invoiceDrivenLoading ? (
                <div className="h-5 w-20 animate-pulse rounded bg-emerald-100" />
              ) : (
                <p className="text-sm font-bold text-emerald-700 leading-tight truncate">{formatMoney(stats.revenueCurrent)}</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">{rangeLabel}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              stats.revenueDelta.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {stats.revenueDelta.label}
            </span>
          </div>
        </article>
      </div>

      {/* ── Account + Priority ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Account card */}
        <section
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3"
          style={{ animation: 'panel-enter 540ms ease-out both' }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('dashboard.mainAccount')}</p>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{t('common.live')}</span>
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('dashboard.accountName')}</h2>
                <p className="mt-0.5 text-xs text-slate-400">{t('dashboard.accountSync')}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t('dashboard.availableFunds')}</p>
                {invoiceDrivenLoading ? (
                  <div className="mt-1 h-8 w-36 animate-pulse rounded-lg bg-slate-100" />
                ) : (
                  <p className="mt-0.5 text-2xl font-black text-slate-900">{formatMoney(stats.revenueCurrent)}</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                to="/revendeur/invoices"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
              >
                <FileText className="h-4 w-4" />
                {t('dashboard.createInvoice')}
              </Link>
              <Link
                to="/revendeur/carte-grise"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                {t('dashboard.followDossiers')}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Monthly progress bar */}
            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <p className="text-xs font-semibold text-slate-600">Objectif mensuel</p>
                </div>
                <p className="text-xs font-bold text-slate-700">
                  {monthPerformance.monthSales}/{SALES_TARGET_MONTH}
                </p>
              </div>
              <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out"
                  style={{ width: `${monthPerformance.progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-[11px] font-semibold text-blue-600">
                {monthPerformance.progress}% atteint
              </p>
            </div>
          </div>
        </section>

        {/* Priority card */}
        <section
          className="relative overflow-hidden rounded-2xl border border-teal-700/30 bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-700 p-5 text-white shadow-sm xl:col-span-2"
          style={{ animation: 'panel-enter 620ms ease-out both' }}
        >
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-white/10" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">{t('dashboard.priority')}</p>
            <h3 className="mt-2 text-xl font-bold">{t('dashboard.remindersTitle')}</h3>
            <p className="mt-2 text-sm text-teal-100 leading-relaxed">
              {t('dashboard.remindersText', { pending: stats.pendingCurrent, missing: missingClientCount })}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                to="/revendeur/carte-grise"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-700 transition hover:bg-teal-50"
              >
                {t('dashboard.openCarte')}
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/revendeur/clients"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t('dashboard.verifyClients')}
              </Link>
            </div>

            {/* Quick counts */}
            <div className="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-[11px] font-medium text-teal-200">En attente</p>
                <p className="text-lg font-bold">{stats.pendingCurrent}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-[11px] font-medium text-teal-200">Clients manquants</p>
                <p className="text-lg font-bold">{missingClientCount}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Highlight Cards ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {highlightCards.map((card, index) => {
          const hs = HIGHLIGHT_STYLES[card.id] || HIGHLIGHT_FALLBACK;
          const Icon = hs.icon;
          return (
            <article
              key={card.id}
              className={`rounded-xl border ${hs.border} ${hs.bg} p-3.5 shadow-sm`}
              style={{ animation: `panel-enter ${680 + index * 60}ms ease-out both` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${hs.iconBg}`}>
                    <Icon className={`h-4 w-4 ${hs.iconColor}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{card.title}</p>
                    {highlightLoading ? (
                      <div className="h-5 w-12 animate-pulse rounded bg-slate-100" />
                    ) : (
                      <p className="text-lg font-bold text-slate-900 leading-tight">{card.value}</p>
                    )}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  card.delta.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {card.delta.label}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{card.subtitle}</p>
            </article>
          );
        })}
      </div>

      {/* ── Recent Actions + Expenses ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Recent Actions */}
        <section
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3"
          style={{ animation: 'panel-enter 850ms ease-out both' }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('dashboard.recentActions')}</p>
            <Link
              to="/revendeur/invoices"
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {t('dashboard.seeAll')}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-4 sm:p-5">
            {activityLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : recentActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Clock className="h-7 w-7 text-slate-300" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-600">{t('dashboard.noRecentActions')}</p>
                <p className="mt-1 text-xs text-slate-400">Vos dernieres actions apparaitront ici.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActions.map((action) => (
                  <Link
                    to={action.route}
                    key={action.id}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 transition-colors group-hover:bg-white">
                      {getActionIcon(action.badgeClass)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{action.title}</p>
                        <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${action.badgeClass}`}>
                          {action.badge}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">{action.detail}</p>
                    </div>

                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-[11px] font-semibold text-slate-600">{action.date.toLocaleDateString(locale)}</p>
                      <p className="text-[10px] text-slate-400">{formatRelativeTime(action.date, t, locale)}</p>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Expenses */}
        <section
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2"
          style={{ animation: 'panel-enter 920ms ease-out both' }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('dashboard.expenses')}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('common.live')}
            </span>
          </div>

          <div className="p-5">
            {/* Quick stats */}
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.quickStats.daily')}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{formatMoney(expensePanel.daily)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.quickStats.weekly')}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{formatMoney(expensePanel.weekly)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.quickStats.monthly')}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{formatMoney(expensePanel.monthly)}</p>
              </div>
            </div>

            {/* Donut chart + legend */}
            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <div
                className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full shadow-inner"
                style={{ background: expensePanel.gradient }}
              >
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.total')}</p>
                  <p className="mt-0.5 text-lg font-black text-slate-900">{formatMoney(expensePanel.total)}</p>
                </div>
              </div>

              <div className="w-full space-y-2.5">
                {expensePanel.parts.map((part) => (
                  <div key={part.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: part.color }} />
                      <span className="truncate text-sm font-medium text-slate-700">{part.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{formatMoney(part.value)}</span>
                      <span className="w-10 text-right text-[11px] font-semibold text-slate-400">
                        {part.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Calendar ── */}
      <LiveCalendarPanel
        locale={locale}
        title="Calendrier live"
        subtitle="Vue calendrier en direct de vos actions et rappels."
        events={calendarEvents}
        loading={activityLoading}
        primary={{ label: 'Valeur du jour', value: formatMoney(expensePanel.daily) }}
        secondary={{ label: 'Actions aujourd hui', value: String(todayActionCount) }}
        accent="teal"
      />
    </div>
  );
}

export default DashboardPage;
