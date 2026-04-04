import { buildPdfPreviewUrl } from '../../features/documents/documentPreview';

function DocumentPreviewModal({
  preview,
  onClose,
  onReady,
  onAssetError,
  closeLabel = 'Fermer',
  loadingLabel = 'Chargement du document...',
  loadingHint = '',
  unsupportedLabel = 'Apercu indisponible pour ce type de document.',
  previewOnlyLabel = 'Apercu uniquement'
}) {
  if (!preview) {
    return null;
  }

  const hasAsset = Boolean(preview.url && (preview.kind === 'image' || preview.kind === 'pdf'));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{preview.fileName || preview.title || 'Apercu document'}</p>
            <p className="text-xs text-slate-500">{preview.subtitle || preview.dossierId || previewOnlyLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {closeLabel}
          </button>
        </div>

        <div className="relative h-[70vh] bg-slate-100">
          {preview.error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-rose-700">
              {preview.error}
            </div>
          ) : hasAsset ? (
            <>
              {preview.kind === 'image' ? (
                <div className="flex h-full items-center justify-center overflow-auto p-4">
                  <img
                    src={preview.url}
                    alt={preview.fileName || preview.title || 'Apercu document'}
                    className="max-h-full max-w-full rounded-lg border border-slate-200 object-contain select-none"
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    onLoad={onReady}
                    onError={onAssetError}
                  />
                </div>
              ) : (
                <iframe
                  title={preview.fileName || preview.title || 'Apercu PDF'}
                  src={buildPdfPreviewUrl(preview.url)}
                  className="h-full w-full"
                  onLoad={onReady}
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-600">
              {unsupportedLabel}
            </div>
          )}

          {preview.loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100/92 px-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-100 via-indigo-100 to-slate-200 animate-pulse" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">{loadingLabel}</p>
                {loadingHint ? <p className="text-xs text-slate-500">{loadingHint}</p> : null}
              </div>
              <div className="h-2 w-56 max-w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentPreviewModal;
