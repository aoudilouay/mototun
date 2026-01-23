import { useState } from 'react';

function RevendeursPage() {
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRevendeur, setSelectedRevendeur] = useState(null);

  // Mock revendeurs data
  const revendeurs = [
    {
      id: 1,
      name: 'Karim Moto Shop',
      avatar: 'KM',
      city: 'Sousse',
      phone: '+216 XX XXX XXX',
      email: 'karim@motoshop.tn',
      status: 'premium',
      joinDate: '10 Jan 2024',
      totalSales: 42,
      monthSales: 12,
      totalRevenue: '280,500 TND',
      pendingCarteGrise: 3,
      completedCarteGrise: 39,
      rating: 4.9,
      lastOrder: '2h ago'
    },
    {
      id: 2,
      name: 'Moto Plus Tunis',
      avatar: 'MP',
      city: 'Tunis',
      phone: '+216 YY YYY YYY',
      email: 'contact@motoplus.tn',
      status: 'premium',
      joinDate: '15 Dec 2023',
      totalSales: 38,
      monthSales: 10,
      totalRevenue: '245,800 TND',
      pendingCarteGrise: 2,
      completedCarteGrise: 36,
      rating: 4.8,
      lastOrder: '4h ago'
    },
    {
      id: 3,
      name: 'Speed Bikes Sfax',
      avatar: 'SB',
      city: 'Sfax',
      phone: '+216 ZZ ZZZ ZZZ',
      email: 'info@speedbikes.tn',
      status: 'standard',
      joinDate: '20 Feb 2024',
      totalSales: 35,
      monthSales: 9,
      totalRevenue: '198,600 TND',
      pendingCarteGrise: 4,
      completedCarteGrise: 31,
      rating: 4.7,
      lastOrder: 'Yesterday'
    },
    {
      id: 4,
      name: 'Moto Star Nabeul',
      avatar: 'MS',
      city: 'Nabeul',
      phone: '+216 AA AAA AAA',
      email: 'contact@motostar.tn',
      status: 'standard',
      joinDate: '05 Mar 2024',
      totalSales: 28,
      monthSales: 7,
      totalRevenue: '156,400 TND',
      pendingCarteGrise: 2,
      completedCarteGrise: 26,
      rating: 4.6,
      lastOrder: '2 days ago'
    },
    {
      id: 5,
      name: 'Racing Moto',
      avatar: 'RM',
      city: 'Monastir',
      phone: '+216 BB BBB BBB',
      email: 'hello@racingmoto.tn',
      status: 'new',
      joinDate: '15 Jan 2026',
      totalSales: 22,
      monthSales: 22,
      totalRevenue: '142,300 TND',
      pendingCarteGrise: 1,
      completedCarteGrise: 21,
      rating: 4.9,
      lastOrder: '1h ago'
    }
  ];

  const getStatusBadge = (status) => {
    const badges = {
      premium: { label: '⭐ Premium', class: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-none' },
      standard: { label: 'Standard', class: 'bg-blue-100 text-blue-700 border-blue-200' },
      new: { label: '🆕 Nouveau', class: 'bg-green-100 text-green-700 border-green-200' },
      inactive: { label: 'Inactif', class: 'bg-slate-100 text-slate-700 border-slate-200' }
    };
    return badges[status];
  };

  const filteredRevendeurs = revendeurs.filter(rev => {
    const matchesStatus = filterStatus === 'all' || rev.status === filterStatus;
    const matchesSearch = 
      rev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rev.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🏪 Mes Revendeurs</h1>
          <p className="text-slate-600 mt-1">Gérez votre réseau de partenaires</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-xl transition-all transform hover:-translate-y-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau Revendeur
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <p className="text-sm text-slate-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{revendeurs.length}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
          <p className="text-sm text-amber-700 mb-1">Premium</p>
          <p className="text-2xl font-bold text-amber-900">{revendeurs.filter(r => r.status === 'premium').length}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
          <p className="text-sm text-blue-700 mb-1">Standard</p>
          <p className="text-2xl font-bold text-blue-900">{revendeurs.filter(r => r.status === 'standard').length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
          <p className="text-sm text-green-700 mb-1">Nouveaux</p>
          <p className="text-2xl font-bold text-green-900">{revendeurs.filter(r => r.status === 'new').length}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
          <p className="text-sm text-purple-700 mb-1">CA Total</p>
          <p className="text-lg font-bold text-purple-900">1.2M TND</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
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
                placeholder="Rechercher par nom ou ville..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Tous statuts</option>
            <option value="premium">⭐ Premium</option>
            <option value="standard">Standard</option>
            <option value="new">🆕 Nouveaux</option>
          </select>

          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-purple-50 text-purple-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 border-l border-slate-200 ${viewMode === 'list' ? 'bg-purple-50 text-purple-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRevendeurs.map((rev) => {
            const statusBadge = getStatusBadge(rev.status);
            return (
              <div
                key={rev.id}
                className="bg-white rounded-xl border-2 border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all cursor-pointer p-6"
                onClick={() => setSelectedRevendeur(rev)}
              >
                
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {rev.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{rev.name}</h3>
                      <p className="text-sm text-slate-600">{rev.city}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.class}`}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-700 mb-1">Ventes ce mois</p>
                    <p className="text-xl font-bold text-blue-900">{rev.monthSales}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-700 mb-1">Total ventes</p>
                    <p className="text-xl font-bold text-green-900">{rev.totalSales}</p>
                  </div>
                </div>

                {/* Revenue */}
                <div className="bg-purple-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-purple-700 mb-1">Chiffre d'affaires</p>
                  <p className="text-lg font-bold text-purple-900">{rev.totalRevenue}</p>
                </div>

                {/* Rating & Last Order */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <span className="text-amber-500">⭐</span>
                    <span className="font-semibold">{rev.rating}</span>
                  </div>
                  <span className="text-slate-500">Dernière commande: {rev.lastOrder}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors">
                    Voir détails
                  </button>
                  <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* List View - Similar structure to Clients table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Revendeur</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ventes (mois)</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">CA Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">CG En attente</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Note</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRevendeurs.map((rev) => {
                const statusBadge = getStatusBadge(rev.status);
                return (
                  <tr key={rev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                          {rev.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{rev.name}</p>
                          <p className="text-sm text-slate-600">{rev.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-blue-600">{rev.monthSales}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{rev.totalRevenue}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        rev.pendingCarteGrise > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {rev.pendingCarteGrise}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-500">⭐</span>
                        <span className="font-semibold">{rev.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedRevendeur(rev)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Revendeur Detail Modal */}
      {selectedRevendeur && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-8 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-purple-600 font-black text-2xl">
                  {selectedRevendeur.avatar}
                </div>
                <div>
                  <h2 className="text-3xl font-black mb-1">{selectedRevendeur.name}</h2>
                  <p className="text-purple-100">{selectedRevendeur.city} • Membre depuis {selectedRevendeur.joinDate}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRevendeur(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <p className="text-sm text-blue-700 mb-1">Ventes ce mois</p>
                  <p className="text-3xl font-bold text-blue-900">{selectedRevendeur.monthSales}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Total ventes</p>
                  <p className="text-3xl font-bold text-green-900">{selectedRevendeur.totalSales}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                  <p className="text-sm text-purple-700 mb-1">Chiffre d'affaires</p>
                  <p className="text-2xl font-bold text-purple-900">{selectedRevendeur.totalRevenue}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-4">📞 Informations de contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Téléphone</p>
                    <p className="font-semibold text-slate-900">{selectedRevendeur.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="font-semibold text-slate-900">{selectedRevendeur.email}</p>
                  </div>
                </div>
              </div>

              {/* Carte Grise Status */}
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                <h3 className="font-bold text-slate-900 mb-4">📄 Cartes grises</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-amber-700 mb-1">En attente</p>
                    <p className="text-2xl font-bold text-amber-900">{selectedRevendeur.pendingCarteGrise}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 mb-1">Complétées</p>
                    <p className="text-2xl font-bold text-green-900">{selectedRevendeur.completedCarteGrise}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
                  📧 Envoyer email
                </button>
                <button className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors">
                  📊 Voir rapport complet
                </button>
                <button className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">
                  ✏️ Modifier
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default RevendeursPage;
