import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '../../api/axios';
import partnershipService, { PartnershipStatus } from '../../services/partnershipService';
import { useI18n } from '../../context/I18nContext';
import { resolveAvatarUrl } from '../../utils/avatar';
import DocumentPreviewModal from '../../components/documents/DocumentPreviewModal';
import {
  buildApiUrl,
  logDocumentPreviewMetric,
  resolveDocumentPreviewKind,
  startBrowserDownload
} from '../../features/documents/documentPreview';

const DOCUMENT_CATALOG = [
  { type: 6, key: 'cin_front', label: 'CIN Front', labelAr: 'البطاقة الوطنية - الوجه الأمامي', hint: 'Recto CIN', hintAr: 'واجهة البطاقة الوطنية', required: true },
  { type: 7, key: 'cin_back', label: 'CIN Back', labelAr: 'البطاقة الوطنية - الوجه الخلفي', hint: 'Verso CIN', hintAr: 'خلفية البطاقة الوطنية', required: true },
  { type: 3, key: 'facture', label: 'Facture', labelAr: 'الفاتورة', hint: 'Facture signee/scannee', hintAr: 'فاتورة ممضاة/ممسوحة', required: true },
  { type: 1, key: 'declaration', label: "Declaration d'impot", labelAr: 'التصريح الجبائي', hint: 'Derniere declaration', hintAr: 'آخر تصريح', required: true },
  { type: 5, key: 'autre', label: 'Autre document', labelAr: 'وثيقة أخرى', hint: 'Document complementaire', hintAr: 'وثيقة إضافية', required: false }
];

const STATUS_META = {
  pending: { label: 'En attente', labelAr: 'في الانتظار', chip: 'bg-amber-100 text-amber-700 border-amber-200', rail: 'from-amber-400 to-orange-500' },
  docs_received: { label: 'Docs recus', labelAr: 'الوثائق مستلمة', chip: 'bg-blue-100 text-blue-700 border-blue-200', rail: 'from-blue-500 to-sky-500' },
  in_progress: { label: 'Controle qualite', labelAr: 'قيد المعالجة', chip: 'bg-indigo-100 text-indigo-700 border-indigo-200', rail: 'from-indigo-500 to-blue-600' },
  depot_antt: { label: 'Depot ANTT', labelAr: 'Depot ANTT', chip: 'bg-violet-100 text-violet-700 border-violet-200', rail: 'from-violet-500 to-purple-600' },
  completed: { label: 'Carte grise prete', labelAr: 'مكتمل', chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', rail: 'from-emerald-500 to-green-500' },
  rejected: { label: 'Rejete', labelAr: 'مرفوض', chip: 'bg-rose-100 text-rose-700 border-rose-200', rail: 'from-rose-500 to-red-500' },
  delivered: { label: 'Livree', labelAr: 'تم التسليم', chip: 'bg-slate-100 text-slate-700 border-slate-300', rail: 'from-slate-500 to-slate-600' }
};

const BOARD_STATE_META = {
  missing_docs: {
    label: 'Manque documents',
    labelAr: 'وثائق ناقصة',
    badge: 'border-rose-200 bg-rose-100 text-rose-700',
    rail: 'from-rose-500 via-orange-500 to-amber-500',
    softPanel: 'border-rose-200 bg-rose-50/90',
    glow: 'from-rose-200/80 via-orange-200/60 to-transparent',
    button: 'from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600'
  },
  ready_to_send: {
    label: 'Pret a envoyer',
    labelAr: 'جاهز للارسال',
    badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    rail: 'from-emerald-500 via-green-500 to-teal-500',
    softPanel: 'border-emerald-200 bg-emerald-50/90',
    glow: 'from-emerald-200/80 via-green-200/60 to-transparent',
    button: 'from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600'
  },
  sent: {
    label: 'Envoye',
    labelAr: 'تم الارسال',
    badge: 'border-sky-200 bg-sky-100 text-sky-700',
    rail: 'from-sky-500 via-blue-500 to-indigo-500',
    softPanel: 'border-sky-200 bg-sky-50/90',
    glow: 'from-sky-200/80 via-blue-200/60 to-transparent',
    button: 'from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700'
  },
  processing: {
    label: 'En traitement',
    labelAr: 'قيد المعالجة',
    badge: 'border-amber-200 bg-amber-100 text-amber-700',
    rail: 'from-amber-500 via-orange-500 to-yellow-500',
    softPanel: 'border-amber-200 bg-amber-50/90',
    glow: 'from-amber-200/80 via-orange-200/60 to-transparent',
    button: 'from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600'
  },
  completed: {
    label: 'Termine',
    labelAr: 'منتهي',
    badge: 'border-slate-300 bg-slate-100 text-slate-700',
    rail: 'from-slate-500 via-slate-600 to-slate-700',
    softPanel: 'border-slate-200 bg-slate-50/90',
    glow: 'from-slate-200/80 via-slate-200/50 to-transparent',
    button: 'from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900'
  }
};

const SORT_OPTIONS = [
  { value: 'action_priority', label: "Priorite d'action", labelAr: 'اولوية الاجراء' },
  { value: 'updated_desc', label: 'Plus recents', labelAr: 'الأحدث' },
  { value: 'created_desc', label: 'Date creation', labelAr: 'تاريخ الإنشاء' },
  { value: 'progress_desc', label: 'Progression', labelAr: 'نسبة التقدم' },
  { value: 'client_asc', label: 'Client A-Z', labelAr: 'الحريف أ-ي' }
];

const CARTE_GRISE_STATUS_TO_ENUM = {
  pending: 0,
  docs_received: 1,
  in_progress: 2,
  depot_antt: 6,
  completed: 3,
  rejected: 4,
  delivered: 5
};

const VALIDATION_REASONS = [
  { value: 1, label: 'Document flou', labelAr: 'وثيقة غير واضحة' },
  { value: 2, label: 'Signature manquante', labelAr: 'إمضاء ناقص' },
  { value: 3, label: 'Incoherence des informations', labelAr: 'عدم تطابق المعطيات' },
  { value: 4, label: 'Page manquante', labelAr: 'صفحة ناقصة' },
  { value: 5, label: 'Document expire', labelAr: 'وثيقة منتهية الصلاحية' },
  { value: 6, label: 'Document incomplet', labelAr: 'وثيقة غير مكتملة' }
];

function normalizeReasonValues(values) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 6)
  )).sort((a, b) => a - b);
}

function parseChecklistDraft(value) {
  return Array.from(new Set(
    String(value || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  )).slice(0, 20);
}

function extractApiData(response) {
  return Array.isArray(response?.data?.data) ? response.data.data : [];
}

function extractSingleApiData(response) {
  const payload = response?.data?.data;
  return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
}

function getApiErrorMessage(error, fallbackMessage) {
  const apiMessage = error?.response?.data?.message || error?.response?.data?.Message;
  if (apiMessage) return apiMessage;

  const validationErrors = error?.response?.data?.errors;
  if (validationErrors && typeof validationErrors === 'object') {
    const first = Object.values(validationErrors).flat?.()?.[0];
    if (first) return String(first);
  }

  const detail = error?.response?.data?.detail || error?.response?.data?.title;
  if (detail) return String(detail);

  return fallbackMessage;
}

function showIncompleteDossierToast(missingDocs, tr) {
  const message = missingDocs.length > 0
    ? tr(`Documents manquants: ${missingDocs.join(', ')}.`, `الوثائق الناقصة: ${missingDocs.join('، ')}.`)
    : tr('Certains documents obligatoires sont manquants.', 'بعض الوثائق الإلزامية ناقصة.');

  toast.error(tr('Dossier incomplet', 'ملف غير مكتمل'), {
    description: `${tr("Impossible d'envoyer le dossier au fournisseur. Completez le dossier puis reessayez.", 'لا يمكن إرسال الملف للمزوّد. أكمل الوثائق ثم أعد المحاولة.')} ${message}`
  });
}

function isMissingDocumentsApiError(error) {
  if (error?.response?.status !== 400) return false;
  const message = String(
    error?.response?.data?.message
    || error?.response?.data?.Message
    || error?.response?.data?.detail
    || ''
  ).toLowerCase();
  return message.includes('incomplet') || message.includes('manquant');
}

function formatDate(value, locale = 'fr-FR') {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(locale);
}

function formatDateTime(value, locale = 'fr-FR') {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString(locale);
}

function mapTimelineEvents(rawEvents, locale = 'fr-FR') {
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  return events
    .map((event) => {
      const actorRole = String(event?.actorRole || '').toLowerCase();
      return {
        eventId: event?.eventId ?? null,
        title: event?.title || 'Evenement dossier',
        message: event?.message || '',
        actorRole: actorRole || 'system',
        createdAtRaw: event?.createdAt || null,
        createdAt: formatDateTime(event?.createdAt, locale)
      };
    })
    .sort((a, b) => new Date(b.createdAtRaw || 0).getTime() - new Date(a.createdAtRaw || 0).getTime())
    .slice(0, 30);
}

function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '--';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function normalizeStatus(raw) {
  if (typeof raw === 'string') {
    const value = raw.trim().toLowerCase();
    if (value === 'pendingdocuments' || value === 'pending') return 'pending';
    if (value === 'documentsreceived' || value === 'docs_received') return 'docs_received';
    if (value === 'inprogress' || value === 'in_progress' || value === 'sent_to_company' || value === 'controlequalite' || value === 'quality_check') return 'in_progress';
    if (value === 'depotantt' || value === 'depot_antt' || value === 'depot-antt') return 'depot_antt';
    if (value === 'ready' || value === 'completed') return 'completed';
    if (value === 'rejected') return 'rejected';
    if (value === 'delivered' || value === 'livree') return 'delivered';
  }

  switch (Number(raw)) {
    case 1: return 'docs_received';
    case 2: return 'in_progress';
    case 6: return 'depot_antt';
    case 3: return 'completed';
    case 4: return 'rejected';
    case 5: return 'delivered';
    default: return 'pending';
  }
}

function buildDocumentFallbackMap(invoice) {
  const byType = new Map();

  if (invoice?.isCinUploaded || invoice?.isCinFrontUploaded) {
    byType.set(6, { documentType: 6, isPlaceholder: true });
  }

  if (invoice?.isCinUploaded || invoice?.isCinBackUploaded) {
    byType.set(7, { documentType: 7, isPlaceholder: true });
  }

  if (invoice?.isFactureUploaded) {
    byType.set(3, { documentType: 3, isPlaceholder: true });
  }

  if (invoice?.isDeclarationUploaded) {
    byType.set(1, { documentType: 1, isPlaceholder: true });
  }

  if (invoice?.isJustificatifUploaded) {
    byType.set(2, { documentType: 2, isPlaceholder: true });
  }

  if (invoice?.isCarteGriseUploaded) {
    byType.set(4, { documentType: 4, isPlaceholder: true });
  }

  if (Number(invoice?.documentCount) > 0) {
    byType.set(5, { documentType: 5, isPlaceholder: true });
  }

  return byType;
}

function mapDocuments(docsRaw, invoice) {
  const docs = Array.isArray(docsRaw) ? docsRaw : [];
  const byType = new Map();
  for (const doc of docs) {
    const type = Number(doc.documentType);
    if (!byType.has(type)) {
      byType.set(type, doc);
    }
  }
  const fallbackByType = buildDocumentFallbackMap(invoice);
  const legacyCin = byType.get(0) || fallbackByType.get(0);
  return DOCUMENT_CATALOG.map((item) => {
    const fromLegacy = Boolean(!byType.get(item.type) && (item.type === 6 || item.type === 7) && legacyCin);
    let doc = byType.get(item.type) || fallbackByType.get(item.type);
    if (!doc && (item.type === 6 || item.type === 7) && legacyCin) {
      doc = legacyCin;
    }
    return {
      ...item,
      uploaded: Boolean(doc),
      documentId: doc?.documentId ?? null,
      fileName: doc?.fileName ?? null,
      contentType: doc?.contentType ?? null,
      sizeBytes: doc?.sizeBytes ?? 0,
      updatedAt: doc?.updatedAt ?? null,
      isPlaceholder: Boolean(doc?.isPlaceholder) && !doc?.documentId,
      fromLegacy
    };
  });
}

function getProgress(status, uploaded, total) {
  const ratio = total > 0 ? Math.round((uploaded / total) * 100) : 0;
  if (status === 'completed' || status === 'delivered') return 100;
  if (status === 'depot_antt') return Math.max(ratio, 85);
  if (status === 'in_progress') return Math.max(ratio, 70);
  if (status === 'docs_received') return Math.max(ratio, 45);
  if (status === 'rejected') return Math.max(ratio, 25);
  return Math.max(ratio, 10);
}

function getBoardStateKey({ status, isSentToFournisseur, missingRequiredCount }) {
  if (status === 'completed' || status === 'delivered') return 'completed';
  if (status === 'rejected' || missingRequiredCount > 0) return 'missing_docs';
  if (!isSentToFournisseur) return 'ready_to_send';
  if (status === 'in_progress' || status === 'depot_antt') return 'processing';
  return 'sent';
}

function getBoardStatePriority(boardStateKey) {
  switch (boardStateKey) {
    case 'missing_docs':
      return 0;
    case 'ready_to_send':
      return 1;
    case 'sent':
      return 2;
    case 'processing':
      return 3;
    case 'completed':
      return 4;
    default:
      return 5;
  }
}

function getWorkflowStepIndex(boardStateKey) {
  switch (boardStateKey) {
    case 'missing_docs':
      return 0;
    case 'ready_to_send':
      return 1;
    case 'sent':
      return 2;
    case 'processing':
      return 3;
    case 'completed':
      return 4;
    default:
      return 0;
  }
}

function mapInvoiceToDossier(invoice, locale = 'fr-FR') {
  const sold = Array.isArray(invoice?.soldMotorcycles) ? invoice.soldMotorcycles[0] || {} : {};
  const status = normalizeStatus(invoice?.carteGriseStatus);
  const documents = mapDocuments(invoice?.documents, invoice);
  const requiredDocs = documents.filter((doc) => doc.required);
  const uploadedRequired = requiredDocs.filter((doc) => doc.uploaded).length;
  const missingRequiredDocuments = requiredDocs.filter((doc) => !doc.uploaded);
  const missingRequiredCount = missingRequiredDocuments.length;
  const sentToFournisseurAtRaw = invoice?.sentToFournisseurAt || null;
  const isSentToFournisseur = Boolean(sentToFournisseurAtRaw);
  const boardStateKey = getBoardStateKey({ status, isSentToFournisseur, missingRequiredCount });
  return {
    id: `CG-${invoice?.invoiceNumber || invoice?.invoiceId || '---'}`,
    invoiceId: invoice?.invoiceId ?? null,
    invoiceNumber: invoice?.invoiceNumber ?? '-',
    revendeurName: invoice?.revendeurBusinessName || 'Revendeur',
    revendeurAvatar: resolveAvatarUrl(invoice?.revendeurAvatar || ''),
    clientName: invoice?.clientFullName || '-',
    clientEmail: invoice?.clientEmail || '',
    clientAvatar: getInitials(invoice?.clientFullName),
    company: sold?.company || '-',
    bikeName: `${sold?.brand || '-'} ${sold?.model || '-'}`.trim(),
    chassis: sold?.chassisNumber || '-',
    assignedFournisseurId: invoice?.assignedFournisseurId ?? null,
    assignedFournisseurName: invoice?.assignedFournisseurBusinessName || '',
    assignedFournisseurAvatar: resolveAvatarUrl(invoice?.assignedFournisseurAvatar || ''),
    assignedFournisseurEmail: invoice?.assignedFournisseurEmail || '',
    sentToFournisseurAtRaw,
    sentToFournisseurAt: formatDateTime(sentToFournisseurAtRaw, locale),
    isSentToFournisseur,
    statusUpdatedAtRaw: invoice?.carteGriseStatusUpdatedAt || null,
    statusUpdatedAt: formatDateTime(invoice?.carteGriseStatusUpdatedAt, locale),
    status,
    boardStateKey,
    boardStatePriority: getBoardStatePriority(boardStateKey),
    workflowStepIndex: getWorkflowStepIndex(boardStateKey),
    progress: getProgress(status, uploadedRequired, requiredDocs.length),
    uploadedCount: uploadedRequired,
    requiredCount: requiredDocs.length,
    missingRequiredCount,
    missingRequiredDocuments,
    uploadedTotalCount: documents.filter((doc) => doc.uploaded).length,
    documentIssueMessage: invoice?.documentIssueMessage || '',
    documentIssueReasons: normalizeReasonValues(invoice?.documentIssueReasons),
    documentFixChecklist: Array.isArray(invoice?.documentFixChecklist)
      ? invoice.documentFixChecklist.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    documentIssueUpdatedAt: formatDateTime(invoice?.documentIssueUpdatedAt, locale),
    clientUpdateMessage: invoice?.clientUpdateMessage || '',
    clientUpdateUpdatedAt: formatDateTime(invoice?.clientUpdateUpdatedAt, locale),
    documents,
    timeline: mapTimelineEvents(invoice?.timeline, locale),
    createdAtRaw: invoice?.invoiceDate || invoice?.createdAt || null,
    updatedAtRaw: invoice?.updatedAt || invoice?.createdAt || null,
    createdAt: formatDate(invoice?.invoiceDate || invoice?.createdAt, locale),
    updatedAt: formatDate(invoice?.updatedAt || invoice?.createdAt, locale)
  };
}

function CarteGrisePage({ initialViewMode = 'active' }) {
  const { language } = useI18n();
  const isArabic = language === 'ar';
  const locale = isArabic ? 'ar-TN' : 'fr-FR';
  const tr = useCallback((fr, ar) => (isArabic ? ar : fr), [isArabic]);

  const [dossiers, setDossiers] = useState([]);
  const [viewMode, setViewMode] = useState(initialViewMode === 'archive' ? 'archive' : 'active');
  const [search, setSearch] = useState('');
  const [boardFilter, setBoardFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('action_priority');
  const [loading, setLoading] = useState(false);
  const [openDossier, setOpenDossier] = useState(null);
  const [preview, setPreview] = useState(null);
  const [emailModal, setEmailModal] = useState({
    open: false,
    invoiceId: null,
    dossierId: '',
    to: '',
    subject: '',
    message: '',
    markAsSentToCompany: false
  });
  const [sendToFournisseurModal, setSendToFournisseurModal] = useState({
    open: false,
    invoiceId: null,
    dossierId: '',
    fournisseurId: '',
    alreadySent: false
  });
  const [connectedFournisseurs, setConnectedFournisseurs] = useState([]);
  const [activeAction, setActiveAction] = useState('');
  const [uploadTarget, setUploadTarget] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ open: false, type: '' });
  const [issueDraft, setIssueDraft] = useState('');
  const [clientMessageDraft, setClientMessageDraft] = useState('');
  const [validationReasonsDraft, setValidationReasonsDraft] = useState([]);
  const [validationChecklistDraft, setValidationChecklistDraft] = useState('');
  const fileInputRef = useRef(null);

  const closePreview = useCallback(() => {
    setPreview(null);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setDetailsModal({ open: false, type: '' });
  }, []);

  const closeDossierModal = useCallback(() => {
    closeDetailsModal();
    setOpenDossier(null);
  }, [closeDetailsModal]);

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key !== 'Escape') return;
      if (detailsModal.open) {
        closeDetailsModal();
        return;
      }
      if (sendToFournisseurModal.open) {
        setSendToFournisseurModal((prev) => ({ ...prev, open: false }));
        return;
      }
      if (emailModal.open) {
        setEmailModal((prev) => ({ ...prev, open: false }));
        return;
      }
      if (preview) {
        closePreview();
        return;
      }
      if (openDossier) {
        closeDossierModal();
      }
    };

    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [
    closeDetailsModal,
    closeDossierModal,
    closePreview,
    detailsModal.open,
    openDossier,
    preview,
    emailModal.open,
    sendToFournisseurModal.open
  ]);

  useEffect(() => {
    if (!openDossier && detailsModal.open) {
      closeDetailsModal();
    }
  }, [closeDetailsModal, detailsModal.open, openDossier]);

  useEffect(() => {
    setIssueDraft(openDossier?.documentIssueMessage || '');
    setClientMessageDraft(openDossier?.clientUpdateMessage || '');
    setValidationReasonsDraft(normalizeReasonValues(openDossier?.documentIssueReasons));
    setValidationChecklistDraft((openDossier?.documentFixChecklist || []).join('\n'));
  }, [
    openDossier?.invoiceId,
    openDossier?.documentIssueMessage,
    openDossier?.clientUpdateMessage,
    openDossier?.documentIssueReasons,
    openDossier?.documentFixChecklist
  ]);

  const loadDossiers = useCallback(async (keepOpenInvoiceId = null) => {
    try {
      setLoading(true);
      const response = await api.get('/Invoices');
      const next = extractApiData(response).map((invoice) => mapInvoiceToDossier(invoice, locale));
      setDossiers(next);
      if (keepOpenInvoiceId) {
        const summary = next.find((item) => item.invoiceId === keepOpenInvoiceId) || null;
        if (!summary) {
          setOpenDossier(null);
          return;
        }

        setOpenDossier(summary);

        try {
          const detailResponse = await api.get(`/Invoices/${keepOpenInvoiceId}`);
          const detail = extractSingleApiData(detailResponse);
          if (!detail) {
            return;
          }

          const hydrated = mapInvoiceToDossier(detail, locale);
          setDossiers((current) => current.map((item) => (
            item.invoiceId === keepOpenInvoiceId ? { ...item, ...hydrated } : item
          )));
          setOpenDossier((current) => (
            current?.invoiceId === keepOpenInvoiceId ? hydrated : current
          ));
        } catch {
          // Keep the summary state visible if the detail fetch fails.
        }
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('Impossible de charger les dossiers carte grise.', 'تعذر تحميل ملفات البطاقة الرمادية.')));
    } finally {
      setLoading(false);
    }
  }, [locale, tr]);

  const openDossierWithDetails = useCallback(async (dossier) => {
    setOpenDossier(dossier);

    if (!dossier?.invoiceId) {
      return;
    }

    try {
      const response = await api.get(`/Invoices/${dossier.invoiceId}`);
      const detail = extractSingleApiData(response);
      if (!detail) {
        return;
      }

      const hydrated = mapInvoiceToDossier(detail, locale);
      setDossiers((current) => current.map((item) => (
        item.invoiceId === dossier.invoiceId ? { ...item, ...hydrated } : item
      )));
      setOpenDossier((current) => (
        current?.invoiceId === dossier.invoiceId ? hydrated : current
      ));
    } catch {
      // Keep the summary state visible if the detail fetch fails.
    }
  }, [locale]);

  const loadConnectedFournisseurs = useCallback(async () => {
    try {
      const data = await partnershipService.getFournisseurDirectory();
      const accepted = (Array.isArray(data) ? data : []).filter((item) => item.status === PartnershipStatus.Accepted);
      setConnectedFournisseurs(accepted);
    } catch {
      setConnectedFournisseurs([]);
    }
  }, []);

  useEffect(() => {
    loadDossiers();
  }, [loadDossiers]);

  useEffect(() => {
    loadConnectedFournisseurs();
  }, [loadConnectedFournisseurs]);

  const visibleDossiers = dossiers.filter((dossier) => (
    viewMode === 'archive'
      ? dossier.status === 'delivered'
      : dossier.status !== 'delivered'
  ));

  const filtered = visibleDossiers.filter((dossier) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = q.length === 0
      || dossier.id.toLowerCase().includes(q)
      || dossier.clientName.toLowerCase().includes(q)
      || dossier.bikeName.toLowerCase().includes(q)
      || dossier.chassis.toLowerCase().includes(q);
    const matchesBoard = boardFilter === 'all'
      || ((boardFilter === 'needs_action' || boardFilter === 'pending' || boardFilter === 'docs_received')
        && (dossier.boardStateKey === 'missing_docs' || dossier.boardStateKey === 'ready_to_send'))
      || ((boardFilter === 'in_progress' || boardFilter === 'depot_antt' || boardFilter === 'rejected')
        && (dossier.boardStateKey === 'sent' || dossier.boardStateKey === 'processing'))
      || ((boardFilter === 'completed' || boardFilter === 'delivered')
        && dossier.boardStateKey === 'completed');
    const matchesCompany = companyFilter === 'all' || dossier.company === companyFilter;
    return matchesSearch && matchesBoard && matchesCompany;
  }).sort((a, b) => {
    if (sortBy === 'action_priority') {
      if (a.boardStatePriority !== b.boardStatePriority) {
        return a.boardStatePriority - b.boardStatePriority;
      }
      if (a.boardStateKey === 'missing_docs' && b.boardStateKey === 'missing_docs' && a.missingRequiredCount !== b.missingRequiredCount) {
        return b.missingRequiredCount - a.missingRequiredCount;
      }
      return new Date(b.updatedAtRaw || 0).getTime() - new Date(a.updatedAtRaw || 0).getTime();
    }
    if (sortBy === 'created_desc') {
      return new Date(b.createdAtRaw || 0).getTime() - new Date(a.createdAtRaw || 0).getTime();
    }
    if (sortBy === 'progress_desc') {
      return b.progress - a.progress;
    }
    if (sortBy === 'client_asc') {
      return a.clientName.localeCompare(b.clientName);
    }
    return new Date(b.updatedAtRaw || 0).getTime() - new Date(a.updatedAtRaw || 0).getTime();
  });

  const companies = ['all', ...Array.from(new Set(visibleDossiers.map((item) => item.company).filter(Boolean)))];
  const stats = {
    total: dossiers.length,
    active: dossiers.filter((d) => d.status !== 'delivered').length,
    archived: dossiers.filter((d) => d.status === 'delivered').length,
    sentToFournisseur: dossiers.filter((d) => d.isSentToFournisseur).length,
    needsAction: dossiers.filter((d) => d.boardStateKey === 'missing_docs' || d.boardStateKey === 'ready_to_send').length,
    missingDocs: dossiers.filter((d) => d.boardStateKey === 'missing_docs').length,
    readyToSend: dossiers.filter((d) => d.boardStateKey === 'ready_to_send').length,
    inProgress: dossiers.filter((d) => d.boardStateKey === 'sent' || d.boardStateKey === 'processing').length,
    completed: dossiers.filter((d) => d.boardStateKey === 'completed').length
  };

  const resolveDocumentAccessUrl = async (invoiceId, doc) => {
    const fallbackUrl = buildApiUrl(`/Invoices/${invoiceId}/documents/${doc.documentId}/inline`);

    try {
      const { data: accessResponse } = await api.get(
        `/Invoices/${invoiceId}/documents/${doc.documentId}/sas-url`,
        { timeout: 10000 }
      );

      if (accessResponse.success && accessResponse.data?.url) {
        return accessResponse.data.url;
      }
    } catch (accessError) {
      logDocumentPreviewMetric('revendeur-access-url-fallback-inline', {
        invoiceId,
        documentId: doc.documentId,
        reason: accessError?.message || 'fallback'
      });
    }

    return fallbackUrl;
  };

  const handleDownload = async (dossier, doc) => {
    const key = `download-${dossier.invoiceId}-${doc.documentId}`;
    try {
      setActiveAction(key);
      startBrowserDownload(buildApiUrl(`/Invoices/${dossier.invoiceId}/documents/${doc.documentId}/download`));
      toast.success(tr('Telechargement lance.', 'تم بدء التنزيل.'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('Impossible de telecharger ce document.', 'تعذر تنزيل هذا المستند.')));
    } finally {
      setActiveAction('');
    }
  };

  const handlePreview = async (dossier, doc) => {
    const key = `preview-${dossier.invoiceId}-${doc.documentId}`;
    const title = doc.fileName || (isArabic ? doc.labelAr : doc.label);
    const kind = resolveDocumentPreviewKind(doc.contentType, title);
    const startedAt = performance.now();

    try {
      setActiveAction(key);
      closePreview();
      setPreview({
        url: '',
        kind,
        fileName: title,
        dossierId: dossier.id,
        loading: true,
        error: '',
        startedAt
      });

      if (kind === 'other') {
        setPreview({
          url: '',
          kind,
          fileName: title,
          dossierId: dossier.id,
          loading: false,
          error: '',
          startedAt
        });
        return;
      }

      const url = await resolveDocumentAccessUrl(dossier.invoiceId, doc);
      logDocumentPreviewMetric('revendeur-access-url-prepared', {
        invoiceId: dossier.invoiceId,
        documentId: doc.documentId,
        sizeBytes: doc.sizeBytes,
        kind,
        accessMs: Math.round(performance.now() - startedAt)
      });

      setPreview({
        url,
        kind,
        fileName: title,
        dossierId: dossier.id,
        loading: true,
        error: '',
        startedAt
      });
    } catch (error) {
      setPreview({
        url: '',
        kind,
        fileName: title,
        dossierId: dossier.id,
        loading: false,
        error: getApiErrorMessage(error, tr('Impossible d ouvrir ce document.', 'تعذر فتح هذا المستند.')),
        startedAt
      });
    } finally {
      setActiveAction('');
    }
  };

  const markPreviewReady = useCallback(() => {
    setPreview((prev) => {
      if (!prev?.loading) {
        return prev;
      }

      logDocumentPreviewMetric('revendeur-preview-visible', {
        fileName: prev.fileName,
        kind: prev.kind,
        visibleMs: Math.round(performance.now() - (prev.startedAt || performance.now()))
      });

      return {
        ...prev,
        loading: false
      };
    });
  }, []);

  const handlePreviewAssetError = useCallback(() => {
    setPreview((prev) => (
      prev
        ? {
          ...prev,
          loading: false,
          error: tr('Apercu indisponible. Reessayez dans quelques instants.', 'المعاينة غير متاحة حاليا. حاول مرة أخرى بعد قليل.')
        }
        : prev
    ));
  }, [tr]);

  const startUpload = (dossier, doc) => {
    setUploadTarget({ invoiceId: dossier.invoiceId, docType: doc.type, docLabel: isArabic ? doc.labelAr : doc.label });
    fileInputRef.current?.click();
  };

  const onFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      setUploadTarget(null);
      return;
    }
    if (!uploadTarget) return;

    const key = `upload-${uploadTarget.invoiceId}-${uploadTarget.docType}`;
    try {
      setActiveAction(key);
      const data = new FormData();
      data.append('documentType', String(uploadTarget.docType));
      data.append('file', file);
      await api.post(`/Invoices/${uploadTarget.invoiceId}/documents`, data);
      toast.success(isArabic ? `تم تحديث ${uploadTarget.docLabel}.` : `${uploadTarget.docLabel} mis a jour.`);
      await loadDossiers(uploadTarget.invoiceId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('Impossible de charger ce document.', 'تعذر تحميل هذا المستند.')));
    } finally {
      setActiveAction('');
      setUploadTarget(null);
    }
  };

  const openEmailModal = (dossier) => {
    setEmailModal({
      open: true,
      invoiceId: dossier.invoiceId,
      dossierId: dossier.id,
      to: dossier.clientEmail || '',
      subject: isArabic ? `ملف البطاقة الرمادية - ${dossier.id}` : `Dossier carte grise - ${dossier.id}`,
      message: isArabic
        ? `مرحبا ${dossier.clientName},\n\nملفك قيد المعالجة.\nشكرا.`
        : `Bonjour ${dossier.clientName},\n\nVotre dossier est en cours de traitement.\nMerci.`,
      markAsSentToCompany: false
    });
  };

  const closeEmailModal = () => {
    setEmailModal((prev) => ({ ...prev, open: false }));
  };

  const openSendToFournisseur = (dossier) => {
    const preferred = dossier.assignedFournisseurId || connectedFournisseurs[0]?.profileId || '';
    setSendToFournisseurModal({
      open: true,
      invoiceId: dossier.invoiceId,
      dossierId: dossier.id,
      fournisseurId: preferred ? String(preferred) : '',
      alreadySent: Boolean(dossier.isSentToFournisseur)
    });
  };

  const closeSendToFournisseur = () => {
    setSendToFournisseurModal({ open: false, invoiceId: null, dossierId: '', fournisseurId: '', alreadySent: false });
  };

  const handleSendEmail = async () => {
    if (!emailModal.invoiceId) return;
    if (!emailModal.to.trim()) {
      toast.error(tr('Email destinataire requis.', 'بريد المستلم مطلوب.'));
      return;
    }

    const key = `send-email-${emailModal.invoiceId}`;
    try {
      setActiveAction(key);
      await api.post(`/Invoices/${emailModal.invoiceId}/carte-grise/send-email`, {
        to: emailModal.to.trim(),
        subject: emailModal.subject.trim(),
        message: emailModal.message,
        markAsSentToCompany: emailModal.markAsSentToCompany
      });

      toast.success(tr('Email envoye avec succes.', 'تم إرسال البريد بنجاح.'));
      closeEmailModal();
      await loadDossiers(emailModal.invoiceId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr("Impossible d'envoyer l'email.", 'تعذر إرسال البريد الإلكتروني.')));
    } finally {
      setActiveAction('');
    }
  };

  const handleSendToFournisseur = async () => {
    if (!sendToFournisseurModal.invoiceId) return;
    if (!sendToFournisseurModal.fournisseurId) {
      toast.error(tr('Selectionnez un fournisseur.', 'اختر مزودا.'));
      return;
    }

    const currentDossier = dossiers.find((item) => item.invoiceId === sendToFournisseurModal.invoiceId);
    const missingDocs = (Array.isArray(currentDossier?.documents) ? currentDossier.documents : [])
      .filter((doc) => doc.required && !doc.uploaded)
      .map((doc) => (isArabic ? doc.hintAr || doc.labelAr || doc.hint || doc.label : doc.hint || doc.label || tr('Document requis', 'وثيقة مطلوبة')));
    if (missingDocs.length > 0) {
      showIncompleteDossierToast(missingDocs, tr);
      return;
    }

    const key = `send-to-fournisseur-${sendToFournisseurModal.invoiceId}`;
    try {
      setActiveAction(key);
      await api.post(`/Invoices/${sendToFournisseurModal.invoiceId}/carte-grise/send-to-company`, {
        fournisseurId: Number(sendToFournisseurModal.fournisseurId)
      });
      toast.success(tr('Dossier envoye au fournisseur.', 'تم إرسال الملف إلى المزوّد.'));
      closeSendToFournisseur();
      await loadDossiers(sendToFournisseurModal.invoiceId);
      await loadConnectedFournisseurs();
    } catch (error) {
      if (isMissingDocumentsApiError(error)) {
        showIncompleteDossierToast(missingDocs, tr);
        return;
      }
      toast.error(getApiErrorMessage(error, tr('Impossible d envoyer le dossier au fournisseur.', 'تعذر إرسال الملف إلى المزوّد.')));
    } finally {
      setActiveAction('');
    }
  };

  const handleUpdateCarteStatus = async (dossier, nextStatusKey) => {
    const statusValue = CARTE_GRISE_STATUS_TO_ENUM[nextStatusKey];
    if (statusValue === undefined || !dossier?.invoiceId) return;

    const key = `status-${dossier.invoiceId}`;
    try {
      setActiveAction(key);
      await api.patch(`/Invoices/${dossier.invoiceId}/carte-grise/status`, { status: statusValue });
      toast.success(tr('Statut carte grise mis a jour.', 'تم تحديث حالة البطاقة الرمادية.'));
      await loadDossiers(dossier.invoiceId);
      if (nextStatusKey === 'delivered') {
        setViewMode('archive');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('Impossible de mettre a jour le statut.', 'تعذر تحديث الحالة.')));
    } finally {
      setActiveAction('');
    }
  };

  const handleSaveDocumentIssueMessage = async (dossier) => {
    if (!dossier?.invoiceId) return;

    const checklist = parseChecklistDraft(validationChecklistDraft);
    const reasons = normalizeReasonValues(validationReasonsDraft);
    const key = `issue-${dossier.invoiceId}`;
    try {
      setActiveAction(key);
      await api.patch(`/Invoices/${dossier.invoiceId}/carte-grise/document-validation`, {
        reasons,
        checklist,
        additionalMessage: issueDraft,
        sendChecklistToClient: false
      });
      toast.success(tr('Checklist de correction mise a jour.', 'تم تحديث قائمة التصحيح.'));
      await loadDossiers(dossier.invoiceId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('Impossible de sauvegarder la remarque.', 'تعذر حفظ الملاحظة.')));
    } finally {
      setActiveAction('');
    }
  };

  const handlePublishChecklistToClient = async (dossier) => {
    if (!dossier?.invoiceId) return;

    const checklist = parseChecklistDraft(validationChecklistDraft);
    const reasons = normalizeReasonValues(validationReasonsDraft);
    const key = `issue-${dossier.invoiceId}`;
    try {
      setActiveAction(key);
      await api.patch(`/Invoices/${dossier.invoiceId}/carte-grise/document-validation`, {
        reasons,
        checklist,
        additionalMessage: issueDraft,
        sendChecklistToClient: true
      });
      toast.success(tr('Checklist publiee au client.', 'تم نشر القائمة للحريف.'));
      await loadDossiers(dossier.invoiceId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('Impossible de publier la checklist au client.', 'تعذر نشر القائمة للحريف.')));
    } finally {
      setActiveAction('');
    }
  };

  const handleSaveClientMessage = async (dossier) => {
    if (!dossier?.invoiceId) return;

    const key = `client-message-${dossier.invoiceId}`;
    try {
      setActiveAction(key);
      await api.patch(`/Invoices/${dossier.invoiceId}/carte-grise/client-message`, {
        message: clientMessageDraft
      });
      toast.success(tr('Message client mis a jour.', 'تم تحديث رسالة الحريف.'));
      await loadDossiers(dossier.invoiceId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('Impossible de sauvegarder le message client.', 'تعذر حفظ رسالة الحريف.')));
    } finally {
      setActiveAction('');
    }
  };

  const handleDeleteDossier = async (dossier) => {
    if (!dossier?.invoiceId) return;

    const confirmed = window.confirm(tr(`Supprimer le dossier ${dossier.id} ? Cette action est irreversible.`, `حذف الملف ${dossier.id}؟ هذا الإجراء نهائي.`));
    if (!confirmed) return;

    const key = `delete-${dossier.invoiceId}`;
    try {
      setActiveAction(key);
      await api.delete(`/Invoices/${dossier.invoiceId}`);
      toast.success(tr('Dossier supprime avec succes.', 'تم حذف الملف بنجاح.'));

      if (openDossier?.invoiceId === dossier.invoiceId) {
        closeDossierModal();
      }

      await loadDossiers();
    } catch (error) {
      toast.error(getApiErrorMessage(error, tr('Impossible de supprimer ce dossier.', 'تعذر حذف هذا الملف.')));
    } finally {
      setActiveAction('');
    }
  };

  const getMissingDocLabels = useCallback((dossier) => (
    Array.isArray(dossier?.missingRequiredDocuments)
      ? dossier.missingRequiredDocuments.map((doc) => (
        isArabic
          ? (doc.hintAr || doc.labelAr || doc.hint || doc.label)
          : (doc.hint || doc.label || doc.hintAr || doc.labelAr)
      )).filter(Boolean)
      : []
  ), [isArabic]);

  const getBoardSummary = useCallback((dossier) => {
    switch (dossier.boardStateKey) {
      case 'missing_docs':
        return dossier.missingRequiredCount <= 1
          ? tr('1 document manquant', 'وثيقة واحدة ناقصة')
          : tr(`${dossier.missingRequiredCount} documents manquants`, `${dossier.missingRequiredCount} وثائق ناقصة`);
      case 'ready_to_send':
        return tr('Dossier complet', 'الملف مكتمل');
      case 'sent':
        return tr('Envoye au fournisseur', 'تم ارساله الى المزوّد');
      case 'processing':
        return tr('Dossier en traitement', 'الملف قيد المعالجة');
      case 'completed':
        return tr('Dossier termine', 'الملف منتهي');
      default:
        return tr('Action requise', 'يوجد اجراء مطلوب');
    }
  }, [tr]);

  const getBoardDetail = useCallback((dossier) => {
    const missingLabels = getMissingDocLabels(dossier);
    if (dossier.boardStateKey === 'missing_docs') {
      const preview = missingLabels.slice(0, 2).join(', ');
      const extra = missingLabels.length > 2 ? tr(` +${missingLabels.length - 2}`, ` +${missingLabels.length - 2}`) : '';
      return preview
        ? `${tr('Manque:', 'ينقص:')} ${preview}${extra}`
        : tr('Ouvrez le dossier pour completer les pieces requises.', 'افتح الملف لاكمال الوثائق المطلوبة.');
    }
    if (dossier.boardStateKey === 'ready_to_send') {
      return connectedFournisseurs.length > 0
        ? tr('Tous les documents requis sont la. Vous pouvez envoyer le dossier maintenant.', 'كل الوثائق المطلوبة موجودة. يمكنك ارسال الملف الآن.')
        : tr('Dossier pret, mais aucun fournisseur connecte.', 'الملف جاهز لكن لا يوجد مزوّد متصل.');
    }
    if (dossier.boardStateKey === 'sent') {
      return dossier.assignedFournisseurName
        ? `${tr('Envoye a', 'تم الارسال الى')} ${dossier.assignedFournisseurName}`
        : tr('Envoye au fournisseur, en attente de prise en charge.', 'تم الارسال الى المزوّد وفي انتظار المعالجة.');
    }
    if (dossier.boardStateKey === 'processing') {
      return tr('Suivez les etapes et mettez le statut a jour sans quitter le dashboard.', 'تابع المراحل وحدّث الحالة مباشرة من اللوحة.');
    }
    return tr('Le dossier est termine. Ouvrez-le pour verifier ou archiver.', 'الملف منتهي. افتحه للمراجعة او الارشفة.');
  }, [connectedFournisseurs.length, getMissingDocLabels, tr]);

  const getBoardSteps = useCallback((dossier) => {
    const current = dossier.workflowStepIndex;
    return [
      { key: 'documents', label: tr('Documents', 'الوثائق'), state: current === 0 ? 'current' : current > 0 ? 'done' : 'future' },
      { key: 'complete', label: tr('Complet', 'مكتمل'), state: current === 1 ? 'current' : current > 1 ? 'done' : 'future' },
      { key: 'sent', label: tr('Envoye', 'مرسل'), state: current === 2 ? 'current' : current > 2 ? 'done' : 'future' },
      { key: 'processing', label: tr('En cours', 'قيد العمل'), state: current === 3 ? 'current' : current > 3 ? 'done' : 'future' },
      { key: 'completed', label: tr('Termine', 'منتهي'), state: current === 4 ? 'current' : 'future' }
    ];
  }, [tr]);

  const getPrimaryAction = (dossier) => {
    if (dossier.boardStateKey === 'missing_docs') {
      return {
        label: tr('Ajouter documents', 'اضافة الوثائق'),
        onClick: () => openDossierWithDetails(dossier),
        disabled: false
      };
    }

    if (dossier.boardStateKey === 'ready_to_send') {
      return {
        label: tr('Envoyer au fournisseur', 'ارسال الى المزوّد'),
        onClick: () => openSendToFournisseur(dossier),
        disabled: connectedFournisseurs.length === 0
      };
    }

    if (dossier.boardStateKey === 'sent') {
      return {
        label: tr('Suivre dossier', 'متابعة الملف'),
        onClick: () => openDossierWithDetails(dossier),
        disabled: false
      };
    }

    if (dossier.boardStateKey === 'processing') {
      return {
        label: tr('Voir details', 'عرض التفاصيل'),
        onClick: () => openDossierWithDetails(dossier),
        disabled: false
      };
    }

    return {
      label: tr('Voir dossier', 'عرض الملف'),
      onClick: () => openDossierWithDetails(dossier),
      disabled: false
    };
  };

  const getQuickActions = (dossier) => {
    const actions = [];
    const firstMissingDoc = dossier.missingRequiredDocuments?.[0] || null;

    if (dossier.boardStateKey === 'missing_docs' && firstMissingDoc) {
      actions.push({
        key: `upload-next-${dossier.invoiceId}`,
        label: tr('Uploader', 'رفع'),
        onClick: () => startUpload(dossier, firstMissingDoc),
        disabled: activeAction === `upload-${dossier.invoiceId}-${firstMissingDoc.type}`,
        tone: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      });
    }

    if (dossier.boardStateKey === 'ready_to_send') {
      actions.push({
        key: `send-${dossier.invoiceId}`,
        label: tr('Envoyer', 'ارسال'),
        onClick: () => openSendToFournisseur(dossier),
        disabled: connectedFournisseurs.length === 0,
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      });
    }

    if (dossier.boardStateKey === 'sent' && dossier.status !== 'in_progress' && dossier.status !== 'depot_antt') {
      actions.push({
        key: `mark-processing-${dossier.invoiceId}`,
        label: tr('Passer en cours', 'بدء المعالجة'),
        onClick: () => handleUpdateCarteStatus(dossier, 'in_progress'),
        disabled: activeAction === `status-${dossier.invoiceId}`,
        tone: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
      });
    }

    if (dossier.boardStateKey === 'processing' && dossier.status !== 'completed' && dossier.status !== 'delivered') {
      actions.push({
        key: `mark-complete-${dossier.invoiceId}`,
        label: tr('Marquer termine', 'تعليم كمنتهي'),
        onClick: () => handleUpdateCarteStatus(dossier, 'completed'),
        disabled: activeAction === `status-${dossier.invoiceId}`,
        tone: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
      });
    }

    if (dossier.boardStateKey === 'completed' && dossier.status !== 'delivered') {
      actions.push({
        key: `archive-${dossier.invoiceId}`,
        label: tr('Archiver', 'ارشفة'),
        onClick: () => handleUpdateCarteStatus(dossier, 'delivered'),
        disabled: activeAction === `status-${dossier.invoiceId}`,
        tone: 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
      });
    }

    actions.push({
      key: `details-${dossier.invoiceId}`,
      label: tr('Details', 'تفاصيل'),
      onClick: () => openDossierWithDetails(dossier),
      disabled: false,
      tone: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
    });

    return actions.slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.jfif,.heic,.heif,.avif" className="hidden" onChange={onFileSelected} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-4 sm:px-6 py-6 sm:py-7 text-white">
          <h1 className="text-3xl font-bold">{tr('Carte Grise', 'البطاقة الرمادية')}</h1>
          <p className="mt-2 text-sm text-slate-200">
            {tr('Suivez les dossiers, les documents recus et les envois fournisseur.', 'تابع الملفات، الوثائق المستلمة، وإرساليات المزوّد.')}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {isArabic ? `${stats.inProgress} ملف قيد المعالجة` : `${stats.inProgress} dossier(s) controle/depot`}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {isArabic ? `${stats.sentToFournisseur} تم إرسالها للمزوّد` : `${stats.sentToFournisseur} envoye(s) fournisseur`}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {isArabic ? `${stats.archived} ملف مؤرشف` : `${stats.archived} dossier(s) archives`}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {tr('Vue:', 'العرض:')} {viewMode === 'archive' ? tr('Archive', 'الأرشيف') : tr('Actifs', 'النشطة')}
            </span>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr('Rechercher dossier, client, moto, chassis...', 'ابحث عن ملف، حريف، دراجة، رقم هيكل...')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1">
                <button
                  onClick={() => setViewMode('active')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'active' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {tr('Actifs', 'النشطة')} ({stats.active})
                </button>
                <button
                  onClick={() => setViewMode('archive')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'archive' ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {tr('Archive', 'الأرشيف')} ({stats.archived})
                </button>
              </div>
              <button
                onClick={() => loadDossiers(openDossier?.invoiceId || null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {loading ? tr('Chargement...', 'جار التحميل...') : tr('Rafraichir', 'تحديث')}
              </button>
              <button
                onClick={() => {
                  setSearch('');
                  setCompanyFilter('all');
                  setBoardFilter('all');
                  setSortBy('action_priority');
                  setViewMode('active');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {tr('Reinitialiser', 'إعادة الضبط')}
              </button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">{tr('Priorite du jour', 'أولوية اليوم')}</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">{tr('Un board pour agir vite, pas pour chercher.', 'لوحة للعمل السريع، لا للبحث.')}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {tr("Reperez les dossiers bloques, completez les pieces manquantes puis envoyez les dossiers complets au fournisseur sans quitter la page.", 'شاهد الملفات المتوقفة، اكمل الوثائق الناقصة ثم ارسل الملفات الجاهزة الى المزوّد دون مغادرة الصفحة.')}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{tr('A completer', 'بحاجة الى اكمال')}</p>
                  <p className="mt-1 text-2xl font-black text-white">{stats.missingDocs}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{tr('Prets a envoyer', 'جاهزة للارسال')}</p>
                  <p className="mt-1 text-2xl font-black text-white">{stats.readyToSend}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{tr('En cours', 'قيد المعالجة')}</p>
                  <p className="mt-1 text-2xl font-black text-white">{stats.inProgress}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-1">
            <article className="hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{tr('Dossiers visibles', 'الملفات الظاهرة')}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{filtered.length}</p>
            </article>
            <article className="hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{tr('Total dossiers', 'إجمالي الملفات')}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
            </article>
            <article className="rounded-3xl border border-rose-200 bg-rose-50/90 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-amber-700">{tr('En attente', 'في الانتظار')}</p>
              <p className="mt-2 text-3xl font-black text-rose-950">{stats.needsAction}</p>
              <p className="mt-2 text-sm text-rose-700">{tr('A completer ou a envoyer maintenant.', 'تحتاج اكمالا او ارسالا الآن.')}</p>
            </article>
            <article className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-blue-700">{tr('Controle + Depot ANTT', 'قيد المعالجة')}</p>
              <p className="mt-2 text-3xl font-black text-amber-950">{stats.inProgress}</p>
              <p className="mt-2 text-sm text-amber-700">{tr('Envoyes ou deja en traitement.', 'تم ارسالها او هي قيد المعالجة.')}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-emerald-700">{tr('Termines', 'مكتملة')}</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{stats.completed}</p>
              <p className="mt-2 text-sm text-slate-600">{tr('Completes ou archives.', 'مكتملة او مؤرشفة.')}</p>
            </article>
            <article className="hidden rounded-xl border border-slate-300 bg-slate-100/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-700">{tr('Archives (livree)', 'الأرشيف (تم التسليم)')}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.archived}</p>
            </article>
          </div>
        </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              {companies.map((company) => (
                <option key={company} value={company}>
                  {company === 'all' ? tr('Tous fournisseurs', 'كل المزودين') : company}
                </option>
              ))}
            </select>
            <select
              value={boardFilter}
              onChange={(e) => setBoardFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{tr('Tous les dossiers', 'كل الملفات')}</option>
              <option value="needs_action">{tr('A traiter', 'يحتاج اجراء')}</option>
              <option value="in_progress">{tr('En cours', 'قيد المعالجة')}</option>
              <option value="completed">{tr('Termines', 'منتهية')}</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {isArabic ? option.labelAr : option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto mb-4 h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
              />
            </svg>
            <h3 className="mb-1 text-lg font-semibold text-slate-900">
              {viewMode === 'archive' ? tr('Aucun dossier archive', 'لا يوجد ملف في الأرشيف') : tr('Aucun dossier trouve', 'لم يتم العثور على ملفات')}
            </h3>
            <p className="text-slate-600">
              {viewMode === 'archive'
                ? tr('Les dossiers marques livree apparaissent ici.', 'الملفات التي تم تعليمها "تم التسليم" تظهر هنا.')
                : tr('Aucun resultat ne correspond aux filtres appliques.', 'لا توجد نتائج مطابقة للفلاتر المطبقة.')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{tr('Dossiers Carte Grise', 'ملفات البطاقة الرمادية')}</p>
              <p className="text-xs font-medium text-slate-500">{isArabic ? `${filtered.length} نتيجة` : `${filtered.length} resultat(s)`}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((dossier) => {
                const status = STATUS_META[dossier.status] || STATUS_META.pending;
                const boardMeta = BOARD_STATE_META[dossier.boardStateKey] || BOARD_STATE_META.missing_docs;
                const primaryAction = getPrimaryAction(dossier);
                const quickActions = getQuickActions(dossier);
                const steps = getBoardSteps(dossier);
                return (
                  <article
                    key={dossier.id}
                    className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${boardMeta.glow} opacity-70`} />
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${boardMeta.rail}`} />
                    <div className="relative space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-700 to-slate-950 text-sm font-black text-white shadow-lg">
                            {dossier.clientAvatar}
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{tr('Dossier', 'ملف')}</p>
                            <p className="font-mono text-sm font-black text-slate-950">{dossier.id}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${boardMeta.badge}`}>
                          {isArabic ? boardMeta.labelAr : boardMeta.label}
                        </span>
                      </div>

                      <div>
                        <p className="text-lg font-black text-slate-950">{dossier.clientName}</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{dossier.bikeName}</p>
                        <p className="mt-1 text-xs text-slate-500">{tr('Chassis', 'رقم الهيكل')}: {dossier.chassis}</p>
                      </div>

                      <div className={`rounded-3xl border p-4 shadow-sm ${boardMeta.softPanel}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{tr('Situation', 'الوضعية')}</p>
                            <p className="mt-2 text-xl font-black tracking-tight text-slate-950">{getBoardSummary(dossier)}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{getBoardDetail(dossier)}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${status.chip}`}>
                            {isArabic ? status.labelAr : status.label}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 font-semibold text-slate-700">
                            {dossier.isSentToFournisseur ? tr('Envoye', 'تم الارسال') : tr('Non envoye', 'لم يرسل بعد')}
                          </span>
                          <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 font-semibold text-slate-700">
                            {tr('MAJ', 'آخر تحديث')}: {dossier.updatedAt}
                          </span>
                          {(dossier.assignedFournisseurName || dossier.company) && (
                            <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 font-semibold text-slate-700">
                              {tr('Fournisseur', 'المزوّد')}: {dossier.assignedFournisseurName || dossier.company}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {steps.map((step, index) => (
                            <div key={step.key} className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                                  step.state === 'done'
                                    ? 'bg-slate-900 text-white'
                                    : step.state === 'current'
                                      ? 'border border-slate-900 bg-white text-slate-900'
                                      : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {step.label}
                              </span>
                              {index < steps.length - 1 && <span className="text-slate-300">→</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled}
                        className={`w-full rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-black text-white shadow-lg transition ${boardMeta.button} disabled:cursor-not-allowed disabled:opacity-55`}
                      >
                        {primaryAction.label}
                      </button>

                      <div className="flex flex-wrap gap-2">
                        {quickActions.map((action) => (
                          <button
                            key={action.key}
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${action.tone}`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 sm:px-6 py-4">
              <p className="text-sm text-slate-600">
                {tr('Affichage de', 'عرض')} <span className="font-semibold">{filtered.length}</span> {tr('sur', 'من أصل')}{' '}
                <span className="font-semibold">{visibleDossiers.length}</span> {tr('dossiers', 'ملف')}
              </p>
            </div>
          </>
        )}
      </section>

      {openDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]" onClick={closeDossierModal}>
          <div className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{tr('Dossier Carte Grise', 'ملف البطاقة الرمادية')}</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">{openDossier.id}</h2>
                <p className="text-sm text-slate-600">{openDossier.clientName} | {tr('Facture', 'فاتورة')} {openDossier.invoiceNumber}</p>
              </div>
              <button onClick={closeDossierModal} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">{tr('Fermer', 'إغلاق')}</button>
            </div>
            <div className="p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <p className="text-sm font-semibold text-slate-700">{tr('Moto', 'الدراجة')}: <span className="font-bold text-slate-900">{openDossier.bikeName}</span></p>
                <p className="text-sm font-semibold text-slate-700">{tr('Client', 'الحريف')}: <span className="font-bold text-slate-900">{openDossier.clientName}</span></p>
                <p className="text-xs text-slate-500">{tr('Chassis', 'رقم الهيكل')}: {openDossier.chassis}</p>
                <p className="text-xs text-slate-500">{tr('Email client', 'بريد الحريف')}: {openDossier.clientEmail || '-'}</p>
                <div className="inline-flex items-center gap-2">
                  <div className="h-6 w-6 overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-bold text-white">
                    {openDossier.assignedFournisseurAvatar ? (
                      <img
                        src={openDossier.assignedFournisseurAvatar}
                        alt={openDossier.assignedFournisseurName || 'Fournisseur'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {getInitials(openDossier.assignedFournisseurName || 'Fournisseur')}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {tr('Fournisseur assigne', 'المزوّد المعيّن')}: {openDossier.assignedFournisseurName || '-'}
                  </p>
                </div>
                <p className="text-xs text-slate-500">{tr('Envoye fournisseur', 'إرسال للمزوّد')}: {openDossier.sentToFournisseurAt || '-'}</p>
                <p className="text-xs text-slate-500">{tr('Cree le', 'تاريخ الإنشاء')} {openDossier.createdAt}</p>
                <p className="text-xs text-slate-500">{tr('Derniere MAJ', 'آخر تحديث')} {openDossier.updatedAt}</p>
              </div>

              <div className={`mb-4 rounded-xl border p-4 ${openDossier.isSentToFournisseur ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{tr('Transmission fournisseur', 'إرسال للمزوّد')}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex items-center gap-2">
                    <span className={`relative inline-flex h-6 w-11 items-center rounded-full border ${openDossier.isSentToFournisseur ? 'border-emerald-300 bg-emerald-500' : 'border-slate-300 bg-slate-200'}`}>
                      <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${openDossier.isSentToFournisseur ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </span>
                    <span className={`text-sm font-bold ${openDossier.isSentToFournisseur ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {openDossier.isSentToFournisseur ? tr('Envoye au fournisseur', 'تم الإرسال للمزوّد') : tr('Pas encore envoye', 'لم يتم الإرسال بعد')}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">{openDossier.sentToFournisseurAt || '-'}</p>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {openDossier.isSentToFournisseur
                    ? `${tr('Dernier envoi vers', 'آخر إرسال إلى')}: ${openDossier.assignedFournisseurName || openDossier.company || '-'}.`
                    : tr('Ce dossier n a pas encore ete transmis au fournisseur.', 'هذا الملف لم يتم إرساله للمزوّد بعد.')}
                </p>
              </div>

              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{tr('Statut carte grise', 'حالة البطاقة الرمادية')}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <select
                    value={openDossier.status}
                    onChange={(event) => handleUpdateCarteStatus(openDossier, event.target.value)}
                    disabled={activeAction === `status-${openDossier.invoiceId}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="pending">{tr('En attente', 'في الانتظار')}</option>
                    <option value="docs_received">{tr('Docs recus', 'الوثائق مستلمة')}</option>
                    <option value="in_progress">{tr('Controle qualite', 'قيد المعالجة')}</option>
                    <option value="depot_antt">{tr('Depot ANTT', 'Depot ANTT')}</option>
                    <option value="completed">{tr('Carte grise prete', 'مكتمل')}</option>
                    <option value="rejected">{tr('Rejete', 'مرفوض')}</option>
                    <option value="delivered">{tr('Livree (archive)', 'تم التسليم (أرشيف)')}</option>
                  </select>
                  <p className="text-xs text-slate-500">
                    {tr('MAJ statut', 'آخر تحديث للحالة')}: {openDossier.statusUpdatedAt || '-'}
                  </p>
                </div>
                {openDossier.status !== 'delivered' && (
                  <button
                    onClick={() => handleUpdateCarteStatus(openDossier, 'delivered')}
                    disabled={activeAction === `status-${openDossier.invoiceId}` || openDossier.status !== 'completed'}
                    className="mt-3 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-60"
                  >
                    {openDossier.status === 'completed'
                      ? tr('Marquer livree et archiver', 'تعليم كمسلّمة وأرشفة')
                      : tr('Livree disponible apres statut Carte grise prete', 'التسليم متاح بعد حالة مكتمل')}
                  </button>
                )}
              </div>

              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{tr('Remarque dossier (revendeur <-> fournisseur)', 'ملاحظة الملف (البائع <-> المزوّد)')}</p>
                    <p className="mt-1 text-xs text-amber-900/80">{tr('Checklist de verification et remarque interne. Ouvrez la popup pour modifier.', 'قائمة تحقق وملاحظة داخلية. افتح النافذة للتعديل.')}</p>
                    <p className="mt-2 max-h-16 overflow-hidden whitespace-pre-wrap text-xs text-amber-900/90">
                      {openDossier.documentIssueMessage || tr('Aucune remarque active.', 'لا توجد ملاحظة نشطة.')}
                    </p>
                    <p className="mt-2 text-xs text-amber-900/80">{tr('Derniere MAJ', 'آخر تحديث')}: {openDossier.documentIssueUpdatedAt || '-'}</p>
                  </div>
                  <button
                    onClick={() => setDetailsModal({ open: true, type: 'issue' })}
                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                  >
                    {tr('Ouvrir remarque', 'فتح الملاحظة')}
                  </button>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">{tr('Message client (visible portail client)', 'رسالة الحريف (ظاهرة في البوابة)')}</p>
                    <p className="mt-1 text-xs text-blue-900/80">{tr('Message public pour le client. Ouvrez la popup pour modifier.', 'رسالة عامة للحريف. افتح النافذة للتعديل.')}</p>
                    <p className="mt-2 max-h-16 overflow-hidden whitespace-pre-wrap text-xs text-blue-900/90">
                      {openDossier.clientUpdateMessage || tr('Aucun message client.', 'لا توجد رسالة للحريف.')}
                    </p>
                    <p className="mt-2 text-xs text-blue-900/80">{tr('Derniere MAJ', 'آخر تحديث')}: {openDossier.clientUpdateUpdatedAt || '-'}</p>
                  </div>
                  <button
                    onClick={() => setDetailsModal({ open: true, type: 'client' })}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    {tr('Ouvrir message client', 'فتح رسالة الحريف')}
                  </button>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{tr('Timeline dossier', 'تسلسل الملف')}</p>
                <div className="mt-3 space-y-2">
                  {(openDossier.timeline || []).length === 0 ? (
                    <p className="text-xs text-slate-500">{tr('Aucun evenement dossier.', 'لا توجد أحداث للملف.')}</p>
                  ) : (
                    openDossier.timeline.map((event) => {
                      const actorName = event.actorRole === 'fournisseur'
                        ? (openDossier.assignedFournisseurName || tr('Fournisseur', 'المزوّد'))
                        : event.actorRole === 'revendeur'
                          ? (openDossier.revendeurName || tr('Revendeur', 'البائع'))
                          : tr('Systeme', 'النظام');
                      const actorAvatar = event.actorRole === 'fournisseur'
                        ? openDossier.assignedFournisseurAvatar
                        : event.actorRole === 'revendeur'
                          ? openDossier.revendeurAvatar
                          : '';

                      return (
                        <div key={`timeline-${event.eventId || event.createdAtRaw}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="h-8 w-8 overflow-hidden rounded-md bg-gradient-to-br from-slate-700 to-slate-900 text-[11px] font-bold text-white">
                                {actorAvatar ? (
                                  <img src={actorAvatar} alt={actorName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">{getInitials(actorName)}</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-900">{event.title}</p>
                                <p className="text-[11px] text-slate-500">{actorName}</p>
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-500">{event.createdAt}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-600">{event.message || '-'}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {openDossier.documents.map((doc) => {
                  const uploadKey = `upload-${openDossier.invoiceId}-${doc.type}`;
                  const previewKey = `preview-${openDossier.invoiceId}-${doc.documentId}`;
                  const downloadKey = `download-${openDossier.invoiceId}-${doc.documentId}`;
                  return (
                    <article key={doc.key} className={`rounded-xl border p-4 shadow-sm ${doc.uploaded ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/70'}`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {(isArabic ? doc.labelAr : doc.label)}{doc.required ? ' *' : ''}
                          </p>
                          <p className="text-xs text-slate-500">{isArabic ? doc.hintAr : doc.hint}</p>
                          {doc.uploaded ? (
                            <p className="mt-2 text-xs font-semibold text-slate-700">
                              {doc.fileName} | {formatFileSize(doc.sizeBytes)} | {tr('Maj', 'تحديث')}: {formatDateTime(doc.updatedAt, locale)}
                              {doc.fromLegacy ? ` | ${tr('Source: CIN legacy', 'المصدر: CIN قديم')}` : ''}
                            </p>
                          ) : (
                            <p className={`mt-2 text-xs font-semibold ${doc.required ? 'text-amber-700' : 'text-slate-500'}`}>
                              {doc.required ? tr('Document manquant', 'وثيقة ناقصة') : tr('Document optionnel non fourni', 'وثيقة اختيارية غير مرفقة')}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {doc.uploaded && doc.documentId && <>
                            <button onClick={() => handlePreview(openDossier, doc)} disabled={activeAction === previewKey} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{activeAction === previewKey ? tr('Ouverture...', 'جار الفتح...') : tr('Voir', 'عرض')}</button>
                            <button onClick={() => handleDownload(openDossier, doc)} disabled={activeAction === downloadKey} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{activeAction === downloadKey ? tr('Chargement...', 'جار التحميل...') : tr('Telecharger', 'تنزيل')}</button>
                          </>}
                          <button onClick={() => startUpload(openDossier, doc)} disabled={activeAction === uploadKey} className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60 ${doc.uploaded ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}>{activeAction === uploadKey ? tr('Upload...', 'جار الرفع...') : doc.uploaded ? tr('Remplacer', 'استبدال') : tr('Uploader', 'رفع')}</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => openEmailModal(openDossier)}
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white hover:from-blue-700 hover:to-indigo-700"
                >
                  {tr('Envoyer par mail', 'إرسال عبر البريد')}
                </button>
                <button
                  onClick={() => openSendToFournisseur(openDossier)}
                  disabled={connectedFournisseurs.length === 0}
                  className="rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-bold text-white hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60"
                >
                  {openDossier.isSentToFournisseur ? tr('Renvoyer au fournisseur', 'إعادة الإرسال للمزوّد') : tr('Envoyer au fournisseur', 'إرسال إلى المزوّد')}
                </button>
                <button
                  onClick={() => handleDeleteDossier(openDossier)}
                  disabled={activeAction === `delete-${openDossier.invoiceId}`}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  {activeAction === `delete-${openDossier.invoiceId}` ? tr('Suppression...', 'جار الحذف...') : tr('Supprimer dossier', 'حذف الملف')}
                </button>
              </div>
              {!openDossier.clientEmail && (
                <p className="mt-2 text-xs text-slate-600">{tr("Email client manquant. Vous pouvez le saisir manuellement dans la fenetre d'envoi.", 'بريد الحريف غير موجود. يمكنك إدخاله يدويًا في نافذة الإرسال.')}</p>
              )}
              {connectedFournisseurs.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">{tr('Aucun fournisseur connecte. Acceptez un partenariat avant envoi.', 'لا يوجد مزوّد متصل. اقبل شراكة قبل الإرسال.')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {detailsModal.open && openDossier && (
        <div className="fixed inset-0 z-[72] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]" onClick={closeDetailsModal}>
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {detailsModal.type === 'issue' ? tr('Remarque dossier', 'ملاحظة الملف') : tr('Message client', 'رسالة الحريف')}
                </p>
                <p className="text-xs text-slate-500">{openDossier.id}</p>
              </div>
              <button onClick={closeDetailsModal} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{tr('Fermer', 'إغلاق')}</button>
            </div>

            <div className="space-y-3 p-4">
              {detailsModal.type === 'issue' ? (
                <>
                  <p className="text-xs text-amber-900/80">{tr('Verification document uniquement: selectionnez les motifs et la checklist.', 'التحقق من الوثائق فقط: اختر الأسباب وقائمة الإصلاح.')}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {VALIDATION_REASONS.map((reason) => {
                      const checked = validationReasonsDraft.includes(reason.value);
                      return (
                        <label key={`modal-reason-${reason.value}`} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...validationReasonsDraft, reason.value]
                                : validationReasonsDraft.filter((value) => value !== reason.value);
                              setValidationReasonsDraft(normalizeReasonValues(next));
                            }}
                          />
                          {isArabic ? reason.labelAr : reason.label}
                        </label>
                      );
                    })}
                  </div>
                  <textarea
                    rows={4}
                    value={validationChecklistDraft}
                    onChange={(event) => setValidationChecklistDraft(event.target.value)}
                    placeholder={tr('Checklist correction (1 ligne = 1 action)\nEx: Reuploader CIN verso lisible\nEx: Ajouter signature sur facture', 'قائمة التصحيح (كل سطر = إجراء واحد)\nمثال: أعد رفع CIN الخلفية بشكل واضح\nمثال: أضف الإمضاء على الفاتورة')}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={3}
                    value={issueDraft}
                    onChange={(event) => setIssueDraft(event.target.value)}
                    placeholder={tr('Commentaire additionnel (optionnel)', 'تعليق إضافي (اختياري)')}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-amber-900/80">{tr('Derniere MAJ', 'آخر تحديث')}: {openDossier.documentIssueUpdatedAt || '-'}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleSaveDocumentIssueMessage(openDossier)}
                        disabled={activeAction === `issue-${openDossier.invoiceId}`}
                        className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                      >
                        {activeAction === `issue-${openDossier.invoiceId}` ? tr('Sauvegarde...', 'جار الحفظ...') : tr('Sauvegarder checklist', 'حفظ القائمة')}
                      </button>
                      <button
                        onClick={() => handlePublishChecklistToClient(openDossier)}
                        disabled={activeAction === `issue-${openDossier.invoiceId}`}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {activeAction === `issue-${openDossier.invoiceId}` ? tr('Publication...', 'جار النشر...') : tr('Publier au client', 'نشر للحريف')}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-blue-900/80">{tr('Ce message est visible par le client dans son portail.', 'هذه الرسالة تظهر للحريف في البوابة الخاصة به.')}</p>
                  <textarea
                    rows={5}
                    value={clientMessageDraft}
                    onChange={(event) => setClientMessageDraft(event.target.value)}
                    placeholder={tr('Ex: Votre carte grise est prete, merci de passer au showroom.', 'مثال: بطاقتك الرمادية جاهزة، يرجى المرور إلى المعرض.')}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-blue-900/80">{tr('Derniere MAJ', 'آخر تحديث')}: {openDossier.clientUpdateUpdatedAt || '-'}</p>
                    <button
                      onClick={() => handleSaveClientMessage(openDossier)}
                      disabled={activeAction === `client-message-${openDossier.invoiceId}`}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {activeAction === `client-message-${openDossier.invoiceId}` ? tr('Sauvegarde...', 'جار الحفظ...') : tr('Publier message client', 'نشر رسالة الحريف')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {emailModal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]" onClick={closeEmailModal}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{tr('Envoyer Email Dossier', 'إرسال بريد للملف')}</p>
                <p className="text-xs text-slate-500">{emailModal.dossierId}</p>
              </div>
              <button onClick={closeEmailModal} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{tr('Fermer', 'إغلاق')}</button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{tr('Destinataire', 'المستلم')}</label>
                <input
                  type="email"
                  value={emailModal.to}
                  onChange={(event) => setEmailModal((prev) => ({ ...prev, to: event.target.value }))}
                  placeholder={tr('email@exemple.com', 'email@example.com')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{tr('Sujet', 'الموضوع')}</label>
                <input
                  type="text"
                  value={emailModal.subject}
                  onChange={(event) => setEmailModal((prev) => ({ ...prev, subject: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{tr('Message', 'الرسالة')}</label>
                <textarea
                  rows={5}
                  value={emailModal.message}
                  onChange={(event) => setEmailModal((prev) => ({ ...prev, message: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleSendEmail}
                disabled={activeAction === `send-email-${emailModal.invoiceId}`}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {activeAction === `send-email-${emailModal.invoiceId}` ? tr('Envoi...', 'جار الإرسال...') : tr('Envoyer email', 'إرسال البريد')}
              </button>
            </div>
          </div>
        </div>
      )}

      {sendToFournisseurModal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]" onClick={closeSendToFournisseur}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{sendToFournisseurModal.alreadySent ? tr('Renvoyer au fournisseur', 'إعادة الإرسال للمزوّد') : tr('Envoyer au fournisseur', 'إرسال إلى المزوّد')}</p>
                <p className="text-xs text-slate-500">{sendToFournisseurModal.dossierId}</p>
              </div>
              <button onClick={closeSendToFournisseur} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{tr('Fermer', 'إغلاق')}</button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{tr('Fournisseur connecte', 'المزوّد المتصل')}</label>
                <select
                  value={sendToFournisseurModal.fournisseurId}
                  onChange={(event) => setSendToFournisseurModal((prev) => ({ ...prev, fournisseurId: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">{tr('Selectionner un fournisseur', 'اختر مزوّدًا')}</option>
                  {connectedFournisseurs.map((item) => (
                    <option key={item.profileId} value={String(item.profileId)}>
                      {item.businessName}{item.city ? ` - ${item.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSendToFournisseur}
                disabled={activeAction === `send-to-fournisseur-${sendToFournisseurModal.invoiceId}` || connectedFournisseurs.length === 0}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {activeAction === `send-to-fournisseur-${sendToFournisseurModal.invoiceId}` ? tr('Envoi...', 'جار الإرسال...') : sendToFournisseurModal.alreadySent ? tr('Renvoyer dossier', 'إعادة إرسال الملف') : tr('Envoyer dossier', 'إرسال الملف')}
              </button>
            </div>
          </div>
        </div>
      )}

      <DocumentPreviewModal
        preview={preview}
        onClose={closePreview}
        onReady={markPreviewReady}
        onAssetError={handlePreviewAssetError}
        closeLabel={tr('Fermer', 'إغلاق')}
        loadingLabel={tr('Chargement du document...', 'جار تحميل الوثيقة...')}
        loadingHint={tr(
          "La fenetre s'ouvre immediatement puis le document se charge en streaming.",
          'تفتح النافذة فوراً ثم يتم تحميل الوثيقة تدريجياً.'
        )}
        unsupportedLabel={tr('Apercu non supporte pour ce format.', 'المعاينة غير مدعومة لهذا النوع.')}
      />
    </div>
  );
}

export default CarteGrisePage;
