import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '../../api/axios';
import {
  clientsQueryOptions,
  getApiErrorMessage,
  normalizeClientRecord,
  queryKeys,
} from '../../lib/appQueries';

const CLIENT_STATUS_META = {
  active: {
    label: 'Actif',
    className: 'border-emerald-200 bg-emerald-100 text-emerald-700'
  },
  missing: {
    label: 'Manquant',
    className: 'border-amber-200 bg-amber-100 text-amber-700'
  }
};

function ClientsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [actionError, setActionError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    cin: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  });

  const clientsQuery = useQuery(clientsQueryOptions());
  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);
  const loading = clientsQuery.isLoading;

  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, payload }) => {
      const response = await axios.put(`/Clients/${clientId}`, payload);
      return normalizeClientRecord(response.data.data);
    },
    onMutate: async ({ clientId, payload }) => {
      setActionError('');
      await queryClient.cancelQueries({ queryKey: queryKeys.clients.all });
      const previousClients = queryClient.getQueryData(queryKeys.clients.all) || [];

      queryClient.setQueryData(queryKeys.clients.all, (current = []) =>
        current.map((client) => (
          client.clientId === clientId
            ? normalizeClientRecord({ ...client, ...payload, clientId })
            : client
        ))
      );

      return { previousClients };
    },
    onError: (err, _variables, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(queryKeys.clients.all, context.previousClients);
      }
      setActionError(getApiErrorMessage(err, 'Erreur lors de la modification'));
    },
    onSuccess: (updatedClient) => {
      queryClient.setQueryData(queryKeys.clients.all, (current = []) =>
        current.map((client) => (
          client.clientId === updatedClient.clientId ? updatedClient : client
        ))
      );
      setSelectedClient(updatedClient);
      setShowEditModal(false);
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId) => {
      const response = await axios.delete(`/Clients/${clientId}`);
      return response.data.data ? normalizeClientRecord(response.data.data) : null;
    },
    onMutate: async (clientId) => {
      setActionError('');
      await queryClient.cancelQueries({ queryKey: queryKeys.clients.all });
      const previousClients = queryClient.getQueryData(queryKeys.clients.all) || [];
      const previousClient = previousClients.find((client) => client.clientId === clientId) || null;

      queryClient.setQueryData(queryKeys.clients.all, (current = []) =>
        current.map((client) => (
          client.clientId === clientId ? { ...client, status: 'missing' } : client
        ))
      );

      return { previousClients, previousClient };
    },
    onError: (err, _clientId, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(queryKeys.clients.all, context.previousClients);
      }
      setActionError(getApiErrorMessage(err, 'Erreur lors du changement de statut'));
    },
    onSuccess: (updatedClient, clientId, context) => {
      const nextClient = updatedClient || (context?.previousClient ? { ...context.previousClient, status: 'missing' } : null);
      if (!nextClient) return;

      queryClient.setQueryData(queryKeys.clients.all, (current = []) =>
        current.map((client) => (
          client.clientId === clientId ? nextClient : client
        ))
      );

      setSelectedClient((prev) => {
        if (!prev || prev.clientId !== clientId) {
          return prev;
        }

        return nextClient;
      });
    }
  });

  const submittingClient = updateClientMutation.isPending || deleteClientMutation.isPending;

  const error = actionError || (clientsQuery.isError ? getApiErrorMessage(clientsQuery.error, 'Erreur lors du chargement des clients') : '');

  const filteredClients = useMemo(() => {
    const s = deferredSearchTerm.toLowerCase().trim();
    if (!s) {
      return clients;
    }

    return clients.filter((client) => {
      const fullName = (client.fullName || '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      const phone = (client.phone || '').toLowerCase();
      const cin = (client.cin || '').toLowerCase();
      const city = (client.city || '').toLowerCase();
      const status = client.status === 'missing' ? 'manquant' : 'actif';

      return (
        fullName.includes(s) ||
        email.includes(s) ||
        phone.includes(s) ||
        cin.includes(s) ||
        city.includes(s) ||
        status.includes(s)
      );
    });
  }, [clients, deferredSearchTerm]);

  const dashboardStats = useMemo(() => {
    const totalClients = clients.length;

    const totalMotorcyclesSold = clients.reduce(
      (sum, client) => sum + (Number(client.motorcyclesPurchasedCount) || 0),
      0
    );

    const totalRevenue = clients.reduce(
      (sum, client) => sum + (Number(client.totalInvoicedAmount) || 0),
      0
    );

    const activeBuyers = clients.filter(
      (client) => client.status !== 'missing' && (Number(client.motorcyclesPurchasedCount) || 0) > 0
    ).length;

    const missingClients = clients.filter((client) => client.status === 'missing').length;

    return {
      totalClients,
      totalMotorcyclesSold,
      totalRevenue,
      activeBuyers,
      missingClients
    };
  }, [clients]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString('fr-FR') : 'Aucun achat');

  const buildClientPayload = () => ({
    fullName: formData.fullName?.trim(),
    cin: formData.cin?.trim(),
    email: formData.email?.trim() || null,
    phone: formData.phone?.trim() || null,
    address: formData.address?.trim() || null,
    city: formData.city?.trim() || null
  });

  const escapeCsvCell = (value) => {
    const normalized = String(value ?? '');
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const handleExportClients = () => {
    if (filteredClients.length === 0) {
      setActionError('Aucun client a exporter.');
      return;
    }

    setActionError('');

    const headers = [
      'Nom complet',
      'CIN',
      'Email',
      'Telephone',
      'Adresse',
      'Ville',
      'Statut',
      'Motos achetees',
      'Montant total facture',
      'Dernier achat',
      'Date creation'
    ];

    const rows = filteredClients.map((client) => [
      client.fullName || '',
      client.cin || '',
      client.email || '',
      client.phone || '',
      client.address || '',
      client.city || '',
      client.status === 'missing' ? 'Manquant' : 'Actif',
      client.motorcyclesPurchasedCount ?? 0,
      Number(client.totalInvoicedAmount || 0).toFixed(2),
      client.lastPurchaseDate ? new Date(client.lastPurchaseDate).toLocaleDateString('fr-FR') : '',
      client.createdAt ? new Date(client.createdAt).toLocaleDateString('fr-FR') : ''
    ]);

    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((row) => row.map(escapeCsvCell).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = `clients-${new Date().toISOString().slice(0, 10)}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      return;
    }

    try {
      await updateClientMutation.mutateAsync({
        clientId: selectedClient.clientId,
        payload: buildClientPayload()
      });
    } catch {
      // handled by mutation callbacks
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Marquer ce client comme manquant ?')) {
      return;
    }

    try {
      await deleteClientMutation.mutateAsync(clientId);
    } catch {
      // handled by mutation callbacks
    }
  };

  const handleViewClient = (client) => {
    setSelectedClient(client);
    setShowViewModal(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setFormData({
      fullName: client.fullName || '',
      cin: client.cin || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || ''
    });
    setShowEditModal(true);
  };

  const getInitials = (name) => {
    const safeName = (name || '').trim();
    if (!safeName) {
      return 'CL';
    }

    const parts = safeName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return safeName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-4 sm:px-6 py-6 sm:py-7 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold">Clients</h1>
          <p className="mt-2 text-sm text-slate-200">
            Suivez les clients, les motos vendues et le montant total facture.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {dashboardStats.activeBuyers} client(s) actif(s)
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-100">
              {dashboardStats.missingClients} client(s) manquant(s)
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {filteredClients.length} resultat(s) affiche(s)
            </span>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, telephone, email, CIN..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleExportClients}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Exporter CSV
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total clients</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboardStats.totalClients}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Motos achetees</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboardStats.totalMotorcyclesSold}</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Montant total facture</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">
                {formatCurrency(dashboardStats.totalRevenue)}
              </p>
            </article>
            <article className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-700">Clients actifs</p>
              <p className="mt-2 text-2xl font-semibold text-blue-900">{dashboardStats.activeBuyers}</p>
            </article>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-12 text-center">
            <svg
              className="mx-auto mb-4 h-16 w-16 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mb-1 text-lg font-semibold text-slate-900">Aucun client trouve</h3>
            <p className="text-slate-600">Aucun resultat ne correspond a votre recherche.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {filteredClients.map((client) => {
                const statusMeta = CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.active;
                const isMissing = client.status === 'missing';

                return (
                  <article
                    key={`mobile-${client.clientId}`}
                    className={`rounded-2xl border p-4 shadow-sm ${isMissing ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-sm font-bold text-white">
                          {getInitials(client.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-900">{client.fullName}</p>
                          <p className="truncate text-sm text-slate-500">{client.email || 'Aucun email'}</p>
                          <p className="mt-0.5 text-xs text-slate-500">CIN: {client.cin}</p>
                        </div>
                      </div>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <span>Telephone</span>
                        <span className="text-right font-semibold text-slate-900">{client.phone || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Ville</span>
                        <span className="text-right font-semibold text-slate-900">{client.city || 'Ville non renseignee'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Motos achetees</span>
                        <span className="text-right font-semibold text-slate-900">{client.motorcyclesPurchasedCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Montant facture</span>
                        <span className="text-right font-semibold text-emerald-700">{formatCurrency(client.totalInvoicedAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Dernier achat</span>
                        <span className="text-right font-semibold text-slate-900">{formatDate(client.lastPurchaseDate)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Date creation</span>
                        <span className="text-right font-semibold text-slate-900">{new Date(client.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewClient(client)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Voir
                      </button>
                      <button
                        onClick={() => handleEditClient(client)}
                        disabled={isMissing}
                        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isMissing ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400' : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                      >
                        Modifier
                      </button>
                      {!isMissing ? (
                        <button
                          onClick={() => handleDeleteClient(client.clientId)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Marquer manquant
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Client
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Contact
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Performance
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Statut
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Dernier achat
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Date creation
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredClients.map((client) => {
                    const statusMeta = CLIENT_STATUS_META[client.status] || CLIENT_STATUS_META.active;
                    const isMissing = client.status === 'missing';

                    return (
                      <tr
                        key={client.clientId}
                        className={`transition-colors ${isMissing ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-sm font-bold text-white">
                              {getInitials(client.fullName)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{client.fullName}</p>
                              <p className="text-sm text-slate-500">{client.email || 'Aucun email'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 sm:px-6 py-4 text-sm">
                          <p className="text-slate-900">{client.phone || '-'}</p>
                          <p className="mt-0.5 text-xs text-slate-500">CIN: {client.cin}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{client.city || 'Ville non renseignee'}</p>
                        </td>

                        <td className="px-4 sm:px-6 py-4">
                          <div className="min-w-[210px] space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Motos achetees</span>
                              <span className="font-semibold text-slate-900">
                                {client.motorcyclesPurchasedCount || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Montant facture</span>
                              <span className="font-semibold text-emerald-700">
                                {formatCurrency(client.totalInvoicedAmount)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="px-4 sm:px-6 py-4 text-sm text-slate-700">{formatDate(client.lastPurchaseDate)}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-slate-600">
                          {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                        </td>

                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewClient(client)}
                              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                              title="Voir"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEditClient(client)}
                              disabled={isMissing}
                              className={`rounded-lg p-2 text-blue-600 transition-colors ${isMissing ? 'cursor-not-allowed opacity-40' : 'hover:bg-blue-50'}`}
                              title={isMissing ? 'Client manquant' : 'Modifier'}
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            {!isMissing ? (
                              <button
                                onClick={() => handleDeleteClient(client.clientId)}
                                className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                                title="Marquer manquant"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            ) : (
                              <span className="rounded-lg border border-amber-200 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                Manquant
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 px-4 sm:px-6 py-4">
              <p className="text-sm text-slate-600">
                Affichage de <span className="font-semibold">{filteredClients.length}</span> sur{' '}
                <span className="font-semibold">{dashboardStats.totalClients}</span> clients
              </p>
            </div>
          </>
        )}
      </section>

      {showViewModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
            <div className="sticky top-0 border-b border-slate-200 bg-white px-4 sm:px-8 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Details du client</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-8">
              <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-xl font-bold text-white">
                  {getInitials(selectedClient.fullName)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedClient.fullName}</h3>
                  <p className="text-slate-600">{selectedClient.email || 'Aucun email'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase text-slate-500">Motos achetees</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {selectedClient.motorcyclesPurchasedCount || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs uppercase text-emerald-700">Montant total</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-900">
                    {formatCurrency(selectedClient.totalInvoicedAmount)}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs uppercase text-blue-700">Dernier achat</p>
                  <p className="mt-1 text-lg font-semibold text-blue-900">
                    {formatDate(selectedClient.lastPurchaseDate)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-sm text-slate-600">CIN</p>
                  <p className="font-semibold text-slate-900">{selectedClient.cin}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-slate-600">Telephone</p>
                  <p className="font-semibold text-slate-900">{selectedClient.phone || '-'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-slate-600">Statut</p>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${(CLIENT_STATUS_META[selectedClient.status] || CLIENT_STATUS_META.active).className}`}>
                    {(CLIENT_STATUS_META[selectedClient.status] || CLIENT_STATUS_META.active).label}
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-sm text-slate-600">Ville</p>
                  <p className="font-semibold text-slate-900">{selectedClient.city || 'N/A'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-slate-600">Adresse</p>
                  <p className="font-semibold text-slate-900">{selectedClient.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-slate-600">Date creation</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(selectedClient.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
            <div className="sticky top-0 border-b border-slate-200 bg-white px-4 sm:px-8 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Modifier le client</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedClient(null);
                  }}
                  className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-6 p-4 sm:p-8">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    CIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cin"
                    value={formData.cin}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Telephone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Adresse</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Ville</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedClient(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingClient}
                  className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingClient ? 'Mise a jour...' : 'Mettre a jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsPage;
