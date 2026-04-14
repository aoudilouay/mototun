import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { fournisseurDossiersQueryOptions } from '../../lib/appQueries';
import { resolveAvatarUrl } from '../../utils/avatar';
import { optimizeDocumentImageUpload } from '../../utils/imageTransform';
import DocumentPreviewModal from '../../components/documents/DocumentPreviewModal';
import {
  buildApiUrl,
  logDocumentPreviewMetric,
  resolveDocumentPreviewKind,
  startBrowserDownload
} from '../../features/documents/documentPreview';

const DOCUMENT_CATALOG = [
  { type: 6, key: 'cin_front', label: 'CIN Front', hint: 'Recto CIN', required: true },
  { type: 7, key: 'cin_back', label: 'CIN Back', hint: 'Verso CIN', required: true },
  { type: 3, key: 'facture', label: 'Facture', hint: 'Facture signee/scannee', required: true },
  { type: 1, key: 'declaration', label: "Declaration d'impot", hint: 'Derniere declaration', required: true },
  { type: 5, key: 'autre', label: 'Autre document', hint: 'Document complementaire', required: false }
];

const BOARD_STATE_META = {
  missing_docs: {
    label: 'Documents a completer',
    badge: 'border-rose-200 bg-rose-100 text-rose-700',
    panel: 'border-rose-200 bg-rose-50/90',
    rail: 'from-rose-500 via-orange-500 to-amber-500',
    button: 'from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600'
  },
  ready_review: {
    label: 'Pret a traiter',
    badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    panel: 'border-emerald-200 bg-emerald-50/90',
    rail: 'from-emerald-500 via-teal-500 to-cyan-500',
    button: 'from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600'
  },
  processing: {
    label: 'En traitement',
    badge: 'border-amber-200 bg-amber-100 text-amber-700',
    panel: 'border-amber-200 bg-amber-50/90',
    rail: 'from-amber-500 via-orange-500 to-yellow-500',
    button: 'from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600'
  },
  completed: {
    label: 'Carte grise prete',
    badge: 'border-sky-200 bg-sky-100 text-sky-700',
    panel: 'border-sky-200 bg-sky-50/90',
    rail: 'from-sky-500 via-blue-500 to-indigo-500',
    button: 'from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700'
  },
  archived: {
    label: 'Archive',
    badge: 'border-slate-300 bg-slate-100 text-slate-700',
    panel: 'border-slate-200 bg-slate-50/90',
    rail: 'from-slate-500 via-slate-600 to-slate-700',
    button: 'from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900'
  }
};

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
  { value: 1, label: 'Document flou' },
  { value: 2, label: 'Signature manquante' },
  { value: 3, label: 'Incoherence des informations' },
  { value: 4, label: 'Page manquante' },
  { value: 5, label: 'Document expire' },
  { value: 6, label: 'Document incomplet' }
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

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('fr-FR');
}

function isRecentUpdate(value, hours = 72) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= hours * 60 * 60 * 1000;
}

function mapTimelineEvents(rawEvents) {
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
        createdAt: formatDateTime(event?.createdAt)
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

function isArchivedStatus(status) {
  return status === 'completed' || status === 'delivered';
}

function mapDocuments(docsRaw) {
  const docs = Array.isArray(docsRaw) ? docsRaw : [];
  const byType = new Map();
  for (const doc of docs) {
    const type = Number(doc.documentType);
    if (!byType.has(type)) {
      byType.set(type, doc);
    }
  }

  const legacyCin = byType.get(0);

  return DOCUMENT_CATALOG.map((item) => {
    const fromLegacy = Boolean(!byType.get(item.type) && (item.type === 6 || item.type === 7) && legacyCin);
    let doc = byType.get(item.type);
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

function getBoardStateKey({ status, missingRequiredCount }) {
  if (status === 'delivered') return 'archived';
  if (status === 'completed') return 'completed';
  if (status === 'rejected' || missingRequiredCount > 0) return 'missing_docs';
  if (status === 'in_progress' || status === 'depot_antt') return 'processing';
  return 'ready_review';
}

function getBoardStatePriority(boardStateKey) {
  switch (boardStateKey) {
    case 'missing_docs':
      return 0;
    case 'ready_review':
      return 1;
    case 'processing':
      return 2;
    case 'completed':
      return 3;
    case 'archived':
      return 4;
    default:
      return 5;
  }
}

function getWorkflowStepIndex(boardStateKey) {
  switch (boardStateKey) {
    case 'missing_docs':
      return 0;
    case 'ready_review':
      return 1;
    case 'processing':
      return 2;
    case 'completed':
      return 3;
    case 'archived':
      return 4;
    default:
      return 0;
  }
}

function buildRevendeurKey(revendeurId, revendeurName) {
  if (Number.isInteger(revendeurId) && revendeurId > 0) {
    return `rid-${revendeurId}`;
  }

  const normalizedName = String(revendeurName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  return normalizedName ? `rname-${normalizedName}` : 'r-unknown';
}

function mapInvoiceToDossier(invoice) {
  const sold = Array.isArray(invoice?.soldMotorcycles) ? invoice.soldMotorcycles[0] || {} : {};
  const parsedRevendeurId = Number(invoice?.revendeurId);
  const revendeurId = Number.isInteger(parsedRevendeurId) && parsedRevendeurId > 0 ? parsedRevendeurId : null;
  const officialRevendeurName = String(invoice?.revendeurBusinessName || '').trim();
  const revendeurName = officialRevendeurName || (revendeurId ? `Revendeur #${revendeurId}` : 'Revendeur inconnu');
  const fournisseurName = String(invoice?.assignedFournisseurBusinessName || '').trim() || 'Fournisseur';
  const status = normalizeStatus(invoice?.carteGriseStatus);
  const documents = mapDocuments(invoice?.documents);
  const requiredDocs = documents.filter((doc) => doc.required);
  const uploadedRequired = requiredDocs.filter((doc) => doc.uploaded).length;
  const missingRequiredDocuments = requiredDocs.filter((doc) => !doc.uploaded);
  const missingRequiredCount = missingRequiredDocuments.length;
  const boardStateKey = getBoardStateKey({ status, missingRequiredCount });

  return {
    id: `CG-${invoice?.invoiceNumber || invoice?.invoiceId || '---'}`,
    invoiceId: invoice?.invoiceId ?? null,
    invoiceNumber: invoice?.invoiceNumber ?? '-',
    clientName: invoice?.clientFullName || '-',
    clientAvatar: getInitials(invoice?.clientFullName),
    revendeurId,
    revendeurName,
    revendeurAvatar: resolveAvatarUrl(invoice?.revendeurAvatar || ''),
    fournisseurName,
    fournisseurAvatar: resolveAvatarUrl(invoice?.assignedFournisseurAvatar || ''),
    revendeurKey: buildRevendeurKey(revendeurId, revendeurName),
    bikeName: `${sold?.brand || '-'} ${sold?.model || '-'}`.trim(),
    chassis: sold?.chassisNumber || '-',
    status,
    boardStateKey,
    boardStatePriority: getBoardStatePriority(boardStateKey),
    workflowStepIndex: getWorkflowStepIndex(boardStateKey),
    progress: getProgress(status, uploadedRequired, requiredDocs.length),
    uploadedCount: uploadedRequired,
    requiredCount: requiredDocs.length,
    missingRequiredCount,
    missingRequiredDocuments,
    documents,
    documentIssueMessage: invoice?.documentIssueMessage || '',
    documentIssueReasons: normalizeReasonValues(invoice?.documentIssueReasons),
    documentFixChecklist: Array.isArray(invoice?.documentFixChecklist)
      ? invoice.documentFixChecklist.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    documentIssueUpdatedAt: formatDateTime(invoice?.documentIssueUpdatedAt),
    clientUpdateMessage: invoice?.clientUpdateMessage || '',
    clientUpdateUpdatedAt: formatDateTime(invoice?.clientUpdateUpdatedAt),
    statusUpdatedAt: formatDateTime(invoice?.carteGriseStatusUpdatedAt),
    sentToFournisseurAt: formatDateTime(invoice?.sentToFournisseurAt),
    timeline: mapTimelineEvents(invoice?.timeline),
    createdAtRaw: invoice?.invoiceDate || invoice?.createdAt || null,
    updatedAtRaw: invoice?.updatedAt || invoice?.createdAt || null,
    createdAt: formatDate(invoice?.invoiceDate || invoice?.createdAt),
    updatedAt: formatDate(invoice?.updatedAt || invoice?.createdAt)
  };
}

function FournisseurCarteGrisePage() {
  const queryClient = useQueryClient();
  const dossiersQueryOptions = fournisseurDossiersQueryOptions();
  const dossiersQueryKey = dossiersQueryOptions.queryKey;

  const [dossiers, setDossiers] = useState([]);
  const [viewMode, setViewMode] = useState('active');
  const [search, setSearch] = useState('');
  const [revendeurSearch, setRevendeurSearch] = useState('');
  const [selectedRevendeurKey, setSelectedRevendeurKey] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dossierPageSize, setDossierPageSize] = useState(12);
  const [dossierPage, setDossierPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [openDossier, setOpenDossier] = useState(null);
  const [preview, setPreview] = useState(null);
  const [activeAction, setActiveAction] = useState('');
  const [uploadTarget, setUploadTarget] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ open: false, type: '' });
  const [issueDraft, setIssueDraft] = useState('');
  const [validationReasonsDraft, setValidationReasonsDraft] = useState([]);
  const [validationChecklistDraft, setValidationChecklistDraft] = useState('');
  const fileInputRef = useRef(null);
  const deferredSearch = useDeferredValue(search);
  const deferredRevendeurSearch = useDeferredValue(revendeurSearch);

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

  const loadDossiers = useCallback(async (keepOpenInvoiceId = null) => {
    try {
      setLoading(true);
      const cached = queryClient.getQueryData(dossiersQueryKey);
      if (cached) {
        const cachedList = Array.isArray(cached) ? cached : [];
        setDossiers(cachedList.map(mapInvoiceToDossier));
      }

      const data = await queryClient.ensureQueryData(dossiersQueryOptions);
      const next = (Array.isArray(data) ? data : []).map(mapInvoiceToDossier);
      setDossiers(next);
      if (keepOpenInvoiceId) {
        setOpenDossier(next.find((item) => item.invoiceId === keepOpenInvoiceId) || null);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de charger les dossiers fournisseur.'));
    } finally {
      setLoading(false);
    }
  }, [dossiersQueryKey, dossiersQueryOptions, queryClient]);

  useEffect(() => {
    loadDossiers();
  }, [loadDossiers]);

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key !== 'Escape') return;
      if (detailsModal.open) {
        closeDetailsModal();
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
  }, [closeDetailsModal, closeDossierModal, closePreview, detailsModal.open, openDossier, preview]);

  useEffect(() => {
    if (!openDossier && detailsModal.open) {
      closeDetailsModal();
    }
  }, [closeDetailsModal, detailsModal.open, openDossier]);

  useEffect(() => {
    setIssueDraft(openDossier?.documentIssueMessage || '');
    setValidationReasonsDraft(normalizeReasonValues(openDossier?.documentIssueReasons));
    setValidationChecklistDraft((openDossier?.documentFixChecklist || []).join('\n'));
  }, [openDossier?.invoiceId, openDossier?.documentIssueMessage, openDossier?.documentIssueReasons, openDossier?.documentFixChecklist]);

  const filteredDossiers = useMemo(() => (
    dossiers
      .filter((dossier) => {
        const q = deferredSearch.trim().toLowerCase();
        const matchesSearch = q.length === 0
          || dossier.id.toLowerCase().includes(q)
          || dossier.clientName.toLowerCase().includes(q)
          || dossier.bikeName.toLowerCase().includes(q)
          || dossier.chassis.toLowerCase().includes(q)
          || dossier.revendeurName.toLowerCase().includes(q);

        const matchesStatus = statusFilter === 'all' || dossier.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => (
        a.boardStatePriority - b.boardStatePriority
        || new Date(b.updatedAtRaw || 0).getTime() - new Date(a.updatedAtRaw || 0).getTime()
      ))
  ), [deferredSearch, dossiers, statusFilter]);

  const revendeurGroups = useMemo(() => {
    const groupsMap = new Map();

    for (const dossier of filteredDossiers) {
      const key = dossier.revendeurKey || 'r-unknown';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          revendeurId: dossier.revendeurId,
          revendeurName: dossier.revendeurName || 'Revendeur inconnu',
          revendeurAvatar: dossier.revendeurAvatar || '',
          dossiers: [],
          activeCount: 0,
          archiveCount: 0,
          actionCount: 0,
          processingCount: 0,
          completedCount: 0,
          lastUpdatedAtRaw: dossier.updatedAtRaw || null
        });
      }

      const group = groupsMap.get(key);
      group.dossiers.push(dossier);
      if (dossier.revendeurAvatar && !group.revendeurAvatar) {
        group.revendeurAvatar = dossier.revendeurAvatar;
      }
      const dossierUpdatedTs = new Date(dossier.updatedAtRaw || 0).getTime();
      const groupUpdatedTs = new Date(group.lastUpdatedAtRaw || 0).getTime();
      if (dossierUpdatedTs > groupUpdatedTs) {
        group.lastUpdatedAtRaw = dossier.updatedAtRaw || group.lastUpdatedAtRaw;
      }
      if (isArchivedStatus(dossier.status)) group.archiveCount += 1;
      else group.activeCount += 1;
      if (dossier.boardStateKey === 'missing_docs' || dossier.boardStateKey === 'ready_review') group.actionCount += 1;
      if (dossier.boardStateKey === 'processing') group.processingCount += 1;
      if (dossier.boardStateKey === 'completed' || dossier.boardStateKey === 'archived') group.completedCount += 1;
    }

    return Array.from(groupsMap.values())
      .map((group) => ({
        ...group,
        dossiers: group.dossiers.sort((a, b) => (
          a.boardStatePriority - b.boardStatePriority
          || new Date(b.updatedAtRaw || 0).getTime() - new Date(a.updatedAtRaw || 0).getTime()
        ))
      }))
      .sort((a, b) => (
        b.actionCount - a.actionCount
        || b.processingCount - a.processingCount
        || b.dossiers.length - a.dossiers.length
        || a.revendeurName.localeCompare(b.revendeurName, 'fr', { sensitivity: 'base' })
      ));
  }, [filteredDossiers]);

  const filteredRevendeurGroups = useMemo(() => {
    const q = deferredRevendeurSearch.trim().toLowerCase();
    if (!q) return revendeurGroups;
    return revendeurGroups.filter((group) => (
      group.revendeurName.toLowerCase().includes(q)
      || String(group.revendeurId || '').includes(q)
    ));
  }, [deferredRevendeurSearch, revendeurGroups]);

  useEffect(() => {
    if (filteredRevendeurGroups.length === 0) {
      setSelectedRevendeurKey('');
      return;
    }

    const selectedStillExists = filteredRevendeurGroups.some((group) => group.key === selectedRevendeurKey);
    if (!selectedStillExists) {
      setSelectedRevendeurKey(filteredRevendeurGroups[0].key);
    }
  }, [filteredRevendeurGroups, selectedRevendeurKey]);

  const selectedRevendeurGroup = useMemo(
    () => filteredRevendeurGroups.find((group) => group.key === selectedRevendeurKey) || null,
    [filteredRevendeurGroups, selectedRevendeurKey]
  );

  const selectedGroupActiveCount = useMemo(
    () => (selectedRevendeurGroup?.dossiers || []).filter((dossier) => !isArchivedStatus(dossier.status)).length,
    [selectedRevendeurGroup]
  );

  const selectedGroupArchiveCount = useMemo(
    () => (selectedRevendeurGroup?.dossiers || []).filter((dossier) => isArchivedStatus(dossier.status)).length,
    [selectedRevendeurGroup]
  );

  const activeGroupDossiers = useMemo(
    () =>
      (selectedRevendeurGroup?.dossiers || []).filter((dossier) => (
        viewMode === 'archive'
          ? isArchivedStatus(dossier.status)
          : !isArchivedStatus(dossier.status)
      )),
    [selectedRevendeurGroup, viewMode]
  );

  const dossierTotalForView = activeGroupDossiers.length;
  const dossierTotalPages = Math.max(1, Math.ceil(dossierTotalForView / dossierPageSize));
  const currentDossierPage = Math.min(dossierPage, dossierTotalPages);
  const dossierPageStart = dossierTotalForView === 0 ? 0 : (currentDossierPage - 1) * dossierPageSize + 1;
  const dossierPageEnd = Math.min(currentDossierPage * dossierPageSize, dossierTotalForView);

  const paginatedGroupDossiers = useMemo(
    () => activeGroupDossiers.slice((currentDossierPage - 1) * dossierPageSize, currentDossierPage * dossierPageSize),
    [activeGroupDossiers, currentDossierPage, dossierPageSize]
  );

  useEffect(() => {
    setDossierPage(1);
  }, [selectedRevendeurKey, viewMode, search, statusFilter, revendeurSearch, dossierPageSize]);

  useEffect(() => {
    if (dossierPage > dossierTotalPages) {
      setDossierPage(dossierTotalPages);
    }
  }, [dossierPage, dossierTotalPages]);

  const stats = useMemo(() => ({
    total: dossiers.length,
    actionRequired: dossiers.filter((d) => d.boardStateKey === 'missing_docs' || d.boardStateKey === 'ready_review').length,
    processing: dossiers.filter((d) => d.boardStateKey === 'processing').length,
    completed: dossiers.filter((d) => d.boardStateKey === 'completed' || d.boardStateKey === 'archived').length,
    active: dossiers.filter((d) => !isArchivedStatus(d.status)).length,
    archived: dossiers.filter((d) => isArchivedStatus(d.status)).length,
    revendeurs: new Set(dossiers.map((d) => d.revendeurKey)).size
  }), [dossiers]);

  const resolveDocumentAccessUrl = async (invoiceId, doc) => {
    const fallbackUrl = buildApiUrl(`/Invoices/fournisseur/carte-grise/${invoiceId}/documents/${doc.documentId}/inline`);

    try {
      const { data: accessResponse } = await api.get(
        `/Invoices/fournisseur/carte-grise/${invoiceId}/documents/${doc.documentId}/sas-url`,
        { timeout: 10000 }
      );

      if (accessResponse.success && accessResponse.data?.url) {
        return accessResponse.data.url;
      }
    } catch (accessError) {
      logDocumentPreviewMetric('fournisseur-access-url-fallback-inline', {
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
      startBrowserDownload(buildApiUrl(`/Invoices/fournisseur/carte-grise/${dossier.invoiceId}/documents/${doc.documentId}/download`));
      toast.success('Telechargement lance.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de telecharger ce document.'));
    } finally {
      setActiveAction('');
    }
  };

  const handleDownloadAll = async (dossier) => {
    if (!dossier?.invoiceId) return;
    const key = `download-all-${dossier.invoiceId}`;
    try {
      setActiveAction(key);
      startBrowserDownload(buildApiUrl(`/Invoices/fournisseur/carte-grise/${dossier.invoiceId}/documents/download-all`));
      toast.success('Telechargement de l archive lance.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de telecharger tous les documents.'));
    } finally {
      setActiveAction('');
    }
  };

  const handlePreview = async (dossier, doc) => {
    const key = `preview-${dossier.invoiceId}-${doc.documentId}`;
    const title = doc.fileName || doc.label;
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
      logDocumentPreviewMetric('fournisseur-access-url-prepared', {
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
        error: getApiErrorMessage(error, 'Impossible d ouvrir ce document.'),
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

      logDocumentPreviewMetric('fournisseur-preview-visible', {
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
          error: 'Apercu indisponible. Reessayez dans quelques instants.'
        }
        : prev
    ));
  }, []);

  const startUpload = (dossier, doc) => {
    setUploadTarget({ invoiceId: dossier.invoiceId, docType: doc.type, docLabel: doc.label });
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
      const preparedUpload = await optimizeDocumentImageUpload(file);
      const data = new FormData();
      data.append('documentType', String(uploadTarget.docType));
      data.append('file', preparedUpload.file);
      await api.post(`/Invoices/fournisseur/carte-grise/${uploadTarget.invoiceId}/documents`, data);
      toast.success(`${uploadTarget.docLabel} ajoute.`);
      await loadDossiers(uploadTarget.invoiceId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible d envoyer ce document.'));
    } finally {
      setActiveAction('');
      setUploadTarget(null);
    }
  };

  const handleUpdateCarteStatus = useCallback(async (dossier, nextStatusKey) => {
    if (nextStatusKey === 'delivered') {
      toast.error('Le statut Livree est reserve au revendeur.');
      return;
    }

    const statusValue = CARTE_GRISE_STATUS_TO_ENUM[nextStatusKey];
    if (statusValue === undefined || !dossier?.invoiceId) return;

    const key = `status-${dossier.invoiceId}`;
    try {
      setActiveAction(key);
      await api.patch(`/Invoices/${dossier.invoiceId}/carte-grise/status`, { status: statusValue });
      toast.success('Statut carte grise mis a jour.');
      await loadDossiers(dossier.invoiceId);
      if (nextStatusKey === 'completed') {
        setViewMode('archive');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de mettre a jour le statut.'));
    } finally {
      setActiveAction('');
    }
  }, [loadDossiers]);

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
      toast.success('Checklist de correction mise a jour.');
      await loadDossiers(dossier.invoiceId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de sauvegarder la remarque dossier.'));
    } finally {
      setActiveAction('');
    }
  };

  const getMissingDocLabels = useCallback((dossier) => (
    Array.isArray(dossier?.missingRequiredDocuments)
      ? dossier.missingRequiredDocuments.map((doc) => doc.hint || doc.label).filter(Boolean)
      : []
  ), []);

  const getBoardSummary = useCallback((dossier) => {
    switch (dossier.boardStateKey) {
      case 'missing_docs':
        return dossier.missingRequiredCount <= 1
          ? '1 document a completer'
          : `${dossier.missingRequiredCount} documents a completer`;
      case 'ready_review':
        return 'Dossier pret a traiter';
      case 'processing':
        return 'Traitement en cours';
      case 'completed':
        return 'Carte grise prete';
      case 'archived':
        return 'Dossier archive';
      default:
        return 'Action requise';
    }
  }, []);

  const getBoardDetail = useCallback((dossier) => {
    const missingLabels = getMissingDocLabels(dossier);
    if (dossier.boardStateKey === 'missing_docs') {
      const preview = missingLabels.slice(0, 2).join(', ');
      const extra = missingLabels.length > 2 ? ` +${missingLabels.length - 2}` : '';
      return preview
        ? `Manque: ${preview}${extra}`
        : 'Ouvrez le dossier pour completer les pieces requises.';
    }
    if (dossier.boardStateKey === 'ready_review') {
      return 'Tous les documents requis sont la. Vous pouvez lancer le traitement.';
    }
    if (dossier.boardStateKey === 'processing') {
      return 'Mettez a jour le statut et controlez les documents sans quitter le workspace.';
    }
    if (dossier.boardStateKey === 'completed') {
      return 'Le dossier est termine et pret pour la suite cote revendeur.';
    }
    return 'Dossier archive pour consultation et suivi.';
  }, [getMissingDocLabels]);

  const getBoardSteps = useCallback((dossier) => {
    const current = dossier.workflowStepIndex;
    return [
      { key: 'documents', label: 'Documents', state: current === 0 ? 'current' : current > 0 ? 'done' : 'future' },
      { key: 'complete', label: 'Complet', state: current === 1 ? 'current' : current > 1 ? 'done' : 'future' },
      { key: 'processing', label: 'En cours', state: current === 2 ? 'current' : current > 2 ? 'done' : 'future' },
      { key: 'ready', label: 'Pret', state: current === 3 ? 'current' : current > 3 ? 'done' : 'future' },
      { key: 'archive', label: 'Archive', state: current === 4 ? 'current' : 'future' }
    ];
  }, []);

  const getPrimaryAction = useCallback((dossier) => {
    if (dossier.boardStateKey === 'missing_docs') {
      return {
        label: 'Completer documents',
        onClick: () => setOpenDossier(dossier),
        disabled: false
      };
    }

    if (dossier.boardStateKey === 'ready_review') {
      return {
        label: 'Commencer traitement',
        onClick: () => handleUpdateCarteStatus(dossier, 'in_progress'),
        disabled: activeAction === `status-${dossier.invoiceId}`
      };
    }

    if (dossier.boardStateKey === 'processing') {
      return {
        label: 'Voir details',
        onClick: () => setOpenDossier(dossier),
        disabled: false
      };
    }

    return {
      label: 'Voir dossier',
      onClick: () => setOpenDossier(dossier),
      disabled: false
    };
  }, [activeAction, handleUpdateCarteStatus]);

  const getQuickActions = useCallback((dossier) => {
    const actions = [];
    const firstMissingDoc = dossier.missingRequiredDocuments?.[0] || null;

    if (dossier.boardStateKey === 'missing_docs' && firstMissingDoc) {
      actions.push({
        key: `upload-next-${dossier.invoiceId}`,
        label: 'Uploader',
        onClick: () => startUpload(dossier, firstMissingDoc),
        disabled: activeAction === `upload-${dossier.invoiceId}-${firstMissingDoc.type}`,
        tone: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      });
    }

    if (dossier.boardStateKey === 'processing' && dossier.status !== 'completed' && dossier.status !== 'delivered') {
      actions.push({
        key: `mark-complete-${dossier.invoiceId}`,
        label: 'Marquer prete',
        onClick: () => handleUpdateCarteStatus(dossier, 'completed'),
        disabled: activeAction === `status-${dossier.invoiceId}`,
        tone: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
      });
    }

    actions.push({
      key: `details-${dossier.invoiceId}`,
      label: 'Ouvrir',
      onClick: () => setOpenDossier(dossier),
      disabled: false,
      tone: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
    });

    return actions.slice(0, 2);
  }, [activeAction, handleUpdateCarteStatus]);

  const requiredOpenDocs = openDossier ? openDossier.documents.filter((doc) => doc.required) : [];
  const uploadedOpenDocs = openDossier ? openDossier.documents.filter((doc) => doc.uploaded) : [];
  const sentDocs = requiredOpenDocs.filter((doc) => doc.uploaded);
  const missingDocs = requiredOpenDocs.filter((doc) => !doc.uploaded);
  const completionRate = requiredOpenDocs.length > 0
    ? Math.round((sentDocs.length / requiredOpenDocs.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.jfif,.heic,.heif,.avif" className="hidden" onChange={onFileSelected} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-4 py-6 text-white sm:px-6 sm:py-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">Workspace fournisseur</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Carte Grise Fournisseur</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">
                Gardez chaque workspace revendeur clair, completer les pieces manquantes et lancez le traitement sans chercher dans plusieurs ecrans.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium">{stats.revendeurs} workspace(s)</span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium">{stats.total} dossier(s)</span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium">Vue: {viewMode === 'archive' ? 'Archive' : 'Actifs'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspaces</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{stats.revendeurs}</p>
              <p className="mt-1 text-xs text-slate-500">Revendeurs avec dossiers actifs ou archives</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">A traiter</p>
              <p className="mt-2 text-2xl font-black text-rose-900">{stats.actionRequired}</p>
              <p className="mt-1 text-xs text-rose-700">Pieces a completer ou dossiers prets a lancer</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">En cours</p>
              <p className="mt-2 text-2xl font-black text-amber-900">{stats.processing}</p>
              <p className="mt-1 text-xs text-amber-700">Traitements deja demarres</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Termines</p>
              <p className="mt-2 text-2xl font-black text-sky-900">{stats.completed}</p>
              <p className="mt-1 text-xs text-sky-700">Prets ou deja archives</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher dossier, client, moto, chassis..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={revendeurSearch}
                onChange={(event) => setRevendeurSearch(event.target.value)}
                placeholder="Filtrer workspace revendeur..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 xl:max-w-xs"
              />

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1">
                  <button
                    onClick={() => setViewMode('active')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'active' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    Actifs ({stats.active})
                  </button>
                  <button
                    onClick={() => setViewMode('archive')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'archive' ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    Archive ({stats.archived})
                  </button>
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="all">Tous statuts</option>
                  <option value="pending">En attente</option>
                  <option value="docs_received">Docs recus</option>
                  <option value="in_progress">Controle qualite</option>
                  <option value="depot_antt">Depot ANTT</option>
                  <option value="completed">Carte grise prete</option>
                  <option value="rejected">Rejete</option>
                  <option value="delivered">Livree</option>
                </select>
                <button
                  onClick={() => loadDossiers(openDossier?.invoiceId || null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {loading ? 'Chargement...' : 'Rafraichir'}
                </button>
                <button
                  onClick={() => {
                    setSearch('');
                    setRevendeurSearch('');
                    setStatusFilter('all');
                    setViewMode('active');
                    setSelectedRevendeurKey('');
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reinitialiser
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Chargement des dossiers...</div>
          ) : filteredDossiers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
              Aucun dossier trouve avec ces filtres.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workspaces revendeur</p>
                  <p className="mt-1 text-sm text-slate-600">Les dossiers les plus urgents remontent automatiquement en haut.</p>
                </div>
                <div className="max-h-[720px] space-y-3 overflow-auto p-3">
                  {filteredRevendeurGroups.map((group) => {
                    const active = group.key === selectedRevendeurKey;
                    return (
                      <button
                        key={group.key}
                        onClick={() => setSelectedRevendeurKey(group.key)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-blue-300 bg-blue-50 shadow-[0_18px_40px_-28px_rgba(37,99,235,0.55)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-10 w-10 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-950 text-xs font-bold text-white shadow-inner">
                              {group.revendeurAvatar ? (
                                <img src={group.revendeurAvatar} alt={group.revendeurName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">{getInitials(group.revendeurName)}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{group.revendeurName}</p>
                              <p className="text-[11px] text-slate-500">Maj: {formatDate(group.lastUpdatedAtRaw)}</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{group.dossiers.length}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">A traiter: {group.actionCount}</span>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">En cours: {group.processingCount}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">Termines: {group.completedCount}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="space-y-4">
                {!selectedRevendeurGroup ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600 sm:p-6">
                    Selectionnez un workspace revendeur pour afficher ses dossiers.
                  </div>
                ) : (
                  <>
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="bg-gradient-to-r from-slate-50 via-white to-blue-50 px-4 py-4 sm:px-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-950 text-sm font-bold text-white shadow-sm">
                              {selectedRevendeurGroup.revendeurAvatar ? (
                                <img src={selectedRevendeurGroup.revendeurAvatar} alt={selectedRevendeurGroup.revendeurName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">{getInitials(selectedRevendeurGroup.revendeurName)}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace revendeur</p>
                              <h2 className="truncate text-2xl font-black text-slate-900">{selectedRevendeurGroup.revendeurName}</h2>
                              <p className="mt-1 text-sm text-slate-600">Les dossiers a traiter et les traitements en cours restent visibles dans ce workspace.</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">A traiter: {selectedRevendeurGroup.actionCount}</span>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">En cours: {selectedRevendeurGroup.processingCount}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Termines: {selectedRevendeurGroup.completedCount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{selectedRevendeurGroup.dossiers.length} dossier(s)</span>
                          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
                            <button
                              onClick={() => setViewMode('active')}
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${viewMode === 'active' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                              En cours ({selectedGroupActiveCount})
                            </button>
                            <button
                              onClick={() => setViewMode('archive')}
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${viewMode === 'archive' ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                              Archive ({selectedGroupArchiveCount})
                            </button>
                          </div>
                        </div>

                        {activeGroupDossiers.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <label htmlFor="dossier-page-size" className="text-xs font-semibold text-slate-600">Dossiers/page</label>
                            <select
                              id="dossier-page-size"
                              value={dossierPageSize}
                              onChange={(event) => setDossierPageSize(Number(event.target.value))}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              <option value={12}>12</option>
                              <option value={24}>24</option>
                              <option value={48}>48</option>
                            </select>
                            <span className="text-xs text-slate-600">{dossierPageStart}-{dossierPageEnd} sur {dossierTotalForView}</span>
                            <button
                              onClick={() => setDossierPage((prev) => Math.max(1, prev - 1))}
                              disabled={currentDossierPage <= 1}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Prec
                            </button>
                            <button
                              onClick={() => setDossierPage((prev) => Math.min(dossierTotalPages, prev + 1))}
                              disabled={currentDossierPage >= dossierTotalPages}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Suiv
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {activeGroupDossiers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                        {viewMode === 'archive' ? 'Aucun dossier archive pour ce workspace.' : 'Aucun dossier actif pour ce workspace.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                        {paginatedGroupDossiers.map((dossier) => {
                          const board = BOARD_STATE_META[dossier.boardStateKey] || BOARD_STATE_META.ready_review;
                          const primaryAction = getPrimaryAction(dossier);
                          const quickActions = getQuickActions(dossier);
                          const boardSteps = getBoardSteps(dossier);

                          return (
                            <article key={dossier.id} className={`overflow-hidden rounded-3xl border bg-white shadow-[0_22px_60px_-36px_rgba(15,23,42,0.35)] ${board.panel}`}>
                              <div className="px-5 pb-5 pt-5">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700">
                                      {dossier.clientAvatar}
                                    </div>
                                    <div>
                                      <p className="font-mono text-sm font-bold text-slate-900">{dossier.id}</p>
                                      <p className="text-xs text-slate-500">Facture {dossier.invoiceNumber}</p>
                                    </div>
                                  </div>
                                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${board.badge}`}>{board.label}</span>
                                </div>

                                <div className="mt-5 space-y-1">
                                  <p className="text-lg font-black text-slate-950">{dossier.clientName}</p>
                                  <p className="text-sm font-medium text-slate-700">{dossier.bikeName}</p>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                    <span>Chassis: {dossier.chassis}</span>
                                    <span>Envoye le: {dossier.sentToFournisseurAt || '-'}</span>
                                    <span>Maj: {dossier.updatedAt}</span>
                                  </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situation</p>
                                      <p className="mt-1 text-base font-black text-slate-950">{getBoardSummary(dossier)}</p>
                                      <p className="mt-1 text-sm text-slate-600">{getBoardDetail(dossier)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pieces</p>
                                      <p className="mt-1 text-sm font-black text-slate-900">{dossier.uploadedCount}/{dossier.requiredCount}</p>
                                    </div>
                                  </div>

                                  <div className="mt-4 h-2 rounded-full bg-slate-200">
                                    <div className={`h-2 rounded-full bg-gradient-to-r ${board.rail}`} style={{ width: `${dossier.progress}%` }} />
                                  </div>

                                  <div className="mt-4 grid grid-cols-5 gap-2">
                                    {boardSteps.map((step) => {
                                      const stateClass = step.state === 'done'
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : step.state === 'current'
                                          ? 'border-blue-200 bg-blue-100 text-blue-700'
                                          : 'border-slate-200 bg-white text-slate-400';

                                      return (
                                        <div key={step.key} className={`flex h-9 items-center justify-center rounded-2xl border text-[11px] font-semibold ${stateClass}`}>
                                          {step.label}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <button
                                    onClick={primaryAction.onClick}
                                    disabled={primaryAction.disabled}
                                    className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition disabled:cursor-not-allowed disabled:opacity-50 ${board.button}`}
                                  >
                                    {primaryAction.label}
                                  </button>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {quickActions.map((action) => (
                                      <button
                                        key={action.key}
                                        onClick={action.onClick}
                                        disabled={action.disabled}
                                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${action.tone}`}
                                      >
                                        {action.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {openDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]" onClick={closeDossierModal}>
          <div className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dossier Carte Grise</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">{openDossier.id}</h2>
                <p className="text-sm text-slate-600">{openDossier.clientName} | Facture {openDossier.invoiceNumber}</p>
                <p className="text-xs text-slate-500">Revendeur: {openDossier.revendeurName}</p>
              </div>
              <button onClick={closeDossierModal} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">Fermer</button>
            </div>

            <div className="p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <p className="text-sm font-semibold text-slate-700">Moto: <span className="font-bold text-slate-900">{openDossier.bikeName}</span></p>
                <p className="text-sm font-semibold text-slate-700">Client: <span className="font-bold text-slate-900">{openDossier.clientName}</span></p>
                <p className="text-xs text-slate-500">Chassis: {openDossier.chassis}</p>
                <p className="text-xs text-slate-500">Envoye fournisseur: {openDossier.sentToFournisseurAt || '-'}</p>
                <p className="text-xs text-slate-500">Cree le {openDossier.createdAt}</p>
                <p className="text-xs text-slate-500">Derniere MAJ {openDossier.updatedAt}</p>
              </div>

              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Checklist GED</p>
                    <p className="text-sm font-bold text-slate-900">{sentDocs.length}/{requiredOpenDocs.length} document(s) requis recu(s)</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${missingDocs.length === 0 ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-amber-200 bg-amber-100 text-amber-700'}`}>
                    {missingDocs.length === 0 ? 'Dossier complet' : `${missingDocs.length} manquant(s)`}
                  </span>
                </div>

                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${completionRate}%` }} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {openDossier.documents.map((doc) => (
                    <div
                      key={`check-${doc.key}`}
                      className={`rounded-lg border px-3 py-2 ${doc.uploaded ? 'border-emerald-200 bg-emerald-50/80' : 'border-amber-200 bg-amber-50/80'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{doc.label}{doc.required ? ' *' : ''}</p>
                          <p className="text-xs text-slate-500">{doc.hint}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${doc.uploaded ? 'border-emerald-300 bg-emerald-500' : 'border-slate-300 bg-slate-200'}`}>
                            <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${doc.uploaded ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </span>
                          <span className={`text-xs font-bold ${doc.uploaded ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {doc.uploaded ? 'Envoye' : doc.required ? 'Manquant' : 'Optionnel'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Statut carte grise</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <select
                    value={openDossier.status}
                    onChange={(event) => handleUpdateCarteStatus(openDossier, event.target.value)}
                    disabled={activeAction === `status-${openDossier.invoiceId}` || openDossier.status === 'delivered'}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="pending">En attente</option>
                    <option value="docs_received">Docs recus</option>
                    <option value="in_progress">Controle qualite</option>
                    <option value="depot_antt">Depot ANTT</option>
                    <option value="completed">Carte grise prete</option>
                    <option value="rejected">Rejete</option>
                    <option value="delivered" disabled>Livree (revendeur)</option>
                  </select>
                  <p className="text-xs text-slate-500">MAJ statut: {openDossier.statusUpdatedAt || '-'}</p>
                </div>
                {openDossier.status === 'delivered' && (
                  <p className="mt-2 text-xs text-slate-600">Ce dossier est archive cote revendeur (carte grise livree).</p>
                )}
              </div>

              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Remarque dossier (revendeur &lt;-&gt; fournisseur)</p>
                    <p className="mt-1 text-xs text-amber-900/80">Checklist de verification et remarque interne. Ouvrez la popup pour modifier.</p>
                    <p className="mt-2 max-h-16 overflow-hidden whitespace-pre-wrap text-xs text-amber-900/90">
                      {openDossier.documentIssueMessage || 'Aucune remarque active.'}
                    </p>
                    <p className="mt-2 text-xs text-amber-900/80">Derniere MAJ: {openDossier.documentIssueUpdatedAt || '-'}</p>
                  </div>
                  <button
                    onClick={() => setDetailsModal({ open: true, type: 'issue' })}
                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                  >
                    Ouvrir remarque
                  </button>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Message client (visible portail client)</p>
                    <p className="mt-1 text-xs text-blue-900/80">Message defini par le revendeur. Ouvrez la popup pour le lire.</p>
                    <p className="mt-2 max-h-16 overflow-hidden whitespace-pre-wrap text-xs text-blue-900/90">
                      {openDossier.clientUpdateMessage || 'Aucun message client pour le moment.'}
                    </p>
                    <p className="mt-2 text-xs text-blue-900/80">Derniere MAJ: {openDossier.clientUpdateUpdatedAt || '-'}</p>
                  </div>
                  <button
                    onClick={() => setDetailsModal({ open: true, type: 'client' })}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Ouvrir message client
                  </button>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Timeline dossier</p>
                <div className="mt-3 space-y-2">
                  {(openDossier.timeline || []).length === 0 ? (
                    <p className="text-xs text-slate-500">Aucun evenement dossier.</p>
                  ) : (
                    openDossier.timeline.map((event) => {
                      const actorName = event.actorRole === 'fournisseur'
                        ? openDossier.fournisseurName
                        : event.actorRole === 'revendeur'
                          ? openDossier.revendeurName
                          : 'Systeme';
                      const actorAvatar = event.actorRole === 'fournisseur'
                        ? openDossier.fournisseurAvatar
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
                                <p className="text-[11px] text-slate-500">{actorName} {isRecentUpdate(event.createdAtRaw) ? '(update)' : ''}</p>
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
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Documents du dossier ({uploadedOpenDocs.length})</p>
                  <button
                    onClick={() => handleDownloadAll(openDossier)}
                    disabled={uploadedOpenDocs.length === 0 || activeAction === `download-all-${openDossier.invoiceId}`}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {activeAction === `download-all-${openDossier.invoiceId}` ? 'Preparation...' : 'Telecharger tous'}
                  </button>
                </div>
                {openDossier.documents.map((doc) => {
                  const uploadKey = `upload-${openDossier.invoiceId}-${doc.type}`;
                  const previewKey = `preview-${openDossier.invoiceId}-${doc.documentId}`;
                  const downloadKey = `download-${openDossier.invoiceId}-${doc.documentId}`;

                  return (
                    <article key={doc.key} className={`rounded-xl border p-4 shadow-sm ${doc.uploaded ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/70'}`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="mb-2 inline-flex items-center gap-2">
                            <span className={`relative inline-flex h-6 w-11 items-center rounded-full border ${doc.uploaded ? 'border-emerald-300 bg-emerald-500' : 'border-slate-300 bg-slate-200'}`}>
                              <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${doc.uploaded ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </span>
                            <span className={`text-xs font-bold ${doc.uploaded ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {doc.uploaded ? 'Envoye au dossier' : 'Pas encore envoye'}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{doc.label}{doc.required ? ' *' : ''}</p>
                          <p className="text-xs text-slate-500">{doc.hint}</p>
                          {doc.uploaded ? (
                            <p className="mt-2 text-xs font-semibold text-slate-700">
                              {doc.fileName} | {formatFileSize(doc.sizeBytes)} | Maj: {formatDateTime(doc.updatedAt)}
                              {doc.fromLegacy ? ' | Source: CIN legacy' : ''}
                            </p>
                          ) : (
                            <p className={`mt-2 text-xs font-semibold ${doc.required ? 'text-amber-700' : 'text-slate-500'}`}>
                              {doc.required ? 'Document manquant' : 'Document optionnel non fourni'}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {doc.uploaded && (
                            <>
                              <button
                                onClick={() => handlePreview(openDossier, doc)}
                                disabled={activeAction === previewKey}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                {activeAction === previewKey ? 'Ouverture...' : 'Voir'}
                              </button>
                              <button
                                onClick={() => handleDownload(openDossier, doc)}
                                disabled={activeAction === downloadKey}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                {activeAction === downloadKey ? 'Chargement...' : 'Telecharger'}
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => startUpload(openDossier, doc)}
                            disabled={activeAction === uploadKey}
                            className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60 ${doc.uploaded ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'}`}
                          >
                            {activeAction === uploadKey ? 'Envoi...' : doc.uploaded ? 'Remplacer' : 'Ajouter'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
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
                  {detailsModal.type === 'issue' ? 'Remarque dossier' : 'Message client'}
                </p>
                <p className="text-xs text-slate-500">{openDossier.id}</p>
              </div>
              <button onClick={closeDetailsModal} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Fermer</button>
            </div>

            <div className="space-y-3 p-4">
              {detailsModal.type === 'issue' ? (
                <>
                  <p className="text-xs text-amber-900/80">Verification document uniquement: selectionnez les motifs et la checklist.</p>
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
                          {reason.label}
                        </label>
                      );
                    })}
                  </div>
                  <textarea
                    rows={4}
                    value={validationChecklistDraft}
                    onChange={(event) => setValidationChecklistDraft(event.target.value)}
                    placeholder={'Checklist correction (1 ligne = 1 action)\nEx: Reuploader CIN verso lisible\nEx: Ajouter signature sur facture'}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={3}
                    value={issueDraft}
                    onChange={(event) => setIssueDraft(event.target.value)}
                    placeholder="Commentaire additionnel (optionnel)"
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-amber-900/80">Derniere MAJ: {openDossier.documentIssueUpdatedAt || '-'}</p>
                    <button
                      onClick={() => handleSaveDocumentIssueMessage(openDossier)}
                      disabled={activeAction === `issue-${openDossier.invoiceId}`}
                      className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      {activeAction === `issue-${openDossier.invoiceId}` ? 'Sauvegarde...' : 'Envoyer remarque'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-blue-900/80">Message defini par le revendeur pour le client.</p>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="whitespace-pre-wrap text-sm text-blue-900">
                      {openDossier.clientUpdateMessage || 'Aucun message client pour le moment.'}
                    </p>
                  </div>
                  <p className="text-xs text-blue-900/80">Derniere MAJ: {openDossier.clientUpdateUpdatedAt || '-'}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <DocumentPreviewModal
        preview={preview}
        onClose={closePreview}
        onReady={markPreviewReady}
        onAssetError={handlePreviewAssetError}
        closeLabel="Fermer"
        loadingLabel="Chargement du document..."
        loadingHint="La fenetre s'ouvre immediatement puis le document se charge en streaming."
        unsupportedLabel="Apercu non supporte pour ce format."
      />
    </div>
  );
}

export default FournisseurCarteGrisePage;
