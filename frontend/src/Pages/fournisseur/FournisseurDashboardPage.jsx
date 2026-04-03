import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../api/axios';
import LiveCalendarPanel from '../../components/LiveCalendarPanel';
import { ChartPanelsSkeleton } from '../../components/loading/RouteSkeletons';
import { useI18n } from '../../context/I18nContext';

const FournisseurDashboardCharts = lazy(() => import('../../components/fournisseur/FournisseurDashboardCharts'));

const CG = { pending: 'pending', docs: 'docs_received', progress: 'in_progress', done: 'completed', rejected: 'rejected' };
const PARTNER = { pending: 'pending', accepted: 'accepted', rejected: 'rejected', blocked: 'blocked' };

const EMPTY_ANALYTICS = {
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
  partnershipsAcceptedCurrent: 0,
  partnershipsAcceptedPrevious: 0,
  connectedRevendeurs: 0,
  incomingPendingPartnerships: 0,
  outgoingPendingPartnerships: 0,
  backlogOpen: 0,
  documentsCompleteTotal: 0,
  slaAtRiskOpen: 0,
  slaStuckOpen: 0,
  slaEscalationsLast30Days: 0,
  totalDossiers: 0,
  amountCurrent: 0,
  statusPending: 0,
  statusDocumentsReceived: 0,
  statusInProgress: 0,
  statusCompleted: 0,
  statusRejected: 0,
  timeline: [],
  revendeurs: []
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const extractArr = (res) => (Array.isArray(res?.data?.data) ? res.data.data : []);
const extractObj = (res) => (res?.data?.data && typeof res.data.data === 'object' ? res.data.data : null);
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmtDate = (v, locale) => {
  const d = parseDate(v);
  return d ? d.toLocaleDateString(locale || 'fr-FR') : '-';
};
const fmtDateTime = (v, locale) => {
  const d = parseDate(v);
  return d ? d.toLocaleString(locale || 'fr-FR') : '-';
};
const fmtMoney = (v, locale) => `${num(v).toLocaleString(locale || 'fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} TND`;
const delta = (a, b, digits = 0) => `${a - b >= 0 ? '+' : ''}${(a - b).toFixed(digits)}`;
const deltaRate = (a, b) => `${a - b >= 0 ? '+' : ''}${Math.round(a - b)} pts`;
const tone = (good) => (good ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700');
const rangeLabel = (r) => (r === 'today' ? "aujourd hui" : r === 'week' ? 'cette semaine' : r === 'year' ? 'cette annee' : 'ce mois');

function normalizeCg(v) {
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'pendingdocuments' || s === 'pending') return CG.pending;
    if (s === 'documentsreceived' || s === 'docs_received') return CG.docs;
    if (s === 'inprogress' || s === 'in_progress' || s === 'depotantt' || s === 'depot_antt') return CG.progress;
    if (s === 'ready' || s === 'completed') return CG.done;
    if (s === 'delivered' || s === 'livree') return CG.done;
    if (s === 'rejected') return CG.rejected;
  }
  if (num(v) === 6) return CG.progress;
  if (num(v) === 5) return CG.done;
  return [CG.pending, CG.docs, CG.progress, CG.done, CG.rejected][num(v)] || CG.pending;
}

function normalizePartner(v) {
  if (typeof v === 'string') return v.trim().toLowerCase();
  return [PARTNER.pending, PARTNER.accepted, PARTNER.rejected, PARTNER.blocked][num(v)] || PARTNER.pending;
}

function statusMeta(status) {
  if (status === CG.done) return { label: 'Termine', rail: 'from-emerald-500 to-teal-500' };
  if (status === CG.progress) return { label: 'En cours', rail: 'from-blue-500 to-cyan-500' };
  if (status === CG.docs) return { label: 'Documents recus', rail: 'from-indigo-500 to-blue-600' };
  if (status === CG.rejected) return { label: 'Rejete', rail: 'from-rose-500 to-red-500' };
  return { label: 'En attente', rail: 'from-amber-500 to-orange-500' };
}

function extractFileName(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(contentDisposition);
  if (!match?.[1]) return fallback;
  return decodeURIComponent(match[1].replace(/"/g, '').trim());
}

function FournisseurDashboardPage() {
  const { locale } = useI18n();
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [analyticsRaw, setAnalyticsRaw] = useState(null);
  const [invoicesRaw, setInvoicesRaw] = useState([]);
  const [sentRaw, setSentRaw] = useState([]);
  const [receivedRaw, setReceivedRaw] = useState([]);
  const [notificationsRaw, setNotificationsRaw] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const req = await Promise.allSettled([
      api.get(`/Invoices/fournisseur/dashboard?range=${timeRange}`),
      api.get('/Invoices/fournisseur/carte-grise'),
      api.get('/partnership-requests/sent'),
      api.get('/partnership-requests/received')
    ]);
    const [a, inv, sent, received] = req;
    setAnalyticsRaw(a.status === 'fulfilled' ? extractObj(a.value) : null);
    setInvoicesRaw(inv.status === 'fulfilled' ? extractArr(inv.value) : []);
    setSentRaw(sent.status === 'fulfilled' ? extractArr(sent.value) : []);
    setReceivedRaw(received.status === 'fulfilled' ? extractArr(received.value) : []);
    const fail = req.find((x) => x.status === 'rejected');
    if (fail) setError('Certaines informations n ont pas pu etre chargees.');
    setLastSync(new Date().toISOString());
    setLoading(false);

    api
      .get('/Notifications')
      .then((response) => {
        setNotificationsRaw(extractArr(response));
      })
      .catch(() => {
        setNotificationsRaw([]);
      });
  }, [timeRange]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const analytics = useMemo(() => ({ ...EMPTY_ANALYTICS, ...(analyticsRaw || {}) }), [analyticsRaw]);

  const revendeurMap = useMemo(() => {
    const map = new Map();
    (analytics.revendeurs || []).forEach((r) => map.set(num(r.revendeurId), r));
    return map;
  }, [analytics.revendeurs]);

  const dossiers = useMemo(() => invoicesRaw.map((i) => {
    const sold = Array.isArray(i?.soldMotorcycles) ? i.soldMotorcycles[0] : null;
    const rid = num(i?.revendeurId);
    const rev = revendeurMap.get(rid);
    return {
      invoiceId: num(i?.invoiceId),
      invoiceNumber: i?.invoiceNumber || '-',
      revendeurName: rev?.businessName || (rid > 0 ? `Revendeur #${rid}` : 'Revendeur'),
      clientName: i?.clientFullName || '-',
      motorcycle: sold ? `${sold.brand || '-'} ${sold.model || '-'}`.trim() : '-',
      status: normalizeCg(i?.carteGriseStatus),
      totalAmount: num(i?.totalAmount),
      docsComplete: Boolean(i?.isCinUploaded && i?.isDeclarationUploaded && i?.isFactureUploaded),
      sentAt: i?.sentToFournisseurAt || i?.invoiceDate || i?.createdAt || null,
      updatedAt: i?.updatedAt || i?.createdAt || null
    };
  }), [invoicesRaw, revendeurMap]);

  const partnershipEvents = useMemo(() => [...sentRaw, ...receivedRaw].map((p) => ({
    id: num(p?.requestId),
    name: p?.revendeurBusinessName || `Revendeur #${num(p?.revendeurId)}`,
    status: normalizePartner(p?.status),
    at: p?.respondedAt || p?.updatedAt || p?.createdAt || null
  })), [sentRaw, receivedRaw]);

  const activity = useMemo(() => {
    const d = dossiers.map((x) => ({
      id: `d-${x.invoiceId}`,
      title: `Dossier ${x.invoiceNumber}`,
      msg: `${x.revendeurName} - ${x.clientName} - ${statusMeta(x.status).label}`,
      at: x.updatedAt || x.sentAt,
      link: '/fournisseur/carte-grise'
    }));
    const p = partnershipEvents.map((x) => ({
      id: `p-${x.id}`,
      title: `Partenariat ${x.id}`,
      msg: `${x.name} - ${x.status}`,
      at: x.at,
      link: '/fournisseur/revendeurs'
    }));
    const n = notificationsRaw.map((x, idx) => ({
      id: `n-${x?.notificationId || idx}`,
      title: x?.title || 'Notification',
      msg: x?.message || 'Mise a jour',
      at: x?.createdAt || null,
      link: '/fournisseur/carte-grise'
    }));
    return [...d, ...p, ...n].filter((x) => parseDate(x.at)).sort((a, b) => parseDate(b.at) - parseDate(a.at)).slice(0, 10);
  }, [dossiers, partnershipEvents, notificationsRaw]);

  const trend = useMemo(() => (analytics.timeline || []).map((pt, idx) => ({
    id: idx,
    label: fmtDate(pt?.bucketStartUtc, locale),
    received: num(pt?.receivedCount),
    completed: num(pt?.completedCount),
    rejected: num(pt?.rejectedCount),
    amount: num(pt?.amountReceived)
  })), [analytics.timeline, locale]);

  const topRevendeurs = useMemo(() => [...(analytics.revendeurs || [])]
    .map((r) => ({ ...r, totalDossiers: num(r?.totalDossiers), totalAmount: num(r?.totalAmount), completionRate: num(r?.completionRate) }))
    .sort((a, b) => b.totalDossiers - a.totalDossiers || b.totalAmount - a.totalAmount)
    .slice(0, 6), [analytics.revendeurs]);

  const workflow = useMemo(() => {
    const total = Math.max(1, num(analytics.totalDossiers));
    const list = [
      { id: CG.pending, c: num(analytics.statusPending) },
      { id: CG.docs, c: num(analytics.statusDocumentsReceived) },
      { id: CG.progress, c: num(analytics.statusInProgress) },
      { id: CG.done, c: num(analytics.statusCompleted) },
      { id: CG.rejected, c: num(analytics.statusRejected) }
    ];
    return list.map((x) => ({ ...x, ...statusMeta(x.id), pct: Math.round((x.c / total) * 100) }));
  }, [analytics]);

  const stats = useMemo(() => ({
    received: num(analytics.receivedCurrent),
    receivedPrev: num(analytics.receivedPrevious),
    completed: num(analytics.completedCurrent),
    completedPrev: num(analytics.completedPrevious),
    completionRate: num(analytics.completionRateCurrent),
    completionRatePrev: num(analytics.completionRatePrevious),
    turnaround: num(analytics.averageTurnaroundDaysCurrent),
    turnaroundPrev: num(analytics.averageTurnaroundDaysPrevious),
    docsCoverage: num(analytics.documentsCoverageCurrent),
    docsCoveragePrev: num(analytics.documentsCoveragePrevious),
    partnershipsAccepted: num(analytics.partnershipsAcceptedCurrent),
    partnershipsAcceptedPrev: num(analytics.partnershipsAcceptedPrevious),
    connected: num(analytics.connectedRevendeurs),
    incoming: num(analytics.incomingPendingPartnerships),
    outgoing: num(analytics.outgoingPendingPartnerships),
    backlog: num(analytics.backlogOpen),
    slaAtRisk: num(analytics.slaAtRiskOpen),
    slaStuck: num(analytics.slaStuckOpen),
    slaEscalations: num(analytics.slaEscalationsLast30Days),
    docsCompleteTotal: num(analytics.documentsCompleteTotal),
    totalDossiers: num(analytics.totalDossiers),
    amountCurrent: num(analytics.amountCurrent)
  }), [analytics]);

  const calendarEvents = useMemo(
    () =>
      activity.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.msg,
        at: item.at,
        link: item.link
      })),
    [activity]
  );

  const todayCalendarValue = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const todayDossiers = dossiers.filter((dossier) => {
      const at = parseDate(dossier.updatedAt || dossier.sentAt);
      return at && at >= start && at < end;
    });

    return {
      count: todayDossiers.length,
      amount: todayDossiers.reduce((total, dossier) => total + num(dossier.totalAmount), 0)
    };
  }, [dossiers]);

  const handleExport = useCallback(async (type) => {
    try {
      setExporting(type);
      const response = await api.get('/Invoices/fournisseur/dashboard/export', {
        params: { range: timeRange, type },
        responseType: 'blob'
      });

      const fallback = `fournisseur_${type}_${timeRange}.csv`;
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
    } catch (requestError) {
      const message = requestError?.response?.data?.message || "Export impossible pour l'instant.";
      toast.error(message);
    } finally {
      setExporting('');
    }
  }, [timeRange]);

  const onExportKpi = useCallback(() => handleExport('kpi'), [handleExport]);
  const onExportDossiers = useCallback(() => handleExport('dossiers'), [handleExport]);
  const onExportRevendeurs = useCallback(() => handleExport('revendeurs'), [handleExport]);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[#edf4f1] p-4 sm:p-6" style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
      <div className="relative space-y-4">
        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Espace fournisseur</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Tableau de bord fournisseur</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">Vue simple des dossiers carte grise {rangeLabel(timeRange)}.</p>
            <p className="mt-2 text-xs text-slate-500">Derniere mise a jour: {fmtDateTime(lastSync, locale)}</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm sm:w-auto">
              <option value="today">Aujourd hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette annee</option>
            </select>
            <button onClick={load} className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto">
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
            <button onClick={onExportKpi} disabled={loading || exporting === 'kpi'} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50 sm:w-auto">{exporting === 'kpi' ? 'Preparation...' : 'Telecharger resume'}</button>
            <button onClick={onExportDossiers} disabled={loading || dossiers.length === 0 || exporting === 'dossiers'} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50 sm:w-auto">{exporting === 'dossiers' ? 'Preparation...' : 'Telecharger dossiers'}</button>
            <button onClick={onExportRevendeurs} disabled={loading || topRevendeurs.length === 0 || exporting === 'revendeurs'} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50 sm:w-auto">{exporting === 'revendeurs' ? 'Preparation...' : 'Telecharger revendeurs'}</button>
          </div>
        </section>

        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{error}</div>}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reseau partenaire</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{stats.connected}</p>
                <p className="text-xs text-slate-500">revendeur(s) connecte(s)</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Mini label="Demandes recues" value={stats.incoming} />
                <Mini label="Demandes envoyees" value={stats.outgoing} />
                <Mini label="Dossiers en attente" value={stats.backlog} />
                <Mini label="Documents complets" value={`${stats.docsCompleteTotal}/${stats.totalDossiers || 0}`} />
                <Mini label="Dossiers urgents" value={stats.slaAtRisk} />
                <Mini label="Dossiers bloques" value={stats.slaStuck} />
              </div>
            </div>
            <div className="mt-4 h-px bg-slate-200" />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link to="/fournisseur/revendeurs" className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">Ouvrir revendeurs</Link>
              <Link to="/fournisseur/carte-grise" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Ouvrir dossiers carte grise</Link>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Volume {fmtMoney(stats.amountCurrent, locale)}</span>
            </div>
          </article>
          <article className="rounded-3xl border border-teal-700/30 bg-gradient-to-br from-teal-700 via-emerald-700 to-cyan-700 p-5 text-white shadow-sm xl:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Resume rapide</p>
            <p className="mt-2 text-2xl font-black">{Math.round(stats.completionRate)}% finalises</p>
            <p className="mt-2 text-sm text-emerald-100">{stats.completed} dossier(s) termines sur {stats.received} recus.</p>
            <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-white/20 bg-white/10 p-3"><p className="opacity-80">Temps moyen</p><p className="mt-1 text-lg font-bold">{stats.turnaround.toFixed(1)} j</p></div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-3"><p className="opacity-80">Documents recus</p><p className="mt-1 text-lg font-bold">{Math.round(stats.docsCoverage)}%</p></div>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Kpi label="Dossiers recus" value={stats.received} detail={rangeLabel(timeRange)} deltaLabel={delta(stats.received, stats.receivedPrev)} ok={stats.received >= stats.receivedPrev} />
          <Kpi label="Dossiers termines" value={stats.completed} detail={rangeLabel(timeRange)} deltaLabel={delta(stats.completed, stats.completedPrev)} ok={stats.completed >= stats.completedPrev} />
          <Kpi label="Taux de dossiers finalises" value={`${Math.round(stats.completionRate)}%`} detail="Finalises / recus" deltaLabel={deltaRate(stats.completionRate, stats.completionRatePrev)} ok={stats.completionRate >= stats.completionRatePrev} />
          <Kpi label="Temps moyen" value={`${stats.turnaround.toFixed(1)} j`} detail="Pour dossiers finalises" deltaLabel={delta(stats.turnaround, stats.turnaroundPrev, 1)} ok={stats.turnaround <= stats.turnaroundPrev} />
          <Kpi label="Couverture documents" value={`${Math.round(stats.docsCoverage)}%`} detail="Tous les papiers obligatoires" deltaLabel={deltaRate(stats.docsCoverage, stats.docsCoveragePrev)} ok={stats.docsCoverage >= stats.docsCoveragePrev} />
          <Kpi label="Partenariats acceptes" value={stats.partnershipsAccepted} detail={rangeLabel(timeRange)} deltaLabel={delta(stats.partnershipsAccepted, stats.partnershipsAcceptedPrev)} ok={stats.partnershipsAccepted >= stats.partnershipsAcceptedPrev} />
        </section>

        <LiveCalendarPanel
          locale={locale}
          title="Calendrier"
          subtitle="Vue des dossiers, partenaires et messages."
          events={calendarEvents}
          loading={loading}
          primary={{ label: 'Dossiers aujourd hui', value: String(todayCalendarValue.count) }}
          secondary={{ label: 'Montant du jour', value: fmtMoney(todayCalendarValue.amount, locale) }}
          accent="emerald"
        />

        <Suspense fallback={<ChartPanelsSkeleton />}>
          <FournisseurDashboardCharts trend={trend} locale={locale} timeRange={timeRange} />
        </Suspense>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-black text-slate-900">Etat des dossiers</h2><span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{stats.totalDossiers} dossier(s)</span></div>
            <div className="space-y-3">
              {workflow.map((x) => (
                <div key={x.id}>
                  <div className="mb-1 flex items-center justify-between text-sm"><span className="font-semibold text-slate-700">{x.label}</span><span className="text-xs font-semibold text-slate-500">{x.c} ({x.pct}%)</span></div>
                  <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full bg-gradient-to-r ${x.rail}`} style={{ width: `${x.pct}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-black text-slate-900">Top revendeurs (nombre de dossiers)</h2><Link to="/fournisseur/revendeurs" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Voir annuaire</Link></div>
            <div className="space-y-2">
              {topRevendeurs.map((r, idx) => (
                <div key={`${r.revendeurId || idx}`} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 px-3 py-2 sm:grid-cols-[34px_1fr_auto_auto] sm:items-center sm:gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">{idx + 1}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{r.businessName || '-'}</p><p className="truncate text-xs text-slate-500">{r.city || '-'}</p></div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{num(r.totalDossiers)} dossier(s)</span>
                  <span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{fmtMoney(r.totalAmount, locale)}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-black text-slate-900">Activite recente</h2><span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">Recente</span></div>
            <div className="space-y-2">
              {activity.map((x) => (
                <Link key={x.id} to={x.link} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50 sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
                  <div><p className="text-xs font-semibold text-slate-900">{fmtDate(x.at, locale)}</p></div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{x.title}</p><p className="truncate text-xs text-slate-500">{x.msg}</p></div>
                </Link>
              ))}
            </div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h2 className="text-lg font-black text-slate-900">Actions prioritaires</h2>
            <div className="mt-4 space-y-3">
              <Action title="Traiter demandes revendeurs" subtitle={`${stats.incoming} demande(s) en attente`} cta="Ouvrir revendeurs" to="/fournisseur/revendeurs" />
              <Action title="Traiter dossiers en attente" subtitle={`${stats.backlog} en attente - ${stats.slaStuck} bloques`} cta="Ouvrir carte grise" to="/fournisseur/carte-grise" />
              <Action title="Verifier dossiers finalises" subtitle={`${num(analytics.statusCompleted)} dossier(s) finalises`} cta="Verifier documents" to="/fournisseur/carte-grise" />
              <Action title="Problemes des 30 derniers jours" subtitle={`${stats.slaEscalations} probleme(s) detecte(s)`} cta="Consulter activite" to="/fournisseur/carte-grise" />
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function Kpi({ label, value, detail, deltaLabel, ok }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">{label}</p>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tone(ok)}`}>{deltaLabel}</span>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p>
    </article>
  );
}

function Action({ title, subtitle, cta, to }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
      <Link to={to} className="mt-3 inline-flex rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-3 py-2 text-xs font-semibold text-white">
        {cta}
      </Link>
    </div>
  );
}

export default FournisseurDashboardPage;
