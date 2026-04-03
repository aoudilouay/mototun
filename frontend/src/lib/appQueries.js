import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import api from '../api/axios';

const MINUTE = 60 * 1000;

export const queryKeys = Object.freeze({
  clients: Object.freeze({
    all: ['clients'],
  }),
  motorcycles: Object.freeze({
    all: ['motorcycles'],
  }),
  revendeur: Object.freeze({
    invoices: Object.freeze({
      all: ['revendeur', 'invoices'],
    }),
    fournisseursDirectory: Object.freeze({
      all: ['revendeur', 'fournisseurs-directory'],
    }),
  }),
  fournisseur: Object.freeze({
    analytics: (range) => ['fournisseur', 'dashboard', 'analytics', range],
    dossiers: ['fournisseur', 'dossiers'],
    partnershipsSent: ['fournisseur', 'partnerships', 'sent'],
    partnershipsReceived: ['fournisseur', 'partnerships', 'received'],
  }),
  notifications: (userType = 'all') => ['notifications', userType],
});

export function extractApiArray(response) {
  return Array.isArray(response?.data?.data) ? response.data.data : [];
}

export function extractApiObject(response) {
  return response?.data?.data && typeof response.data.data === 'object' ? response.data.data : null;
}

export function getApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.response?.data?.Message || fallbackMessage;
}

export function normalizeClientStatus(rawStatus) {
  if (typeof rawStatus === 'string') {
    return rawStatus.trim().toLowerCase() === 'missing' ? 'missing' : 'active';
  }

  return Number(rawStatus) === 1 ? 'missing' : 'active';
}

export function normalizeClientRecord(rawClient) {
  const clientId = rawClient?.clientId ?? rawClient?.id;

  return {
    ...rawClient,
    id: clientId,
    clientId,
    status: normalizeClientStatus(rawClient?.status),
  };
}

export function normalizeMotorcycleRecord(rawMotorcycle) {
  const motorcycleId = rawMotorcycle?.motorcycleId ?? rawMotorcycle?.id;

  return {
    ...rawMotorcycle,
    id: motorcycleId,
    motorcycleId,
    revendeurId: rawMotorcycle?.revendeurId,
    company: rawMotorcycle?.company,
    brand: rawMotorcycle?.brand,
    model: rawMotorcycle?.model,
    qty: rawMotorcycle?.qty,
    purchasePrice: rawMotorcycle?.purchasePrice,
    salePrice: rawMotorcycle?.salePrice,
  };
}

async function fetchClients() {
  const response = await api.get('/Clients');
  return extractApiArray(response).map(normalizeClientRecord);
}

async function fetchMotorcycles() {
  const response = await api.get('/Motorcycles');
  return extractApiArray(response).map(normalizeMotorcycleRecord);
}

async function fetchRevendeurInvoices() {
  const response = await api.get('/Invoices');
  return extractApiArray(response);
}

async function fetchRevendeurFournisseursDirectory() {
  const response = await api.get('/partnership-requests/directory/fournisseurs');
  return extractApiArray(response);
}

async function fetchFournisseurAnalytics(range) {
  const response = await api.get(`/Invoices/fournisseur/dashboard?range=${range}`);
  return extractApiObject(response);
}

async function fetchFournisseurDossiers() {
  const response = await api.get('/Invoices/fournisseur/carte-grise');
  return extractApiArray(response);
}

async function fetchFournisseurPartnershipsSent() {
  const response = await api.get('/partnership-requests/sent');
  return extractApiArray(response);
}

async function fetchFournisseurPartnershipsReceived() {
  const response = await api.get('/partnership-requests/received');
  return extractApiArray(response);
}

async function fetchNotifications() {
  const response = await api.get('/Notifications');
  return extractApiArray(response);
}

export function clientsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.clients.all,
    queryFn: fetchClients,
    staleTime: 2 * MINUTE,
    gcTime: 20 * MINUTE,
  });
}

export function motorcyclesQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.motorcycles.all,
    queryFn: fetchMotorcycles,
    staleTime: 2 * MINUTE,
    gcTime: 20 * MINUTE,
  });
}

export function revendeurInvoicesQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.revendeur.invoices.all,
    queryFn: fetchRevendeurInvoices,
    staleTime: 45 * 1000,
    gcTime: 15 * MINUTE,
  });
}

export function revendeurFournisseursDirectoryQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.revendeur.fournisseursDirectory.all,
    queryFn: fetchRevendeurFournisseursDirectory,
    staleTime: 3 * MINUTE,
    gcTime: 20 * MINUTE,
  });
}

export function fournisseurDashboardAnalyticsQueryOptions(range = 'month') {
  return queryOptions({
    queryKey: queryKeys.fournisseur.analytics(range),
    queryFn: () => fetchFournisseurAnalytics(range),
    staleTime: MINUTE,
    gcTime: 15 * MINUTE,
    placeholderData: keepPreviousData,
  });
}

export function fournisseurDossiersQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.fournisseur.dossiers,
    queryFn: fetchFournisseurDossiers,
    staleTime: 45 * 1000,
    gcTime: 15 * MINUTE,
  });
}

export function fournisseurPartnershipsSentQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.fournisseur.partnershipsSent,
    queryFn: fetchFournisseurPartnershipsSent,
    staleTime: MINUTE,
    gcTime: 15 * MINUTE,
  });
}

export function fournisseurPartnershipsReceivedQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.fournisseur.partnershipsReceived,
    queryFn: fetchFournisseurPartnershipsReceived,
    staleTime: MINUTE,
    gcTime: 15 * MINUTE,
  });
}

export function notificationsQueryOptions(userType = 'all') {
  return queryOptions({
    queryKey: queryKeys.notifications(userType),
    queryFn: fetchNotifications,
    staleTime: 20 * 1000,
    gcTime: 10 * MINUTE,
  });
}

export function prefetchDataForRole(queryClient, role) {
  if (!queryClient || !role) return Promise.resolve([]);

  if (role === 'Revendeur') {
    return Promise.allSettled([
      queryClient.prefetchQuery(revendeurInvoicesQueryOptions()),
      queryClient.prefetchQuery(clientsQueryOptions()),
      queryClient.prefetchQuery(motorcyclesQueryOptions()),
      queryClient.prefetchQuery(revendeurFournisseursDirectoryQueryOptions()),
    ]);
  }

  if (role === 'Fournisseur') {
    return Promise.allSettled([
      queryClient.prefetchQuery(fournisseurDashboardAnalyticsQueryOptions('month')),
      queryClient.prefetchQuery(fournisseurDossiersQueryOptions()),
      queryClient.prefetchQuery(fournisseurPartnershipsSentQueryOptions()),
      queryClient.prefetchQuery(fournisseurPartnershipsReceivedQueryOptions()),
      queryClient.prefetchQuery(notificationsQueryOptions('fournisseur')),
    ]);
  }

  return Promise.resolve([]);
}

export function prefetchDataForPath(queryClient, path) {
  if (!queryClient || !path) return Promise.resolve([]);

  switch (path) {
    case '/revendeur/dashboard':
      return prefetchDataForRole(queryClient, 'Revendeur');
    case '/revendeur/clients':
      return Promise.allSettled([queryClient.prefetchQuery(clientsQueryOptions())]);
    case '/revendeur/motorcycles':
      return Promise.allSettled([queryClient.prefetchQuery(motorcyclesQueryOptions())]);
    case '/revendeur/invoices':
      return Promise.allSettled([
        queryClient.prefetchQuery(clientsQueryOptions()),
        queryClient.prefetchQuery(motorcyclesQueryOptions()),
      ]);
    case '/revendeur/carte-grise':
      return Promise.allSettled([queryClient.prefetchQuery(revendeurInvoicesQueryOptions())]);
    case '/fournisseur/dashboard':
      return prefetchDataForRole(queryClient, 'Fournisseur');
    case '/fournisseur/revendeurs':
      return Promise.allSettled([
        queryClient.prefetchQuery(fournisseurPartnershipsSentQueryOptions()),
        queryClient.prefetchQuery(fournisseurPartnershipsReceivedQueryOptions()),
      ]);
    case '/fournisseur/carte-grise':
      return Promise.allSettled([queryClient.prefetchQuery(fournisseurDossiersQueryOptions())]);
    default:
      return Promise.resolve([]);
  }
}
