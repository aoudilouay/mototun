/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { repairMojibake } from '../utils/textEncoding';

const STORAGE_KEY = 'mototun_language';
const ENABLE_DOM_AUTO_TRANSLATION = String(import.meta.env.VITE_ENABLE_DOM_AUTO_TRANSLATION || '').trim().toLowerCase() === 'true';

const AUTO_TRANSLATION_KEYS = {
  Dashboard: 'nav.dashboard',
  Clients: 'nav.clients',
  Motos: 'nav.motorcycles',
  'Carte grise': 'nav.carteGrise',
  Factures: 'nav.invoices',
  'Mes fournisseurs': 'nav.fournisseurs',
  'Mes revendeurs': 'nav.revendeurs',
  'Cartes grises': 'nav.cartesGrises',
  'Catalogue motos': 'nav.catalog',
  Commandes: 'nav.orders',
  Messages: 'nav.messages',
  Parametres: 'nav.settings',
  Statistiques: 'nav.stats',
  Autres: 'common.other',
  'Mon profil': 'common.profile',
  Deconnexion: 'common.logout',
  Rafraichir: 'common.refresh',
  'Chargement...': 'common.loading',
  Notifications: 'notifications.title',
  'Tout marquer lu': 'notifications.markAllRead',
  'Aucune notification': 'notifications.noNotifications',
  'Vous etes a jour.': 'notifications.upToDate',
  'Marquer lu': 'notifications.markRead',
  Supprimer: 'notifications.delete',
  Toutes: 'notifications.filters.all',
  'Non lues': 'notifications.filters.unread',
  Stock: 'notifications.filters.stock',
  Paiements: 'notifications.filters.payments',
  'Rechercher client, moto, facture...': 'common.searchRevendeur',
  'Rechercher revendeur, dossier...': 'common.searchFournisseur',
  'Archive (bientot...)': 'common.comingSoonArchive',
  'Statistiques (bientot...)': 'common.comingSoonStats',
  'Parametres (bientot...)': 'common.comingSoonSettings',
  'Catalogue (bientot...)': 'common.comingSoonCatalog',
  'Commandes (bientot...)': 'common.comingSoonOrders',
  'Bon retour !': 'login.title',
  'Connectez-vous a votre espace professionnel': 'login.subtitle',
  Email: 'login.email',
  'Mot de passe': 'login.password',
  'Se connecter': 'login.submit',
  'Connexion...': 'login.submitting',
  'Pas encore de compte ?': 'login.noAccount',
  'Creer un compte': 'login.createAccount',
  'Creer votre compte professionnel': 'register.title',
  'Commencez a digitaliser votre business en 5 minutes': 'register.subtitle',
  Informations: 'register.step1',
  Securite: 'register.step2',
  'Je suis un': 'register.roleLabel',
  Revendeur: 'register.revendeur',
  Fournisseur: 'register.fournisseur',
  'Nom du responsable': 'register.fullName',
  'Nom du business': 'register.businessName',
  'Nom de la societe': 'register.companyName',
  'Matricule fiscale': 'register.taxId',
  Telephone: 'register.phone',
  Adresse: 'register.address',
  Ville: 'register.city',
  'Code postal': 'register.postalCode',
  Continuer: 'register.continue',
  'Confirmer le mot de passe': 'register.confirmPassword',
  Retour: 'register.back',
  'Creation...': 'register.creating',
  'Creer mon compte': 'register.create'
};

const AUTO_TRANSLATION_ENTRIES = Object.entries(AUTO_TRANSLATION_KEYS)
  .sort((a, b) => b[0].length - a[0].length);

const AUTO_PHRASE_TRANSLATIONS = {
  'R\u00f4les': '\u0627\u0644\u0623\u062f\u0648\u0627\u0631',
  'Fonctionnalit\u00e9s': '\u0627\u0644\u0645\u064a\u0632\u0627\u062a',
  'Probl\u00e8mes r\u00e9solus': '\u0627\u0644\u0645\u0634\u0643\u0644\u0627\u062a \u0627\u0644\u062a\u064a \u0646\u062d\u0644\u0647\u0627',
  'Espace Client': '\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0639\u0645\u064a\u0644',
  'Cr\u00e9er un compte': '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628',
  'D\u00e9j\u00e0 utilis\u00e9 par 50+ revendeurs en Tunisie': '\u064a\u0633\u062a\u062e\u062f\u0645\u0647 \u0628\u0627\u0644\u0641\u0639\u0644 \u0623\u0643\u062b\u0631 \u0645\u0646 50 \u0628\u0627\u0626\u0639\u0627\u064b \u0641\u064a \u062a\u0648\u0646\u0633',
  'G\u00e9rez 100+ cartes grises': '\u0623\u062f\u0650\u0631 \u0623\u0643\u062b\u0631 \u0645\u0646 100 \u0645\u0644\u0641 \u0628\u0637\u0627\u0642\u0629 \u0631\u0645\u0627\u062f\u064a\u0629',
  'sans WhatsApp, sans chaos': '\u0628\u062f\u0648\u0646 \u0648\u0627\u062a\u0633\u0627\u0628 \u0648\u0628\u062f\u0648\u0646 \u0641\u0648\u0636\u0649',
  'Questions fr\u00e9quentes': '\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629',
  'Pr\u00eat \u00e0 digitaliser votre business ?': '\u0647\u0644 \u0623\u0646\u062a \u062c\u0627\u0647\u0632 \u0644\u0631\u0642\u0645\u0646\u0629 \u0646\u0634\u0627\u0637\u0643\u061f',
  'Mentions l\u00e9gales': '\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629',
  'Politique de confidentialit\u00e9': '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629',
  'Derni\u00e8re mise \u00e0 jour:': '\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b:',
  'Retour accueil': '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
  'Moyens de paiement': '\u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062f\u0641\u0639',
  'Paiements s\u00e9curis\u00e9s accept\u00e9s.': '\u0646\u0642\u0628\u0644 \u0648\u0633\u0627\u0626\u0644 \u062f\u0641\u0639 \u0622\u0645\u0646\u0629.',
  'Tous droits r\u00e9serv\u00e9s.': '\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629.',
  'Site op\u00e9r\u00e9 par TuniMoto SARL.': '\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0645\u064f\u062f\u0627\u0631 \u0645\u0646 \u0637\u0631\u0641 TuniMoto SARL.',
  'Carte grise prete': '\u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0631\u0645\u0627\u062f\u064a\u0629 \u062c\u0627\u0647\u0632\u0629',
  'Carte grise livree': '\u062a\u0645 \u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0631\u0645\u0627\u062f\u064a\u0629',
  'Dossiers Carte Grise': '\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0631\u0645\u0627\u062f\u064a\u0629',
  'Dossier Carte Grise': '\u0645\u0644\u0641 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0631\u0645\u0627\u062f\u064a\u0629',
  'Open dossiers': '\u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629',
  'Clients actifs': '\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0646\u0634\u0637\u0648\u0646',
  'Top clients': '\u0623\u0641\u0636\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621',
  'Base client exploitable': '\u0642\u0627\u0639\u062f\u0629 \u0639\u0645\u0644\u0627\u0621 \u062c\u0627\u0647\u0632\u0629',
  'Par chiffre d affaires': '\u062d\u0633\u0628 \u0631\u0642\u0645 \u0627\u0644\u0623\u0639\u0645\u0627\u0644',
  'Aucun dossier archive': '\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0644\u0641 \u0645\u0624\u0631\u0634\u0641',
  'Aucun dossier trouve': '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u0641',
  'Aucun resultat ne correspond aux filtres appliques.': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u062a\u0637\u0627\u0628\u0642 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u0645\u0637\u0628\u0642\u0629.'
};
const AUTO_PHRASE_ENTRIES = Object.entries(AUTO_PHRASE_TRANSLATIONS)
  .sort((a, b) => b[0].length - a[0].length);

const AUTO_WORD_TRANSLATIONS = {
  dashboard: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
  role: '\u062f\u0648\u0631',
  roles: '\u0627\u0644\u0623\u062f\u0648\u0627\u0631',
  client: '\u0639\u0645\u064a\u0644',
  clients: '\u0627\u0644\u0639\u0645\u0644\u0627\u0621',
  fournisseur: '\u0645\u0648\u0631\u062f',
  fournisseurs: '\u0627\u0644\u0645\u0648\u0631\u062f\u0648\u0646',
  revendeur: '\u0628\u0627\u0626\u0639',
  revendeurs: '\u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646',
  moto: '\u062f\u0631\u0627\u062c\u0629',
  motos: '\u0627\u0644\u062f\u0631\u0627\u062c\u0627\u062a',
  facture: '\u0641\u0627\u062a\u0648\u0631\u0629',
  factures: '\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631',
  commande: '\u0637\u0644\u0628',
  commandes: '\u0627\u0644\u0637\u0644\u0628\u0627\u062a',
  paiement: '\u062f\u0641\u0639',
  paiements: '\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a',
  stock: '\u0627\u0644\u0645\u062e\u0632\u0648\u0646',
  messages: '\u0627\u0644\u0631\u0633\u0627\u0626\u0644',
  parametres: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',
  statistiques: '\u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a',
  profil: '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a',
  archive: '\u0627\u0644\u0623\u0631\u0634\u064a\u0641',
  fonctionnalite: '\u0645\u064a\u0632\u0629',
  fonctionnalites: '\u0645\u064a\u0632\u0627\u062a',
  probleme: '\u0645\u0634\u0643\u0644\u0629',
  problemes: '\u0645\u0634\u0643\u0644\u0627\u062a',
  resolus: '\u0645\u062d\u0644\u0648\u0644\u0629',
  recherche: '\u0628\u062d\u062b',
  search: '\u0628\u062d\u062b',
  rechercher: '\u0627\u0628\u062d\u062b',
  exporter: '\u062a\u0635\u062f\u064a\u0631',
  ajouter: '\u0625\u0636\u0627\u0641\u0629',
  modifier: '\u062a\u0639\u062f\u064a\u0644',
  supprimer: '\u062d\u0630\u0641',
  ventes: '\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a',
  vente: '\u0628\u064a\u0639',
  revenu: '\u0627\u0644\u0625\u064a\u0631\u0627\u062f',
  ville: '\u0627\u0644\u0645\u062f\u064a\u0646\u0629',
  adresse: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646',
  telephone: '\u0627\u0644\u0647\u0627\u062a\u0641',
  total: '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a',
  active: '\u0646\u0634\u0637',
  pending: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631',
  completed: '\u0645\u0643\u062a\u0645\u0644',
  annulee: '\u0645\u0644\u063a\u0627\u0629',
  premium: '\u0645\u0645\u064a\u0632',
  nouveau: '\u062c\u062f\u064a\u062f',
  nouvelle: '\u062c\u062f\u064a\u062f\u0629',
  compte: '\u062d\u0633\u0627\u0628',
  comptes: '\u062d\u0633\u0627\u0628\u0627\u062a',
  connexion: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
  deconnexion: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c',
  dossier: '\u0645\u0644\u0641',
  dossiers: '\u0627\u0644\u0645\u0644\u0641\u0627\u062a',
  document: '\u0645\u0633\u062a\u0646\u062f',
  documents: '\u0645\u0633\u062a\u0646\u062f\u0627\u062a',
  facture_num: '\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629',
  status: '\u0627\u0644\u062d\u0627\u0644\u0629',
  attente: '\u0627\u0646\u062a\u0638\u0627\u0631',
  valide: '\u0635\u0627\u0644\u062d',
  annule: '\u0645\u0644\u063a\u0649',
  gerer: '\u0625\u062f\u0627\u0631\u0629',
  gerez: '\u0623\u062f\u0631',
  cartes: '\u0628\u0637\u0627\u0642\u0627\u062a',
  grises: '\u0631\u0645\u0627\u062f\u064a\u0629',
  portail: '\u0628\u0648\u0627\u0628\u0629',
  securise: '\u0622\u0645\u0646',
  support: '\u062f\u0639\u0645',
  francais: '\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629',
  arabe: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
  digitaliser: '\u0631\u0642\u0645\u0646\u0629',
  business: '\u0646\u0634\u0627\u0637',
  installation: '\u0625\u0639\u062f\u0627\u062f',
  minute: '\u062f\u0642\u064a\u0642\u0629',
  minutes: '\u062f\u0642\u0627\u0626\u0642',
  legal: '\u0642\u0627\u0646\u0648\u0646\u064a',
  confidentialite: '\u062e\u0635\u0648\u0635\u064a\u0629',
  open: '\u0645\u0641\u062a\u0648\u062d',
  top: '\u0623\u0641\u0636\u0644',
  base: '\u0642\u0627\u0639\u062f\u0629',
  exploitable: '\u062c\u0627\u0647\u0632\u0629',
  chiffre: '\u0631\u0642\u0645',
  affaires: '\u0627\u0644\u0623\u0639\u0645\u0627\u0644',
  actif: '\u0646\u0634\u0637',
  actifs: '\u0646\u0634\u0637\u0648\u0646',
  audit: '\u062a\u062f\u0642\u064a\u0642',
  archives: '\u0623\u0631\u0634\u064a\u0641',
  trouve: '\u0645\u0648\u062c\u0648\u062f',
  resultat: '\u0646\u062a\u064a\u062c\u0629',
  resultats: '\u0646\u062a\u0627\u0626\u062c',
  filtre: '\u0641\u0644\u062a\u0631',
  filtres: '\u0641\u0644\u0627\u062a\u0631',
  applique: '\u0645\u0637\u0628\u0642',
  appliques: '\u0645\u0637\u0628\u0642\u0629',
  aucun: '\u0644\u0627',
  aucune: '\u0644\u0627',
  prete: '\u062c\u0627\u0647\u0632\u0629',
  livree: '\u0645\u0633\u0644\u0645\u0629',
  la: '\u0627\u0644',
  le: '\u0627\u0644',
  les: '\u0627\u0644',
  du: '\u0645\u0646',
  des: '\u0645\u0646',
  de: '\u0645\u0646',
  un: '\u0648\u0627\u062d\u062f',
  une: '\u0648\u0627\u062d\u062f\u0629',
  et: '\u0648',
  ou: '\u0623\u0648',
  en: '\u0641\u064a',
  dans: '\u0641\u064a',
  sur: '\u0639\u0644\u0649',
  pour: '\u0644\u0640',
  par: '\u0639\u0628\u0631',
  avec: '\u0645\u0639',
  sans: '\u0628\u062f\u0648\u0646',
  plus: '\u0623\u0643\u062b\u0631',
  moins: '\u0623\u0642\u0644',
  tout: '\u0643\u0644',
  tous: '\u0627\u0644\u062c\u0645\u064a\u0639',
  toute: '\u0643\u0627\u0645\u0644\u0629',
  toutes: '\u0627\u0644\u0643\u0644',
  votre: '\u062e\u0627\u0635\u062a\u0643',
  vos: '\u062e\u0627\u0635\u062a\u0643\u0645',
  mon: '\u062e\u0627\u0635\u062a\u064a',
  ma: '\u062e\u0627\u0635\u062a\u064a',
  mes: '\u062e\u0627\u0635\u062a\u064a',
  ce: '\u0647\u0630\u0627',
  cette: '\u0647\u0630\u0647',
  ces: '\u0647\u0630\u0647',
  est: '\u0647\u0648',
  sont: '\u0647\u0645',
  a: '\u0644\u062f\u064a\u0647',
  au: '\u0625\u0644\u0649',
  aux: '\u0625\u0644\u0649',
  il: '\u0647\u0648',
  elle: '\u0647\u064a',
  ils: '\u0647\u0645',
  elles: '\u0647\u0646',
  nous: '\u0646\u062d\u0646',
  vous: '\u0623\u0646\u062a\u0645',
  je: '\u0623\u0646\u0627',
  me: '\u0646\u0641\u0633\u064a',
  pas: '\u0644\u0627',
  ne: '\u0644\u0627',
  que: '\u0623\u0646',
  qui: '\u0627\u0644\u0630\u064a',
  comment: '\u0643\u064a\u0641',
  deja: '\u0628\u0627\u0644\u0641\u0639\u0644',
  avant: '\u0642\u0628\u0644',
  apres: '\u0628\u0639\u062f',
  fini: '\u0627\u0646\u062a\u0647\u0649',
  pret: '\u062c\u0627\u0647\u0632',
  reserve: '\u0627\u062d\u062c\u0632',
  demo: '\u0639\u0631\u0636',
  complete: '\u0643\u0627\u0645\u0644',
  completee: '\u0645\u0643\u062a\u0645\u0644\u0629',
  automation: '\u0623\u062a\u0645\u062a\u0629',
  automatisation: '\u0623\u062a\u0645\u062a\u0629',
  automatique: '\u062a\u0644\u0642\u0627\u0626\u064a',
  automatiques: '\u062a\u0644\u0642\u0627\u0626\u064a\u0629',
  export: '\u062a\u0635\u062f\u064a\u0631',
  excel: '\u0625\u0643\u0633\u0644',
  whatsapp: '\u0648\u0627\u062a\u0633\u0627\u0628',
  bulk: '\u062f\u0641\u0639\u0629',
  gestion: '\u0625\u062f\u0627\u0631\u0629',
  supporte: '\u0645\u062f\u0639\u0648\u0645',
  impossible: '\u063a\u064a\u0631 \u0645\u0645\u0643\u0646',
  erreur: '\u062e\u0637\u0623',
  erreurs: '\u0623\u062e\u0637\u0627\u0621',
  configurez: '\u0623\u0639\u062f \u0627\u0644\u0636\u0628\u0637'
};
function normalizeFrenchWord(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const LATIN_TOKEN_REGEX = /\p{Script=Latin}+(?:['’-]\p{Script=Latin}+)*/gu;
const LATIN_KEEP_TOKENS = new Set([
  'fr',
  'ar',
  'api',
  'pdf',
  'cin',
  'qr',
  'ssl',
  'rgpd',
  'tnd',
  'tn'
]);

const LATIN_DIGRAPHS = [
  ['eau', 'و'],
  ['ch', 'ش'],
  ['sh', 'ش'],
  ['kh', 'خ'],
  ['gh', 'غ'],
  ['ph', 'ف'],
  ['th', 'ث'],
  ['ou', 'و'],
  ['oi', 'وا'],
  ['ai', 'ي'],
  ['ei', 'ي'],
  ['au', 'و']
];

const LATIN_CHAR_TO_AR = {
  a: 'ا',
  b: 'ب',
  c: 'ك',
  d: 'د',
  e: 'ي',
  f: 'ف',
  g: 'ج',
  h: 'ه',
  i: 'ي',
  j: 'ج',
  k: 'ك',
  l: 'ل',
  m: 'م',
  n: 'ن',
  o: 'و',
  p: 'ب',
  q: 'ق',
  r: 'ر',
  s: 'س',
  t: 'ت',
  u: 'و',
  v: 'ف',
  w: 'و',
  x: 'كس',
  y: 'ي',
  z: 'ز'
};

function shouldKeepLatinToken(token) {
  if (!token) {
    return true;
  }

  const lowered = token.toLowerCase();
  if (LATIN_KEEP_TOKENS.has(lowered)) {
    return true;
  }

  if (/^[A-Z]{1,5}$/.test(token)) {
    return true;
  }

  return false;
}

function transliterateLatinWord(word) {
  const normalized = normalizeFrenchWord(word).replace(/[^a-z]/g, '');
  if (!normalized) {
    return word;
  }

  let index = 0;
  let result = '';
  while (index < normalized.length) {
    let matched = false;
    for (const [latin, arabic] of LATIN_DIGRAPHS) {
      if (!normalized.startsWith(latin, index)) {
        continue;
      }

      result += arabic;
      index += latin.length;
      matched = true;
      break;
    }

    if (matched) {
      continue;
    }

    const char = normalized[index];
    result += LATIN_CHAR_TO_AR[char] || char;
    index += 1;
  }

  return result || word;
}

function protectSensitiveTokens(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return { text: value, tokens: [] };
  }

  const tokens = [];
  const register = (match) => {
    const index = tokens.push(match) - 1;
    return `%%${index}%%`;
  };

  let text = value;
  text = text.replace(/\bhttps?:\/\/[^\s]+/gi, register);
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, register);
  text = text.replace(/\b(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?:\/[^\s]*)?\b/g, register);

  return { text, tokens };
}

function restoreSensitiveTokens(value, tokens) {
  if (!tokens?.length || typeof value !== 'string') {
    return value;
  }

  return value.replace(/%%(\d+)%%/g, (_, rawIndex) => {
    const index = Number(rawIndex);
    return Number.isInteger(index) && index >= 0 && index < tokens.length
      ? tokens[index]
      : _;
  });
}

const AUTO_WORD_LOOKUP = new Map(
  Object.entries(AUTO_WORD_TRANSLATIONS).map(([frWord, arWord]) => [normalizeFrenchWord(frWord), arWord])
);

const TEXT_NODE_SOURCE_CACHE = new WeakMap();
const ATTR_SOURCE_CACHE = new WeakMap();

const messages = {
  fr: {
    lang: { fr: 'FR', ar: 'AR' },
    common: {
      loading: 'Chargement...',
      profile: 'Mon profil',
      settings: 'Parametres',
      logout: 'Deconnexion',
      other: 'Autres',
      live: 'En direct',
      refresh: 'Rafraichir',
      searchRevendeur: 'Rechercher client, moto, dossier...',
      searchFournisseur: 'Rechercher revendeur, dossier...',
      comingSoonArchive: 'Archive (bientot...)',
      comingSoonStats: 'Statistiques (bientot...)',
      comingSoonSettings: 'Parametres (bientot...)',
      comingSoonCatalog: 'Catalogue (bientot...)',
      comingSoonOrders: 'Commandes (bientot...)'
    },
    nav: {
      dashboard: 'Tableau de bord',
      clients: 'Clients',
      motorcycles: 'Motos',
      carteGrise: 'Carte grise',
      invoices: 'Ventes',
      fournisseurs: 'Mes fournisseurs',
      archive: 'Archive',
      stats: 'Statistiques',
      settings: 'Parametres',
      revendeurs: 'Mes revendeurs',
      cartesGrises: 'Cartes grises',
      catalog: 'Catalogue motos',
      orders: 'Commandes',
      messages: 'Messages',
      fournisseur: 'Fournisseur',
      revendeur: 'Revendeur',
      fournisseurPremium: 'Fournisseur Premium'
    },
    notifications: {
      title: 'Notifications',
      markAllRead: 'Tout marquer lu',
      noNotifications: 'Aucune notification',
      upToDate: 'Vous etes a jour.',
      markRead: 'Marquer lu',
      delete: 'Supprimer',
      filters: {
        all: 'Toutes',
        unread: 'Non lues',
        carteGrise: 'Carte grise',
        invoices: 'Ventes',
        clients: 'Clients',
        stock: 'Stock',
        orders: 'Commandes',
        payments: 'Paiements',
        sla: 'SLA'
      },
      fallback: {
        orderTitle: 'Nouvelle commande',
        orderMessage: 'Un revendeur a passe une commande recente.',
        dossierTitle: 'Demande carte grise',
        dossierMessage: 'Un dossier carte grise est en attente.'
      },
      relative: {
        now: 'a l instant',
        min: 'il y a {count} min',
        hour: 'il y a {count} h',
        day: 'il y a {count} j'
      },
      serverTitles: {
        carteGriseReady: 'Carte grise prete',
        missingDocuments: 'Documents manquants',
        invoicePaid: 'Vente reglee',
        invoiceCreated: 'Nouvelle vente',
        newClient: 'Nouveau client',
        lowStock: 'Stock faible',
        outOfStock: 'Rupture de stock',
        partnershipRequest: 'Nouvelle demande partenaire',
        carteGriseAssigned: 'Nouveau dossier carte grise',
        carteGriseStatusUpdated: 'Statut dossier mis a jour'
      }
    },
    dashboard: {
      title: 'Tableau de bord revendeur',
      subtitle: 'Resume de votre activite {range}.',
      range: {
        today: "aujourd'hui",
        week: 'cette semaine',
        month: 'ce mois',
        year: 'cette annee'
      },
      select: {
        today: 'Aujourd hui',
        week: 'Cette semaine',
        month: 'Ce mois',
        year: 'Cette annee'
      },
      mainAccount: 'Compte principal',
      accountName: 'Compte revendeur Tunimoto',
      accountSync: 'Donnees mises a jour en continu',
      availableFunds: 'Fonds disponibles',
      createInvoice: 'Enregistrer une vente',
      followDossiers: 'Suivre les dossiers',
      monthlyGoal: 'Objectif mensuel: {value}%',
      priority: 'Actions prioritaires',
      remindersTitle: 'Definir vos rappels de dossier',
      remindersText: '{pending} dossier(s) carte grise en attente et {missing} client(s) incomplet(s).',
      openCarte: 'Ouvrir les dossiers carte grise',
      verifyClients: 'Verifier clients',
      metrics: {
        paidInvoices: 'Ventes reglees',
        inProgressInvoices: 'Ventes en cours',
        readyCarteGrise: 'Carte grise prete',
        stockAlerts: 'Alertes stock',
        operations: '{count} operation(s)',
        toFinalize: 'a finaliser',
        dossiersFinalized: 'dossiers finalises',
        lowStockCount: 'motos <= 2 unites'
      },
      recentActions: 'Activite recente',
      noRecentActions: 'Aucune action recente.',
      seeAll: 'Voir tout',
      expenses: 'Toutes les depenses',
      total: 'Total',
      quickStats: {
        daily: 'journalier',
        weekly: 'hebdo',
        monthly: 'mensuel'
      },
      actionTypes: {
        payment: 'Paiement',
        cancelled: 'Annulee',
        carteGrise: 'Carte grise',
        dossier: 'Dossier',
        invoice: 'Vente',
        client: 'Client',
        stock: 'Stock'
      },
      actions: {
        invoicePaid: 'Vente reglee',
        invoiceCreated: 'Nouvelle vente',
        carteReady: 'Carte grise prete',
        clientAdded: 'Nouveau client',
        stockLow: 'Stock faible',
        stockOut: 'Rupture de stock'
      },
      expenseBuckets: {
        paid: 'Paiements valides',
        draft: 'Ventes en attente de reglement',
        pending: 'Dossiers en attente',
        cancelled: 'Ventes annulees'
      }
    },
    login: {
      title: 'Bon retour !',
      subtitle: 'Connectez-vous a votre espace professionnel',
      unauthorized: 'Acces reserve a votre espace',
      email: 'Email',
      password: 'Mot de passe',
      remember: 'Se souvenir de moi',
      forgot: 'Mot de passe oublie ?',
      submit: 'Se connecter',
      submitting: 'Connexion...',
      divider: 'Ou continuer avec',
      noAccount: 'Pas encore de compte ?',
      createAccount: 'Creer un compte'
    },
    register: {
      title: 'Creer votre compte',
      subtitle: 'Commencez en quelques minutes, depuis votre telephone ou votre ordinateur',
      step1: 'Informations',
      step2: 'Securite',
      roleLabel: 'Je suis un',
      revendeur: 'Revendeur',
      fournisseur: 'Fournisseur',
      revendeurHint: 'Je vends des motos',
      fournisseurHint: 'Je fournis des motos aux revendeurs',
      fullName: 'Nom du responsable',
      businessName: 'Nom du magasin',
      companyName: 'Nom de la societe',
      taxId: 'Matricule fiscal',
      phone: 'Telephone',
      address: 'Adresse',
      city: 'Ville',
      postalCode: 'Code postal',
      continue: 'Continuer',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      passwordHint: 'Au moins 10 caracteres avec une lettre, un chiffre et un symbole',
      confirmHint: 'Retapez votre mot de passe',
      acceptTerms: "J'accepte les", 
      terms: "Conditions d'utilisation",
      privacy: 'Politique de confidentialite',
      back: 'Retour',
      create: 'Creer mon compte',
      creating: 'Creation...',
      featuresTitle: 'Ce que vous gagnez :',
      feature1: '14 jours d essai',
      feature2: 'Sans carte bancaire',
      feature3: 'Support 7j/7',
      feature4: 'Formation incluse',
      haveAccount: 'Vous avez deja un compte ?',
      signIn: 'Se connecter',
      errPasswordMatch: 'Les mots de passe ne correspondent pas',
      errPasswordLength: 'Ajoutez au moins 10 caracteres',
      errTerms: 'Vous devez accepter les conditions'
    }
  },
  ar: {
    lang: { fr: 'FR', ar: 'AR' },
    common: {
      loading: 'Ã™â€šÃ˜Â§Ã˜Â¹Ã˜Â¯ Ã™Å Ã˜ÂªÃ˜Â­Ã™â€¦Ã™â€ž...',
      profile: 'Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Ë†Ã™ÂÃ™Å Ã™â€ž Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¹Ã™Æ’',
      settings: 'Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª',
      logout: 'Ã˜Â§Ã˜Â®Ã˜Â±Ã˜Â¬',
      other: 'Ã˜Â­Ã˜Â§Ã˜Â¬Ã˜Â§Ã˜Âª Ã˜Â§Ã˜Â®Ã˜Â±Ã™â€°',
      live: 'Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±',
      refresh: 'Ã˜Â¹Ã˜Â§Ã™Ë†Ã˜Â¯ Ã˜Â­Ã˜Â¯Ã™â€˜Ã˜Â«',
      searchRevendeur: 'Ã™â€šÃ™â€žÃ˜Â¨ Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â­Ã˜Â±Ã™Å Ã™ÂÃ˜Å’ Ã™â€¦Ã™Ë†Ã˜ÂªÃ™Ë†Ã˜Å’ Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©...',
      searchFournisseur: 'Ã™â€šÃ™â€žÃ˜Â¨ Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â±Ã™Å Ã™ÂÃ™Ë†Ã™â€ Ã˜Â¯Ã™Ë†Ã˜Â± Ã™Ë†Ã™â€žÃ˜Â§ Ã˜Â¯Ã™Ë†Ã˜Â³Ã™Å ...',
      comingSoonArchive: 'Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â±Ã˜Â´Ã™Å Ã™Â (Ã™â€šÃ˜Â±Ã™Å Ã˜Â¨...)',
      comingSoonStats: 'Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â­Ã˜ÂµÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã˜Âª (Ã™â€šÃ˜Â±Ã™Å Ã˜Â¨...)',
      comingSoonSettings: 'Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª (Ã™â€šÃ˜Â±Ã™Å Ã˜Â¨...)',
      comingSoonCatalog: 'Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã˜ÂªÃ˜Â§Ã™â€žÃ™Ë†Ã˜Âº (Ã™â€šÃ˜Â±Ã™Å Ã˜Â¨...)',
      comingSoonOrders: 'Ã˜Â§Ã™â€žÃ™Æ’Ã™Ë†Ã™â€¦Ã™Ë†Ã™â€ Ã˜Â¯Ã˜Â§Ã˜Âª (Ã™â€šÃ˜Â±Ã™Å Ã˜Â¨...)'
    },
    nav: {
      dashboard: 'Ã˜Â§Ã™â€žÃ˜Â¯Ã™Å Ã˜Â´Ã˜Â¨Ã™Ë†Ã˜Â±Ã˜Â¯',
      clients: 'Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â±Ã™ÂÃ˜Â§Ã˜Â¡',
      motorcycles: 'Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â§Ã˜Âª',
      carteGrise: 'Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â²',
      invoices: 'Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â±',
      fournisseurs: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â²Ã™Ë†Ã˜Â¯Ã™Å Ã™â€  Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¹Ã™Å ',
      archive: 'Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â±Ã˜Â´Ã™Å Ã™Â',
      stats: 'Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â­Ã˜ÂµÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã˜Âª',
      settings: 'Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª',
      revendeurs: 'Ã˜Â§Ã™â€žÃ˜Â±Ã™Å Ã™ÂÃ™Ë†Ã™â€ Ã˜Â¯Ã™Ë†Ã˜Â±Ã˜Â§Ã˜Âª',
      cartesGrises: 'Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â²',
      catalog: 'Ã™Æ’Ã˜Â§Ã˜ÂªÃ˜Â§Ã™â€žÃ™Ë†Ã˜Âº Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â§Ã˜Âª',
      orders: 'Ã˜Â§Ã™â€žÃ™Æ’Ã™Ë†Ã™â€¦Ã™Ë†Ã™â€ Ã˜Â¯Ã˜Â§Ã˜Âª',
      messages: 'Ã˜Â§Ã™â€žÃ™â€¦Ã™Å Ã˜Â³Ã˜Â§Ã˜Â¬Ã˜Â§Ã˜Âª',
      fournisseur: 'Ã™â€¦Ã˜Â²Ã™Ë†Ã™â€˜Ã˜Â¯',
      revendeur: 'Ã˜Â±Ã™Å Ã™ÂÃ™Ë†Ã™â€ Ã˜Â¯Ã™Ë†Ã˜Â±',
      fournisseurPremium: 'Ã™â€¦Ã˜Â²Ã™Ë†Ã™â€˜Ã˜Â¯ Ã˜Â¨Ã˜Â±Ã™Å Ã™â€¦Ã™Å Ã™Ë†Ã™â€¦'
    },
    notifications: {
      title: 'Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª',
      markAllRead: 'Ã˜Â¹Ã™â€žÃ™â€˜Ã™â€¦ Ã˜Â§Ã™â€žÃ™Æ’Ã™â€ž Ã™â€¦Ã™â€šÃ˜Â±Ã™Å ',
      noNotifications: 'Ã™â€¦Ã˜Â§ Ã™ÂÃ™â€¦Ã˜Â§Ã˜Â´ Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª',
      upToDate: 'Ã™â€žÃ˜Â§Ã˜Â¨Ã˜Â§Ã˜Â³Ã˜Å’ Ã™Æ’Ã™â€ž Ã˜Â´Ã™Å  Ã™â€¦Ã™â€šÃ˜Â±Ã™Å .',
      markRead: 'Ã˜Â¹Ã™â€žÃ™â€˜Ã™â€¦Ã™â€¡Ã˜Â§ Ã™â€¦Ã™â€šÃ˜Â±Ã™Å Ã˜Â©',
      delete: 'Ã˜Â­Ã˜Â°Ã™Â',
      filters: {
        all: 'Ã˜Â§Ã™â€žÃ™Æ’Ã™â€ž',
        unread: 'Ã™â€¦Ã™Ë†Ã˜Â´ Ã™â€¦Ã™â€šÃ˜Â±Ã™Å ',
        carteGrise: 'Ã™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â²',
        invoices: 'Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â±',
        clients: 'Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â±Ã™ÂÃ˜Â§Ã˜Â¡',
        stock: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â®Ã˜Â²Ã™Ë†Ã™â€ ',
        orders: 'Ã˜Â§Ã™â€žÃ™Æ’Ã™Ë†Ã™â€¦Ã™Ë†Ã™â€ Ã˜Â¯Ã˜Â§Ã˜Âª',
        payments: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™ÂÃ™Ë†Ã˜Â¹Ã˜Â§Ã˜Âª'
      },
      fallback: {
        orderTitle: 'Ã™Æ’Ã™Ë†Ã™â€¦Ã™Ë†Ã™â€ Ã˜Â¯Ã˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©',
        orderMessage: 'Ã™ÂÃ™â€¦Ã˜Â§ Ã˜Â±Ã™Å Ã™ÂÃ™Ë†Ã™â€ Ã˜Â¯Ã™Ë†Ã˜Â± Ã˜Â¨Ã˜Â¹Ã˜Â« Ã™Æ’Ã™Ë†Ã™â€¦Ã™Ë†Ã™â€ Ã˜Â¯Ã˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©.',
        dossierTitle: 'Ã˜Â·Ã™â€žÃ˜Â¨ Ã™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â²',
        dossierMessage: 'Ã™ÂÃ™â€¦Ã˜Â§ Ã˜Â¯Ã™Ë†Ã˜Â³Ã™Å  Ã™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â² Ã™Å Ã˜Â³Ã˜ÂªÃ™â€ Ã™â€°.'
      },
      relative: {
        now: 'Ã˜ÂªÃ™Ë†Ã˜Â§',
        min: 'Ã™â€¦Ã™â€ Ã˜Â° {count} Ã˜Â¯Ã™â€šÃ™Å Ã™â€šÃ˜Â©',
        hour: 'Ã™â€¦Ã™â€ Ã˜Â° {count} Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©',
        day: 'Ã™â€¦Ã™â€ Ã˜Â° {count} Ã™Å Ã™Ë†Ã™â€¦'
      },
      serverTitles: {
        carteGriseReady: 'Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â² Ã™Ë†Ã˜Â§Ã˜Â¬Ã˜Â¯Ã˜Â©',
        missingDocuments: 'Ã™Ë†Ã˜Â«Ã˜Â§Ã™Å Ã™â€š Ã™â€ Ã˜Â§Ã™â€šÃ˜ÂµÃ™Å Ã™â€ ',
        invoicePaid: 'Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã˜ÂªÃ˜Â®Ã™â€žÃ˜ÂµÃ˜Âª',
        invoiceCreated: 'Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©',
        newClient: 'Ã˜Â­Ã˜Â±Ã™Å Ã™Â Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯',
        lowStock: 'Ã˜Â§Ã™â€žÃ˜Â³Ã˜ÂªÃ™Ë†Ã™Æ’ Ã™â€ Ã˜Â§Ã™â€šÃ˜Âµ',
        outOfStock: 'Ã˜Â§Ã™â€žÃ˜Â³Ã˜ÂªÃ™Ë†Ã™Æ’ Ã™Ë†Ã™ÂÃ™â€°',
        partnershipRequest: 'Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜Â´Ã˜Â±Ã˜Â§Ã™Æ’Ã˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯',
        carteGriseAssigned: 'Ã˜Â¯Ã™Ë†Ã˜Â³Ã™Å  Ã™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â² Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯',
        carteGriseStatusUpdated: 'Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â« Ã˜Â³Ã˜ÂªÃ˜Â§Ã˜ÂªÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¯Ã™Ë†Ã˜Â³Ã™Å '
      }
    },
    dashboard: {
      title: 'Ã˜Â¯Ã™Å Ã˜Â´Ã˜Â¨Ã™Ë†Ã˜Â±Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â±Ã™Å Ã™ÂÃ™Ë†Ã™â€ Ã˜Â¯Ã™Ë†Ã˜Â±',
      subtitle: 'Ã™â€¦Ã˜Â¹Ã˜Â·Ã™Å Ã˜Â§Ã˜Âª Ã™â€žÃ˜Â§Ã™Å Ã™Â Ã™â€¦Ã™â€  API {range}.',
      range: {
        today: 'Ã˜Â§Ã™â€žÃ™Å Ã™Ë†Ã™â€¦',
        week: 'Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã™â€¦Ã˜Â§Ã™â€ Ã˜Â© Ã™â€¡Ã˜Â§Ã˜Â°Ã™Å ',
        month: 'Ã˜Â§Ã™â€žÃ˜Â´Ã™â€¡Ã˜Â± Ã™â€¡Ã˜Â°Ã˜Â§',
        year: 'Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã™â€¦ Ã™â€¡Ã˜Â°Ã˜Â§'
      },
      select: {
        today: 'Ã˜Â§Ã™â€žÃ™Å Ã™Ë†Ã™â€¦',
        week: 'Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã™â€¦Ã˜Â§Ã™â€ Ã˜Â© Ã™â€¡Ã˜Â§Ã˜Â°Ã™Å ',
        month: 'Ã˜Â§Ã™â€žÃ˜Â´Ã™â€¡Ã˜Â± Ã™â€¡Ã˜Â°Ã˜Â§',
        year: 'Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã™â€¦ Ã™â€¡Ã˜Â°Ã˜Â§'
      },
      mainAccount: 'Ã˜Â§Ã™â€žÃ™Æ’Ã™Ë†Ã™â€ Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â¦Ã™Å Ã˜Â³Ã™Å ',
      accountName: 'Ã™Æ’Ã™Ë†Ã™â€ Ã˜Âª Tunimoto Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â±Ã™Å Ã™ÂÃ™Ë†Ã™â€ Ã˜Â¯Ã™Ë†Ã˜Â±',
      accountSync: 'Ã˜Â§Ã™â€žÃ™â‚¬ API Ã™â€¦Ã™ÂÃ˜Â¹Ã™â€žÃ˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â¯Ã™Å Ã˜Â´Ã˜Â¨Ã™Ë†Ã˜Â±Ã˜Â¯ Ã™â€žÃ˜Â§Ã™Å Ã™Â',
      availableFunds: 'Ã˜Â§Ã™â€žÃ˜Â±Ã˜ÂµÃ™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Ë†Ã™ÂÃ˜Â±',
      createInvoice: 'Ã˜Â§Ã˜Â¹Ã™â€¦Ã™â€ž Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©',
      followDossiers: 'Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¯Ã™Ë†Ã˜Â³Ã™Å Ã˜Â§Ã˜Âª',
      monthlyGoal: 'Ã™â€¡Ã˜Â¯Ã™Â Ã˜Â§Ã™â€žÃ˜Â´Ã™â€¡Ã˜Â±: {value}%',
      priority: 'Ã˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â¹Ã˜Â¬Ã™â€žÃ˜Â©',
      remindersTitle: 'Ã™â€ Ã˜Â¸Ã™â€˜Ã™â€¦ Ã˜ÂªÃ˜Â°Ã™Æ’Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â¯Ã™Ë†Ã˜Â³Ã™Å Ã˜Â§Ã˜Âª',
      remindersText: '{pending} Ã˜Â¯Ã™Ë†Ã˜Â³Ã™Å  Ã™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â² Ã™â€¦Ã˜Â§Ã˜Â²Ã˜Â§Ã™â€ž Ã™Å Ã˜Â³Ã˜ÂªÃ™â€ Ã™â€° Ã™Ë† {missing} Ã˜Â­Ã˜Â±Ã™Å Ã™Â Ã™â€ Ã˜Â§Ã™â€šÃ˜Âµ.',
      openCarte: 'Ã˜Â­Ã™â€žÃ™â€˜ Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â²',
      verifyClients: 'Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â±Ã™ÂÃ˜Â§Ã˜Â¡',
      metrics: {
        paidInvoices: 'Ã™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã™â€¦Ã˜Â®Ã™â€žÃ˜ÂµÃ˜Â©',
        inProgressInvoices: 'Ã™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã™â€¦Ã˜Â§Ã˜Â²Ã˜Â§Ã™â€žÃ˜Âª',
        readyCarteGrise: 'Ã™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â² Ã™Ë†Ã˜Â§Ã˜Â¬Ã˜Â¯Ã˜Â©',
        stockAlerts: 'Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â³Ã˜ÂªÃ™Ë†Ã™Æ’',
        operations: '{count} Ã˜Â¹Ã™â€¦Ã™â€žÃ™Å Ã˜Â©',
        toFinalize: 'Ã™â€žÃ˜Â§Ã˜Â²Ã™â€¦Ã™â€¡Ã˜Â§ Ã˜ÂªÃ™Æ’Ã™â€¦Ã™â€žÃ˜Â©',
        dossiersFinalized: 'Ã˜Â¯Ã™Ë†Ã˜Â³Ã™Å Ã˜Â§Ã˜Âª Ã™â€¦Ã™Æ’Ã™â€¦Ã™â€žÃ™Å Ã™â€ ',
        lowStockCount: 'Ã™â€¦Ã™Ë†Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â§Ã˜Âª <= 2'
      },
      recentActions: 'Ã˜Â§Ã˜Â®Ã˜Â± Ã˜Â§Ã™â€žÃ™â€ Ã˜Â´Ã˜Â§Ã˜Â·Ã˜Â§Ã˜Âª',
      noRecentActions: 'Ã™â€¦Ã˜Â§ Ã™ÂÃ™â€¦Ã˜Â§Ã˜Â´ Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â·Ã˜Â§Ã˜Âª Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©.',
      seeAll: 'Ã˜Â´Ã™Ë†Ã™Â Ã˜Â§Ã™â€žÃ™Æ’Ã™â€ž',
      expenses: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â§Ã˜Â±Ã™Å Ã™Â Ã˜Â§Ã™â€žÃ™Æ’Ã™â€ž',
      total: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¬Ã™â€¦Ã™Ë†Ã˜Â¹',
      quickStats: {
        daily: 'Ã™Å Ã™Ë†Ã™â€¦Ã™Å ',
        weekly: 'Ã˜Â£Ã˜Â³Ã˜Â¨Ã™Ë†Ã˜Â¹Ã™Å ',
        monthly: 'Ã˜Â´Ã™â€¡Ã˜Â±Ã™Å '
      },
      actionTypes: {
        payment: 'Ã˜Â®Ã™â€žÃ˜Â§Ã˜Âµ',
        cancelled: 'Ã˜ÂªÃ™â€žÃ˜ÂºÃ˜Â§Ã˜Âª',
        carteGrise: 'Ã™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â²',
        dossier: 'Ã˜Â¯Ã™Ë†Ã˜Â³Ã™Å ',
        invoice: 'Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©',
        client: 'Ã˜Â­Ã˜Â±Ã™Å Ã™Â',
        stock: 'Ã˜Â³Ã˜ÂªÃ™Ë†Ã™Æ’'
      },
      actions: {
        invoicePaid: 'Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã˜ÂªÃ˜Â®Ã™â€žÃ˜ÂµÃ˜Âª',
        invoiceCreated: 'Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©',
        carteReady: 'Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã˜Â±Ã˜Âª Ã˜ÂºÃ˜Â±Ã™Å Ã˜Â² Ã™Ë†Ã˜Â§Ã˜Â¬Ã˜Â¯Ã˜Â©',
        clientAdded: 'Ã˜Â­Ã˜Â±Ã™Å Ã™Â Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯',
        stockLow: 'Ã˜Â§Ã™â€žÃ˜Â³Ã˜ÂªÃ™Ë†Ã™Æ’ Ã™â€ Ã˜Â§Ã™â€šÃ˜Âµ',
        stockOut: 'Ã˜Â§Ã™â€žÃ˜Â³Ã˜ÂªÃ™Ë†Ã™Æ’ Ã™Ë†Ã™ÂÃ™â€°'
      },
      expenseBuckets: {
        paid: 'Ã˜Â®Ã™â€žÃ˜Â§Ã˜ÂµÃ˜Â§Ã˜Âª Ã™â€¦Ã˜Â¤Ã™Æ’Ã˜Â¯Ã˜Â©',
        draft: 'Ã™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã˜Â¨Ã˜Â±Ã™Ë†Ã™Å Ã™Ë†Ã™â€ ',
        pending: 'Ã˜Â¯Ã™Ë†Ã˜Â³Ã™Å Ã˜Â§Ã˜Âª Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã˜ÂªÃ˜Â¸Ã˜Â§Ã˜Â±',
        cancelled: 'Ã™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â± Ã™â€¦Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â©'
      }
    },
    login: {
      title: 'Ã™â€¦Ã˜Â±Ã˜Â­Ã˜Â¨Ã˜Â§ Ã˜Â¨Ã™Å Ã™Æ’ Ã™â€¦Ã™â€  Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯!',
      subtitle: 'Ã˜Â§Ã˜Â¯Ã˜Â®Ã™â€ž Ã™â€žÃ™â€žÃ™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã™â€¡Ã™â€ Ã™Å Ã˜Â© Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¹Ã™Æ’',
      unauthorized: 'Ã˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž Ã™â€¦Ã™Ë†Ã˜Â´ Ã™â€¦Ã˜Â³Ã™â€¦Ã™Ë†Ã˜Â­',
      email: 'Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å ',
      password: 'Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±',
      remember: 'Ã˜ÂªÃ˜Â°Ã™Æ’Ã˜Â±Ã™â€ Ã™Å ',
      forgot: 'Ã™â€ Ã˜Â³Ã™Å Ã˜Âª Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â±Ã˜Å¸',
      submit: 'Ã˜Â§Ã˜Â¯Ã˜Â®Ã™â€ž',
      submitting: 'Ã™â€šÃ˜Â§Ã˜Â¹Ã˜Â¯ Ã™Å Ã˜Â¯Ã˜Â®Ã™â€ž...',
      divider: 'Ã™Ë†Ã™â€žÃ˜Â§ Ã™Æ’Ã™â€¦Ã™â€ž Ã˜Â¹Ã˜Â¨Ã˜Â±',
      noAccount: 'Ã™â€¦Ã˜Â§ Ã˜Â¹Ã™â€ Ã˜Â¯Ã™Æ’Ã˜Â´ Ã™Æ’Ã™Ë†Ã™â€ Ã˜ÂªÃ˜Å¸',
      createAccount: 'Ã˜Â§Ã˜Â¹Ã™â€¦Ã™â€ž Ã™Æ’Ã™Ë†Ã™â€ Ã˜Âª'
    },
    register: {
      title: 'Ã˜Â§Ã˜Â¹Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ™Æ’Ã™Ë†Ã™â€ Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã™â€¡Ã™â€ Ã™Å  Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¹Ã™Æ’',
      subtitle: 'Ã˜Â§Ã˜Â¨Ã˜Â¯Ã˜Â£ Ã˜Â¯Ã™Å Ã˜Â¬Ã™Å Ã˜ÂªÃ˜Â§Ã™â€žÃ™Å Ã˜Â²Ã˜Â§Ã˜Â³Ã™Å Ã™Ë†Ã™â€  Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜ÂªÃ™Æ’ Ã™ÂÃ™Å  5 Ã˜Â¯Ã™â€šÃ˜Â§Ã™Å Ã™â€š',
      step1: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¹Ã™â€žÃ™Ë†Ã™â€¦Ã˜Â§Ã˜Âª',
      step2: 'Ã˜Â§Ã™â€žÃ˜Â§Ã™â€¦Ã˜Â§Ã™â€ ',
      roleLabel: 'Ã˜Â£Ã™â€ Ã˜Â§',
      revendeur: 'Ã˜Â±Ã™Å Ã™ÂÃ™Ë†Ã™â€ Ã˜Â¯Ã™Ë†Ã˜Â±',
      fournisseur: 'Ã™â€¦Ã˜Â²Ã™Ë†Ã™â€˜Ã˜Â¯',
      revendeurHint: 'Ã™â€ Ã˜Â¨Ã™Å Ã˜Â¹ Ã™â€¦Ã™Ë†Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â§Ã˜Âª',
      fournisseurHint: 'CCT, Zimota, Sanya...',
      fullName: 'Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜Â¤Ã™Ë†Ã™â€ž',
      businessName: 'Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€ Ã˜Â´Ã˜Â§Ã˜Â·',
      companyName: 'Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â©',
      taxId: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¹Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â¨Ã˜Â§Ã˜Â¦Ã™Å ',
      phone: 'Ã˜ÂªÃ™â€žÃ™Å Ã™ÂÃ™Ë†Ã™â€ ',
      address: 'Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€ ',
      city: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™Å Ã™â€ Ã˜Â©',
      postalCode: 'Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â±Ã™â€šÃ™Å Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯Ã™Å ',
      continue: 'Ã™Æ’Ã™â€¦Ã™â€˜Ã™â€ž',
      password: 'Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±',
      confirmPassword: 'Ã˜Â¹Ã˜Â§Ã™Ë†Ã˜Â¯ Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â¨ Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±',
      passwordHint: 'Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â¹Ã™â€¦Ã™â€ž 6 Ã˜Â­Ã˜Â±Ã™Ë†Ã™Â Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ˜Â§Ã™â€šÃ™â€ž Ã™â€¦Ã˜Â¹ Ã˜Â§Ã˜Â±Ã™â€šÃ˜Â§Ã™â€¦ Ã™Ë†Ã˜Â­Ã˜Â±Ã™Ë†Ã™Â',
      confirmHint: 'Ã˜Â¹Ã˜Â§Ã™Ë†Ã˜Â¯ Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â¨ Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±',
      acceptTerms: 'Ã˜Â£Ã™Ë†Ã˜Â§Ã™ÂÃ™â€š Ã˜Â¹Ã™â€žÃ™â€°',
      terms: 'Ã˜Â´Ã˜Â±Ã™Ë†Ã˜Â· Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦',
      privacy: 'Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â®Ã˜ÂµÃ™Ë†Ã˜ÂµÃ™Å Ã˜Â©',
      back: 'Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹',
      create: 'Ã˜Â§Ã˜Â¹Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ™Æ’Ã™Ë†Ã™â€ Ã˜Âª',
      creating: 'Ã™â€šÃ˜Â§Ã˜Â¹Ã˜Â¯ Ã™â€ Ã˜Â¹Ã™â€¦Ã™â€žÃ™Ë†...',
      featuresTitle: 'Ã˜Â´Ã™â€ Ã™Ë†Ã™â€˜Ã˜Â§ Ã˜Â¨Ã˜Â§Ã˜Â´ Ã˜ÂªÃ˜Â§Ã˜Â®Ã™Ë†:',
      feature1: 'Ã˜ÂªÃ˜Â¬Ã˜Â±Ã˜Â¨Ã˜Â© Ã™â€¦Ã˜Â¬Ã˜Â§Ã™â€ Ã™Å Ã˜Â© 14 Ã™Å Ã™Ë†Ã™â€¦',
      feature2: 'Ã™â€¦Ã™â€  Ã˜ÂºÃ™Å Ã˜Â± Ã™Æ’Ã˜Â§Ã˜Â±Ã˜ÂªÃ˜Â© Ã˜Â¨Ã™â€ Ã™Æ’Ã™Å Ã˜Â©',
      feature3: 'Ã˜Â³Ã™Ë†Ã˜Â¨Ã™Ë†Ã˜Â± 7/7',
      feature4: 'Ã™ÂÃ™Ë†Ã˜Â±Ã™â€¦Ã˜Â§Ã˜Â³Ã™Å Ã™Ë†Ã™â€  Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€žÃ˜Â©',
      haveAccount: 'Ã˜Â¹Ã™â€ Ã˜Â¯Ã™Æ’ Ã™Æ’Ã™Ë†Ã™â€ Ã˜Âª Ã™â€šÃ˜Â¨Ã™â€žÃ˜Å¸',
      signIn: 'Ã˜Â§Ã˜Â¯Ã˜Â®Ã™â€ž',
      errPasswordMatch: 'Ã™Æ’Ã™â€žÃ™â€¦Ã˜ÂªÃ™Å  Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â± Ã™â€¦Ã™Ë†Ã˜Â´ Ã™Æ’Ã™Å Ã™Â Ã™Æ’Ã™Å Ã™Â',
      errPasswordLength: 'Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â± Ã™â€žÃ˜Â§Ã˜Â²Ã™â€¦Ã™â€¡Ã˜Â§ 6 Ã˜Â­Ã˜Â±Ã™Ë†Ã™Â Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ˜Â§Ã™â€šÃ™â€ž',
      errTerms: 'Ã™â€žÃ˜Â§Ã˜Â²Ã™â€¦Ã™Æ’ Ã˜ÂªÃ™Ë†Ã˜Â§Ã™ÂÃ™â€š Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Ë†Ã˜Â·'
    }
  }
};

const cleanArabicMessages = {
  lang: { fr: 'FR', ar: 'AR' },
  common: {
    loading: 'جاري التحميل...',
    profile: 'ملفي الشخصي',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    other: 'أخرى',
    live: 'مباشر',
    refresh: 'تحديث',
    searchRevendeur: 'ابحث عن عميل أو دراجة أو ملف...',
    searchFournisseur: 'ابحث عن بائع أو ملف...',
    comingSoonArchive: 'الأرشيف (قريباً...)',
    comingSoonStats: 'الإحصائيات (قريباً...)',
    comingSoonSettings: 'الإعدادات (قريباً...)',
    comingSoonCatalog: 'الكتالوج (قريباً...)',
    comingSoonOrders: 'الطلبات (قريباً...)'
  },
  nav: {
    dashboard: 'لوحة التحكم',
    clients: 'العملاء',
    motorcycles: 'الدراجات',
    carteGrise: 'البطاقة الرمادية',
      invoices: 'المبيعات',
    fournisseurs: 'الموردون',
    archive: 'الأرشيف',
    stats: 'الإحصائيات',
    settings: 'الإعدادات',
    revendeurs: 'البائعون',
    cartesGrises: 'البطاقات الرمادية',
    catalog: 'كتالوج الدراجات',
    orders: 'الطلبات',
    messages: 'الرسائل',
    fournisseur: 'مورد',
    revendeur: 'بائع',
    fournisseurPremium: 'مورد مميز'
  },
  notifications: {
    title: 'الإشعارات',
    markAllRead: 'تحديد الكل كمقروء',
    noNotifications: 'لا توجد إشعارات',
    upToDate: 'كل شيء محدث.',
    markRead: 'تحديد كمقروء',
    delete: 'حذف',
    filters: {
      all: 'الكل',
      unread: 'غير مقروء',
      carteGrise: 'البطاقة الرمادية',
      invoices: 'المبيعات',
      clients: 'العملاء',
      stock: 'المخزون',
      orders: 'الطلبات',
      payments: 'المدفوعات',
      sla: 'مستوى الخدمة'
    },
    fallback: {
      orderTitle: 'طلب جديد',
      orderMessage: 'قام أحد البائعين بإنشاء طلب جديد.',
      dossierTitle: 'طلب بطاقة رمادية',
      dossierMessage: 'يوجد ملف بطاقة رمادية قيد الانتظار.'
    },
    relative: {
      now: 'الآن',
      min: 'منذ {count} دقيقة',
      hour: 'منذ {count} ساعة',
      day: 'منذ {count} يوم'
    },
    serverTitles: {
      carteGriseReady: 'البطاقة الرمادية جاهزة',
      missingDocuments: 'وثائق ناقصة',
      invoicePaid: 'تم تسديد البيعة',
      invoiceCreated: 'بيعة جديدة',
      newClient: 'عميل جديد',
      lowStock: 'المخزون منخفض',
      outOfStock: 'نفاد المخزون',
      partnershipRequest: 'طلب شراكة جديد',
      carteGriseAssigned: 'ملف بطاقة رمادية جديد',
      carteGriseStatusUpdated: 'تم تحديث حالة الملف'
    }
  },
  dashboard: {
    title: 'لوحة تحكم البائع',
    subtitle: 'عرض مباشر عبر API للفترة {range}.',
    range: {
      today: 'اليوم',
      week: 'هذا الأسبوع',
      month: 'هذا الشهر',
      year: 'هذه السنة'
    },
    select: {
      today: 'اليوم',
      week: 'هذا الأسبوع',
      month: 'هذا الشهر',
      year: 'هذه السنة'
    },
    mainAccount: 'الحساب الرئيسي',
    accountName: 'حساب تونيموتو للبائع',
    accountSync: 'مزامنة API مفعلة - لوحة التحكم مباشرة',
    availableFunds: 'الرصيد المتاح',
    createInvoice: 'تسجيل بيعة',
    followDossiers: 'متابعة الملفات',
    monthlyGoal: 'الهدف الشهري: {value}%',
    priority: 'الإجراءات ذات الأولوية',
    remindersTitle: 'ضبط تذكيرات الملفات',
    remindersText: 'يوجد {pending} ملف بطاقة رمادية قيد الانتظار و {missing} عميل ببيانات غير مكتملة.',
    openCarte: 'فتح ملف البطاقة الرمادية',
    verifyClients: 'مراجعة العملاء',
    metrics: {
      paidInvoices: 'مبيعات مسددة',
      inProgressInvoices: 'مبيعات قيد المتابعة',
      readyCarteGrise: 'البطاقة الرمادية جاهزة',
      stockAlerts: 'تنبيهات المخزون',
      operations: '{count} عملية',
      toFinalize: 'للإنهاء',
      dossiersFinalized: 'ملفات مكتملة',
      lowStockCount: 'دراجات <= 2 وحدات'
    },
    recentActions: 'آخر العمليات',
    noRecentActions: 'لا توجد عمليات حديثة.',
    seeAll: 'عرض الكل',
    expenses: 'جميع المصاريف',
    total: 'الإجمالي',
    quickStats: {
      daily: 'يومي',
      weekly: 'أسبوعي',
      monthly: 'شهري'
    },
    actionTypes: {
      payment: 'دفع',
      cancelled: 'ملغى',
      carteGrise: 'بطاقة رمادية',
      dossier: 'ملف',
      invoice: 'بيعة',
      client: 'عميل',
      stock: 'مخزون'
    },
    actions: {
      invoicePaid: 'تم تسديد البيعة',
      invoiceCreated: 'بيعة جديدة',
      carteReady: 'البطاقة الرمادية جاهزة',
      clientAdded: 'عميل جديد',
      stockLow: 'المخزون منخفض',
      stockOut: 'نفاد المخزون'
    },
    expenseBuckets: {
      paid: 'مدفوعات مؤكدة',
      draft: 'مبيعات في انتظار الخلاص',
      pending: 'ملفات قيد الانتظار',
      cancelled: 'مبيعات ملغاة'
    }
  },
  login: {
    title: 'مرحباً بعودتك',
    subtitle: 'سجّل الدخول إلى مساحتك المهنية',
    unauthorized: 'وصول غير مصرح',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    remember: 'تذكرني',
    forgot: 'نسيت كلمة المرور؟',
    submit: 'تسجيل الدخول',
    submitting: 'جار تسجيل الدخول...',
    divider: 'أو المتابعة عبر',
    noAccount: 'ليس لديك حساب بعد؟',
    createAccount: 'إنشاء حساب'
  },
  register: {
    title: 'إنشاء حسابك المهني',
    subtitle: 'ابدأ رقمنة نشاطك في 5 دقائق',
    step1: 'المعلومات',
    step2: 'الأمان',
    roleLabel: 'أنا',
    revendeur: 'بائع',
    fournisseur: 'مورد',
    revendeurHint: 'أبيع الدراجات',
    fournisseurHint: 'سي سي تي، زيموتا، سانيا...',
    fullName: 'اسم المسؤول',
    businessName: 'اسم النشاط',
    companyName: 'اسم الشركة',
    taxId: 'المعرف الجبائي',
    phone: 'الهاتف',
    address: 'العنوان',
    city: 'المدينة',
    postalCode: 'الرمز البريدي',
    continue: 'متابعة',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    passwordHint: 'استعمل 10 أحرف على الأقل مع حرف كبير وحرف صغير ورقم ورمز',
    confirmHint: 'أعد كتابة كلمة المرور',
    acceptTerms: 'أوافق على',
    terms: 'شروط الاستخدام',
    privacy: 'سياسة الخصوصية',
    back: 'رجوع',
    create: 'إنشاء حسابي',
    creating: 'جار الإنشاء...',
    featuresTitle: 'ما الذي ستحصل عليه:',
    feature1: 'تجربة مجانية لمدة 14 يوماً',
    feature2: 'بدون بطاقة بنكية',
    feature3: 'دعم 7/7',
    feature4: 'تكوين مشمول',
    haveAccount: 'لديك حساب بالفعل؟',
    signIn: 'تسجيل الدخول',
    errPasswordMatch: 'كلمتا المرور غير متطابقتين',
    errPasswordLength: 'يجب أن تحتوي كلمة المرور على 10 أحرف على الأقل',
    errTerms: 'يجب عليك قبول شروط الاستخدام'
  }
};

function collectLeafStringPairs(frNode, arNode, collector = []) {
  if (typeof frNode === 'string' && typeof arNode === 'string') {
    collector.push([repairMojibake(frNode), repairMojibake(arNode)]);
    return collector;
  }

  if (!frNode || typeof frNode !== 'object' || !arNode || typeof arNode !== 'object') {
    return collector;
  }

  Object.keys(frNode).forEach((key) => {
    collectLeafStringPairs(frNode[key], arNode[key], collector);
  });

  return collector;
}

const DICTIONARY_PHRASE_ENTRIES = collectLeafStringPairs(messages.fr, cleanArabicMessages)
  .filter(([frText, arText]) => frText && arText && frText !== arText && frText.trim().length >= 3)
  .sort((a, b) => b[0].length - a[0].length);

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);
}

function interpolate(template, params) {
  if (typeof template !== 'string') return template;
  return Object.entries(params || {}).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function resolveMessage(language, key, fallback = '', options = {}) {
  const { translateFrenchFallback = true } = options;
  const dictionary = language === 'ar'
    ? cleanArabicMessages
    : messages[language] || messages.fr;
  const value = getByPath(dictionary, key);
  if (typeof value === 'string') {
    return repairMojibake(value);
  }

  const frValue = getByPath(messages.fr, key);
  if (typeof frValue === 'string') {
    if (language === 'ar' && translateFrenchFallback) {
      return repairMojibake(autoTranslateString(frValue, 'ar'));
    }

    return repairMojibake(frValue);
  }

  return repairMojibake(fallback);
}

function autoTranslateString(source, language) {
  if (language !== 'ar' || typeof source !== 'string' || source.trim().length === 0) {
    return source;
  }

  const { text: protectedSource, tokens: protectedTokens } = protectSensitiveTokens(repairMojibake(source));
  let result = protectedSource;
  for (const [frText, arText] of DICTIONARY_PHRASE_ENTRIES) {
    if (!result.includes(frText)) {
      continue;
    }

    result = result.split(frText).join(arText);
  }

  for (const [frText, arText] of AUTO_PHRASE_ENTRIES) {
    if (!result.includes(frText)) {
      continue;
    }

    result = result.split(frText).join(arText);
  }

  for (const [frText, key] of AUTO_TRANSLATION_ENTRIES) {
    if (!result.includes(frText)) {
      continue;
    }

    const translated = resolveMessage(language, key, frText, { translateFrenchFallback: false });
    if (!translated || translated === frText) {
      continue;
    }

    result = result.split(frText).join(translated);
  }

  result = result.replace(LATIN_TOKEN_REGEX, (word) => {
    const translated = AUTO_WORD_LOOKUP.get(normalizeFrenchWord(word));
    if (translated) {
      return translated;
    }

    if (shouldKeepLatinToken(word)) {
      return word;
    }

    return transliterateLatinWord(word);
  });

  return restoreSensitiveTokens(repairMojibake(result), protectedTokens);
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' || stored === 'fr' ? stored : 'fr';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    if (!ENABLE_DOM_AUTO_TRANSLATION || language !== 'ar') {
      return undefined;
    }

    if (typeof document === 'undefined') {
      return undefined;
    }

    const root = document.body;
    if (!root) {
      return undefined;
    }

    const isArabic = language === 'ar';
    const translatableAttrs = ['placeholder', 'title', 'aria-label'];

    const processTextNode = (node) => {
      if (!node || node.nodeType !== Node.TEXT_NODE) {
        return;
      }

      const parentTag = node.parentElement?.tagName;
      if (parentTag && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parentTag)) {
        return;
      }

      const currentText = node.textContent || '';
      let sourceText = TEXT_NODE_SOURCE_CACHE.get(node);

      if (!sourceText) {
        sourceText = currentText;
        TEXT_NODE_SOURCE_CACHE.set(node, sourceText);
      }

      if (isArabic) {
        const translatedFromSource = autoTranslateString(sourceText, language);
        if (currentText !== sourceText && currentText !== translatedFromSource) {
          sourceText = currentText;
          TEXT_NODE_SOURCE_CACHE.set(node, sourceText);
        }
      } else {
        const translatedFromSource = autoTranslateString(sourceText, 'ar');
        if (currentText !== sourceText && currentText !== translatedFromSource) {
          sourceText = currentText;
          TEXT_NODE_SOURCE_CACHE.set(node, sourceText);
        }
      }

      const nextText = isArabic ? autoTranslateString(sourceText, language) : sourceText;

      if (nextText !== currentText) {
        node.textContent = nextText;
      }
    };

    const processElementAttributes = (element) => {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const cache = ATTR_SOURCE_CACHE.get(element) || {};

      translatableAttrs.forEach((attrName) => {
        const currentValue = element.getAttribute(attrName);
        if (!currentValue) {
          return;
        }

        let sourceValue = cache[attrName];
        if (!sourceValue) {
          sourceValue = currentValue;
          cache[attrName] = sourceValue;
        }

        if (isArabic) {
          const translatedFromSource = autoTranslateString(sourceValue, language);
          if (currentValue !== sourceValue && currentValue !== translatedFromSource) {
            sourceValue = currentValue;
            cache[attrName] = sourceValue;
          }
        } else {
          const translatedFromSource = autoTranslateString(sourceValue, 'ar');
          if (currentValue !== sourceValue && currentValue !== translatedFromSource) {
            sourceValue = currentValue;
            cache[attrName] = sourceValue;
          }
        }

        const nextValue = isArabic ? autoTranslateString(sourceValue, language) : sourceValue;
        if (nextValue !== currentValue) {
          element.setAttribute(attrName, nextValue);
        }
      });

      ATTR_SOURCE_CACHE.set(element, cache);
    };

    const processNodeTree = (node) => {
      if (!node) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        processTextNode(node);
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      processElementAttributes(node);

      const textWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (textWalker.nextNode()) {
        processTextNode(textWalker.currentNode);
      }

      node.querySelectorAll('*').forEach(processElementAttributes);
    };

    processNodeTree(root);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          processTextNode(mutation.target);
          return;
        }

        if (mutation.type === 'attributes') {
          processElementAttributes(mutation.target);
          return;
        }

        mutation.addedNodes.forEach(processNodeTree);
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttrs
    });

    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => {
    const t = (key, params = {}, fallback = '') => {
      const template = resolveMessage(language, key, fallback || key);
      return repairMojibake(interpolate(template, params));
    };

    return {
      language,
      isArabic: language === 'ar',
      locale: language === 'ar' ? 'ar' : 'fr-FR',
      setLanguage,
      t
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
