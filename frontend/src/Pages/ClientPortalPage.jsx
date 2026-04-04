import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import clientPortalService from '../services/clientPortalService';
import BrandLogo from '../components/BrandLogo';
import DocumentPreviewModal from '../components/documents/DocumentPreviewModal';
import { optimizeDocumentImageUpload } from '../utils/imageTransform';
import {
  buildClientPortalViewModel,
  CLIENT_PORTAL_DOCUMENT_TYPES,
  CLIENT_PORTAL_PROCESS_STEPS,
  formatClientPortalAmount,
  formatClientPortalDate,
  formatClientPortalDateTime,
  formatClientPortalSize,
  getClientPortalDocumentMeta,
  normalizeClientPortalCode,
} from '../features/clientPortal/portalModel';
import {
  logDocumentPreviewMetric,
  resolveDocumentPreviewKind
} from '../features/documents/documentPreview';

function ClientPortalPage() {
  const [portalCode, setPortalCode] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [error, setError] = useState('');
  const [dossier, setDossier] = useState(null);
  const [preview, setPreview] = useState({
    open: false,
    loading: false,
    error: '',
    title: '',
    kind: '',
    mimeType: '',
    url: '',
    startedAt: 0
  });

  const {
    requiredDocuments,
    requiredDocsCount,
    missingRequiredDocuments,
    nextRequiredDocument,
    invoiceStatusMeta,
    carteGriseMeta,
    progressMeta,
    portalMessages
  } = useMemo(() => buildClientPortalViewModel(dossier), [dossier]);

  const handleAccess = async (event) => {
    event.preventDefault();

    const code = normalizeClientPortalCode(portalCode);
    if (!code) {
      setError('Entrez un code valide.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await clientPortalService.accessByCode(code);
      setDossier(data);
      setSessionCode(code);
      setPortalCode(code);
    } catch (accessError) {
      setError(accessError.message || 'Code invalide.');
    } finally {
      setLoading(false);
    }
  };

  const refreshDossier = async () => {
    if (!dossier?.invoiceId || !sessionCode) {
      return;
    }

    const updated = await clientPortalService.getDossier(dossier.invoiceId, sessionCode);
    setDossier(updated);
  };

  const handleUpload = async (documentType, file) => {
    if (!file || !dossier?.invoiceId) {
      return;
    }

    setError('');
    setUploadingType(documentType);

    try {
      const preparedUpload = await optimizeDocumentImageUpload(file);
      await clientPortalService.uploadDocument(dossier.invoiceId, sessionCode, documentType, preparedUpload.file);
      await refreshDossier();
    } catch (uploadError) {
      setError(uploadError.message || 'Upload impossible.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleLogout = () => {
    setDossier(null);
    setSessionCode('');
    setPortalCode('');
    setError('');
  };

  const closePreview = () => {
    setPreview((prev) => ({
      ...prev,
      open: false,
      loading: false,
      error: '',
      title: '',
      kind: '',
      mimeType: '',
      url: '',
      startedAt: 0
    }));
  };

  const markPreviewReady = () => {
    setPreview((prev) => {
      if (!prev.open || !prev.loading) {
        return prev;
      }

      if (Number.isFinite(prev.startedAt) && prev.startedAt > 0) {
        logDocumentPreviewMetric('visible', {
          title: prev.title,
          kind: prev.kind,
          visibleMs: Math.round(performance.now() - prev.startedAt)
        });
      }

      return {
        ...prev,
        loading: false
      };
    });
  };

  const handlePreviewAssetError = () => {
    setPreview((prev) => ({
      ...prev,
      loading: false,
      error: 'Apercu indisponible. Reessayez dans quelques instants.'
    }));
  };

  const openInvoicePdfPreview = () => {
    if (!dossier?.invoiceId || !sessionCode) {
      return;
    }

    const startedAt = performance.now();
    setPreview({
      open: true,
      loading: true,
      error: '',
      title: `Facture ${dossier.invoiceNumber || `${dossier.invoiceId}`}.pdf`,
      kind: 'pdf',
      mimeType: 'application/pdf',
      url: clientPortalService.getInvoicePdfInlineUrl(dossier.invoiceId, sessionCode),
      startedAt
    });
  };

  const openPreview = async (document) => {
    if (!document?.documentId || !dossier?.invoiceId || !sessionCode) {
      return;
    }

    const title = document.fileName || document.documentLabel || 'Document';
    const kind = resolveDocumentPreviewKind(document.contentType, title);
    const startedAt = performance.now();

    setPreview({
      open: true,
      loading: true,
      error: '',
      title,
      kind,
      mimeType: document.contentType || '',
      url: '',
      startedAt
    });

    if (kind === 'other') {
      setPreview((prev) => ({
        ...prev,
        loading: false
      }));
      return;
    }

    try {
      const access = await clientPortalService.getDocumentAccessUrl(dossier.invoiceId, document.documentId, sessionCode);
      logDocumentPreviewMetric('access-url-prepared', {
        title,
        kind,
        sizeBytes: document.sizeBytes,
        mimeType: document.contentType,
        accessMs: Math.round(performance.now() - startedAt)
      });

      setPreview((prev) => ({
        ...prev,
        url: access.url
      }));
    } catch (previewError) {
      const fallbackUrl = clientPortalService.getInlinePreviewUrl(dossier.invoiceId, document.documentId, sessionCode);
      setPreview((prev) => ({
        ...prev,
        url: fallbackUrl,
        error: '',
        loading: true
      }));
      logDocumentPreviewMetric('access-url-fallback-inline', {
        title,
        kind,
        sizeBytes: document.sizeBytes,
        mimeType: document.contentType,
        reason: previewError?.message || 'fallback'
      });
    }
  };

  if (!dossier) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <BrandLogo imageClassName="h-10 w-auto rounded-lg border border-slate-200" />
              <span className="text-xl font-bold text-slate-900">Espace Client</span>
            </Link>
            <p className="text-sm text-slate-600">
              Saisissez le code d'acces partage par votre revendeur.
            </p>
          </div>

          <form onSubmit={handleAccess} className="space-y-4">
            <div>
              <label htmlFor="portal-code" className="block text-sm font-semibold text-slate-700 mb-2">
                Code d'acces
              </label>
              <input
                id="portal-code"
                type="text"
                value={portalCode}
                onChange={(event) => setPortalCode(normalizeClientPortalCode(event.target.value))}
                placeholder="Ex: A1B2C3D4E5F60718"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl uppercase tracking-wide focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl disabled:opacity-60"
            >
              {loading ? 'Verification...' : 'Acceder a mon dossier'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
              Retour a l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900">
      <main className="max-w-[1300px] mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4 sm:space-y-5">
        {error && (
          <div className="px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-[26px] shadow-[0_16px_40px_rgba(15,23,42,0.08)] px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                Dossier Carte Grise
              </h1>
              <p className="mt-1 text-base text-slate-500 break-all">
                Code: {sessionCode} <span className="mx-1">•</span> Facture: {dossier.invoiceNumber || `${dossier.invoiceId}`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${invoiceStatusMeta.className}`}>
                  {invoiceStatusMeta.label}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-700 text-xs font-semibold">
                  Montant {formatClientPortalAmount(dossier.totalAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={openInvoicePdfPreview}
                  className="px-4 py-2.5 text-sm rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center font-semibold"
                >
                  Facture PDF
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 text-sm border border-slate-300 rounded-2xl bg-white hover:bg-slate-50 font-medium"
              >
                Se deconnecter
              </button>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border border-slate-200 rounded-[24px] shadow-[0_14px_34px_rgba(15,23,42,0.1)] bg-gradient-to-br from-white via-slate-50 to-blue-50/70 px-5 py-5 sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-indigo-200/30 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.35fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Statut du dossier</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{carteGriseMeta.label}</h2>
              <span className={`mt-3 inline-flex px-3.5 py-1.5 rounded-full border text-sm font-semibold ${carteGriseMeta.className}`}>
                Etape active
              </span>

              <div className="mt-4 space-y-2">
                <p className="text-base text-slate-600">
                  Derniere mise a jour: <span className="font-semibold text-slate-800">{formatClientPortalDate(dossier.updatedAt)}</span>
                </p>
                <p className="text-base text-slate-600">{progressMeta.estimate}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {requiredDocsCount}/{CLIENT_PORTAL_DOCUMENT_TYPES.length} documents recus
                </span>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Progression {progressMeta.percent}%
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Avancement</p>
                <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  {progressMeta.percent}%
                </span>
              </div>

              <div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${dossier.carteGriseStatus === 5 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : dossier.carteGriseStatus === 6 ? 'bg-gradient-to-r from-violet-500 to-indigo-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                  style={{ width: `${progressMeta.percent}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CLIENT_PORTAL_PROCESS_STEPS.map((step, index) => {
                  const isDone = index < progressMeta.currentStepIndex || (dossier.carteGriseStatus === 5 && index <= progressMeta.currentStepIndex);
                  const isCurrent = index === progressMeta.currentStepIndex && dossier.carteGriseStatus !== 5;
                  const stepTone = isDone
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : isCurrent
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500';

                  return (
                    <div key={step} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${stepTone}`}>
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[11px] font-bold ${isDone || isCurrent ? 'bg-white/90' : 'bg-slate-200 text-slate-500'}`}>
                        {isDone ? 'OK' : index + 1}
                      </span>
                      <span className="text-sm font-semibold">{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Prochaine action</p>
              {nextRequiredDocument ? (
                <>
                  <p className="mt-2 text-sm text-slate-500">Document prioritaire</p>
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3">
                    <p className="text-2xl font-extrabold tracking-tight text-rose-600 sm:text-3xl">{nextRequiredDocument.label}</p>
                    <p className="mt-1 text-xs font-medium text-rose-700">{missingRequiredDocuments.length} document(s) manquant(s)</p>
                  </div>

                  <input
                    id="quick-upload-next-document"
                    type="file"
                    accept={nextRequiredDocument.accept}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleUpload(nextRequiredDocument.value, file);
                      }
                      event.target.value = '';
                    }}
                  />
                  <label
                    htmlFor="quick-upload-next-document"
                    className="mt-4 inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)] hover:from-blue-700 hover:to-indigo-700 sm:text-lg"
                  >
                    {uploadingType === nextRequiredDocument.value ? 'Upload...' : 'Uploader maintenant'}
                  </label>
                </>
              ) : (
                <>
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <p className="text-sm font-semibold text-emerald-800">Tous les documents requis sont recus.</p>
                    <p className="mt-1 text-xs text-emerald-700">Votre dossier continue automatiquement vers la prochaine etape.</p>
                  </div>
                  <button
                    type="button"
                    onClick={openInvoicePdfPreview}
                    className="mt-4 inline-flex w-full items-center justify-center px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-semibold hover:bg-slate-200"
                  >
                    Voir la facture
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.95fr_1fr] gap-4">
          <article className="bg-white border border-slate-200 rounded-[24px] shadow-[0_12px_28px_rgba(15,23,42,0.08)] p-5 sm:p-6">
            <h2 className="text-2xl font-bold text-slate-900">Documents</h2>
            <p className="mt-1 text-lg text-slate-500">
              Gerez vos {CLIENT_PORTAL_DOCUMENT_TYPES.length} documents. Chaque tile indique l'etat et l'action possible.
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {requiredDocuments.map((type) => {
                const existing = type.document;
                const inputId = `upload-${type.key}`;
                const isUploading = uploadingType === type.value;
                const docMeta = getClientPortalDocumentMeta(existing, type.required);
                return (
                  <div
                    key={type.value}
                    className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-2xl font-bold text-slate-900">{type.label}</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${docMeta.className}`}>
                        {docMeta.label}
                      </span>
                    </div>

                    <div className="mt-3 min-h-[74px]">
                      {existing ? (
                        <>
                          <p className="text-base text-slate-600 break-all">{existing.fileName}</p>
                          <p className="text-base text-slate-500 mt-1">
                            {formatClientPortalSize(existing.sizeBytes)} <span className="mx-1">•</span> {formatClientPortalDate(existing.updatedAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-base text-slate-500">Aucun fichier</p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      {existing ? (
                        <button
                          type="button"
                          onClick={() => openPreview(existing)}
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:w-auto sm:text-base"
                        >
                          Voir
                        </button>
                      ) : (
                        <span className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400 sm:w-auto sm:text-base">
                          Voir
                        </span>
                      )}

                      <input
                        id={inputId}
                        type="file"
                        accept={type.accept}
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            handleUpload(type.value, file);
                          }
                          event.target.value = '';
                        }}
                      />
                      <label
                        htmlFor={inputId}
                        className="inline-flex w-full flex-1 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 sm:w-auto sm:text-base"
                      >
                        {isUploading ? 'Upload...' : existing ? 'Remplacer' : 'Uploader'}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

          </article>

          <div className="space-y-4">
            <article className="bg-white border border-slate-200 rounded-[24px] shadow-[0_12px_28px_rgba(15,23,42,0.08)] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-slate-900">Messages et mises a jour</h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                  {dossier.clientUpdateMessage ? '1 message agent' : 'Suivi auto'}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {portalMessages.map((message) => {
                  const toneClass = message.tone === 'warning'
                    ? 'border border-amber-200 bg-amber-50'
                    : message.tone === 'info'
                      ? 'border border-blue-200 bg-blue-50/70'
                      : 'border border-slate-200 bg-slate-100';

                  return (
                    <div key={message.id} className={`rounded-2xl p-4 ${toneClass}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{message.sender}</p>
                      <p className="mt-1 text-base leading-snug text-slate-800 whitespace-pre-wrap">
                        {message.text}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{formatClientPortalDateTime(message.createdAt)}</p>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-sm text-slate-500">
                Besoin d'aide ? Contactez votre revendeur via les coordonnees affichees dans le bloc details.
              </p>
            </article>

            <article className="bg-white border border-slate-200 rounded-[24px] shadow-[0_12px_28px_rgba(15,23,42,0.08)] p-5 sm:p-6">
              <h2 className="text-2xl font-bold text-slate-900">Suivi</h2>
              <ol className="mt-4 space-y-3">
                {CLIENT_PORTAL_PROCESS_STEPS.map((step, index) => {
                  const isDone = index < progressMeta.currentStepIndex || (dossier.carteGriseStatus === 5 && index <= progressMeta.currentStepIndex);
                  const isCurrent = index === progressMeta.currentStepIndex && dossier.carteGriseStatus !== 5;
                  const dotClass = isDone ? 'bg-blue-600' : isCurrent ? 'bg-blue-400' : 'bg-slate-300';
                  const textClass = isDone || isCurrent ? 'text-slate-900' : 'text-slate-500';
                  const subText = isDone ? formatClientPortalDate(dossier.updatedAt) : isCurrent ? 'En cours' : 'A venir';

                  return (
                    <li key={step} className="flex gap-3">
                      <span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${dotClass}`} />
                      <div>
                        <p className={`text-lg font-semibold ${textClass}`}>{step}</p>
                        <p className="mt-1 text-sm text-slate-500">{subText}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </article>
          </div>
        </section>

        <details className="bg-white border border-slate-200 rounded-[22px] shadow-[0_10px_24px_rgba(15,23,42,0.07)] overflow-hidden">
          <summary className="list-none cursor-pointer px-5 py-4 text-lg text-slate-500 hover:bg-slate-50">
            Details du dossier (client, revendeur, paiement) - cliquer pour ouvrir
          </summary>
          <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Client</h3>
                <div className="mt-2 space-y-1.5 text-slate-800">
                  <p className="text-base"><span className="font-semibold">Nom:</span> {dossier.clientName || '-'}</p>
                  <p className="text-base"><span className="font-semibold">CIN:</span> {dossier.clientCIN || '-'}</p>
                  <p className="text-base"><span className="font-semibold">Moto:</span> {dossier.motorcycleBrand || '-'} {dossier.motorcycleModel || ''}</p>
                  <p className="text-base"><span className="font-semibold">Chassis:</span> {dossier.chassisNumber || '-'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Revendeur</h3>
                <div className="mt-2 space-y-1.5 text-slate-800">
                  <p className="text-base"><span className="font-semibold">Entreprise:</span> {dossier.revendeurName || '-'}</p>
                  <p className="text-base"><span className="font-semibold">Telephone:</span> {dossier.revendeurPhone || '-'}</p>
                  <p className="text-base"><span className="font-semibold">Email:</span> {dossier.revendeurEmail || '-'}</p>
                  <p className="text-base"><span className="font-semibold">Marque fournisseur:</span> {dossier.motorcycleCompany || '-'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Paiement / Facture</h3>
                <div className="mt-2 space-y-1.5 text-slate-800">
                  <p className="text-base"><span className="font-semibold">Numero:</span> {dossier.invoiceNumber || `${dossier.invoiceId}`}</p>
                  <p className="text-base"><span className="font-semibold">Date:</span> {formatClientPortalDate(dossier.invoiceDate)}</p>
                  <p className="text-base"><span className="font-semibold">Montant TTC:</span> {formatClientPortalAmount(dossier.totalAmount)}</p>
                  <p className="text-base"><span className="font-semibold">Documents recus:</span> {requiredDocsCount}/{CLIENT_PORTAL_DOCUMENT_TYPES.length}</p>
                </div>
              </div>
            </div>
          </div>
        </details>

        <DocumentPreviewModal
          preview={preview.open ? {
            ...preview,
            fileName: preview.title,
            subtitle: 'Apercu uniquement (telechargement desactive)',
            dossierId: undefined
          } : null}
          onClose={closePreview}
          onReady={markPreviewReady}
          onAssetError={handlePreviewAssetError}
          loadingLabel="Chargement du document..."
          loadingHint="La fenetre de preview s'ouvre tout de suite, puis le document se charge en streaming."
          unsupportedLabel="Apercu indisponible pour ce type de document."
        />
      </main>
    </div>
  );
}

export default ClientPortalPage;
