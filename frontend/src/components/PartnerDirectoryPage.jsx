import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Clock3, Inbox, LayoutGrid, Mail, MapPin, Phone, Plus, RefreshCw, Rows3, Search, Send, Users, X } from 'lucide-react';
import partnershipService, { PartnershipStatus, UserRole } from '../services/partnershipService';
import { resolveAvatarUrl } from '../utils/avatar';

const themeByAccent = {
  blue: {
    header: 'from-slate-950 via-slate-900 to-blue-900',
    accentStrip: 'from-blue-500 via-cyan-400 to-blue-700',
    button: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:from-blue-300 disabled:to-blue-300',
    focus: 'focus:border-blue-500 focus:ring-blue-500',
    chipActive: 'border-blue-500 bg-blue-600 text-white shadow-sm',
    chipIdle: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
    subtleTag: 'border-blue-200 bg-blue-50 text-blue-700'
  },
  emerald: {
    header: 'from-slate-950 via-slate-900 to-emerald-900',
    accentStrip: 'from-emerald-500 via-teal-400 to-emerald-700',
    button: 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 disabled:from-emerald-300 disabled:to-emerald-300',
    focus: 'focus:border-emerald-500 focus:ring-emerald-500',
    chipActive: 'border-emerald-500 bg-emerald-600 text-white shadow-sm',
    chipIdle: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
    subtleTag: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
};

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];
const BOARD_META = {
  incoming_pending: {
    label: 'A traiter',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    rail: 'from-amber-500 via-orange-500 to-amber-400',
    panelClass: 'border-amber-200 bg-amber-50/80 text-amber-700'
  },
  connected: {
    label: 'Connecte',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rail: 'from-emerald-500 via-green-500 to-teal-500',
    panelClass: 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
  },
  outgoing_pending: {
    label: 'Invitation envoyee',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    rail: 'from-sky-500 via-blue-500 to-indigo-500',
    panelClass: 'border-sky-200 bg-sky-50/80 text-sky-700'
  },
  available: {
    label: 'A contacter',
    badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',
    rail: 'from-slate-500 via-slate-700 to-slate-600',
    panelClass: 'border-slate-200 bg-slate-50/90 text-slate-700'
  },
  rejected: {
    label: 'A contacter',
    badgeClass: 'border-orange-200 bg-orange-50 text-orange-700',
    rail: 'from-orange-500 via-amber-500 to-orange-400',
    panelClass: 'border-orange-200 bg-orange-50/80 text-orange-700'
  },
  blocked: {
    label: 'Bloque',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    rail: 'from-rose-500 via-red-500 to-rose-400',
    panelClass: 'border-rose-200 bg-rose-50/80 text-rose-700'
  }
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-TN');
}

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return 'MT';
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return text.slice(0, 2).toUpperCase();
}

function isPendingIncoming(item, selfRole) {
  return item.status === PartnershipStatus.Pending && item.requestedByRole !== selfRole;
}

function isPendingOutgoing(item, selfRole) {
  return item.status === PartnershipStatus.Pending && item.requestedByRole === selfRole;
}

function canSendRequest(item, selfRole) {
  if (item.status === null || item.status === undefined || item.status === PartnershipStatus.Rejected) return true;
  return item.status === PartnershipStatus.Blocked && item.blockedByRole === selfRole;
}

function getCounterpartyLabels(selfRole) {
  if (selfRole === UserRole.Revendeur) {
    return {
      singular: 'fournisseur',
      plural: 'fournisseurs'
    };
  }

  return {
    singular: 'revendeur',
    plural: 'revendeurs'
  };
}

function getPartnerBoardState(item, selfRole) {
  if (isPendingIncoming(item, selfRole)) return 'incoming_pending';
  if (item.status === PartnershipStatus.Accepted) return 'connected';
  if (isPendingOutgoing(item, selfRole)) return 'outgoing_pending';
  if (item.status === PartnershipStatus.Blocked) return 'blocked';
  if (item.status === PartnershipStatus.Rejected) return 'rejected';
  return 'available';
}

function getPartnerPriority(boardState) {
  switch (boardState) {
    case 'incoming_pending':
      return 0;
    case 'available':
      return 1;
    case 'rejected':
      return 2;
    case 'outgoing_pending':
      return 3;
    case 'connected':
      return 4;
    case 'blocked':
      return 5;
    default:
      return 6;
  }
}

function getStatusLabel(item) {
  if (item.boardState === 'incoming_pending') return 'A traiter';
  if (item.boardState === 'connected') return 'Connecte';
  if (item.boardState === 'outgoing_pending') return 'Invitation envoyee';
  if (item.boardState === 'blocked') return 'Bloque';
  if (item.boardState === 'rejected') return 'A contacter';
  return 'A contacter';
}

function buildAddress(profile) {
  return [profile.address, profile.city, profile.postalCode].filter(Boolean).join(', ') || 'Adresse non renseignee';
}

function matchesSearch(item, term) {
  if (!term) return true;
  const haystack = `${item.businessName || ''} ${item.fullName || ''} ${item.city || ''} ${item.email || ''} ${item.taxId || ''} ${item.phone || ''}`.toLowerCase();
  return haystack.includes(term);
}

function sortPartners(items, sortBy) {
  const list = [...items];
  if (sortBy === 'name_asc') {
    return list.sort((a, b) => String(a.businessName || '').localeCompare(String(b.businessName || ''), 'fr', { sensitivity: 'base' }));
  }

  if (sortBy === 'city_asc') {
    return list.sort((a, b) => String(a.city || '').localeCompare(String(b.city || ''), 'fr', { sensitivity: 'base' }));
  }

  if (sortBy === 'updated_desc') {
    return list.sort((a, b) => {
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return db - da;
    });
  }

  return list.sort((a, b) => {
    if (a.boardPriority !== b.boardPriority) {
      return a.boardPriority - b.boardPriority;
    }

    const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return db - da;
  });
}

function getPartnerSecondaryLine(item) {
  const bits = [item.city || 'Ville non renseignee'];
  if (item.fullName) bits.push(item.fullName);
  return bits.join(' - ');
}

function getPartnerSummary(item, selfRole) {
  switch (item.boardState) {
    case 'incoming_pending':
      return 'Invitation recue. Repondez maintenant pour activer la relation.';
    case 'connected':
      return 'Connexion active. Ce partenaire est pret a recevoir vos prochains dossiers.';
    case 'outgoing_pending':
      return 'Invitation envoyee. En attente de reponse.';
    case 'rejected':
      return 'Demande precedente refusee. Vous pouvez relancer le contact.';
    case 'blocked':
      return item.blockedByRole === selfRole
        ? 'Relation bloquee par vous. Relancez si vous souhaitez reouvrir le lien.'
        : 'Ce partenaire vous a bloque. Aucune action directe possible pour le moment.';
    case 'available':
    default:
      return 'Aucun lien actif. Vous pouvez lancer une invitation en un clic.';
  }
}

function buildPaginationPages(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const normalized = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const withGaps = [];

  normalized.forEach((value, index) => {
    if (index > 0) {
      const prev = normalized[index - 1];
      if (value - prev > 1) withGaps.push('...');
    }
    withGaps.push(value);
  });

  return withGaps;
}

function ProfileModal({ profile, selfRole, processingKey, onClose, onBlock, onRemove }) {
  const avatarUrl = resolveAvatarUrl(profile.avatar);
  const canImage = Boolean(avatarUrl);
  const canBlock = Boolean(profile.requestId) && profile.status !== PartnershipStatus.Blocked;
  const canRemove = Boolean(profile.requestId) && profile.status === PartnershipStatus.Accepted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="relative border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-lg font-bold text-white">
                {canImage ? (
                  <img src={avatarUrl} alt={profile.fullName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">{getInitials(profile.fullName || profile.businessName)}</div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{profile.fullName || '-'}</h3>
                <p className="text-sm text-slate-600">{profile.businessName || '-'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 text-sm text-slate-700 sm:p-6 md:grid-cols-2">
          <p><span className="text-slate-500">Adresse:</span> {buildAddress(profile)}</p>
          <p><span className="text-slate-500">Email:</span> {profile.email || '-'}</p>
          <p><span className="text-slate-500">Telephone:</span> {profile.phone || '-'}</p>
          <p><span className="text-slate-500">Fiscal:</span> {profile.taxId || '-'}</p>
          <p><span className="text-slate-500">RC:</span> {profile.registrationNumber || '-'}</p>
          <p><span className="text-slate-500">Maj:</span> {formatDate(profile.updatedAt)}</p>
        </div>

        {profile.rejectReason && (
          <div className="mx-4 mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:mx-6">
            Motif: {profile.rejectReason}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-4 sm:px-6">
          {canRemove && (
            <button
              type="button"
              disabled={processingKey === `remove-${profile.requestId}`}
              onClick={() => onRemove(profile.requestId)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Retirer la relation
            </button>
          )}

          {canBlock && (
            <button
              type="button"
              disabled={processingKey === `block-${profile.requestId}`}
              onClick={() => onBlock(profile.requestId)}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              Bloquer
            </button>
          )}

          {!canRemove && !canBlock && profile.status === PartnershipStatus.Blocked && (
            <p className="text-sm font-medium text-red-700">
              {profile.blockedByRole === selfRole ? 'Cette relation est bloquee par vous.' : 'Ce profil vous a bloque.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ title, description, actionLabel, onAction, icon }) {
  const IconComponent = icon || Inbox;

  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/90 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <IconComponent className="h-6 w-6 text-slate-500" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function PartnerCard({
  item,
  selfRole,
  theme,
  processingKey,
  onOpenProfile,
  onSendRequest,
  onAccept,
  onReject
}) {
  const avatarUrl = resolveAvatarUrl(item.avatar);
  const meta = BOARD_META[item.boardState] || BOARD_META.available;
  const statusLabel = getStatusLabel(item);
  const canRetryInvitation = item.boardState === 'blocked' && canSendRequest(item, selfRole);
  const contactChips = [
    item.city ? { icon: MapPin, label: item.city } : null,
    item.email ? { icon: Mail, label: item.email } : null,
    item.phone ? { icon: Phone, label: item.phone } : null
  ].filter(Boolean);

  let actionToneLabel = 'A surveiller';
  if (item.boardState === 'incoming_pending') actionToneLabel = 'Action requise';
  if (item.boardState === 'connected') actionToneLabel = 'Pret a recevoir';
  if (item.boardState === 'available' || item.boardState === 'rejected') actionToneLabel = 'A contacter';
  if (item.boardState === 'outgoing_pending') actionToneLabel = 'Invitation envoyee';
  if (item.boardState === 'blocked') actionToneLabel = 'Acces restreint';

  let primaryAction = null;
  const tertiaryActions = [];

  if (item.boardState === 'incoming_pending' && item.requestId) {
    primaryAction = {
      label: 'Accepter',
      disabled: processingKey === `accept-${item.requestId}`,
      className: 'bg-emerald-600 text-white hover:bg-emerald-700',
      onClick: () => onAccept(item.requestId)
    };
    tertiaryActions.push({
      label: 'Refuser',
      disabled: processingKey === `reject-${item.requestId}`,
      className: 'text-rose-700 hover:bg-rose-50',
      onClick: () => onReject(item.requestId)
    });
  } else if (item.boardState === 'available' || item.boardState === 'rejected') {
    primaryAction = {
      label: 'Envoyer invitation',
      disabled: processingKey === `send-${item.profileId}`,
      className: `${theme.button} text-white`,
      onClick: () => onSendRequest(item),
      icon: Send
    };
  } else if (item.boardState === 'outgoing_pending') {
    primaryAction = {
      label: 'Invitation envoyee',
      disabled: true,
      className: 'border border-sky-200 bg-sky-50 text-sky-700',
      onClick: undefined,
      icon: Clock3
    };
  } else if (item.boardState === 'connected') {
    primaryAction = {
      label: 'Gerer relation',
      disabled: false,
      className: `${theme.button} text-white`,
      onClick: () => onOpenProfile(item)
    };
  }

  if (canRetryInvitation) {
    tertiaryActions.push({
      label: 'Relancer invitation',
      disabled: processingKey === `send-${item.profileId}`,
      className: 'text-slate-700 hover:bg-slate-100',
      onClick: () => onSendRequest(item)
    });
  }

  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-34px_rgba(15,23,42,0.4)] sm:p-6">
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${meta.rail}`} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-bold text-white shadow-inner">
            {avatarUrl ? (
              <img src={avatarUrl} alt={item.fullName || item.businessName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">{getInitials(item.businessName || item.fullName)}</div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black tracking-tight text-slate-950">{item.businessName || '-'}</h3>
            <p className="truncate text-sm text-slate-500">{getPartnerSecondaryLine(item)}</p>
          </div>
        </div>

        <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${meta.panelClass}`}>
          {actionToneLabel}
        </span>
        {item.status === PartnershipStatus.Accepted && (
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            Connexion active
          </span>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">{getPartnerSummary(item, selfRole)}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {contactChips.map((chip) => {
          const Icon = chip.icon;
          return (
            <span key={`${chip.label}-${chip.icon.name}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{chip.label}</span>
            </span>
          );
        })}
      </div>

      {item.rejectReason && (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          Motif: {item.rejectReason}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-500">
        <Clock3 className="h-3.5 w-3.5" />
        Derniere mise a jour: {formatDate(item.updatedAt)}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          {primaryAction ? (
            <button
              type="button"
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${primaryAction.className}`}
            >
              {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
              {primaryAction.label}
            </button>
          ) : (
            <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
              Action indisponible depuis cette carte
            </div>
          )}

          <button
            type="button"
            onClick={() => onOpenProfile(item)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Voir profil
          </button>
        </div>

        {tertiaryActions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tertiaryActions.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={action.disabled}
                onClick={action.onClick}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${action.className}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function PartnerDirectoryPage({
  accent = 'blue',
  title,
  subtitle,
  directoryTitle,
  emptyTitle,
  emptyMessage,
  selfRole,
  directoryLoader,
  createPayloadKey,
  kicker = 'Reseau partenaires'
}) {
  const theme = themeByAccent[accent] || themeByAccent.blue;
  const labels = getCounterpartyLabels(selfRole);
  const searchInputRef = useRef(null);
  const directorySectionRef = useRef(null);
  const [directory, setDirectory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority_desc');
  const [viewMode, setViewMode] = useState('cards');
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const directoryData = await directoryLoader();
      setDirectory(Array.isArray(directoryData) ? directoryData : []);
    } catch (err) {
      setError(err.message || 'Impossible de charger les partenaires');
    } finally {
      setLoading(false);
    }
  }, [directoryLoader]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const directoryWithBoard = useMemo(() => {
    return directory.map((item) => {
      const boardState = getPartnerBoardState(item, selfRole);
      return {
        ...item,
        boardState,
        boardPriority: getPartnerPriority(boardState)
      };
    });
  }, [directory, selfRole]);

  const stats = useMemo(() => {
    return {
      total: directoryWithBoard.length,
      connected: directoryWithBoard.filter((item) => item.boardState === 'connected').length,
      incomingPending: directoryWithBoard.filter((item) => item.boardState === 'incoming_pending').length,
      outgoingPending: directoryWithBoard.filter((item) => item.boardState === 'outgoing_pending').length,
      blocked: directoryWithBoard.filter((item) => item.boardState === 'blocked').length,
      available: directoryWithBoard.filter((item) => item.boardState === 'available' || item.boardState === 'rejected').length
    };
  }, [directoryWithBoard]);

  const filterButtons = useMemo(() => {
    return [
      { key: 'all', label: 'Tous', count: stats.total },
      { key: 'connected', label: 'Connectes', count: stats.connected },
      { key: 'incoming', label: 'Recues', count: stats.incomingPending },
      { key: 'outgoing', label: 'Envoyees', count: stats.outgoingPending },
      { key: 'available', label: 'A contacter', count: stats.available },
      { key: 'blocked', label: 'Bloques', count: stats.blocked }
    ];
  }, [stats]);

  const searchableDirectory = useMemo(() => {
    const term = deferredSearchTerm.trim().toLowerCase();
    if (!term) return directoryWithBoard;
    return directoryWithBoard.filter((item) => matchesSearch(item, term));
  }, [deferredSearchTerm, directoryWithBoard]);

  const actionCenterPartners = useMemo(() => {
    return sortPartners(
      searchableDirectory.filter((item) => item.boardState === 'incoming_pending' || item.boardState === 'available' || item.boardState === 'rejected'),
      'priority_desc'
    ).slice(0, 6);
  }, [searchableDirectory]);

  const connectedPartners = useMemo(() => {
    return sortPartners(searchableDirectory.filter((item) => item.boardState === 'connected'), 'updated_desc').slice(0, 6);
  }, [searchableDirectory]);

  const filteredDirectory = useMemo(() => {
    const byStatus = searchableDirectory.filter((item) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'connected') return item.boardState === 'connected';
      if (statusFilter === 'incoming') return item.boardState === 'incoming_pending';
      if (statusFilter === 'outgoing') return item.boardState === 'outgoing_pending';
      if (statusFilter === 'available') return item.boardState === 'available' || item.boardState === 'rejected';
      if (statusFilter === 'blocked') return item.boardState === 'blocked';
      return true;
    });

    return sortPartners(byStatus, sortBy);
  }, [searchableDirectory, statusFilter, sortBy]);

  const totalResults = filteredDirectory.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  const paginatedDirectory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDirectory.slice(start, start + pageSize);
  }, [filteredDirectory, currentPage, pageSize]);

  const paginationPages = useMemo(() => buildPaginationPages(totalPages, currentPage), [totalPages, currentPage]);
  const pageStart = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = totalResults === 0 ? 0 : Math.min(currentPage * pageSize, totalResults);
  const hasActiveFilters = useMemo(() => searchTerm.trim() !== '' || statusFilter !== 'all' || sortBy !== 'priority_desc' || viewMode !== 'cards', [searchTerm, statusFilter, sortBy, viewMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, statusFilter, sortBy, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const runAction = async (key, callback) => {
    setProcessingKey(key);
    setError('');
    setNotice('');
    try {
      await callback();
      await loadData();
    } catch (err) {
      setError(err.message || 'Operation impossible');
    } finally {
      setProcessingKey('');
    }
  };

  const handleSendRequest = (item) =>
    runAction(`send-${item.profileId}`, async () => {
      await partnershipService.createRequest({ [createPayloadKey]: item.profileId });
      setNotice('Invitation envoyee avec succes');
    });

  const handleAccept = (requestId) =>
    runAction(`accept-${requestId}`, async () => {
      await partnershipService.acceptRequest(requestId);
      setNotice('Demande acceptee');
    });

  const handleReject = async (requestId) => {
    const reason = window.prompt('Motif du refus (optionnel):', '');
    if (reason === null) return;
    await runAction(`reject-${requestId}`, async () => {
      await partnershipService.rejectRequest(requestId, reason);
      setNotice('Demande refusee');
    });
  };

  const handleBlock = async (requestId) => {
    if (!window.confirm('Bloquer cette relation ?')) return;
    const reason = window.prompt('Motif du blocage (optionnel):', '');
    if (reason === null) return;
    await runAction(`block-${requestId}`, async () => {
      await partnershipService.blockConnection(requestId, reason || undefined);
      setNotice('Relation bloquee');
      setSelectedProfile(null);
    });
  };

  const handleRemove = async (requestId) => {
    if (!window.confirm('Retirer cette relation ?')) return;
    await runAction(`remove-${requestId}`, async () => {
      await partnershipService.removeConnection(requestId);
      setNotice('Relation retiree');
      setSelectedProfile(null);
    });
  };

  const focusDirectorySearch = () => {
    setStatusFilter('available');
    setViewMode('cards');
    setCurrentPage(1);
    directorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('priority_desc');
    setViewMode('cards');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_30px_80px_-48px_rgba(15,23,42,0.5)]">
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${theme.accentStrip}`} />
        <div className={`relative overflow-hidden bg-gradient-to-br px-5 py-6 text-white sm:px-7 sm:py-8 lg:px-8 ${theme.header}`}>
          <div className="pointer-events-none absolute -left-20 top-8 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-60 w-60 translate-x-1/4 -translate-y-1/3 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 translate-y-1/3 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-100">
                {kicker}
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.65rem]">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">{subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={focusDirectorySearch}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter {labels.singular}
                </button>
                <button
                  type="button"
                  onClick={loadData}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Actualisation...' : 'Actualiser'}
                </button>
              </div>
            </div>

            <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              <article className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur-sm">
                <p className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <Users className="h-3.5 w-3.5" />
                  Total profils
                </p>
                <p className="mt-2 text-3xl font-black">{stats.total}</p>
              </article>
              <article className="rounded-3xl border border-emerald-200/25 bg-emerald-500/10 p-4 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-medium text-emerald-100">Connectes</p>
                <p className="mt-2 text-3xl font-black text-emerald-50">{stats.connected}</p>
              </article>
              <article className="rounded-3xl border border-amber-200/25 bg-amber-500/10 p-4 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-medium text-amber-100">Demandes recues</p>
                <p className="mt-2 text-3xl font-black text-amber-50">{stats.incomingPending}</p>
              </article>
              <article className="rounded-3xl border border-sky-200/25 bg-sky-500/10 p-4 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-medium text-sky-100">Demandes envoyees</p>
                <p className="mt-2 text-3xl font-black text-sky-50">{stats.outgoingPending}</p>
              </article>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6 lg:p-7">
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
          {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4 shadow-inner sm:p-5">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px_170px_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={`Rechercher un ${labels.singular} par nom, ville, email ou telephone...`}
                  className={`w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 shadow-sm focus:ring-2 ${theme.focus}`}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
                    aria-label="Effacer la recherche"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className={`h-full w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm font-semibold text-slate-700 shadow-sm focus:ring-2 ${theme.focus}`}
                >
                  <option value="priority_desc">Priorite d'action</option>
                  <option value="updated_desc">Derniere activite</option>
                  <option value="name_asc">Nom A-Z</option>
                  <option value="city_asc">Ville A-Z</option>
                </select>
              </div>

              <div className="relative">
                <Rows3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className={`h-full w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm font-semibold text-slate-700 shadow-sm focus:ring-2 ${theme.focus}`}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} par page
                    </option>
                  ))}
                </select>
              </div>

              <div className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                {totalResults} resultat(s)
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${viewMode === 'cards' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Cartes
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <Rows3 className="h-3.5 w-3.5" />
                    Tableau
                  </button>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                  >
                    Reinitialiser
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {filterButtons.map((filter) => {
                const active = statusFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStatusFilter(filter.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? theme.chipActive : theme.chipIdle}`}
                  >
                    <span>{filter.label}</span>
                    <span className={`rounded-full px-2 py-0.5 ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>{filter.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <article className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.35)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Priorites</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Centre d'actions</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Commencez par les demandes recues et les {labels.plural} que vous pouvez contacter maintenant.
              </p>
            </div>
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {stats.incomingPending + stats.available} action(s)
            </span>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-[30px] bg-slate-100" />
                ))}
              </div>
            ) : actionCenterPartners.length === 0 ? (
              <EmptyPanel
                title="Aucune action immediate"
                description={`Votre centre d'actions est vide. Parcourez l'annuaire pour ajouter un nouveau ${labels.singular} ou attendez de nouvelles demandes.`}
                actionLabel={`Parcourir les ${labels.plural}`}
                onAction={focusDirectorySearch}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {actionCenterPartners.map((item) => (
                  <PartnerCard
                    key={`action-${item.profileId}`}
                    item={item}
                    selfRole={selfRole}
                    theme={theme}
                    processingKey={processingKey}
                    onOpenProfile={setSelectedProfile}
                    onSendRequest={handleSendRequest}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.3)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Reseau actif</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Deja connectes</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Vos relations actives sont pretes a travailler avec vous. Ouvrez une fiche pour gerer la relation si besoin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter('connected')}
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${theme.subtleTag}`}
            >
              {stats.connected} connexion(s)
            </button>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-[30px] bg-slate-100" />
                ))}
              </div>
            ) : connectedPartners.length === 0 ? (
              <EmptyPanel
                icon={Users}
                title={`Aucun ${labels.singular} connecte`}
                description={`Des qu'une relation est acceptee, elle apparaitra ici avec un acces direct a sa fiche.`}
                actionLabel={`Voir les ${labels.plural} a contacter`}
                onAction={focusDirectorySearch}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {connectedPartners.map((item) => (
                  <PartnerCard
                    key={`connected-${item.profileId}`}
                    item={item}
                    selfRole={selfRole}
                    theme={theme}
                    processingKey={processingKey}
                    onOpenProfile={setSelectedProfile}
                    onSendRequest={handleSendRequest}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </div>
        </article>

        <section ref={directorySectionRef} className="rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.28)]">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Exploration</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{directoryTitle}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Parcourez l'ensemble des profils, appliquez vos filtres et lancez la bonne action sans quitter la page.
                </p>
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${theme.subtleTag}`}>
                {pageStart}-{pageEnd} sur {totalResults}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 p-5 sm:p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-[28px] bg-slate-100" />
              ))}
            </div>
          ) : totalResults === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyPanel
                title={emptyTitle}
                description={emptyMessage}
                actionLabel={hasActiveFilters ? 'Reinitialiser les filtres' : `Ajouter ${labels.singular}`}
                onAction={hasActiveFilters ? resetFilters : focusDirectorySearch}
              />
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3 sm:p-6">
              {paginatedDirectory.map((item) => (
                <PartnerCard
                  key={item.profileId}
                  item={item}
                  selfRole={selfRole}
                  theme={theme}
                  processingKey={processingKey}
                  onOpenProfile={setSelectedProfile}
                  onSendRequest={handleSendRequest}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold">Partenaire</th>
                    <th className="px-5 py-4 text-left font-semibold">Etat</th>
                    <th className="px-5 py-4 text-left font-semibold">Contact</th>
                    <th className="px-5 py-4 text-left font-semibold">Ville</th>
                    <th className="px-5 py-4 text-left font-semibold">Maj</th>
                    <th className="px-5 py-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedDirectory.map((item) => {
                    const avatarUrl = resolveAvatarUrl(item.avatar);
                    const meta = BOARD_META[item.boardState] || BOARD_META.available;
                    const canRetryInvitation = item.boardState === 'blocked' && canSendRequest(item, selfRole);

                    return (
                      <tr key={item.profileId} className="align-top">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-xs font-bold text-white">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={item.fullName || item.businessName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">{getInitials(item.businessName || item.fullName)}</div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{item.businessName || '-'}</p>
                              <p className="text-xs text-slate-500">{item.fullName || 'Responsable non renseigne'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.badgeClass}`}>
                              {getStatusLabel(item)}
                            </span>
                            <p className="max-w-xs text-xs text-slate-500">{getPartnerSummary(item, selfRole)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          <p>{item.email || '-'}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.phone || '-'}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{item.city || '-'}</td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(item.updatedAt)}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedProfile(item)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Voir profil
                            </button>

                            {item.boardState === 'incoming_pending' && item.requestId && (
                              <>
                                <button
                                  type="button"
                                  disabled={processingKey === `accept-${item.requestId}`}
                                  onClick={() => handleAccept(item.requestId)}
                                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  Accepter
                                </button>
                                <button
                                  type="button"
                                  disabled={processingKey === `reject-${item.requestId}`}
                                  onClick={() => handleReject(item.requestId)}
                                  className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                                >
                                  Refuser
                                </button>
                              </>
                            )}

                            {(item.boardState === 'available' || item.boardState === 'rejected') && (
                              <button
                                type="button"
                                disabled={processingKey === `send-${item.profileId}`}
                                onClick={() => handleSendRequest(item)}
                                className={`rounded-xl px-3 py-2 text-xs font-semibold text-white ${theme.button}`}
                              >
                                Envoyer invitation
                              </button>
                            )}

                            {item.boardState === 'outgoing_pending' && (
                              <span className="inline-flex items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
                                Invitation envoyee
                              </span>
                            )}

                            {item.boardState === 'connected' && (
                              <button
                                type="button"
                                onClick={() => setSelectedProfile(item)}
                                className={`rounded-xl px-3 py-2 text-xs font-semibold text-white ${theme.button}`}
                              >
                                Gerer relation
                              </button>
                            )}

                            {canRetryInvitation && (
                              <button
                                type="button"
                                disabled={processingKey === `send-${item.profileId}`}
                                onClick={() => handleSendRequest(item)}
                                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                              >
                                Relancer invitation
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs font-medium text-slate-600">
              Affichage {pageStart}-{pageEnd} sur {totalResults}
            </p>
            <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                aria-label="Page precedente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {paginationPages.map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">
                      ...
                    </span>
                  );
                }

                const isActive = page === currentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 min-w-9 rounded-xl border px-2 text-xs font-semibold ${
                      isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </section>

      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          selfRole={selfRole}
          processingKey={processingKey}
          onClose={() => setSelectedProfile(null)}
          onBlock={handleBlock}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}

export default PartnerDirectoryPage;
