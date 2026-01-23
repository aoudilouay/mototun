import { useState } from 'react';

function FournisseursPage() {
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock fournisseurs data
  const fournisseurs = [
    {
      id: 1,
      name: 'Zimota',
      logo: '🏢',
      color: 'blue',
      type: 'premium',
      description: 'Leader tunisien de la distribution de motos Yamaha',
      phone: '+216 73 XXX XXX',
      email: 'contact@zimota.tn',
      address: 'Avenue Habib Bourguiba, Sousse',
      website: 'www.zimota.tn',
      brands: ['Yamaha', 'Sym', 'Kymco'],
      status: 'active',
      rating: 4.9,
      totalOrders: 42,
      pendingOrders: 3,
      completedOrders: 39,
      totalSpent: '450,000 TND',
      lastOrder: '2 jours',
      responseTime: '2-4h',
      carteGriseService: true,
      deliveryTime: '3-5 jours',
      paymentTerms: '30 jours',
      discount: '5%',
      contactPerson: {
        name: 'Mohamed Ali',
        position: 'Responsable Commercial',
        phone: '+216 XX XXX XXX',
        email: 'mohamed.ali@zimota.tn'
      }
    },
    {
      id: 2,
      name: 'Forza',
      logo: '🏭',
      color: 'red',
      type: 'premium',
      description: 'Importateur exclusif Honda et Kawasaki en Tunisie',
      phone: '+216 71 XXX XXX',
      email: 'info@forza.tn',
      address: 'Rue de la Liberté, Tunis',
      website: 'www.forza.tn',
      brands: ['Honda', 'Kawasaki', 'Piaggio'],
      status: 'active',
      rating: 4.8,
      totalOrders: 38,
      pendingOrders: 2,
      completedOrders: 36,
      totalSpent: '380,000 TND',
      lastOrder: '1 semaine',
      responseTime: '3-6h',
      carteGriseService: true,
      deliveryTime: '5-7 jours',
      paymentTerms: '45 jours',
      discount: '3%',
      contactPerson: {
        name: 'Ahmed Trabelsi',
        position: 'Directeur Commercial',
        phone: '+216 YY YYY YYY',
        email: 'ahmed.trabelsi@forza.tn'
      }
    },
    {
      id: 3,
      name: 'GSM',
      logo: '🏪',
      color: 'green',
      type: 'standard',
      description: 'Spécialiste Suzuki et pièces détachées',
      phone: '+216 74 XXX XXX',
      email: 'contact@gsm.tn',
      address: 'Avenue Hedi Chaker, Sfax',
      website: 'www.gsm-moto.tn',
      brands: ['Suzuki', 'Benelli'],
      status: 'active',
      rating: 4.7,
      totalOrders: 28,
      pendingOrders: 1,
      completedOrders: 27,
      totalSpent: '210,000 TND',
      lastOrder: '3 jours',
      responseTime: '4-8h',
      carteGriseService: true,
      deliveryTime: '7-10 jours',
      paymentTerms: '30 jours',
      discount: '2%',
      contactPerson: {
        name: 'Karim Ben Salem',
        position: 'Chef des Ventes',
        phone: '+216 ZZ ZZZ ZZZ',
        email: 'karim@gsm.tn'
      }
    },
    {
      id: 4,
      name: 'Sanya',
      logo: '🚀',
      color: 'purple',
      type: 'standard',
      description: 'Distributeur de motos sportives premium',
      phone: '+216 72 XXX XXX',
      email: 'hello@sanya.tn',
      address: 'Route de Tunis, Monastir',
      website: 'www.sanya-motors.tn',
      brands: ['KTM', 'Aprilia', 'Vespa'],
      status: 'active',
      rating: 4.6,
      totalOrders: 18,
      pendingOrders: 2,
      completedOrders: 16,
      totalSpent: '156,000 TND',
      lastOrder: '5 jours',
      responseTime: '6-12h',
      carteGriseService: false,
      deliveryTime: '10-14 jours',
      paymentTerms: '15 jours',
      discount: '0%',
      contactPerson: {
        name: 'Salah Eddine',
        position: 'Responsable Ventes',
        phone: '+216 AA AAA AAA',
        email: 'salah@sanya.tn'
      }
    }
  ];

  const getColorClasses = (color, type = 'bg') => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        gradient: 'from-blue-500 to-cyan-600',
        badge: 'bg-blue-100 text-blue-700 border-blue-200'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        gradient: 'from-red-500 to-pink-600',
        badge: 'bg-red-100 text-red-700 border-red-200'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        gradient: 'from-green-500 to-emerald-600',
        badge: 'bg-green-100 text-green-700 border-green-200'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        gradient: 'from-purple-500 to-indigo-600',
        badge: 'bg-purple-100 text-purple-700 border-purple-200'
      }
    };
    return colors[color]?.[type] || colors.blue[type];
  };

  const filteredFournisseurs = fournisseurs.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.brands.some(b => b.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: fournisseurs.length,
    active: fournisseurs.filter(f => f.status === 'active').length,
    totalOrders: fournisseurs.reduce((sum, f) => sum + f.totalOrders, 0),
    pendingOrders: fournisseurs.reduce((sum, f) => sum + f.pendingOrders, 0),
    totalSpent: '1,196,000 TND'
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🏢 Mes Fournisseurs</h1>
          <p className="text-slate-600 mt-1">Gérez vos partenaires fournisseurs</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg shadow-xl transition-all transform hover:-translate-y-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau Fournisseur
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg transition-all">
          <p className="text-sm text-slate-600 mb-1">Total</p>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5 border border-green-200 hover:shadow-lg transition-all">
          <p className="text-sm text-green-700 mb-1">Actifs</p>
          <p className="text-3xl font-bold text-green-900">{stats.active}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-5 border border-blue-200 hover:shadow-lg transition-all">
          <p className="text-sm text-blue-700 mb-1">Commandes</p>
          <p className="text-3xl font-bold text-blue-900">{stats.totalOrders}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 hover:shadow-lg transition-all">
          <p className="text-sm text-amber-700 mb-1">En attente</p>
          <p className="text-3xl font-bold text-amber-900">{stats.pendingOrders}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-5 border border-purple-200 hover:shadow-lg transition-all">
          <p className="text-sm text-purple-700 mb-1">Total dépensé</p>
          <p className="text-lg font-bold text-purple-900">{stats.totalSpent}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom ou marque..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Fournisseurs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredFournisseurs.map((fournisseur) => (
          <div
            key={fournisseur.id}
            className={`bg-white rounded-2xl border-2 ${getColorClasses(fournisseur.color, 'border')} hover:shadow-2xl transition-all cursor-pointer overflow-hidden group`}
            onClick={() => setSelectedFournisseur(fournisseur)}
          >
            
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${getColorClasses(fournisseur.color, 'gradient')} p-6 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 text-9xl opacity-10 transform translate-x-8 -translate-y-4">
                {fournisseur.logo}
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-4xl shadow-lg">
                      {fournisseur.logo}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white mb-1">{fournisseur.name}</h3>
                      {fournisseur.type === 'premium' && (
                        <span className="px-3 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-bold">
                          ⭐ Premium
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                    <span className="text-amber-300 text-lg">⭐</span>
                    <span className="font-bold text-white">{fournisseur.rating}</span>
                  </div>
                </div>
                <p className="text-white/90 text-sm">{fournisseur.description}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              
              {/* Brands */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Marques disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {fournisseur.brands.map((brand, idx) => (
                    <span key={idx} className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getColorClasses(fournisseur.color, 'badge')}`}>
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`${getColorClasses(fournisseur.color, 'bg')} rounded-lg p-3 border ${getColorClasses(fournisseur.color, 'border')}`}>
                  <p className={`text-xs ${getColorClasses(fournisseur.color, 'text')} mb-1`}>Commandes</p>
                  <p className={`text-xl font-bold ${getColorClasses(fournisseur.color, 'text')}`}>{fournisseur.totalOrders}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="text-xs text-amber-700 mb-1">En attente</p>
                  <p className="text-xl font-bold text-amber-900">{fournisseur.pendingOrders}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-green-700 mb-1">Livrées</p>
                  <p className="text-xl font-bold text-green-900">{fournisseur.completedOrders}</p>
                </div>
              </div>

              {/* Total Spent */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-purple-700">Total dépensé</span>
                  <span className="text-xl font-black text-purple-900">{fournisseur.totalSpent}</span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">⏱️</span>
                  <span className="text-slate-600">Réponse: <strong>{fournisseur.responseTime}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">🚚</span>
                  <span className="text-slate-600">Livraison: <strong>{fournisseur.deliveryTime}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">💳</span>
                  <span className="text-slate-600">Paiement: <strong>{fournisseur.paymentTerms}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">💰</span>
                  <span className="text-slate-600">Remise: <strong className="text-green-600">{fournisseur.discount}</strong></span>
                </div>
              </div>

              {/* Carte Grise Service */}
              {fournisseur.carteGriseService && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-semibold text-blue-700">Service carte grise disponible</span>
                </div>
              )}

              {/* Last Order */}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-500">Dernière commande</span>
                <span className="font-semibold text-slate-900">Il y a {fournisseur.lastOrder}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFournisseur(fournisseur);
                  }}
                  className={`flex-1 py-3 bg-gradient-to-r ${getColorClasses(fournisseur.color, 'gradient')} text-white font-bold rounded-lg transition-all transform hover:-translate-y-0.5 shadow-lg`}
                >
                  Voir détails
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContactModal(true);
                    setSelectedFournisseur(fournisseur);
                  }}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`tel:${fournisseur.phone}`);
                  }}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
              </div>

            </div>

          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedFournisseur && !showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className={`sticky top-0 bg-gradient-to-r ${getColorClasses(selectedFournisseur.color, 'gradient')} p-8 flex items-start justify-between`}>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl shadow-2xl">
                  {selectedFournisseur.logo}
                </div>
                <div className="text-white">
                  <h2 className="text-4xl font-black mb-2">{selectedFournisseur.name}</h2>
                  <p className="text-white/90 mb-2">{selectedFournisseur.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                      ⭐ {selectedFournisseur.rating}
                    </span>
                    {selectedFournisseur.type === 'premium' && (
                      <span className="px-3 py-1 bg-amber-400 text-amber-900 rounded-full text-sm font-bold">
                        Premium Partner
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFournisseur(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className={`${getColorClasses(selectedFournisseur.color, 'bg')} rounded-xl p-5 border ${getColorClasses(selectedFournisseur.color, 'border')}`}>
                  <p className={`text-sm ${getColorClasses(selectedFournisseur.color, 'text')} mb-1`}>Total commandes</p>
                  <p className={`text-3xl font-bold ${getColorClasses(selectedFournisseur.color, 'text')}`}>{selectedFournisseur.totalOrders}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                  <p className="text-sm text-amber-700 mb-1">En attente</p>
                  <p className="text-3xl font-bold text-amber-900">{selectedFournisseur.pendingOrders}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Livrées</p>
                  <p className="text-3xl font-bold text-green-900">{selectedFournisseur.completedOrders}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                  <p className="text-sm text-purple-700 mb-1">Total dépensé</p>
                  <p className="text-2xl font-bold text-purple-900">{selectedFournisseur.totalSpent}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 text-lg mb-4">📞 Coordonnées</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Téléphone</p>
                    <p className="font-semibold text-slate-900">{selectedFournisseur.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="font-semibold text-slate-900">{selectedFournisseur.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Adresse</p>
                    <p className="font-semibold text-slate-900">{selectedFournisseur.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Site web</p>
                    <a href={`https://${selectedFournisseur.website}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
                      {selectedFournisseur.website}
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-bold text-slate-900 text-lg mb-4">👤 Personne de contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-700 mb-1">Nom</p>
                    <p className="font-bold text-slate-900">{selectedFournisseur.contactPerson.name}</p>
                    <p className="text-sm text-slate-600">{selectedFournisseur.contactPerson.position}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 mb-1">Contact</p>
                    <p className="font-semibold text-slate-900">{selectedFournisseur.contactPerson.phone}</p>
                    <p className="text-sm text-slate-600">{selectedFournisseur.contactPerson.email}</p>
                  </div>
                </div>
              </div>

              {/* Services & Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                  <h4 className="font-bold text-slate-900 mb-3">📦 Services</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <svg className={`w-5 h-5 ${selectedFournisseur.carteGriseService ? 'text-green-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-slate-700">Carte grise</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-slate-700">Livraison: {selectedFournisseur.deliveryTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-slate-700">Réponse: {selectedFournisseur.responseTime}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                  <h4 className="font-bold text-slate-900 mb-3">💳 Conditions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Paiement:</span>
                      <span className="font-bold text-slate-900">{selectedFournisseur.paymentTerms}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Remise:</span>
                      <span className="font-bold text-green-600">{selectedFournisseur.discount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Note:</span>
                      <span className="font-bold text-amber-600">⭐ {selectedFournisseur.rating}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Nouvelle commande
                </button>
                <button
                  onClick={() => {
                    setShowContactModal(true);
                  }}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contacter
                </button>
                <button
                  onClick={() => window.open(`tel:${selectedFournisseur.phone}`)}
                  className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Appeler
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && selectedFournisseur && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Contacter {selectedFournisseur.name}</h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Sujet</label>
                <input
                  type="text"
                  placeholder="Demande de prix, Information produit..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                <textarea
                  rows={6}
                  placeholder="Votre message..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default FournisseursPage;
