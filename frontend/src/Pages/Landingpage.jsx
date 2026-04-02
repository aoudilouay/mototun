import { Link } from 'react-router-dom';
import { useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import { useI18n } from '../context/I18nContext';

function LandingPage() {
  const { isArabic } = useI18n();
  const [activeRole, setActiveRole] = useState('revendeur');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const roleUrls = {
    revendeur: 'tunimoto.tn/revendeur/dashboard',
    client: 'tunimoto.tn/client/portal/ABC123',
    fournisseur: 'tunimoto.tn/fournisseur/dashboard'
  };

  const roleSequence = ['revendeur', 'client', 'fournisseur'];
  const roleJourney = {
    revendeur: {
      step: '01',
      label: 'Revendeur',
      badge: 'Vous',
      eyebrow: 'Pilotage',
      selectorText: 'Décide quoi compléter, envoyer et suivre',
      summary: 'Le revendeur ouvre le dossier, voit ce qui manque et décide immédiatement quoi faire ensuite.',
      actions: [
        'Repère les pièces manquantes sans calculer',
        'Relance le client ou complète le dossier',
        'Envoie le dossier complet au fournisseur'
      ],
      result: 'Moins de chaos, moins de relances, plus de dossiers qui avancent.',
      selectorActive: 'border-blue-300 bg-blue-50 shadow-[0_20px_45px_-30px_rgba(37,99,235,0.45)]',
      selectorBadge: 'bg-blue-100 text-blue-700',
      resultTone: 'border-blue-200 bg-blue-50 text-blue-900'
    },
    client: {
      step: '02',
      label: 'Client',
      badge: null,
      eyebrow: 'Portail',
      selectorText: 'Dépose ses pièces et suit le statut',
      summary: 'Le client voit les documents attendus, dépose ses pièces et suit le dossier sans appeler à chaque étape.',
      actions: [
        'Voit immédiatement le document prioritaire',
        'Upload les pièces demandées depuis son portail',
        'Suit l’avancement du dossier en temps réel'
      ],
      result: 'Moins d’appels, moins d’oubli, plus de clarté côté client.',
      selectorActive: 'border-cyan-300 bg-cyan-50 shadow-[0_20px_45px_-30px_rgba(8,145,178,0.45)]',
      selectorBadge: 'bg-cyan-100 text-cyan-700',
      resultTone: 'border-cyan-200 bg-cyan-50 text-cyan-900'
    },
    fournisseur: {
      step: '03',
      label: 'Fournisseur',
      badge: 'Workspace',
      eyebrow: 'Traitement',
      selectorText: 'Traite les dossiers par workspace',
      summary: 'Le fournisseur retrouve chaque dossier dans le bon workspace revendeur, avec les priorités visibles et un traitement plus propre.',
      actions: [
        'Ouvre le bon workspace revendeur',
        'Voit les dossiers prêts à traiter en premier',
        'Lance le traitement sans re-saisie inutile'
      ],
      result: 'Des dossiers plus propres, mieux groupés et plus rapides à traiter.',
      selectorActive: 'border-indigo-300 bg-indigo-50 shadow-[0_20px_45px_-30px_rgba(79,70,229,0.45)]',
      selectorBadge: 'bg-indigo-100 text-indigo-700',
      resultTone: 'border-indigo-200 bg-indigo-50 text-indigo-900'
    }
  };
  const activeRoleIndex = roleSequence.indexOf(activeRole);
  const currentRole = roleJourney[activeRole];

  const cycleRole = (direction) => {
    const nextIndex = (activeRoleIndex + direction + roleSequence.length) % roleSequence.length;
    setActiveRole(roleSequence[nextIndex]);
  };

  const renderRolePreview = (role) => {
    if (role === 'revendeur') {
      return (
        <div className="rounded-[30px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_26px_80px_-42px_rgba(15,23,42,0.75)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">Vue revendeur</p>
              <h4 className="mt-2 text-2xl font-black tracking-tight">Les dossiers à faire aujourd&apos;hui</h4>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">Priorité claire</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">À compléter</p>
              <p className="mt-1 text-2xl font-black">4</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Prêts</p>
              <p className="mt-1 text-2xl font-black">5</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">En cours</p>
              <p className="mt-1 text-2xl font-black">3</p>
            </div>
          </div>

          <div className="mt-5 rounded-[28px] bg-white p-5 text-slate-900 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dossier</p>
                <p className="mt-1 font-mono text-sm font-black text-slate-950">CG-2026-148</p>
              </div>
              <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                Manque documents
              </span>
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-lg font-black text-slate-950">Ahmed Ben Salem</p>
              <p className="text-sm font-medium text-slate-700">Yamaha NMAX 125</p>
              <p className="text-sm text-slate-600">2 documents manquants: CIN verso, justificatif</p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:from-rose-700 hover:to-orange-600">
                Ajouter documents
              </button>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-600">Non envoyé</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-600">MAJ: Aujourd&apos;hui</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'client') {
      return (
        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_26px_80px_-42px_rgba(37,99,235,0.32)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">Portail client</p>
              <h4 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Le client voit tout de suite quoi envoyer</h4>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Simple</span>
          </div>

          <div className="mt-5 rounded-[28px] border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">Prochaine action</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-rose-700">Uploader la CIN verso</p>
              </div>
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-rose-700">Prioritaire</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-rose-700">Le client n&apos;a rien à deviner. Le document demandé est visible immédiatement.</p>
          </div>

          <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Avancement</p>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">3/5 reçus</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700">Facture reçue</span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700">CIN recto reçu</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-500">Carte grise en attente</span>
            </div>
          </div>

          <button className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)] hover:from-blue-700 hover:to-indigo-700">
            Uploader maintenant
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspaces</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">Moto Ben Arous</p>
                  <p className="text-[11px] text-slate-500">Actif aujourd&apos;hui</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700">7</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">À traiter: 3</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">En cours: 2</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-sm font-bold text-slate-900">Kram Scooters</p>
              <p className="mt-1 text-[11px] text-slate-500">4 dossiers</p>
            </div>
          </div>
        </aside>

        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_26px_80px_-42px_rgba(79,70,229,0.28)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">Vue fournisseur</p>
              <h4 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Chaque revendeur garde son workspace</h4>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Prêt à traiter</span>
          </div>

          <div className="mt-5 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-black text-slate-900">CG-2026-077</p>
                <p className="mt-2 text-lg font-black text-slate-950">Amine Slama</p>
                <p className="mt-1 text-sm text-slate-700">Piaggio Liberty 125</p>
              </div>
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-emerald-700">4/4 pièces</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">Le fournisseur ouvre le bon workspace, retrouve le bon dossier et lance le traitement sans confusion.</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-900 px-3 py-1.5 font-bold text-white">Docs</span>
            <span className="rounded-full bg-slate-900 px-3 py-1.5 font-bold text-white">Complet</span>
            <span className="rounded-full border border-blue-200 bg-blue-100 px-3 py-1.5 font-bold text-blue-700">Envoyé</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-400">En cours</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-400">Terminé</span>
          </div>

          <button className="mt-5 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:from-emerald-700 hover:to-teal-600">
            Traiter dossier
          </button>
        </div>
      </div>
    );
  };

  if (isArabic) {
    return <ArabicLandingPage />;
  }

  return (
    <>
      <div>
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
          <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-wrap 2xl:flex-nowrap items-center gap-3 justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <BrandLogo
                  imageClassName="h-9 sm:h-10 w-auto rounded-lg border border-slate-200"
                  loading="eager"
                  fetchPriority="high"
                />
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Tunimoto
                </span>
              </div>
              <span className="hidden sm:inline text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200">
                Conçu pour les professionnels moto en Tunisie
              </span>
            </div>

            {/* Middle Nav Links */}
            <div className="hidden 2xl:flex items-center gap-6 text-sm font-medium shrink-0">
              <a href="#roles" className="text-slate-600 hover:text-blue-600 transition">Comment ça marche</a>
              <a href="#features" className="text-slate-600 hover:text-blue-600 transition">Pour revendeurs</a>
              <a href="#faq" className="text-slate-600 hover:text-blue-600 transition">Questions</a>
            </div>

            {/* Mobile Menu Toggle - Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Right Side - 3 Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Client portal - secondary utility link */}
              <Link
                to="/client-portal"
                className="hidden xl:inline-flex px-3 sm:px-4 py-2 border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs sm:text-sm font-semibold rounded-lg transition-all items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
                <span>Accès client</span>
              </Link>

              {/* Button 2: Sign In */}
              <Link
                to="/login"
                className="px-3 sm:px-5 py-2 border border-slate-300 hover:border-blue-400 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg transition-all"
              >
                Connexion
              </Link>

              {/* Button 3: Sign Up */}
              <Link
                to="/register"
                className="hidden sm:inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-600/30 transition-all"
              >
                Créer mon espace
              </Link>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="fixed top-16 left-0 right-0 z-40 lg:hidden bg-white border-b border-slate-200/60 shadow-lg">
            <div className="max-w-[1480px] mx-auto px-4 py-4 space-y-3">
              <a href="#roles" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition" onClick={() => setIsMobileMenuOpen(false)}>
                Comment ça marche
              </a>
              <a href="#features" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition" onClick={() => setIsMobileMenuOpen(false)}>
                Pour revendeurs
              </a>
              <a href="#faq" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition" onClick={() => setIsMobileMenuOpen(false)}>
                Questions
              </a>
              <Link
                to="/client-portal"
                className="block px-4 py-2 text-cyan-700 bg-cyan-50 rounded-lg font-semibold text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Accès client
              </Link>
              <div className="pt-2 border-t border-slate-200">
                <Link
                  to="/register"
                  className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-center transition"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Créer mon espace
                </Link>
              </div>
            </div>
          </div>
        )}
        <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 pt-32 pb-20 relative overflow-hidden">

          {/* Animated background pattern - flowing gradients */}
          <div className="absolute inset-0 opacity-50 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-200 to-transparent rounded-full blur-3xl will-change-transform" style={{animation: 'backgroundFlow 20s ease-in-out infinite'}} />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-cyan-200 to-transparent rounded-full blur-3xl will-change-transform" style={{animation: 'backgroundFlow 20s ease-in-out infinite reverse'}} />
          </div>

          {/* Animated gradient orbs - with floating effect */}
          <div className="hidden sm:block absolute top-20 left-10 w-80 h-80 lg:w-96 lg:h-96 bg-blue-400/30 rounded-full blur-3xl will-change-transform" style={{animation: 'float 8s ease-in-out infinite, pulse 4s ease-in-out infinite'}} />
          <div className="hidden sm:block absolute bottom-20 right-10 w-80 h-80 lg:w-96 lg:h-96 bg-cyan-400/30 rounded-full blur-3xl will-change-transform" style={{animation: 'float 8s ease-in-out infinite 1s, pulse 4s ease-in-out infinite 1s'}} />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto space-y-8">
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg shadow-blue-500/10 border border-blue-100">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Pensé pour les revendeurs moto qui gèrent leurs dossiers carte grise au quotidien
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight">
                <span className="block text-slate-900">
                  Vos dossiers carte grise
                </span>
                <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent bg-[length:200%_100%]" style={{animation: 'gradientShift 3s ease-in-out infinite, shimmer 6s ease-in-out infinite'}}>
                  sans WhatsApp, sans chaos
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-3xl mx-auto leading-relaxed">
                Tunimoto centralise les documents, montre ce qui manque, prépare l&apos;envoi au fournisseur et suit chaque dossier jusqu&apos;à la carte grise prête.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border border-slate-200">
                  <span className="text-2xl font-bold text-blue-600">2-3h</span>
                  <span className="text-slate-600 text-xs">gagnées/jour</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border border-slate-200">
                  <span className="text-2xl font-bold text-emerald-600">1 vue</span>
                  <span className="text-slate-600 text-xs">pièces manquantes visibles</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border border-slate-200">
                  <span className="text-2xl font-bold text-cyan-600">1 clic</span>
                  <span className="text-slate-600 text-xs">pour préparer l&apos;envoi fournisseur</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  to="/register"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl shadow-xl shadow-blue-500/25 hover:shadow-blue-600/40 transition-all transform hover:-translate-y-0.5"
                >
                  Créer mon espace revendeur
                </Link>
                <a href="#demo" className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 text-lg font-semibold rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-all">
                  Voir une vraie démo
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Mise en route rapide</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Portail client inclus</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Support en français et en arabe</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* NEW: Animated Stats Section - TRUST BUILDER */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
              
              <div className="text-center group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  50+
                </div>
                <div className="text-sm text-slate-600 font-medium">Revendeurs actifs</div>
              </div>

              <div className="text-center group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  2-3h
                </div>
                <div className="text-sm text-slate-600 font-medium">gagnées chaque jour</div>
              </div>

              <div className="text-center group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  1 clic
                </div>
                <div className="text-sm text-slate-600 font-medium">pour transmettre un dossier propre</div>
              </div>

              <div className="text-center group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  24/7
                </div>
                <div className="text-sm text-slate-600 font-medium">de visibilité sur chaque dossier</div>
              </div>

            </div>
          </div>
        </section>

        {/* Journey Section - Simple step slider */}
        <section id="roles" className="py-32 bg-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{backgroundImage: 'repeating-linear-gradient(0deg, #60a5fa 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #60a5fa 0px, transparent 1px, transparent 40px)'}} />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
              <div className="inline-block px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
                <span className="text-sm font-semibold text-blue-700">Un dossier, trois vues utiles</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900">
                {isArabic ? 'من المورّد إلى العميل، الجميع متصل' : 'Un parcours simple du premier document jusqu’au traitement fournisseur'}
              </h2>
              <p className="text-xl text-slate-600">
                Passez d&apos;une étape à l&apos;autre pour voir l&apos;écran utile, pas un mock compliqué.
              </p>
            </div>

            <div className="space-y-8">
              
              <div className="relative mx-auto max-w-5xl">
                <div className="pointer-events-none absolute left-24 right-24 top-11 hidden h-px bg-slate-200 md:block" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {roleSequence.map((role) => {
                    const roleMeta = roleJourney[role];
                    const active = activeRole === role;

                    return (
                      <button
                        key={role}
                        onClick={() => setActiveRole(role)}
                        className={`relative rounded-[24px] border p-4 text-left transition-all duration-200 ${
                          active
                            ? roleMeta.selectorActive
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black ${
                            active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {roleMeta.step}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-bold text-slate-900">{roleMeta.label}</p>
                              {roleMeta.badge && (
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  active ? roleMeta.selectorBadge : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {roleMeta.badge}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-sm leading-5 text-slate-600">{roleMeta.selectorText}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Dynamic mockup */}
              <div className="relative mx-auto max-w-5xl">
                
                <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white/80 backdrop-blur-lg shadow-[0_30px_80px_-44px_rgba(37,99,235,0.42)]">
                  
                  <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-slate-500 font-medium">
                      {roleUrls[activeRole] || 'tunimoto.tn'}
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6">
                    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="max-w-2xl">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${currentRole.selectorBadge}`}>
                          {currentRole.eyebrow}
                        </span>
                        <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{currentRole.label}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{currentRole.summary}</p>
                      </div>
                      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => cycleRole(-1)}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
                        >
                          ← Étape précédente
                        </button>
                        <button
                          type="button"
                          onClick={() => cycleRole(1)}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
                        >
                          Étape suivante →
                        </button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-slate-50/70">
                      <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${activeRoleIndex * 100}%)` }}
                      >
                        {roleSequence.map((role) => {
                          const roleMeta = roleJourney[role];

                          return (
                            <section key={role} className="min-w-full p-4 sm:p-5">
                              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
                                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                                      {roleMeta.step}
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Étape du parcours</p>
                                      <h4 className="text-xl font-black text-slate-950">{roleMeta.label}</h4>
                                    </div>
                                  </div>

                                  <p className="mt-5 text-sm leading-6 text-slate-600">{roleMeta.summary}</p>

                                  <div className="mt-5 space-y-3">
                                    {roleMeta.actions.map((action, index) => (
                                      <div key={action} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                                        <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white text-xs font-black text-slate-700 shadow-sm">
                                          0{index + 1}
                                        </span>
                                        <p className="text-sm font-medium leading-6 text-slate-700">{action}</p>
                                      </div>
                                    ))}
                                  </div>

                                  <div className={`mt-5 rounded-[24px] border px-4 py-4 ${roleMeta.resultTone}`}>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Résultat</p>
                                    <p className="mt-2 text-sm font-semibold leading-6">{roleMeta.result}</p>
                                  </div>
                                </div>

                                <div style={{ animation: 'rolePanelIn 260ms ease-out' }}>
                                  {renderRolePreview(role)}
                                </div>
                              </div>
                            </section>
                          );
                        })}

                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {roleSequence.map((role) => {
                          const roleMeta = roleJourney[role];
                          const active = role === activeRole;

                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => setActiveRole(role)}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? roleMeta.selectorActive
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                              }`}
                            >
                              <span>{roleMeta.step}</span>
                              <span>{roleMeta.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-sm text-slate-500">
                        Un même dossier, trois écrans utiles et une seule histoire claire.
                      </p>
                    </div>

                  </div>
                </div>

                <div className="absolute -top-4 right-0 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20">
                  Inspiré de votre vrai workflow
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Ce qui fait gagner du temps chaque jour
              </h2>
              <p className="text-xl text-slate-600">
                Pas une plateforme générique. Un outil pensé pour les dossiers carte grise moto.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 transition-all group hover:border-blue-300 hover:shadow-xl sm:p-8">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📦</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Pièces manquantes visibles immédiatement
                </h3>
                <p className="text-slate-600">
                  Chaque dossier montre clairement ce qui manque, ce qui est reçu et ce qui peut partir au fournisseur.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-6 transition-all group hover:border-cyan-300 hover:shadow-xl sm:p-8">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Envoi fournisseur structuré
                </h3>
                <p className="text-slate-600">
                  Préparez un dossier propre, sans photos perdues ni copier-coller manuel entre WhatsApp, email et Excel.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 transition-all group hover:border-blue-300 hover:shadow-xl sm:p-8">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔐</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Portail client et suivi clair
                </h3>
                <p className="text-slate-600">
                  Le client dépose ses documents et suit l&apos;avancement sans vous appeler plusieurs fois par jour.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* NEW: Video Demo Section - ENGAGEMENT BOOSTER */}
        <section id="demo" className="py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
          
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div className="hidden sm:block absolute top-20 left-20 w-64 h-64 lg:w-72 lg:h-72 bg-blue-500 rounded-full blur-3xl animate-pulse" />
            <div className="hidden sm:block absolute bottom-20 right-20 w-80 h-80 lg:w-96 lg:h-96 bg-cyan-500 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            
            <div className="text-center mb-16">
              <div className="inline-block px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full mb-6">
                <span className="text-sm font-semibold text-blue-300">Voir le parcours d&apos;un vrai dossier</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                De “pièces manquantes” à “envoyé fournisseur”
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Une démo courte pour voir comment Tunimoto enlève les relances, les oublis et le désordre quotidien.
              </p>
            </div>

            {/* Video Placeholder */}
            <div className="relative max-w-4xl mx-auto">
              <div className="aspect-video bg-slate-800 rounded-2xl border-2 border-blue-500/30 shadow-2xl shadow-blue-500/20 overflow-hidden group cursor-pointer">
                
                {/* Thumbnail overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/50 to-cyan-600/50 flex items-center justify-center group-hover:bg-blue-600/30 transition-all">
                  
                  {/* Play button */}
                  <div className="w-24 h-24 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                    <svg className="w-10 h-10 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>

                  {/* Mock screenshot text */}
                  <div className="absolute bottom-8 left-8 text-left">
                    <div className="text-sm font-medium text-white/80 mb-1">Parcours revendeur</div>
                    <div className="text-2xl font-bold text-white">Compléter, envoyer, suivre</div>
                  </div>

                </div>

              </div>

              {/* Floating badges */}
              <div className="absolute -top-6 -left-6 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-semibold shadow-xl animate-bounce">
                Démo courte et concrète
              </div>
              <div className="absolute -bottom-6 -right-6 px-4 py-2 bg-purple-500 text-white rounded-full text-sm font-semibold shadow-xl">
                3 minutes pour décider
              </div>

            </div>

          </div>
        </section>

        {/* Problems Solved Section - ALL 3 PROBLEMS (Company names removed) */}
        <section id="how" className="py-32 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
          
          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            
            <div className="text-center mb-20">
              <div className="inline-block px-4 py-2 bg-red-50 rounded-full border border-red-200 mb-6">
                <span className="text-sm font-semibold text-red-700">Le chaos que vous connaissez déjà</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Avant Tunimoto vs Avec Tunimoto
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Trois changements qui font la différence dès les premiers dossiers.
              </p>
            </div>

            <div className="space-y-16">
              
              {/* Problem 1: WhatsApp chaos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                <div className="relative">
                  <div className="absolute -top-3 -left-3 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                    ❌
                  </div>
                  <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-6 shadow-lg sm:p-8">
                    <h3 className="text-2xl font-bold text-red-900 mb-2">
                      Avant : WhatsApp chaos
                    </h3>
                    <p className="text-sm text-red-700 font-medium mb-4">
                      Vous cherchez les infos partout
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">1</div>
                        <div>
                          <div className="font-semibold text-slate-900">Messages perdus partout</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Le client relance, l&apos;équipe répond au coup par coup, personne ne sait où en est le dossier.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">2</div>
                        <div>
                          <div className="font-semibold text-slate-900">Documents éparpillés</div>
                          <div className="text-slate-600 text-xs mt-1">
                            CIN, justificatifs et facture restent dispersés entre photos, emails et papiers.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                      <div className="text-xs font-semibold text-red-800">
                        Résultat : trop de relances et trop d&apos;incertitude
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10 animate-pulse">
                    ✓
                  </div>
                  <div className="rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-xl shadow-green-500/20 sm:p-8">
                    <h3 className="text-2xl font-bold text-green-900 mb-2">
                      Avec Tunimoto : un dossier clair
                    </h3>
                    <p className="text-sm text-green-700 font-medium mb-4">
                      Tout le monde sait quoi faire ensuite
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Portail client automatique</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Le client voit les pièces demandées et le statut de son dossier sans vous appeler.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">GED centralisée</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Tous les documents restent regroupés, lisibles et prêts à être envoyés.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-400">
                      <div className="text-xs font-semibold text-green-800">
                        Gain direct : moins de chaos, plus de dossiers qui avancent
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Problem 2: Export Excel chaos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                <div className="relative">
                  <div className="absolute -top-3 -left-3 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                    ❌
                  </div>
                  <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-6 shadow-lg sm:p-8">
                    <h3 className="text-2xl font-bold text-red-900 mb-2">
                      Avant : les pièces manquantes se découvrent trop tard
                    </h3>
                    <p className="text-sm text-red-700 font-medium mb-4">
                      Vous perdez du temps juste pour vérifier
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">1</div>
                        <div>
                          <div className="font-semibold text-slate-900">Export Excel manuel</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Le dossier semble prêt, mais il manque encore une pièce au moment d&apos;envoyer.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">2</div>
                        <div>
                          <div className="font-semibold text-slate-900">Erreurs de saisie</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Vous vérifiez, revérifiez, puis relancez encore pour compléter.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                      <div className="text-xs font-semibold text-red-800">
                        Risque : retard, allers-retours et clients mécontents
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10 animate-pulse">
                    ✓
                  </div>
                  <div className="rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-xl shadow-green-500/20 sm:p-8">
                    <h3 className="text-2xl font-bold text-green-900 mb-2">
                      Avec Tunimoto : ce qui manque saute aux yeux
                    </h3>
                    <p className="text-sm text-green-700 font-medium mb-4">
                      Vous savez immédiatement si le dossier peut partir
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Export automatique</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Le tableau de bord affiche les pièces manquantes sans calcul ni contrôle manuel.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Zéro erreur</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Vous ne perdez plus de temps à préparer un dossier incomplet.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-400">
                      <div className="text-xs font-semibold text-green-800">
                        Résultat : les bons dossiers partent plus vite
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Problem 3: Fournisseur WhatsApp hell */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                <div className="relative">
                  <div className="absolute -top-3 -left-3 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                    ❌
                  </div>
                  <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-6 shadow-lg sm:p-8">
                    <h3 className="text-2xl font-bold text-red-900 mb-2">
                      Avant : l&apos;envoi fournisseur prend trop de temps
                    </h3>
                    <p className="text-sm text-red-700 font-medium mb-4">
                      Chaque transmission demande encore un effort manuel
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">1</div>
                        <div>
                          <div className="font-semibold text-slate-900">10 revendeurs × 10 dossiers/jour</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Le fournisseur reçoit des dossiers incomplets, des formats différents et trop d&apos;allers-retours.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">2</div>
                        <div>
                          <div className="font-semibold text-slate-900">Re-saisie manuelle de tout</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Vous préparez encore les envois un par un alors que le dossier devrait déjà être prêt.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                      <div className="text-xs font-semibold text-red-800">
                        Coût : lenteur, confusion et communication fragile
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10 animate-pulse">
                    ✓
                  </div>
                  <div className="rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-xl shadow-green-500/20 sm:p-8">
                    <h3 className="text-2xl font-bold text-green-900 mb-2">
                      Avec Tunimoto : envoi fournisseur structuré
                    </h3>
                    <p className="text-sm text-green-700 font-medium mb-4">
                      Le dossier part mieux et se suit plus facilement
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Réception automatique standardisée</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Le fournisseur reçoit des dossiers plus propres et plus simples à traiter.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Export Excel bulk en 1 clic</div>
                          <div className="text-slate-600 text-xs mt-1">
                            L&apos;envoi se prépare vite, sans bricoler entre plusieurs outils.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-400">
                      <div className="text-xs font-semibold text-green-800">
                        Impact : moins d&apos;aller-retour et plus de dossiers traités
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* NEW: Social Proof - Testimonials */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Ils nous font confiance
              </h2>
              <p className="text-xl text-slate-600">
                Des retours terrain, ancrés dans le vrai quotidien des revendeurs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Testimonial 1 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:shadow-xl sm:p-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Revendeur · Sousse
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">
                  &quot;On sait enfin quels dossiers sont bloqués et pourquoi. Mon équipe relance mieux, et mes clients appellent beaucoup moins.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                    KM
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Karim M.</div>
                    <div className="text-sm text-slate-500">Moto Karim, Sousse</div>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:shadow-xl sm:p-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Revendeur · Sfax
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">
                  &quot;Le fournisseur reçoit des dossiers plus propres. On perd moins de temps sur les pièces manquantes et les allers-retours.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold">
                    AB
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Ahmed B.</div>
                    <div className="text-sm text-slate-500">Revendeur, Sfax</div>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:shadow-xl sm:p-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Revendeur · Tunis
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">
                  &quot;Le portail client change l&apos;image du magasin. On paraît tout de suite plus organisé, plus sérieux, plus professionnel.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                    MH
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Mohamed H.</div>
                    <div className="text-sm text-slate-500">Revendeur, Tunis</div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* NEW: FAQ Section - REMOVES DOUBTS */}
        <section id="faq" className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Questions fréquentes
              </h2>
              <p className="text-xl text-slate-600">
                Les vraies questions avant de démarrer
              </p>
            </div>

            <div className="space-y-4">
              
              {/* FAQ 1 */}
              <details className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <summary className="flex items-center justify-between p-4 sm:p-6 cursor-pointer list-none group-open:bg-gradient-to-r group-open:from-blue-50 group-open:to-white">
                  <span className="text-lg font-semibold text-slate-900 group-open:text-blue-600">
                    Combien ça coûte ?
                  </span>
                  <svg className="w-5 h-5 text-slate-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-slate-600 leading-relaxed">
                  <strong>59 DT/mois</strong> pour un revendeur avec dossiers illimités, portail client et suivi dossier inclus. Pas d&apos;engagement compliqué.
                </div>
              </details>

              {/* FAQ 2 */}
              <details className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <summary className="flex items-center justify-between p-4 sm:p-6 cursor-pointer list-none group-open:bg-gradient-to-r group-open:from-blue-50 group-open:to-white">
                  <span className="text-lg font-semibold text-slate-900 group-open:text-blue-600">
                    Combien de temps pour démarrer ?
                  </span>
                  <svg className="w-5 h-5 text-slate-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-slate-600 leading-relaxed">
                  <strong>Très vite.</strong> Vous créez votre espace, ajoutez vos premiers dossiers et vous pouvez travailler tout de suite. L&apos;outil est pensé pour être pris en main sans formation lourde.
                </div>
              </details>

              {/* FAQ 3 */}
              <details className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <summary className="flex items-center justify-between p-4 sm:p-6 cursor-pointer list-none group-open:bg-gradient-to-r group-open:from-blue-50 group-open:to-white">
                  <span className="text-lg font-semibold text-slate-900 group-open:text-blue-600">
                    Mes clients peuvent-ils envoyer leurs pièces eux-mêmes ?
                  </span>
                  <svg className="w-5 h-5 text-slate-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-slate-600 leading-relaxed">
                  Oui. Chaque client peut déposer ses documents dans son portail, voir ce qui manque et suivre l&apos;avancement sans passer par WhatsApp.
                </div>
              </details>

              {/* FAQ 4 */}
              <details className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <summary className="flex items-center justify-between p-4 sm:p-6 cursor-pointer list-none group-open:bg-gradient-to-r group-open:from-blue-50 group-open:to-white">
                  <span className="text-lg font-semibold text-slate-900 group-open:text-blue-600">
                    Mon fournisseur peut-il recevoir les dossiers ?
                  </span>
                  <svg className="w-5 h-5 text-slate-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-slate-600 leading-relaxed">
                  Oui. Le dossier peut être préparé proprement pour le fournisseur, avec moins d&apos;allers-retours et une meilleure visibilité sur l&apos;avancement.
                </div>
              </details>

            </div>

          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Commencez avec vos dossiers en attente, pas avec un projet compliqué
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Créez votre espace, ajoutez vos premiers dossiers, et voyez tout de suite ce qui manque et ce qui peut partir.
            </p>
            <Link
              to="/register"
              className="inline-block px-10 py-5 bg-white text-blue-600 text-lg font-bold rounded-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all"
            >
              Créer mon espace revendeur
            </Link>
            <p className="mt-4 text-sm text-blue-200">
              Mise en route rapide · Portail client inclus · Support local
            </p>
          </div>
        </section>
        {/* PROFESSIONAL FOOTER */}
        <footer className="border-t border-blue-900/30 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-slate-300">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BrandLogo imageClassName="h-11 w-auto rounded-lg border border-blue-900/40 bg-white/95 p-1.5" />
                  <p className="text-xl font-bold text-white">Tunimoto<span className="text-blue-400">.tn</span></p>
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-slate-400">
                  Conçu pour les revendeurs et fournisseurs moto en Tunisie, avec un vrai focus sur les dossiers carte grise.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Produit</h4>
                <div className="space-y-3 text-sm">
                  <a href="#roles" className="block text-slate-300 transition hover:text-blue-300">Comment ça marche</a>
                  <a href="#features" className="block text-slate-300 transition hover:text-blue-300">Pour revendeurs</a>
                  <a href="#demo" className="block text-slate-300 transition hover:text-blue-300">Démo produit</a>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Support</h4>
                <div className="space-y-3 text-sm">
                  <Link to="/login" className="block text-slate-300 transition hover:text-blue-300">Connexion</Link>
                  <Link to="/client-portal" className="block text-slate-300 transition hover:text-blue-300">Accès client</Link>
                  <span className="block text-slate-400">Support en français et en arabe</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Légal</h4>
                <div className="space-y-3 text-sm">
                  <Link to="/legal" className="block text-slate-300 transition hover:text-blue-300">Mentions légales</Link>
                  <Link to="/privacy-policy" className="block text-slate-300 transition hover:text-blue-300">Politique de confidentialité</Link>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-blue-900/30 pt-8">
              <p className="text-sm font-medium text-slate-200">{isArabic ? '© 2026 Tunimoto.tn. جميع الحقوق محفوظة.' : '© 2026 Tunimoto.tn. Tous droits réservés.'}</p>
              <p className="mt-2 text-sm text-slate-400">{isArabic ? 'هذا الموقع مُدار من طرف Tunimoto SARL.' : 'Site opéré par Tunimoto SARL.'}</p>
            </div>
          </div>
        </footer>

      </div>

      {/* Animations */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, -20px) rotate(5deg); }
          50% { transform: translate(0, -30px) rotate(0deg); }
          75% { transform: translate(-20px, -20px) rotate(-5deg); }
        }

        @keyframes backgroundFlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 30px) scale(1.05); }
        }

        @keyframes shimmer {
          0%, 100% { filter: drop-shadow(0 0 0px rgba(59, 130, 246, 0)); }
          50% { filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5)); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes tabGlow {
          0%, 100% { box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.5); }
        }
      `}</style>
    </>
  );
}

function ArabicLandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <div>
        <nav className="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-lg border-b border-slate-200/70">
          <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-wrap 2xl:flex-nowrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <BrandLogo
                  imageClassName="h-9 sm:h-10 w-auto rounded-lg border border-slate-200"
                  loading="eager"
                  fetchPriority="high"
                />
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  تونيموتو
                </span>
              </div>
              <span className="hidden sm:inline text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200">
                صنع في تونس
              </span>
            </div>

            <div className="hidden 2xl:flex items-center gap-6 text-sm font-medium shrink-0">
              <a href="#roles" className="text-slate-600 hover:text-blue-600 transition">الأدوار</a>
              <a href="#features" className="text-slate-600 hover:text-blue-600 transition">المزايا</a>
              <a href="#how" className="text-slate-600 hover:text-blue-600 transition">طريقة العمل</a>
            </div>

            {/* Mobile Menu Toggle - Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                to="/client-portal"
                className="px-3 sm:px-5 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-lg shadow-cyan-500/25 transition-all"
              >
                بوابة العميل
              </Link>
              <Link
                to="/login"
                className="px-3 sm:px-5 py-2 border border-slate-300 hover:border-blue-400 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg transition-all"
              >
                تسجيل الدخول
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/25 transition-all"
              >
                إنشاء حساب
              </Link>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation Menu - Arabic */}
        {isMobileMenuOpen && (
          <div className="fixed top-16 left-0 right-0 z-40 lg:hidden bg-white border-b border-slate-200/60 shadow-lg">
            <div className="max-w-[1480px] mx-auto px-4 py-4 space-y-3">
              <a href="#roles" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition" onClick={() => setIsMobileMenuOpen(false)}>
                الأدوار
              </a>
              <a href="#features" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition" onClick={() => setIsMobileMenuOpen(false)}>
                المزايا
              </a>
              <a href="#how" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition" onClick={() => setIsMobileMenuOpen(false)}>
                طريقة العمل
              </a>
              <div className="pt-2 border-t border-slate-200">
                <Link
                  to="/register"
                  className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-center transition"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  إنشاء حساب
                </Link>
              </div>
            </div>
          </div>
        )}
          <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 pt-32 pb-20 relative overflow-hidden">

          {/* Animated background pattern - flowing gradients */}
          <div className="absolute inset-0 opacity-50 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-200 to-transparent rounded-full blur-3xl will-change-transform" style={{animation: 'backgroundFlow 20s ease-in-out infinite'}} />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-cyan-200 to-transparent rounded-full blur-3xl will-change-transform" style={{animation: 'backgroundFlow 20s ease-in-out infinite reverse'}} />
          </div>

          {/* Animated gradient orbs - with floating effect */}
          <div className="hidden sm:block absolute top-20 left-10 w-80 h-80 lg:w-96 lg:h-96 bg-blue-400/30 rounded-full blur-3xl will-change-transform" style={{animation: 'float 8s ease-in-out infinite, pulse 4s ease-in-out infinite'}} />
          <div className="hidden sm:block absolute bottom-20 right-10 w-80 h-80 lg:w-96 lg:h-96 bg-cyan-400/30 rounded-full blur-3xl will-change-transform" style={{animation: 'float 8s ease-in-out infinite 1s, pulse 4s ease-in-out infinite 1s'}} />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg shadow-blue-500/10 border border-blue-100">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                <span className="text-xs font-semibold text-slate-700">
                  يستخدمها اليوم أكثر من 50 بائعاً في تونس
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight">
                <span className="block text-slate-900">أدر ملفات البطاقة الرمادية بسهولة</span>
                <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent bg-[length:200%_100%]" style={{animation: 'gradientShift 3s ease-in-out infinite, shimmer 6s ease-in-out infinite'}}>
                  منصة واحدة بدل الفوضى
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-3xl mx-auto leading-relaxed">
                منصة متكاملة للبائع والمورد والعميل: فواتير، تتبع ملفات، وبوابة عميل في مكان واحد.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl shadow-md border border-slate-200">
                  <span className="text-2xl font-bold text-blue-600">2-3h</span>
                  <span className="text-slate-600 text-xs">وقت موفّر يومياً</span>
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl shadow-md border border-slate-200">
                  <span className="text-2xl font-bold text-emerald-600">48h</span>
                  <span className="text-slate-600 text-xs">متوسط إنهاء الملف</span>
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl shadow-md border border-slate-200">
                  <span className="text-2xl font-bold text-cyan-600">100%</span>
                  <span className="text-slate-600 text-xs">سير عمل رقمي</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  to="/register"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl shadow-xl shadow-blue-500/25 transition-all"
                >
                  ابدأ الآن
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 text-lg font-semibold rounded-xl border-2 border-slate-200 transition-all"
                >
                  تجربة المنصة
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">إدارة المخزون وملفات كارت جري</h3>
                <p className="text-sm text-slate-600">تتبع مخزونك وملفاتك بطريقة منظمة وفعالة من مكان واحد.</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">تصدير سريع</h3>
                <p className="text-sm text-slate-600">جهّز ملفاتك بضغطة واحدة مع تنسيق واضح يقلل الأخطاء والتأخير.</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">بوابة عميل احترافية</h3>
                <p className="text-sm text-slate-600">العميل يرفع الوثائق ويتابع حالته بنفسه دون مكالمات متكررة.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="roles" className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">ثلاثة أدوار في منصة واحدة</h2>
              <p className="text-lg text-slate-600">تعاون كامل بين المورد والبائع والعميل ضمن نفس النظام.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">البائع</h3>
                <p className="text-sm text-slate-700">يدير المبيعات والملفات والفواتير ومتابعة العملاء من لوحة واحدة.</p>
              </article>
              <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">العميل</h3>
                <p className="text-sm text-slate-700">يرفع وثائقه ويتابع تقدم ملفه بدقة وشفافية.</p>
              </article>
              <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">المورد</h3>
                <p className="text-sm text-slate-700">يراقب الملفات الواردة ويعالجها بسرعة مع رؤية واضحة للحالة.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="how" className="py-20 bg-slate-50 border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">كيف تبدأ؟</h2>
              <p className="text-lg text-slate-600">ثلاث خطوات فقط للانطلاق.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm font-semibold text-blue-600 mb-2">الخطوة 1</p>
                <h3 className="text-lg font-bold text-slate-900 mb-2">أنشئ حسابك</h3>
                <p className="text-sm text-slate-600">سجّل بياناتك الأساسية في دقائق.</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm font-semibold text-blue-600 mb-2">الخطوة 2</p>
                <h3 className="text-lg font-bold text-slate-900 mb-2">أضف فريقك وملفاتك</h3>
                <p className="text-sm text-slate-600">ابدأ بتنظيم العملاء والوثائق داخل المنصة.</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm font-semibold text-blue-600 mb-2">الخطوة 3</p>
                <h3 className="text-lg font-bold text-slate-900 mb-2">تابع النتائج</h3>
                <p className="text-sm text-slate-600">راقب الأداء وقلل الأخطاء والتأخير بشكل واضح.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="py-24 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">جاهز لرقمنة عملك؟</h2>
            <p className="text-xl text-blue-100 mb-8">انضم إلى المنصة وابدأ إدارة ملفاتك باحترافية أعلى.</p>
            <Link
              to="/register"
              className="inline-block px-10 py-5 bg-white text-blue-600 text-lg font-bold rounded-xl shadow-2xl hover:scale-105 transition-all"
            >
              إنشاء حسابي الآن
            </Link>
            <p className="mt-4 text-sm text-blue-200">إعداد سريع - بدون بطاقة بنكية - دعم متواصل</p>
          </div>
        </section>

        <footer className="border-t border-blue-900/30 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-slate-300">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BrandLogo imageClassName="h-11 w-auto rounded-lg border border-blue-900/40 bg-white/95 p-1.5" />
                  <p className="text-xl font-bold text-white">تونيموتو</p>
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-slate-400">
                  منصة تونسية لإدارة ملفات الدراجات والفواتير ومتابعة العملاء بأمان.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">القسم القانوني</h4>
                <div className="space-y-3 text-sm">
                  <Link to="/legal" className="block text-slate-300 transition hover:text-blue-300">المعلومات القانونية</Link>
                  <Link to="/privacy-policy" className="block text-slate-300 transition hover:text-blue-300">سياسة الخصوصية</Link>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">وسائل الدفع</h4>
                <p className="text-sm text-slate-400">نقبل وسائل دفع آمنة.</p>
              </div>
            </div>

            <div className="mt-10 border-t border-blue-900/30 pt-8">
              <p className="text-sm font-medium text-slate-200">© 2026 تونيموتو.tn. جميع الحقوق محفوظة.</p>
              <p className="mt-2 text-sm text-slate-400">هذا الموقع مُدار من طرف تونيموتو SARL.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default LandingPage;


