import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Bike,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderOpen,
  IdCard,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  UploadCloud,
  UserRound,
  Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../api/axios';
import {
  clientsQueryOptions,
  motorcyclesQueryOptions,
  queryKeys,
  revendeurInvoicesQueryOptions,
} from '../../lib/appQueries';
import { preloadRouteModule } from '../../lib/routePreloaders';

const DOCUMENT_FIELDS = [
  { key: 'facture', type: 3, label: 'Facture externe', hint: 'Obligatoire. Chargez la facture creee dans votre systeme actuel.', required: true, icon: FileText, accent: 'from-blue-600 to-cyan-500' },
  { key: 'cinFront', type: 6, label: 'CIN recto', hint: 'Optionnel maintenant. Peut etre ajoute plus tard dans Carte grise.', required: false, icon: IdCard, accent: 'from-violet-600 to-fuchsia-500' },
  { key: 'cinBack', type: 7, label: 'CIN verso', hint: 'Optionnel maintenant. Peut etre ajoute plus tard dans Carte grise.', required: false, icon: IdCard, accent: 'from-indigo-600 to-blue-500' },
  { key: 'declaration', type: 1, label: "Declaration d'impot", hint: 'Optionnel maintenant. Peut etre ajoute plus tard dans Carte grise.', required: false, icon: ShieldCheck, accent: 'from-emerald-600 to-teal-500' }
];

const EMPTY_UPLOADS = { facture: null, cinFront: null, cinBack: null, declaration: null };

function getApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.response?.data?.Message || fallbackMessage;
}

function normalizeClientStatus(status) {
  if (typeof status === 'string') return status.trim().toLowerCase() === 'missing' ? 'missing' : 'active';
  return Number(status) === 1 ? 'missing' : 'active';
}

function parseAmount(value) {
  const parsed = Number.parseFloat(String(value ?? '0').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyTnd(value) {
  const amount = parseAmount(value);
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} TND`;
}

function formatFileSize(size) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptySale() {
  return {
    saleDate: getTodayValue(),
    clientName: '',
    clientCIN: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientCity: '',
    company: '',
    motorcycleBrand: '',
    motorcycleModel: '',
    chassisNumber: '',
    salePrice: '',
    notes: ''
  };
}

function SectionHeader(props) {
  const {
    step,
    icon: IconComponent,
    title,
    description,
    badge,
    badgeClassName = 'bg-slate-100 text-slate-600'
  } = props;

  return (
    <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <IconComponent className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Etape {step}</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
        {badge ? <span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-semibold ${badgeClassName}`}>{badge}</span> : null}
      </div>
    </div>
  );
}

function SummaryCheck({ done, label }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 ${done ? 'border-emerald-200 bg-emerald-50/80' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400'}`}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        </span>
        <span className={`text-sm font-medium ${done ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</span>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{done ? 'OK' : 'En attente'}</span>
    </div>
  );
}

function UploadCard({ field, file, saving, onChange, onRemove }) {
  const Icon = field.icon;
  const inputId = `sale-upload-${field.key}`;
  const surfaceClass = file
    ? 'border-emerald-200 bg-emerald-50/70'
    : field.required
      ? 'border-amber-200 bg-amber-50/70'
      : 'border-slate-200 bg-slate-50';

  return (
    <article className={`rounded-3xl border p-4 sm:p-5 ${surfaceClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white ${field.accent}`}>
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900">{field.label}</p>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${field.required ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                {field.required ? 'Requis' : 'Optionnel'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{field.hint}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${file ? 'bg-emerald-100 text-emerald-700' : 'bg-white/70 text-slate-600'}`}>{file ? 'Charge' : 'En attente'}</span>
      </div>

      <label htmlFor={inputId} className={`mt-4 flex cursor-pointer flex-col rounded-2xl border border-dashed px-4 py-4 transition ${file ? 'border-emerald-300 bg-white/90' : 'border-slate-300 bg-white hover:border-sky-300'}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${file ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {file ? <BadgeCheck className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            {file ? (
              <>
                <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="mt-1 text-xs text-slate-400">{formatFileSize(file.size)}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-800">Choisir un fichier</p>
                <p className="mt-1 text-xs text-slate-400">PDF ou image nette pour une verification rapide</p>
              </>
            )}
          </div>
        </div>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">Formats: PDF, JPG, PNG, WEBP, HEIC</p>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
          {file ? 'Remplacer' : 'Choisir un fichier'}
        </label>
        {file ? (
          <button type="button" onClick={() => onRemove(field.key)} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50" disabled={saving}>
            Retirer
          </button>
        ) : null}
      </div>

      <input
        id={inputId}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.jfif,.heic,.heif,.avif"
        onChange={(event) => onChange(field.key, event.target.files?.[0] || null)}
        disabled={saving}
      />
    </article>
  );
}

function SummaryTile({ label, value, hint, tone = 'default' }) {
  const toneClassName = tone === 'blue'
    ? 'border-blue-200 bg-blue-50/80'
    : tone === 'green'
      ? 'border-emerald-200 bg-emerald-50/80'
      : 'border-slate-200 bg-slate-50';

  return (
    <div className={`rounded-2xl border p-4 ${toneClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function NextStepCard({ index, title, description, tone = 'default' }) {
  const badgeClassName = tone === 'dark'
    ? 'bg-slate-950 text-white'
    : tone === 'sky'
      ? 'bg-sky-100 text-sky-700'
      : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${badgeClassName}`}>
        {index}
      </span>
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function InvoicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [sale, setSale] = useState(createEmptySale);
  const [uploads, setUploads] = useState(EMPTY_UPLOADS);
  const [saving, setSaving] = useState(false);
  const clientsQuery = useQuery(clientsQueryOptions());
  const motorcyclesQuery = useQuery(motorcyclesQueryOptions());
  const loading = clientsQuery.isLoading || motorcyclesQuery.isLoading;
  const clients = useMemo(
    () => (clientsQuery.data ?? [])
      .map((item) => ({
        id: item.clientId ?? item.id,
        fullName: item.fullName ?? '',
        cin: item.cin ?? '',
        phone: item.phone ?? '',
        email: item.email ?? '',
        address: item.address ?? '',
        city: item.city ?? '',
        status: normalizeClientStatus(item.status)
      }))
      .filter((item) => item.status !== 'missing'),
    [clientsQuery.data]
  );
  const stockMotorcycles = useMemo(
    () => (motorcyclesQuery.data ?? []).map((item) => ({
      id: item.motorcycleId ?? item.id,
      company: item.company ?? '',
      brand: item.brand ?? '',
      model: item.model ?? '',
      qty: item.qty ?? 0,
      purchasePrice: item.purchasePrice ?? 0,
      salePrice: item.salePrice ?? 0
    })),
    [motorcyclesQuery.data]
  );

  const availableStock = useMemo(() => stockMotorcycles.filter((item) => Number(item.qty || 0) > 0), [stockMotorcycles]);
  const selectedClient = useMemo(() => clients.find((item) => String(item.id) === String(selectedClientId)) || null, [clients, selectedClientId]);
  const selectedStock = useMemo(() => stockMotorcycles.find((item) => String(item.id) === String(selectedStockId)) || null, [stockMotorcycles, selectedStockId]);
  const attachedDocumentsCount = useMemo(() => DOCUMENT_FIELDS.filter((field) => Boolean(uploads[field.key])).length, [uploads]);

  const saleAmount = parseAmount(sale.salePrice);
  const hasMinimumDossierDocs = Boolean(uploads.facture && uploads.cinFront && uploads.cinBack && uploads.declaration);
  const isClientReady = Boolean(selectedClientId || (sale.clientName.trim() && sale.clientCIN.trim()));
  const isMotorcycleReady = Boolean(sale.company.trim() && sale.motorcycleBrand.trim() && sale.motorcycleModel.trim() && sale.chassisNumber.trim() && saleAmount > 0);
  const isFactureReady = Boolean(uploads.facture);
  const readinessChecks = [
    { label: 'Client identifie', done: isClientReady },
    { label: 'Moto et chassis valides', done: isMotorcycleReady },
    { label: 'Facture externe importee', done: isFactureReady },
    { label: 'Pack dossier complet', done: hasMinimumDossierDocs }
  ];
  const readinessPercent = Math.round((readinessChecks.filter((item) => item.done).length / readinessChecks.length) * 100);
  const nextMissingCheck = readinessChecks.find((item) => !item.done)?.label || 'Pret a basculer vers Carte grise';
  const saleLabel = [sale.company, sale.motorcycleBrand, sale.motorcycleModel].filter(Boolean).join(' ');

  function handleSaleChange(field, value) {
    setSale((previous) => ({ ...previous, [field]: value }));
  }

  function handleSelectClient(nextClientId) {
    setSelectedClientId(nextClientId);
    if (!nextClientId) {
      setSale((previous) => ({ ...previous, clientName: '', clientCIN: '', clientPhone: '', clientEmail: '', clientAddress: '', clientCity: '' }));
      return;
    }

    const client = clients.find((item) => String(item.id) === String(nextClientId));
    if (!client) return;

    setSale((previous) => ({
      ...previous,
      clientName: client.fullName || '',
      clientCIN: client.cin || '',
      clientPhone: client.phone || '',
      clientEmail: client.email || '',
      clientAddress: client.address || '',
      clientCity: client.city || ''
    }));
  }

  function handleSelectStock(nextStockId) {
    setSelectedStockId(nextStockId);
    if (!nextStockId) {
      setSale((previous) => ({ ...previous, company: '', motorcycleBrand: '', motorcycleModel: '', salePrice: '' }));
      return;
    }

    const stock = stockMotorcycles.find((item) => String(item.id) === String(nextStockId));
    if (!stock) return;

    setSale((previous) => ({
      ...previous,
      company: stock.company || '',
      motorcycleBrand: stock.brand || '',
      motorcycleModel: stock.model || '',
      salePrice: String(stock.salePrice ?? '')
    }));
  }

  function handleFileChange(key, file) {
    setUploads((previous) => ({ ...previous, [key]: file || null }));
  }

  function resetForm() {
    setSelectedClientId('');
    setSelectedStockId('');
    setSale(createEmptySale());
    setUploads(EMPTY_UPLOADS);
  }

  async function uploadDocument(invoiceId, field) {
    const file = uploads[field.key];
    if (!file) return;
    const formData = new FormData();
    formData.append('documentType', String(field.type));
    formData.append('file', file);
    await api.post(`/Invoices/${invoiceId}/documents`, formData);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const manualClient = {
      fullName: sale.clientName.trim(),
      cin: sale.clientCIN.trim().toUpperCase(),
      phone: sale.clientPhone.trim() || null,
      email: sale.clientEmail.trim() || null,
      address: sale.clientAddress.trim() || null,
      city: sale.clientCity.trim() || null
    };
    const company = sale.company.trim();
    const brand = sale.motorcycleBrand.trim();
    const model = sale.motorcycleModel.trim();
    const chassisNumber = sale.chassisNumber.trim().toUpperCase();

    if (!uploads.facture) return toast.error('La facture externe est obligatoire pour enregistrer la vente.');
    if (!selectedClientId && (!manualClient.fullName || !manualClient.cin)) return toast.error('Selectionnez un client ou saisissez au minimum le nom et le CIN.');
    if (!brand || !model || !company) return toast.error('Company, marque et modele sont obligatoires.');
    if (!chassisNumber) return toast.error('Numero de chassis obligatoire.');
    if (saleAmount <= 0) return toast.error('Prix de vente invalide.');
    if (selectedStockId && !selectedStock) return toast.error('La moto selectionnee en stock est introuvable.');

    const payload = {
      invoiceDate: sale.saleDate ? new Date(`${sale.saleDate}T12:00:00`).toISOString() : new Date().toISOString(),
      notes: sale.notes.trim(),
      soldMotorcycles: [{
        stockMotorcycleId: selectedStock ? Number(selectedStock.id) : null,
        company,
        brand,
        model,
        chassisNumber,
        purchasePrice: selectedStock ? selectedStock.purchasePrice : null,
        salePrice: saleAmount
      }]
    };

    if (selectedClientId) payload.clientId = Number(selectedClientId);
    else payload.client = manualClient;

    setSaving(true);
    try {
      const response = await api.post('/Invoices', payload);
      const invoiceId = response?.data?.data?.invoiceId;
      const clientPortalAccessCode = response?.data?.data?.clientPortalAccessCode;
      if (!invoiceId) throw new Error('Identifiant dossier manquant.');

      const failedUploads = [];
      for (const field of DOCUMENT_FIELDS) {
        if (!uploads[field.key]) continue;
        try {
          await uploadDocument(invoiceId, field);
        } catch (error) {
          failedUploads.push(field.label);
          toast.error(getApiErrorMessage(error, `Impossible de charger ${field.label}.`));
        }
      }

      if (selectedStock) {
        queryClient.setQueryData(queryKeys.motorcycles.all, (previous = []) => previous.map((item) => (
          item.id === selectedStock.id ? { ...item, qty: Math.max(Number(item.qty || 0) - 1, 0) } : item
        )));
      }

      resetForm();
      void queryClient.invalidateQueries({ queryKey: queryKeys.revendeur.invoices.all });
      void queryClient.prefetchQuery(revendeurInvoicesQueryOptions());
      void preloadRouteModule('/revendeur/carte-grise');
      window.dispatchEvent(new Event('notifications:refresh'));
      if (failedUploads.length > 0) {
        toast.warning(`Vente enregistree. Code portail: ${clientPortalAccessCode || 'genere'}. Documents a reprendre: ${failedUploads.join(', ')}.`);
      } else {
        toast.success(`Vente enregistree avec succes. Code portail: ${clientPortalAccessCode || 'genere'}.`);
      }
      navigate('/revendeur/carte-grise');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erreur lors de la creation du dossier de vente.'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
  const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500';
  const cardClass = 'overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm';

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-4 py-6 text-white sm:px-6 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Nouvelle vente</h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-300">
                Enregistrez la vente, joignez la facture externe, puis laissez le dossier continuer dans Carte grise.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/revendeur/carte-grise')}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Carte grise
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              {loading ? 'Chargement clients...' : `${clients.length} client(s) actif(s)`}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              {loading ? 'Chargement stock...' : `${availableStock.length} reference(s) en stock`}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-100">
              <FileText className="h-3.5 w-3.5" />
              Facture externe requise
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              <FolderOpen className="h-3.5 w-3.5" />
              {readinessPercent}% progression
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form id="sale-dossier-form" className="space-y-5" onSubmit={handleSubmit}>
          <section className={cardClass}>
            <SectionHeader
              step="01"
              icon={UserRound}
              title="Client et contact"
              description="Selectionnez une fiche existante ou creez une vente rapide avec les informations minimales."
              badge={selectedClient ? 'Client lie a la vente' : 'Creation manuelle possible'}
              badgeClassName={selectedClient ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'}
            />

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className={labelClass}><UserRound className="h-3.5 w-3.5" />Client existant</label>
                <select value={selectedClientId} onChange={(event) => handleSelectClient(event.target.value)} className={inputClass} disabled={loading || saving}>
                  <option value="">Nouveau client (saisie manuelle)</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.fullName} - CIN {client.cin}</option>)}
                </select>
                <p className="mt-3 text-sm text-slate-500">
                  {selectedClient
                    ? 'La fiche client reste la source de verite. Les champs ci-dessous sont verrouilles.'
                    : 'Pas besoin de quitter la page: vous pouvez saisir un nouveau client directement ici.'}
                </p>
              </div>

              {selectedClient ? (
                <div className="grid gap-3 rounded-3xl border border-sky-200 bg-sky-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-600">Client lie</p><p className="mt-2 text-sm font-bold text-slate-900">{selectedClient.fullName}</p><p className="mt-1 text-xs font-medium text-slate-500">CIN {selectedClient.cin || '-'}</p></div>
                  <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-600">Contact</p><p className="mt-2 text-sm text-slate-700">{selectedClient.phone || 'Telephone non renseigne'}</p><p className="mt-1 truncate text-xs text-slate-500">{selectedClient.email || 'Email non renseigne'}</p></div>
                  <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-600">Adresse</p><p className="mt-2 text-sm text-slate-700">{selectedClient.address || 'Adresse non renseignee'}</p><p className="mt-1 text-xs text-slate-500">{selectedClient.city || 'Ville non renseignee'}</p></div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Creation express</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Pour ouvrir le dossier, le nom complet et le CIN suffisent. Le reste peut etre enrichi ensuite.</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div><label className={labelClass}><UserRound className="h-3.5 w-3.5" />Nom complet</label><input className={inputClass} value={sale.clientName} onChange={(event) => handleSaleChange('clientName', event.target.value)} placeholder="Ahmed Ben Salah" disabled={Boolean(selectedClientId) || saving} /></div>
                <div><label className={labelClass}><IdCard className="h-3.5 w-3.5" />Numero CIN</label><input className={`${inputClass} font-mono tracking-[0.12em] sm:tracking-[0.22em]`} value={sale.clientCIN} onChange={(event) => handleSaleChange('clientCIN', event.target.value.toUpperCase())} placeholder="12345678" disabled={Boolean(selectedClientId) || saving} /></div>
                <div><label className={labelClass}><Phone className="h-3.5 w-3.5" />Telephone</label><input className={inputClass} value={sale.clientPhone} onChange={(event) => handleSaleChange('clientPhone', event.target.value)} placeholder="+216 XX XXX XXX" disabled={Boolean(selectedClientId) || saving} /></div>
                <div><label className={labelClass}><Mail className="h-3.5 w-3.5" />Email</label><input type="email" className={inputClass} value={sale.clientEmail} onChange={(event) => handleSaleChange('clientEmail', event.target.value)} placeholder="client@email.com" disabled={Boolean(selectedClientId) || saving} /></div>
                <div><label className={labelClass}><Building2 className="h-3.5 w-3.5" />Adresse</label><input className={inputClass} value={sale.clientAddress} onChange={(event) => handleSaleChange('clientAddress', event.target.value)} placeholder="Adresse client" disabled={Boolean(selectedClientId) || saving} /></div>
                <div><label className={labelClass}><Building2 className="h-3.5 w-3.5" />Ville</label><input className={inputClass} value={sale.clientCity} onChange={(event) => handleSaleChange('clientCity', event.target.value)} placeholder="Tunis" disabled={Boolean(selectedClientId) || saving} /></div>
              </div>
            </div>
          </section>
          <section className={cardClass}>
            <SectionHeader
              step="02"
              icon={Bike}
              title="Moto vendue"
              description="Choisissez une reference du stock ou saisissez les details manuellement pour garder le flux rapide."
              badge={selectedStock ? 'Liee au stock' : 'Saisie manuelle'}
              badgeClassName={selectedStock ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
            />

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className={labelClass}><FolderOpen className="h-3.5 w-3.5" />Depuis le stock</label>
                <select value={selectedStockId} onChange={(event) => handleSelectStock(event.target.value)} className={inputClass} disabled={loading || saving}>
                  <option value="">Saisie manuelle</option>
                  {availableStock.map((stock) => <option key={stock.id} value={stock.id}>{stock.company} - {stock.brand} {stock.model} (qte: {stock.qty})</option>)}
                </select>
                <p className="mt-3 text-sm text-slate-500">Une unite sera deduite du stock a la creation du dossier si une reference stock est selectionnee.</p>
              </div>

              {selectedStock ? (
                <div className="grid gap-3 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Reference</p><p className="mt-2 text-sm font-bold text-slate-900">{selectedStock.company} {selectedStock.brand} {selectedStock.model}</p></div>
                  <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Stock restant</p><p className="mt-2 text-sm text-slate-700">{selectedStock.qty} unite(s)</p></div>
                  <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Prix catalogue</p><p className="mt-2 text-sm text-slate-700">{formatMoneyTnd(selectedStock.salePrice)}</p></div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Vente hors reference stock</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Utile pour les cas exceptionnels ou pour migrer rapidement votre flux existant vers l'app.</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div><label className={labelClass}><Building2 className="h-3.5 w-3.5" />Societe</label><input className={inputClass} value={sale.company} onChange={(event) => handleSaleChange('company', event.target.value)} placeholder="Zimota" disabled={saving} /></div>
                <div><label className={labelClass}><CalendarDays className="h-3.5 w-3.5" />Date de vente</label><input type="date" className={inputClass} value={sale.saleDate} onChange={(event) => handleSaleChange('saleDate', event.target.value)} disabled={saving} /></div>
                <div><label className={labelClass}><Bike className="h-3.5 w-3.5" />Marque</label><input className={inputClass} value={sale.motorcycleBrand} onChange={(event) => handleSaleChange('motorcycleBrand', event.target.value)} placeholder="Honda" disabled={saving} /></div>
                <div><label className={labelClass}><Bike className="h-3.5 w-3.5" />Modele</label><input className={inputClass} value={sale.motorcycleModel} onChange={(event) => handleSaleChange('motorcycleModel', event.target.value)} placeholder="CB125F" disabled={saving} /></div>
                <div><label className={labelClass}><ShieldCheck className="h-3.5 w-3.5" />Numero de chassis</label><input className={`${inputClass} font-mono tracking-[0.08em] sm:tracking-[0.16em]`} value={sale.chassisNumber} onChange={(event) => handleSaleChange('chassisNumber', event.target.value.toUpperCase())} placeholder="JYARN23E00A000123" disabled={saving} /></div>
                <div><label className={labelClass}><Wallet className="h-3.5 w-3.5" />Prix de vente TTC</label><input type="number" min="0" step="0.001" className={inputClass} value={sale.salePrice} onChange={(event) => handleSaleChange('salePrice', event.target.value)} placeholder="12500" disabled={saving} /></div>
              </div>

              <div><label className={labelClass}><FileText className="h-3.5 w-3.5" />Notes internes</label><textarea className={`${inputClass} min-h-28 resize-y py-3`} value={sale.notes} onChange={(event) => handleSaleChange('notes', event.target.value)} placeholder="Commentaires internes pour l'equipe..." disabled={saving} /></div>
            </div>
          </section>
          <section className={cardClass}>
            <SectionHeader
              step="03"
              icon={UploadCloud}
              title="Documents de depart"
              description="Chargez la facture maintenant. Les autres pieces peuvent etre completees dans Carte grise si vous voulez aller vite."
              badge={`${attachedDocumentsCount}/${DOCUMENT_FIELDS.length} document(s) attaches`}
              badgeClassName="bg-slate-950 text-white"
            />

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><ArrowRight className="h-5 w-5" /></span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Flux rapide assume</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Chargez la facture maintenant, puis completez le reste plus tard si besoin. L'important est de lancer la vente sans friction.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {DOCUMENT_FIELDS.map((field) => (
                  <UploadCard
                    key={field.key}
                    field={field}
                    file={uploads[field.key]}
                    saving={saving}
                    onChange={handleFileChange}
                    onRemove={(key) => handleFileChange(key, null)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Actions</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">Finaliser la vente</h2>
                  <p className="mt-1 text-sm text-slate-500">Le dossier sera cree puis redirige vers Carte grise.</p>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-semibold ${hasMinimumDossierDocs ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {hasMinimumDossierDocs ? 'Dossier complet' : 'Documents a completer'}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button type="submit" disabled={saving || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {saving ? 'Enregistrement...' : 'Enregistrer la vente'}
                </button>
                <button type="button" onClick={() => navigate('/revendeur/carte-grise')} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto">
                  Ouvrir Carte grise <ChevronRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={resetForm} disabled={saving} className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto">
                  Reinitialiser
                </button>
              </div>
            </div>
          </section>
        </form>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className={cardClass}>
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Resume</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-950">Etat du dossier</h2>
                  <p className="mt-1 text-sm text-slate-500">{nextMissingCheck}</p>
                </div>
                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Score</p>
                  <p className="mt-1 text-2xl font-black">{readinessPercent}%</p>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all" style={{ width: `${readinessPercent}%` }} />
              </div>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div className="space-y-3">{readinessChecks.map((item) => <SummaryCheck key={item.label} done={item.done} label={item.label} />)}</div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SummaryTile label="Client" value={sale.clientName || 'A selectionner / saisir'} hint={sale.clientCIN || 'CIN requis'} />
                <SummaryTile label="Moto" value={saleLabel || 'A renseigner'} hint={sale.chassisNumber || 'Chassis requis'} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SummaryTile label="Prix de vente" value={saleAmount > 0 ? formatMoneyTnd(saleAmount) : 'A renseigner'} tone="blue" />
                <SummaryTile label="Documents attaches" value={`${attachedDocumentsCount}/${DOCUMENT_FIELDS.length}`} hint={isFactureReady ? 'Facture presente' : 'Facture manquante'} tone="green" />
              </div>

              <SummaryTile label="Code portail client" value="Genere automatiquement" hint="Un code securise sera cree apres l'enregistrement du dossier." />

              <div className={`rounded-2xl border p-4 ${hasMinimumDossierDocs ? 'border-emerald-200 bg-emerald-50/80' : 'border-amber-200 bg-amber-50/80'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${hasMinimumDossierDocs ? 'text-emerald-700' : 'text-amber-700'}`}>Statut apres creation</p>
                <p className={`mt-2 text-lg font-black ${hasMinimumDossierDocs ? 'text-emerald-900' : 'text-amber-900'}`}>{hasMinimumDossierDocs ? 'Documents recus' : 'En attente de documents'}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Sans CIN recto/verso + declaration + facture, le dossier restera a completer dans Carte grise.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Apres validation</p>
            <div className="mt-4 space-y-3">
              <NextStepCard index="1" title="Creation instantanee" description="Le dossier est cree sans generer de facture PDF interne." tone="dark" />
              <NextStepCard index="2" title="Completer si besoin" description="Les pieces manquantes peuvent etre ajoutees depuis Carte grise plus tard." tone="sky" />
              <NextStepCard index="3" title="Envoi fournisseur" description="Quand le dossier est complet, il peut partir vers le fournisseur depuis le board." tone="green" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default InvoicesPage;
