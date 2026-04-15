export const CLIENT_PORTAL_DOCUMENT_TYPES = [
  {
    value: 6,
    key: 'cin_front',
    label: 'CIN (recto)',
    required: true,
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.bmp,.jfif,.heic,.heif,.avif'
  },
  {
    value: 7,
    key: 'cin_back',
    label: 'CIN (verso)',
    required: true,
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.bmp,.jfif,.heic,.heif,.avif'
  },
  {
    value: 3,
    key: 'facture',
    label: 'Facture',
    required: true,
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.bmp,.jfif,.heic,.heif,.avif'
  },
  {
    value: 1,
    key: 'declaration',
    label: "Attestation d'impot",
    required: true,
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.bmp,.jfif,.heic,.heif,.avif'
  }
];

export const CLIENT_PORTAL_CARTE_GRISE_STATUS = {
  0: { label: 'En attente', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  1: { label: 'Docs recus', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  2: { label: 'Verification', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  6: { label: 'Depot ANTT en cours', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  3: { label: 'Carte grise prete', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  4: { label: 'Action requise', className: 'bg-rose-100 text-rose-800 border-rose-200' },
  5: { label: 'Livree', className: 'bg-slate-100 text-slate-700 border-slate-300' }
};

export const CLIENT_PORTAL_INVOICE_STATUS = {
  0: { label: 'Facture brouillon', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  1: { label: 'Facture payee', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  2: { label: 'Facture annulee', className: 'bg-rose-100 text-rose-800 border-rose-200' }
};

export const CLIENT_PORTAL_PROCESS_STEPS = [
  'En attente',
  'Docs recus',
  'Verification',
  'Depot ANTT',
  'Carte grise prete',
  'Livree'
];

export function normalizeClientPortalCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function formatClientPortalDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('fr-FR');
}

export function formatClientPortalDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatClientPortalAmount(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return '-';
  }

  return `${amount.toLocaleString('fr-FR')} TND`;
}

export function formatClientPortalSize(sizeBytes) {
  const size = Number(sizeBytes);
  if (!Number.isFinite(size) || size <= 0) {
    return '0 Ko';
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} Mo`;
  }

  return `${Math.max(1, Math.round(size / 1024))} Ko`;
}

export function resolveClientPortalPreviewKind(mimeType, fileName) {
  const type = String(mimeType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();

  if (type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|avif|heic|heif|jfif)$/.test(name)) {
    return 'image';
  }

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return 'pdf';
  }

  return 'other';
}

export function getClientPortalDocumentMeta(existing, required) {
  if (existing) {
    return {
      label: 'Ajoute',
      className: 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    };
  }

  if (required) {
    return {
      label: 'Manquant',
      className: 'bg-rose-100 text-rose-800 border border-rose-200'
    };
  }

  return {
    label: 'Optionnel',
    className: 'bg-slate-100 text-slate-700 border border-slate-200'
  };
}

export function buildClientPortalViewModel(dossier) {
  const documentsByType = buildDocumentsByType(dossier?.documents);
  const requiredDocuments = CLIENT_PORTAL_DOCUMENT_TYPES.map((documentType) => ({
    ...documentType,
    document: getDocumentForType(documentsByType, documentType.value)
  }));
  const requiredDocsCount = requiredDocuments.reduce((count, documentType) => {
    return count + (documentType.document ? 1 : 0);
  }, 0);
  const missingRequiredDocuments = requiredDocuments.filter((documentType) => {
    return documentType.required && !documentType.document;
  });
  const nextRequiredDocument = missingRequiredDocuments[0] || null;
  const invoiceStatusMeta =
    CLIENT_PORTAL_INVOICE_STATUS[dossier?.invoiceStatus] || CLIENT_PORTAL_INVOICE_STATUS[0];
  const carteGriseMeta =
    CLIENT_PORTAL_CARTE_GRISE_STATUS[dossier?.carteGriseStatus] || CLIENT_PORTAL_CARTE_GRISE_STATUS[0];
  const progressMeta = getProgressMeta(
    dossier?.carteGriseStatus,
    requiredDocsCount,
    CLIENT_PORTAL_DOCUMENT_TYPES.length
  );
  const portalMessages = buildPortalMessages(
    dossier,
    carteGriseMeta,
    progressMeta,
    missingRequiredDocuments,
    nextRequiredDocument
  );

  return {
    requiredDocuments,
    requiredDocsCount,
    missingRequiredDocuments,
    nextRequiredDocument,
    invoiceStatusMeta,
    carteGriseMeta,
    progressMeta,
    portalMessages
  };
}

function buildDocumentsByType(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return {};
  }

  return documents.reduce((accumulator, document) => {
    if (!accumulator[document.documentType]) {
      accumulator[document.documentType] = document;
    }

    return accumulator;
  }, {});
}

function getDocumentForType(documentsByType, type) {
  const direct = documentsByType[type];
  if (direct) {
    return direct;
  }

  if ((type === 6 || type === 7) && documentsByType[0]) {
    return documentsByType[0];
  }

  return null;
}

function getProgressMeta(status, uploadedCount, totalRequired) {
  const docsRatio = totalRequired ? uploadedCount / totalRequired : 0;

  if (status === 5) {
    return { percent: 100, currentStepIndex: 5, estimate: 'Dossier livre' };
  }

  if (status === 3) {
    return { percent: 90, currentStepIndex: 4, estimate: 'Carte grise prete pour livraison' };
  }

  if (status === 6) {
    return { percent: 76, currentStepIndex: 3, estimate: 'Depot au bureau ANTT en cours' };
  }

  if (status === 2) {
    return { percent: 62, currentStepIndex: 2, estimate: 'Nous verifions vos documents' };
  }

  if (status === 1) {
    return { percent: 42, currentStepIndex: 1, estimate: 'Documents recus' };
  }

  if (status === 4) {
    return { percent: 40, currentStepIndex: 1, estimate: 'Action client requise' };
  }

  return {
    percent: Math.max(10, Math.round(docsRatio * 24)),
    currentStepIndex: 0,
    estimate: docsRatio >= 1 ? 'En attente de verification' : 'Des documents manquent encore'
  };
}

function buildPortalMessages(
  dossier,
  carteGriseMeta,
  progressMeta,
  missingRequiredDocuments,
  nextRequiredDocument
) {
  if (!dossier) {
    return [];
  }

  const messages = [
    {
      id: 'status-update',
      sender: 'Suivi du dossier',
      tone: 'info',
      text: `Votre dossier est actuellement : ${carteGriseMeta.label}. ${progressMeta.estimate}.`,
      createdAt: dossier.updatedAt
    }
  ];

  if (dossier.clientUpdateMessage) {
    messages.push({
      id: 'agent-update',
      sender: 'Agent Mototun',
      tone: 'agent',
      text: dossier.clientUpdateMessage,
      createdAt: dossier.clientUpdateUpdatedAt || dossier.updatedAt
    });
  }

  if (missingRequiredDocuments.length > 0) {
    messages.push({
      id: 'missing-docs',
      sender: 'A faire',
      tone: 'warning',
      text: `Il manque encore : ${missingRequiredDocuments.map((doc) => doc.label).join(', ')}.`,
      createdAt: dossier.updatedAt
    });
  } else {
    messages.push({
      id: 'docs-confirmation',
      sender: 'Equipe Tunimoto',
      tone: 'agent',
      text: 'Tous les documents demandes sont bien recus. Nous vous prevenons a chaque etape.',
      createdAt: dossier.updatedAt
    });
  }

  if (nextRequiredDocument) {
    messages.push({
      id: 'next-doc',
      sender: 'Rappel utile',
      tone: 'warning',
      text: `Ajoutez maintenant : ${nextRequiredDocument.label}.`,
      createdAt: dossier.updatedAt
    });
  }

  return messages.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}
