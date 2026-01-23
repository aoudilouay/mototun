import { useState } from 'react';

function FournisseurDashboardPage() {
  const [timeRange, setTimeRange] = useState('month');

  // Mock data
  const stats = [
    {
      label: 'Revendeurs actifs',
      value: '24',
      change: '+3',
      changeType: 'positive',
      icon: '🏪',
      color: 'blue'
    },
    {
      label: 'Motos vendues ce mois',
      value: '156',
      change: '+22%',
      changeType: 'positive',
      icon: '🏍️',
      color: 'green'
    },
    {
      label: 'Cartes grises en attente',
      value: '12',
      change: '-5',
      changeType: 'negative',
      icon: '📄',
      color: 'amber'
    },
    {
      label: 'Revenu total',
      value: '1.2M TND',
      change: '+18%',
      changeType: 'positive',
      icon: '💰',
      color: 'purple'
    }
  ];

  const topRevendeurs = [
    { id: 1, name: 'Karim Moto Shop', city: 'Sousse', sales: 42, revenue: '280,500 TND', avatar: 'KM', status: 'premium' },
    { id: 2, name: 'Moto Plus Tunis', city: 'Tunis', sales: 38, revenue: '245,800 TND', avatar: 'MP', status: 'premium' },
    { id: 3, name: 'Speed Bikes Sfax', city: 'Sfax', sales: 35, revenue: '198,600 TND', avatar: 'SB', status: 'standard' },
    { id: 4, name: 'Moto Star Nabeul', city: 'Nabeul', sales: 28, revenue: '156,400 TND', avatar: 'MS', status: 'standard' },
    { id: 5, name: 'Racing Moto', city: 'Monastir', sales: 22, revenue: '142,300 TND', avatar: 'RM', status: 'new' }
  ];

  const recentCarteGrise = [
    { id: 'CG-001', revendeur: 'Karim Moto Shop', client: 'Ahmed Ben Salah', motorcycle: 'Yamaha R125', status: 'pending', date: 'Il y a 2h' },
    { id: 'CG-002', revendeur: 'Moto Plus Tunis', client: 'Mohamed Ali', motorcycle: 'Honda CBR 250', status: 'in_progress', date: 'Il y a 4h' },
    { id: 'CG-003', revendeur: 'Speed Bikes Sfax', client: 'Fatma Trabelsi', motorcycle: 'Suzuki GSX-S150', status: 'completed', date: 'Hier' }
  ];

  const recentOrders = [
    { id: 'ORD-1024', revendeur: 'Karim Moto Shop', items: '3 motos', amount: '42,500 TND', status: 'processing', date: 'Il y a 1h' },
    { id: 'ORD-1023', revendeur: 'Moto Plus Tunis', items: '5 motos', amount: '68,900 TND', status: 'shipped', date: 'Il y a 3h' },
    { id: 'ORD-1022', revendeur: 'Speed Bikes Sfax', items: '2 motos', amount: '28,400 TND', status: 'delivered', date: 'Hier' }
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      shipped: 'bg-purple-100 text-purple-700 border-purple-200',
      delivered: 'bg-green-100 text-green-700 border-green-200',
      premium: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
      standard: 'bg-blue-100 text-blue-700',
      new: 'bg-green-100 text-green-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      amber: 'bg-amber-50 text-amber-600 border-amber-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Fournisseur</h1>
          <p className="text-slate-600 mt-1">Vue d'ensemble de votre réseau de revendeurs</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
            📥 Exporter rapport
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${getColorClasses(stat.color)} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                stat.changeType === 'positive'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Revendeurs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">🏆 Top Revendeurs</h2>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              Voir tout
            </button>
          </div>
          
          <div className="space-y-4">
            {topRevendeurs.map((revendeur, index) => (
              <div
                key={revendeur.id}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors group border border-slate-100"
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0 ${
                  index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                  index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                  index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {revendeur.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 truncate">{revendeur.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(revendeur.status)}`}>
                      {revendeur.status === 'premium' && '⭐ Premium'}
                      {revendeur.status === 'standard' && 'Standard'}
                      {revendeur.status === 'new' && '🆕 Nouveau'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{revendeur.city}</p>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{revendeur.sales} ventes</p>
                  <p className="text-sm text-green-600 font-semibold">{revendeur.revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          
          {/* Network Performance */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
            <h3 className="text-lg font-bold mb-2">Performance Réseau</h3>
            <p className="text-3xl font-black mb-4">🎯 Excellent!</p>
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="opacity-90">Objectif mensuel</span>
                  <span className="font-semibold">156/150</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2" style={{width: '104%', maxWidth: '100%'}}></div>
                </div>
              </div>
              <p className="text-xs opacity-75 mt-3">
                Votre réseau a dépassé l'objectif de 4%! 🚀
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Actions rapides</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                <span>📊</span>
                <span>Exporter Excel</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">
                <span>➕</span>
                <span>Nouveau revendeur</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
                <span>📧</span>
                <span>Email groupé</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Recent Activity Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Carte Grise */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">📄 Cartes grises récentes</h3>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            {recentCarteGrise.map((cg) => (
              <div key={cg.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-lg">
                  📁
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{cg.id}</p>
                  <p className="text-xs text-slate-600">{cg.revendeur} • {cg.client}</p>
                  <p className="text-xs text-slate-500 mt-1">{cg.motorcycle}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(cg.status)}`}>
                    {cg.status === 'pending' && '⏳'}
                    {cg.status === 'in_progress' && '⚙️'}
                    {cg.status === 'completed' && '✓'}
                  </span>
                  <span className="text-xs text-slate-400">{cg.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">📦 Commandes récentes</h3>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-lg">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{order.id}</p>
                  <p className="text-xs text-slate-600">{order.revendeur}</p>
                  <p className="text-xs text-slate-500 mt-1">{order.items} • {order.amount}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {order.status === 'processing' && '⚙️'}
                    {order.status === 'shipped' && '🚚'}
                    {order.status === 'delivered' && '✓'}
                  </span>
                  <span className="text-xs text-slate-400">{order.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

export default FournisseurDashboardPage;
