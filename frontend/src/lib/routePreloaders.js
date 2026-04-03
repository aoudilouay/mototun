export const loadRevendeurDashboardPage = () => import('../Pages/revendeur/DashboardPage');
export const loadClientsPage = () => import('../Pages/revendeur/ClientsPage');
export const loadMotorcyclesPage = () => import('../Pages/revendeur/MotorcyclesPage');
export const loadCarteGrisePage = () => import('../Pages/revendeur/CarteGrisePage');
export const loadInvoicesPage = () => import('../Pages/revendeur/InvoicesPage');

export const loadFournisseurDashboardPage = () => import('../Pages/fournisseur/FournisseurDashboardPage');
export const loadRevendeursPage = () => import('../Pages/fournisseur/RevendeursPage');
export const loadFournisseurCarteGrisePage = () => import('../Pages/fournisseur/FournisseurCarteGrisePage');

const routeModuleLoaders = {
  '/revendeur/dashboard': loadRevendeurDashboardPage,
  '/revendeur/clients': loadClientsPage,
  '/revendeur/motorcycles': loadMotorcyclesPage,
  '/revendeur/carte-grise': loadCarteGrisePage,
  '/revendeur/invoices': loadInvoicesPage,
  '/fournisseur/dashboard': loadFournisseurDashboardPage,
  '/fournisseur/revendeurs': loadRevendeursPage,
  '/fournisseur/carte-grise': loadFournisseurCarteGrisePage,
};

export function preloadRouteModule(path) {
  const loader = routeModuleLoaders[path];
  if (!loader) return Promise.resolve(null);
  return loader();
}
