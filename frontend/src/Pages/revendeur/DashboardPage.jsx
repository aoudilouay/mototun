import { useState } from 'react';

function DashboardPage() {
  const [timeRange, setTimeRange] = useState('month');

  // Mock data
  const stats = [
    {
      label: 'Ventes ce mois',
      value: '24',
      change: '+12%',
      changeType: 'positive',
      icon: '💰',
      color: 'blue'
    },
    {
      label: 'Clients actifs',
      value: '156',
      change: '+8%',
      changeType: 'positive',
      icon: '👥',
      color: 'green'
    },
    {
      label: 'Carte grise en attente',
      value: '5',
      change: '-3',
      changeType: 'negative',
      icon: '📄',
      color: 'amber'
    },
    {
      label: 'Revenu mensuel',
      value: '42,850 TND',
      change: '+18%',
      changeType: 'positive',
      icon: '📊',
      color: 'purple'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'sale',
      title: 'Nouvelle vente',
      description: 'Ahmed a acheté Yamaha R125',
      time: 'Il y a 2h',
      icon: '🎉',
      iconBg: 'bg-green-100 text-green-600'
    },
    {
      id: 2,
      type: 'carte_grise',
      title: 'Carte grise validée',
      description: 'Dossier #CG-2024-156 complété',
      time: 'Il y a 4h',
      icon: '✓',
      iconBg: 'bg-blue-100 text-blue-600'
    },
    {
      id: 3,
      type: 'client',
      title: 'Nouveau client',
      description: 'Mohamed inscrit avec succès',
      time: 'Il y a 5h',
      icon: '👤',
      iconBg: 'bg-purple-100 text-purple-600'
    },
    {
      id: 4,
      type: 'payment',
      title: 'Paiement reçu',
      description: 'Karim - 8,500 TND',
      time: 'Hier',
      icon: '💳',
      iconBg: 'bg-cyan-100 text-cyan-600'
    },
    {
      id: 5,
      type: 'document',
      title: 'Documents uploadés',
      description: 'Client Fatma - CIN + Photo',
      time: 'Hier',
      icon: '📎',
      iconBg: 'bg-amber-100 text-amber-600'
    }
  ];

  const quickActions = [
    { label: 'Ajouter Client', icon: '👥', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Ajouter Moto', icon: '🏍️', color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Générer Facture', icon: '📄', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Exporter Excel', icon: '📤', color: 'bg-cyan-600 hover:bg-cyan-700' }
  ];

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
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Bienvenue sur votre espace revendeur</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
            📥 Télécharger rapport
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
        
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Activité récente</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Voir tout
            </button>
          </div>
          
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-lg ${activity.iconBg} flex items-center justify-center text-lg flex-shrink-0`}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {activity.title}
                  </p>
                  <p className="text-sm text-slate-600 truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          
          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Actions rapides</h2>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className={`w-full flex items-center gap-3 px-4 py-3 ${action.color} text-white font-semibold rounded-lg transition-all transform hover:-translate-y-0.5 shadow-lg`}
                >
                  <span className="text-xl">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Performance Card */}
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-bold mb-2">Performance du mois</h3>
            <p className="text-3xl font-black mb-4">🎯 Excellent!</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="opacity-90">Objectif ventes</span>
                <span className="font-semibold">24/20</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-white rounded-full h-2" style={{width: '120%', maxWidth: '100%'}}></div>
              </div>
              <p className="text-xs opacity-75 mt-3">
                Vous avez dépassé votre objectif de 20%! 🚀
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default DashboardPage;
