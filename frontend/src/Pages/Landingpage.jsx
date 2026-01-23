import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

function LandingPage() {
  const [preloaderVisible, setPreloaderVisible] = useState(true);
  const [activeRole, setActiveRole] = useState('revendeur');
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPreloaderVisible(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const switchRole = (role) => {
    setShowSkeleton(true);
    setActiveRole('');
    
    setTimeout(() => {
      setShowSkeleton(false);
      setActiveRole(role);
    }, 300);
  };

  const roleUrls = {
    revendeur: 'tunimoto.tn/revendeur/dashboard',
    client: 'tunimoto.tn/client/portal/ABC123',
    fournisseur: 'tunimoto.tn/fournisseur/dashboard'
  };

  return (
    <>
      {/* Preloader */}
      <div
        className={`fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-[9999] transition-opacity duration-500 ${
          preloaderVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50 animate-pulse">
            <span className="text-white font-black text-3xl tracking-wider">TM</span>
          </div>
          <div className="text-blue-400 text-sm font-semibold tracking-[3px] uppercase">
            Tunimoto
          </div>
          <div className="w-52 h-1 bg-white/10 rounded-full mt-5 mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-full animate-[loading_1.5s_ease-in-out_forwards]" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-opacity duration-800 ${preloaderVisible ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <span className="text-white font-bold text-sm">TM</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Tunimoto
                </span>
              </div>
              <span className="hidden sm:inline text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200">
                🇹🇳 Made in Tunisia
              </span>
            </div>

            {/* Middle Nav Links */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#roles" className="text-slate-600 hover:text-blue-600 transition">Rôles</a>
              <a href="#features" className="text-slate-600 hover:text-blue-600 transition">Fonctionnalités</a>
              <a href="#how" className="text-slate-600 hover:text-blue-600 transition">Problèmes résolus</a>
            </div>

            {/* Right Side - 3 Buttons */}
            <div className="flex items-center gap-3">
              {/* Button 1: Client Portal - MORE PROMINENT */}
              <Link
                to="/client-portal"
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-600/30 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
                <span className="hidden sm:inline">Espace Client</span>
                <span className="sm:hidden">Client</span>
              </Link>

              {/* Button 2: Sign In */}
              <Link
                to="/login"
                className="px-5 py-2 border border-slate-300 hover:border-blue-400 text-slate-700 text-sm font-semibold rounded-lg transition-all"
              >
                Connexion
              </Link>

              {/* Button 3: Sign Up */}
              <Link
                to="/register"
                className="hidden sm:inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-600/30 transition-all"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section - ENHANCED with animated orbs */}
        <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 pt-32 pb-20 relative overflow-hidden">
          
          {/* Animated gradient orbs */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto space-y-8">
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg shadow-blue-500/10 border border-blue-100">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Déjà utilisé par 50+ revendeurs en Tunisie
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight">
                <span className="block text-slate-900">
                  Gérez 100+ cartes grises
                </span>
                <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradientShift_4s_ease-in-out_infinite]">
                  sans WhatsApp, sans chaos
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-3xl mx-auto leading-relaxed">
                La plateforme tout-en-un pour <strong>revendeurs, clients et fournisseurs</strong>. 
                Factures pro, portail client, export Excel en 1 clic.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border border-slate-200">
                  <span className="text-2xl font-bold text-blue-600">2-3h</span>
                  <span className="text-slate-600 text-xs">gagnées/jour</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border border-slate-200">
                  <span className="text-2xl font-bold text-emerald-600">48h</span>
                  <span className="text-slate-600 text-xs">carte grise traitée</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border border-slate-200">
                  <span className="text-2xl font-bold text-cyan-600">100%</span>
                  <span className="text-slate-600 text-xs">digital</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  to="/register"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl shadow-xl shadow-blue-500/25 hover:shadow-blue-600/40 transition-all transform hover:-translate-y-0.5"
                >
                  🚀 Commencer maintenant
                </Link>
                <button className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 text-lg font-semibold rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-all">
                  📞 Réserver une démo
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Installation en 5 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Sans carte bancaire</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Support en français & arabe</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* NEW: Animated Stats Section - TRUST BUILDER */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              
              <div className="text-center group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  50+
                </div>
                <div className="text-sm text-slate-600 font-medium">Revendeurs actifs</div>
              </div>

              <div className="text-center group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  2.5k+
                </div>
                <div className="text-sm text-slate-600 font-medium">Cartes grises traitées</div>
              </div>

              <div className="text-center group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  48h
                </div>
                <div className="text-sm text-slate-600 font-medium">Délai moyen</div>
              </div>

              <div className="text-center group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  99%
                </div>
                <div className="text-sm text-slate-600 font-medium">Satisfaction client</div>
              </div>

            </div>
          </div>
        </section>

        {/* Roles Section - WITH INTERACTIVE TABS */}
        <section id="roles" className="py-32 bg-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{backgroundImage: 'repeating-linear-gradient(0deg, #60a5fa 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #60a5fa 0px, transparent 1px, transparent 40px)'}} />
          </div>

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
              <div className="inline-block px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
                <span className="text-sm font-semibold text-blue-700">🇹🇳 3 rôles · 1 plateforme</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900">
                من المستورد للعميل، الكل متصل
              </h2>
              <p className="text-xl text-slate-600">
                Du fournisseur au client final, toute la chaîne carte grise connectée en temps réel.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              
              {/* Left: Role tabs */}
              <div className="space-y-4">
                
                <button 
                  onClick={() => switchRole('revendeur')} 
                  className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 group ${
                    activeRole === 'revendeur' 
                      ? 'bg-gradient-to-r from-blue-50 to-white border-blue-500 shadow-lg shadow-blue-500/20' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🏪
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        Revendeur
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Vous</span>
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Tableau de bord complet : gestion stock, factures automatiques, suivi carte grise de tous vos clients en un clic.
                      </p>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => switchRole('client')} 
                  className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 group ${
                    activeRole === 'client' 
                      ? 'bg-gradient-to-r from-cyan-50 to-white border-cyan-500 shadow-lg shadow-cyan-500/20' 
                      : 'bg-white border-slate-200 hover:border-cyan-300 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-cyan-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      👤
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Client</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Portail personnel : télécharger facture, uploader documents CIN/carte grise, suivre le statut en temps réel.
                      </p>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => switchRole('fournisseur')} 
                  className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 group ${
                    activeRole === 'fournisseur' 
                      ? 'bg-gradient-to-r from-blue-50 to-white border-blue-500 shadow-lg shadow-blue-500/20' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🏭
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        Fournisseur
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">Importateur</span>
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Vue globale : tous vos revendeurs, export Excel bulk, validation carte grise centralisée.
                      </p>
                    </div>
                  </div>
                </button>

              </div>

              {/* Right: Dynamic mockup */}
              <div className="relative">
                
                <div className="bg-white/70 backdrop-blur-lg border border-blue-200 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden">
                  
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

                  <div className="bg-white p-6 min-h-[400px]">
                    
                    {showSkeleton && (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-8 bg-slate-200 rounded w-3/4" />
                        <div className="h-4 bg-slate-200 rounded w-1/2" />
                        <div className="grid grid-cols-3 gap-3">
                          <div className="h-16 bg-slate-200 rounded" />
                          <div className="h-16 bg-slate-200 rounded" />
                          <div className="h-16 bg-slate-200 rounded" />
                        </div>
                      </div>
                    )}

                    {activeRole === 'revendeur' && !showSkeleton && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900">Tableau de bord revendeur</h4>
                            <p className="text-xs text-slate-500">Gérez vos ventes et cartes grises</p>
                          </div>
                          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            12 dossiers actifs
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div className="text-2xl font-bold text-blue-600">8</div>
                            <div className="text-xs text-slate-600">Payés</div>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                            <div className="text-2xl font-bold text-amber-600">3</div>
                            <div className="text-xs text-slate-600">En attente</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="text-2xl font-bold text-green-600">5</div>
                            <div className="text-xs text-slate-600">Complétés</div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">AZ</div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">Ahmed · Moto 125cc</div>
                                <div className="text-xs text-slate-500">Docs reçus · Payé</div>
                              </div>
                            </div>
                            <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ Prêt</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeRole === 'client' && !showSkeleton && (
                      <div className="space-y-4">
                        <div className="text-center py-8">
                          <div className="text-6xl mb-4">🔐</div>
                          <h4 className="text-lg font-bold text-slate-900 mb-2">Portail client</h4>
                          <p className="text-sm text-slate-600 mb-6">Votre espace personnel sécurisé</p>
                          
                          <div className="max-w-sm mx-auto space-y-3">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-left">
                              <div className="text-xs text-slate-500 mb-1">📄 Votre facture</div>
                              <div className="text-sm font-semibold text-slate-900">Moto_125cc_Ahmed.pdf</div>
                              <button className="mt-2 text-xs text-blue-600 font-medium">Télécharger</button>
                            </div>
                            
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-left">
                              <div className="text-xs text-slate-500 mb-1">✓ Statut carte grise</div>
                              <div className="text-sm font-semibold text-green-700">Documents reçus · Validation en cours</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeRole === 'fournisseur' && !showSkeleton && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900">Dashboard Fournisseur</h4>
                            <p className="text-xs text-slate-500">Vue globale · Tous revendeurs</p>
                          </div>
                          <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
                            ⬇ Export Excel
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <div className="text-2xl font-bold text-slate-900">24</div>
                            <div className="text-xs text-slate-600">Revendeurs actifs</div>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div className="text-2xl font-bold text-blue-600">156</div>
                            <div className="text-xs text-slate-600">Cartes grises ce mois</div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                <div className="absolute -top-4 -right-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full text-xs font-semibold shadow-xl shadow-blue-500/30 animate-bounce">
                  ⚡ Temps réel
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-xl text-slate-600">
                Une plateforme complète pour gérer vos ventes, factures et cartes grises.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div className="p-8 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:shadow-xl hover:border-blue-300 transition-all group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏪</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Boutique en ligne pro
                </h3>
                <p className="text-slate-600">
                  Showroom personnalisé avec votre logo, couleurs et catalogue motos.
                </p>
              </div>

              <div className="p-8 bg-gradient-to-br from-cyan-50 to-white rounded-2xl border border-cyan-100 hover:shadow-xl hover:border-cyan-300 transition-all group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Factures automatiques
                </h3>
                <p className="text-slate-600">
                  Génération PDF avec logo et QR code en 1 clic.
                </p>
              </div>

              <div className="p-8 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:shadow-xl hover:border-blue-300 transition-all group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔐</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Portail client sécurisé
                </h3>
                <p className="text-slate-600">
                  Chaque client suit sa carte grise en temps réel.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* NEW: Video Demo Section - ENGAGEMENT BOOSTER */}
        <section className="py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
          
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
          </div>

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            
            <div className="text-center mb-16">
              <div className="inline-block px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full mb-6">
                <span className="text-sm font-semibold text-blue-300">🎥 Voir en action</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                3 minutes pour tout comprendre
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Découvrez comment Tunimoto transforme votre gestion quotidienne
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
                    <div className="text-sm font-medium text-white/80 mb-1">Dashboard Tunimoto</div>
                    <div className="text-2xl font-bold text-white">Gestion complète en temps réel</div>
                  </div>

                </div>

              </div>

              {/* Floating badges */}
              <div className="absolute -top-6 -left-6 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-semibold shadow-xl animate-bounce">
                ✓ Sans engagement
              </div>
              <div className="absolute -bottom-6 -right-6 px-4 py-2 bg-purple-500 text-white rounded-full text-sm font-semibold shadow-xl">
                🎯 Installation 5min
              </div>

            </div>

          </div>
        </section>

        {/* Problems Solved Section - ALL 3 PROBLEMS (Company names removed) */}
        <section id="how" className="py-32 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            
            <div className="text-center mb-20">
              <div className="inline-block px-4 py-2 bg-red-50 rounded-full border border-red-200 mb-6">
                <span className="text-sm font-semibold text-red-700">❌ Les problèmes que vous connaissez trop bien</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Avant Tunimoto vs Avec Tunimoto
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Découvrez comment nous transformons le chaos quotidien en système professionnel.
              </p>
            </div>

            <div className="space-y-16">
              
              {/* Problem 1: WhatsApp chaos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                <div className="relative">
                  <div className="absolute -top-3 -left-3 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                    ❌
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-8 border-2 border-red-200 shadow-lg">
                    <h3 className="text-2xl font-bold text-red-900 mb-2">
                      Avant : WhatsApp chaos
                    </h3>
                    <p className="text-sm text-red-700 font-medium mb-4">
                      Le cauchemar quotidien du revendeur tunisien
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">1</div>
                        <div>
                          <div className="font-semibold text-slate-900">Messages perdus partout</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Client : "وين وصلت carte grise متاعي؟" × 50 fois/jour.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">2</div>
                        <div>
                          <div className="font-semibold text-slate-900">Documents éparpillés</div>
                          <div className="text-slate-600 text-xs mt-1">
                            CIN dans votre galerie photo, bon de livraison sur papier froissé.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                      <div className="text-xs font-semibold text-red-800">
                        ⏱️ Temps perdu : 2-3 heures/jour
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10 animate-pulse">
                    ✓
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-300 shadow-xl shadow-green-500/20">
                    <h3 className="text-2xl font-bold text-green-900 mb-2">
                      Avec Tunimoto : Zéro stress
                    </h3>
                    <p className="text-sm text-green-700 font-medium mb-4">
                      Automatisation complète
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Portail client automatique</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Le client suit sa carte grise en temps réel. Plus de "وين وصلت".
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">GED centralisée</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Tous les documents dans un seul dossier sécurisé.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-400">
                      <div className="text-xs font-semibold text-green-800">
                        ✨ Temps gagné : 2-3 heures/jour
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
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-8 border-2 border-red-200 shadow-lg">
                    <h3 className="text-2xl font-bold text-red-900 mb-2">
                      Avant : Galère fournisseur
                    </h3>
                    <p className="text-sm text-red-700 font-medium mb-4">
                      L'enfer administratif avec votre importateur
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">1</div>
                        <div>
                          <div className="font-semibold text-slate-900">Export Excel manuel</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Vous copiez-collez 50 dossiers un par un. 2h de travail répétitif.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">2</div>
                        <div>
                          <div className="font-semibold text-slate-900">Erreurs de saisie</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Numéro CIN mal copié → carte grise rejetée → client furieux.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                      <div className="text-xs font-semibold text-red-800">
                        ⚠️ Risque : Retards & clients mécontents
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10 animate-pulse">
                    ✓
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-300 shadow-xl shadow-green-500/20">
                    <h3 className="text-2xl font-bold text-green-900 mb-2">
                      Avec Tunimoto : Export 1 clic
                    </h3>
                    <p className="text-sm text-green-700 font-medium mb-4">
                      Connexion directe avec votre fournisseur
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Export automatique</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Bouton "Envoyer" → Excel généré au bon format. 10 secondes.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Zéro erreur</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Données copiées automatiquement. Format respecté 100%.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-400">
                      <div className="text-xs font-semibold text-green-800">
                        🚀 Résultat : Carte grise 2x plus rapide
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
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-8 border-2 border-red-200 shadow-lg">
                    <h3 className="text-2xl font-bold text-red-900 mb-2">
                      Avant : Fournisseur noyé dans WhatsApp
                    </h3>
                    <p className="text-sm text-red-700 font-medium mb-4">
                      Importateur reçoit 100+ dossiers/jour sur WhatsApp
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">1</div>
                        <div>
                          <div className="font-semibold text-slate-900">10 revendeurs × 10 dossiers/jour</div>
                          <div className="text-slate-600 text-xs mt-1">
                            100 messages WhatsApp avec photos floues, formats différents.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-red-200">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">2</div>
                        <div>
                          <div className="font-semibold text-slate-900">Re-saisie manuelle de tout</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Employé recopie chaque CIN, numéro châssis. 5 min/dossier = 8h/jour perdu.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                      <div className="text-xs font-semibold text-red-800">
                        💸 Coût : 2-3 employés temps plein juste pour WhatsApp
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10 animate-pulse">
                    ✓
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-300 shadow-xl shadow-green-500/20">
                    <h3 className="text-2xl font-bold text-green-900 mb-2">
                      Avec Tunimoto : Dashboard centralisé
                    </h3>
                    <p className="text-sm text-green-700 font-medium mb-4">
                      Tous vos revendeurs connectés en 1 plateforme
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Réception automatique standardisée</div>
                          <div className="text-slate-600 text-xs mt-1">
                            Format unique validé → données propres & structurées.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-green-300">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div>
                          <div className="font-semibold text-slate-900">Export Excel bulk en 1 clic</div>
                          <div className="text-slate-600 text-xs mt-1">
                            156 dossiers → Excel prêt. Plus de re-saisie manuelle.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-400">
                      <div className="text-xs font-semibold text-green-800">
                        📊 Économie : -70% du temps admin, 1 seul employé suffit
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
          <div className="max-w-6xl mx-auto px-6">
            
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Ils nous font confiance
              </h2>
              <p className="text-xl text-slate-600">
                Plus de 50 revendeurs tunisiens ont déjà transformé leur business
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Testimonial 1 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">
                  "Tunimoto m'a fait gagner 3h par jour. Mes clients sont ravis de suivre leur carte grise en temps réel sans m'appeler 10 fois."
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
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">
                  "Export en 1 clic, factures pro automatiques... Je me demande comment j'ai fait sans ça avant. خلاص WhatsApp !"
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
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">
                  "L'image pro que ça donne à mes clients... Ils pensent que je suis une grande concession. Ça change tout niveau confiance."
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
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Questions fréquentes
              </h2>
              <p className="text-xl text-slate-600">
                Tout ce que vous devez savoir avant de commencer
              </p>
            </div>

            <div className="space-y-4">
              
              {/* FAQ 1 */}
              <details className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-lg font-semibold text-slate-900 group-open:text-blue-600">
                    💰 C'est combien par mois ?
                  </span>
                  <svg className="w-5 h-5 text-slate-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                  À partir de <strong>99 TND/mois</strong> pour un revendeur (jusqu'à 50 dossiers/mois). 
                  Formule fournisseur sur devis. Pas de frais cachés, pas d'engagement.
                </div>
              </details>

              {/* FAQ 2 */}
              <details className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-lg font-semibold text-slate-900 group-open:text-blue-600">
                    ⏱️ Installation difficile ?
                  </span>
                  <svg className="w-5 h-5 text-slate-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                  <strong>5 minutes chrono.</strong> Inscription → Upload logo → Import catalogue → C'est prêt. 
                  On vous accompagne en vidéo + support WhatsApp en direct.
                </div>
              </details>

              {/* FAQ 3 */}
              <details className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-lg font-semibold text-slate-900 group-open:text-blue-600">
                    📱 Mes données sont sécurisées ?
                  </span>
                  <svg className="w-5 h-5 text-slate-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                  <strong>100% sécurisé.</strong> Serveurs en Europe, backup quotidien, chiffrement SSL. 
                  Conformité RGPD. Vos données = votre propriété, on n'y touche jamais.
                </div>
              </details>

              {/* FAQ 4 */}
              <details className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-lg font-semibold text-slate-900 group-open:text-blue-600">
                    🤝 Compatible avec mon fournisseur ?
                  </span>
                  <svg className="w-5 h-5 text-slate-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                  <strong>Oui, totalement.</strong> Export Excel format standard en 1 clic. 
                  On travaille déjà avec plusieurs importateurs tunisiens. Intégration API possible.
                </div>
              </details>

              {/* FAQ 5 */}
              <details className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-lg font-semibold text-slate-900 group-open:text-blue-600">
                    🎓 Formation incluse ?
                  </span>
                  <svg className="w-5 h-5 text-slate-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                  <strong>Oui !</strong> Onboarding vidéo 30min, tutoriels en français/arabe, 
                  support WhatsApp illimité. Si besoin, session Zoom 1-to-1 offerte.
                </div>
              </details>

            </div>

          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prêt à digitaliser votre business ?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Rejoignez 50+ revendeurs tunisiens qui ont déjà transformé leur façon de travailler.
            </p>
            <Link
              to="/register"
              className="inline-block px-10 py-5 bg-white text-blue-600 text-lg font-bold rounded-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all"
            >
              🚀 Créer mon compte
            </Link>
            <p className="mt-4 text-sm text-blue-200">
              Installation en 5 minutes · Sans carte bancaire · Support 7j/7
            </p>
          </div>
        </section>

        {/* PROFESSIONAL FOOTER */}
        <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-16">
            
            {/* Top Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
              
              {/* Column 1: Brand */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">TM</span>
                  </div>
                  <span className="text-xl font-bold text-white">Tunimoto</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  La plateforme digitale pour revendeurs de motos en Tunisie. 
                  Gérez ventes, factures et cartes grises en un seul endroit.
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                    🇹🇳 Made in Tunisia
                  </span>
                </div>
              </div>

              {/* Column 2: Produit */}
              <div>
                <h4 className="text-white font-semibold mb-4">Produit</h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a href="#features" className="hover:text-blue-400 transition">Fonctionnalités</a>
                  </li>
                  <li>
                    <a href="#roles" className="hover:text-blue-400 transition">Pour qui ?</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Tarifs</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Démo en ligne</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Changelog</a>
                  </li>
                </ul>
              </div>

              {/* Column 3: Support */}
              <div>
                <h4 className="text-white font-semibold mb-4">Support</h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Centre d'aide</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Documentation</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Tutoriels vidéo</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Contact</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">WhatsApp Support</a>
                  </li>
                </ul>
              </div>

              {/* Column 4: Entreprise */}
              <div>
                <h4 className="text-white font-semibold mb-4">Entreprise</h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">À propos</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Blog</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Carrières</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Partenaires</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-400 transition">Presse</a>
                  </li>
                </ul>
              </div>

            </div>

            {/* Divider */}
            <div className="border-t border-slate-800 pt-8">
              
              {/* Bottom Section */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* Left: Copyright */}
                <div className="text-sm text-slate-500">
                  © 2026 Tunimoto Tunisia. Tous droits réservés.
                </div>

                {/* Center: Links */}
                <div className="flex items-center gap-6 text-sm">
                  <a href="#" className="hover:text-blue-400 transition">
                    Confidentialité
                  </a>
                  <a href="#" className="hover:text-blue-400 transition">
                    CGU
                  </a>
                  <a href="#" className="hover:text-blue-400 transition">
                    Mentions légales
                  </a>
                </div>

                {/* Right: Social Icons */}
                <div className="flex items-center gap-4">
                  <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-all group">
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-all group">
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                    </svg>
                  </a>
                  <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-all group">
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-all group">
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                </div>

              </div>

            </div>

          </div>
        </footer>

      </div>

      {/* Animations */}
      <style>{`
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
}

export default LandingPage;
