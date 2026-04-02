import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import supportService from '../services/supportService';

const STATUS_OPTIONS = [
  { value: 1, label: 'En attente' },
  { value: 2, label: 'En cours' },
  { value: 3, label: 'Resolue' },
  { value: 4, label: 'Cloturee' }
];

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Basse' },
  { value: 2, label: 'Normale' },
  { value: 3, label: 'Haute' },
  { value: 4, label: 'Urgente' }
];

const CREATED_BY_ROLE_OPTIONS = [
  { value: 2, label: 'Revendeur' },
  { value: 3, label: 'Fournisseur' }
];

function normalizeStatus(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isInteger(numeric)) return numeric;
    const key = value.trim().toLowerCase();
    if (key === 'pending') return 1;
    if (key === 'inprogress' || key === 'in_progress') return 2;
    if (key === 'resolved') return 3;
    if (key === 'closed') return 4;
  }
  return 1;
}

function normalizePriority(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isInteger(numeric)) return numeric;
    const key = value.trim().toLowerCase();
    if (key === 'low') return 1;
    if (key === 'normal') return 2;
    if (key === 'high') return 3;
    if (key === 'urgent') return 4;
  }
  return 2;
}

function normalizeRole(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isInteger(numeric)) return numeric;
    const key = value.trim().toLowerCase();
    if (key === 'revendeur') return 2;
    if (key === 'fournisseur') return 3;
    if (key === 'admin') return 4;
  }
  return 0;
}

function formatDateTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function statusLabel(value) {
  const normalized = normalizeStatus(value);
  return STATUS_OPTIONS.find((x) => x.value === normalized)?.label || 'En attente';
}

function priorityLabel(value) {
  const normalized = normalizePriority(value);
  return PRIORITY_OPTIONS.find((x) => x.value === normalized)?.label || 'Normale';
}

function roleLabel(value) {
  const normalized = normalizeRole(value);
  if (normalized === 2) return 'Revendeur';
  if (normalized === 3) return 'Fournisseur';
  if (normalized === 4) return 'Admin';
  return 'Utilisateur';
}

function roleInitial(value) {
  const normalized = normalizeRole(value);
  if (normalized === 2) return 'R';
  if (normalized === 3) return 'F';
  if (normalized === 4) return 'A';
  return 'U';
}

function statusBadgeClass(value) {
  const normalized = normalizeStatus(value);
  if (normalized === 4) return 'bg-slate-100 text-slate-700';
  if (normalized === 3) return 'bg-emerald-100 text-emerald-700';
  if (normalized === 2) return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

function priorityBadgeClass(value) {
  const normalized = normalizePriority(value);
  if (normalized === 4) return 'bg-rose-100 text-rose-700';
  if (normalized === 3) return 'bg-orange-100 text-orange-700';
  if (normalized === 1) return 'bg-slate-100 text-slate-700';
  return 'bg-indigo-100 text-indigo-700';
}

function SupportCenterPage({ mode = 'revendeur' }) {
  const { user } = useAuth();
  const isAdmin = mode === 'admin';
  const currentUserId = Number(user?.id ?? user?.userId ?? 0);
  const currentUserRole = normalizeRole(user?.role);

  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newPriority, setNewPriority] = useState('2');
  const [newMessage, setNewMessage] = useState('');

  const pageTitle = useMemo(() => {
    if (isAdmin) return 'Support admin';
    if (mode === 'fournisseur') return 'Support fournisseur';
    return 'Support revendeur';
  }, [isAdmin, mode]);

  const loadDetail = useCallback(async (ticketId) => {
    if (!ticketId) {
      setSelectedTicket(null);
      return;
    }

    setLoadingDetail(true);
    try {
      const detail = await supportService.getTicket(ticketId);
      setSelectedTicket(detail);
    } catch (error) {
      toast.error(error.message || 'Impossible de charger le detail.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const params = { take: 200 };
      if (statusFilter !== 'all') params.status = Number(statusFilter);
      if (isAdmin && roleFilter !== 'all') params.createdByRole = Number(roleFilter);
      if (search.trim()) params.search = search.trim();

      const data = await supportService.listTickets(params);
      setTickets(data);

      if (data.length === 0) {
        setSelectedTicketId(null);
        setSelectedTicket(null);
        return;
      }

      if (!selectedTicketId || !data.some((x) => x.id === selectedTicketId)) {
        setSelectedTicketId(data[0].id);
      }
    } catch (error) {
      toast.error(error.message || 'Impossible de charger les tickets.');
    } finally {
      setLoadingTickets(false);
    }
  }, [isAdmin, roleFilter, search, selectedTicketId, statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    loadDetail(selectedTicketId);
  }, [loadDetail, selectedTicketId]);

  const handleCreateTicket = async (event) => {
    event.preventDefault();
    const subject = newSubject.trim();
    const message = newMessage.trim();

    if (!subject || !message) {
      toast.error('Renseignez l objet et le message.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await supportService.createTicket({
        subject,
        category: newCategory.trim() || 'General',
        priority: Number(newPriority),
        message
      });

      toast.success('Ticket cree avec succes.');
      setNewSubject('');
      setNewMessage('');
      setNewCategory('General');
      setNewPriority('2');

      await loadTickets();
      if (created?.id) {
        setSelectedTicketId(created.id);
      }
    } catch (error) {
      toast.error(error.message || 'Creation impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket?.id) return;
    const body = replyMessage.trim();
    if (!body) return;

    setSendingMessage(true);
    try {
      await supportService.sendMessage(selectedTicket.id, body);
      setReplyMessage('');
      await Promise.all([loadDetail(selectedTicket.id), loadTickets()]);
      toast.success('Message envoye.');
    } catch (error) {
      toast.error(error.message || 'Envoi impossible.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!selectedTicket?.id) return;

    setUpdatingStatus(true);
    try {
      await supportService.updateStatus(selectedTicket.id, Number(nextStatus));
      await Promise.all([loadDetail(selectedTicket.id), loadTickets()]);
      toast.success('Statut mis a jour.');
    } catch (error) {
      toast.error(error.message || 'Mise a jour impossible.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const canCloseTicket = !isAdmin && normalizeStatus(selectedTicket?.status) !== 4;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.1 9a3 3 0 0 1 5.8 1c0 1.9-2.9 2.3-2.9 4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{pageTitle}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {isAdmin
            ? 'Repondez aux demandes support des revendeurs et fournisseurs.'
            : 'Ouvrez un ticket pour contacter l equipe admin et suivre les reponses.'}
        </p>
      </div>

      {!isAdmin && (
        <form onSubmit={handleCreateTicket} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Nouveau ticket</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              type="text"
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
              placeholder="Objet du ticket"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 md:col-span-2"
            />
            <select
              value={newPriority}
              onChange={(event) => setNewPriority(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Categorie (ex: Facturation)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 md:col-span-3"
            />
            <textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              rows={4}
              placeholder="Expliquez votre demande..."
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 md:col-span-3"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creation...' : 'Creer le ticket'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-4">
          <div className="border-b border-slate-200 p-4">
            <h3 className="text-base font-bold text-slate-900">Tickets</h3>
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher ticket..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                >
                  <option value="all">Tous statuts</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {isAdmin && (
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                  >
                    <option value="all">Tous profils</option>
                    {CREATED_BY_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto">
            {loadingTickets ? (
              <p className="p-4 text-sm text-slate-500">Chargement des tickets...</p>
            ) : tickets.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Aucun ticket.</p>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50 ${
                    selectedTicketId === ticket.id ? 'bg-cyan-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{ticket.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">{ticket.ticketNumber}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(ticket.status)}`}>
                      {statusLabel(ticket.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${priorityBadgeClass(ticket.priority)}`}>
                      {priorityLabel(ticket.priority)}
                    </span>
                    <span className="text-xs text-slate-500">{ticket.category || 'General'}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {isAdmin ? `${roleLabel(ticket.createdByRole)}: ${ticket.createdByName}` : `MAJ: ${formatDateTime(ticket.updatedAt)}`}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
          {!selectedTicket ? (
            <div className="p-6 text-sm text-slate-500">Selectionnez un ticket pour afficher la discussion.</div>
          ) : loadingDetail ? (
            <div className="p-6 text-sm text-slate-500">Chargement du detail...</div>
          ) : (
            <div className="flex h-full min-h-[560px] flex-col">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedTicket.subject}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedTicket.ticketNumber} - {selectedTicket.category || 'General'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(selectedTicket.status)}`}>
                      {statusLabel(selectedTicket.status)}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${priorityBadgeClass(selectedTicket.priority)}`}>
                      {priorityLabel(selectedTicket.priority)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Cree par: {selectedTicket.createdByName} ({roleLabel(selectedTicket.createdByRole)})</span>
                  {selectedTicket.assignedAdminName && <span>Admin: {selectedTicket.assignedAdminName}</span>}
                  <span>Ouvert le: {formatDateTime(selectedTicket.createdAt)}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isAdmin ? (
                    <select
                      value={normalizeStatus(selectedTicket.status)}
                      onChange={(event) => handleStatusChange(event.target.value)}
                      disabled={updatingStatus}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    canCloseTicket && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(4)}
                        disabled={updatingStatus}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cloturer le ticket
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
                {(selectedTicket.messages || []).map((msg) => {
                  const senderId = Number(msg.senderUserId ?? 0);
                  const senderRole = normalizeRole(msg.senderRole);
                  const mineById = senderId > 0 && currentUserId > 0 && senderId === currentUserId;
                  const mineByRole = !isAdmin && senderRole > 0 && senderRole === currentUserRole;
                  const mine = mineById || mineByRole;

                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
                          {roleInitial(senderRole)}
                        </div>
                      )}

                      <div className={`max-w-[82%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                        <p className={`mb-1 text-[11px] font-semibold ${mine ? 'text-cyan-700' : 'text-slate-500'}`}>
                          {mine ? 'Vous' : `${msg.senderName} (${roleLabel(senderRole)})`}
                        </p>
                        <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          mine
                            ? 'rounded-br-md bg-cyan-600 text-white'
                            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        </div>
                        <p className={`mt-1 text-[11px] ${mine ? 'text-cyan-700/80' : 'text-slate-500'}`}>
                          {formatDateTime(msg.createdAt)}
                        </p>
                      </div>

                      {mine && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[11px] font-bold text-cyan-700">
                          {roleInitial(senderRole)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    rows={3}
                    placeholder="Ecrire une reponse..."
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !replyMessage.trim()}
                    className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingMessage ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default SupportCenterPage;
