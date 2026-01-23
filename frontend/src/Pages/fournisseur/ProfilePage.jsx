import { useState } from 'react';

function FournisseurProfilePage() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, edit, settings, security
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Mock user data
  const [userData, setUserData] = useState({
    // Personal Info
    fullName: 'Mohamed Benali',
    email: 'contact@zimota.tn',
    phone: '+216 XX XXX XXX',
    avatar: 'ZM',
    
    // Business Info
    businessName: 'Zimota Tunisia',
    businessType: 'Fournisseur Premium',
    registrationNumber: 'FOUR-2020-001',
    taxId: 'TN987654321',
    address: 'Zone Industrielle, Route de Sousse',
    city: 'Tunis',
    postalCode: '1000',
    country: 'Tunisie',
    
    // Account Info
    joinDate: '15 Mars 2020',
    status: 'active',
    tier: 'premium',
    
    // Stats
    totalRevendeurs: 42,
    activeRevendeurs: 38,
    totalRevenue: '2,450,000 TND',
    totalOrders: 156,
    completedCarteGrise: 142,
    rating: 4.8,
    
    // Settings
    notifications: {
      email: true,
      sms: true,
      newOrders: true,
      paymentReceived: true,
      carteGriseRequests: true,
      revendeurMessages: true,
      stockAlerts: true,
      promotions: false
    },
    
    // Featured Products
    products: [
      { id: 1, name: 'Yamaha R125', stock: 15, sales: 45 },
      { id: 2, name: 'Yamaha MT-03', stock: 8, sales: 32 },
      { id: 3, name: 'Yamaha R3', stock: 5, sales: 28 },
      { id: 4, name: 'Yamaha MT-07', stock: 3, sales: 18 }
    ],
    
    // Top Revendeurs
    topRevendeurs: [
      { id: 1, name: 'Karim Moto Shop', avatar: 'KM', city: 'Sousse', orders: 28, revenue: '180,500 TND' },
      { id: 2, name: 'Moto Plus Tunis', avatar: 'MP', city: 'Tunis', orders: 24, revenue: '165,000 TND' },
      { id: 3, name: 'Speed Bikes Sfax', avatar: 'SB', city: 'Sfax', orders: 19, revenue: '142,000 TND' },
      { id: 4, name: 'Racing Moto', avatar: 'RM', city: 'Monastir', orders: 16, revenue: '125,500 TND' }
    ]
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: '👤' },
    { id: 'edit', label: 'Modifier profil', icon: '✏️' },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' },
    { id: 'security', label: 'Sécurité', icon: '🔒' }
  ];

  const handleSave = () => {
    console.log('Saving profile:', userData);
    setIsEditing(false);
  };

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Les mots de passe ne correspondent pas!');
      return;
    }
    console.log('Changing password');
    setShowPasswordModal(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header with Cover */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl overflow-hidden shadow-xl">
        <div className="h-32 relative">
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)'
            }}></div>
          </div>
        </div>
        
        <div className="px-8 pb-8 -mt-16 relative">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-5xl font-black shadow-2xl border-4 border-white">
                {userData.avatar}
              </div>
              <button className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-white">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-black">{userData.fullName}</h1>
                {userData.tier === 'premium' && (
                  <span className="px-3 py-1 bg-amber-400 text-amber-900 rounded-full text-sm font-bold">
                    ⭐ Premium
                  </span>
                )}
                <span className="px-3 py-1 bg-green-400 text-green-900 rounded-full text-sm font-bold">
                  ✓ Actif
                </span>
              </div>
              <p className="text-xl text-purple-100 mb-1">{userData.businessName}</p>
              <p className="text-purple-200">🏢 {userData.businessType} • Membre depuis {userData.joinDate}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
                <p className="text-3xl font-black text-white">{userData.totalRevendeurs}</p>
                <p className="text-xs text-purple-100 mt-1">Revendeurs</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
                <p className="text-2xl font-black text-white">⭐ {userData.rating}</p>
                <p className="text-xs text-purple-100 mt-1">Note</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center gap-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">💰</span>
                  <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-sm text-blue-700 mb-1">Chiffre d'affaires</p>
                <p className="text-3xl font-black text-blue-900">{userData.totalRevenue}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">🏪</span>
                  <svg className="w-8 h-8 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                <p className="text-sm text-green-700 mb-1">Revendeurs actifs</p>
                <p className="text-3xl font-black text-green-900">{userData.activeRevendeurs}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">📦</span>
                  <svg className="w-8 h-8 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                  </svg>
                </div>
                <p className="text-sm text-purple-700 mb-1">Commandes totales</p>
                <p className="text-3xl font-black text-purple-900">{userData.totalOrders}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">📄</span>
                  <svg className="w-8 h-8 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-sm text-amber-700 mb-1">CG complétées</p>
                <p className="text-3xl font-black text-amber-900">{userData.completedCarteGrise}</p>
              </div>
            </div>

            {/* Business Info & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Business Info */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  Informations de l'entreprise
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Nom de l'entreprise</p>
                    <p className="font-semibold text-slate-900">{userData.businessName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Type</p>
                    <p className="font-semibold text-slate-900">{userData.businessType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">N° d'enregistrement</p>
                    <p className="font-semibold text-slate-900 font-mono">{userData.registrationNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">ID Fiscal</p>
                    <p className="font-semibold text-slate-900 font-mono">{userData.taxId}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500 mb-1">Adresse</p>
                    <p className="font-semibold text-slate-900">{userData.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Ville</p>
                    <p className="font-semibold text-slate-900">{userData.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Code postal</p>
                    <p className="font-semibold text-slate-900">{userData.postalCode}</p>
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="text-2xl">🏍️</span>
                  Top Produits
                </h2>
                <div className="space-y-3">
                  {userData.products.map((product, index) => (
                    <div key={product.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{product.name}</p>
                        <p className="text-xs text-slate-500">Stock: {product.stock} • Ventes: {product.sales}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Top Revendeurs */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                Top Revendeurs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {userData.topRevendeurs.map((revendeur, index) => (
                  <div key={revendeur.id} className="relative">
                    {index === 0 && (
                      <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg z-10">
                        <span className="text-xl">👑</span>
                      </div>
                    )}
                    <div className={`p-4 rounded-xl border-2 ${
                      index === 0 ? 'border-amber-400 bg-amber-50' :
                      index === 1 ? 'border-slate-300 bg-slate-50' :
                      index === 2 ? 'border-orange-300 bg-orange-50' :
                      'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                          {revendeur.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{revendeur.name}</p>
                          <p className="text-xs text-slate-500">{revendeur.city}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">Commandes</span>
                          <span className="text-sm font-bold text-purple-600">{revendeur.orders}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">Revenu</span>
                          <span className="text-sm font-bold text-green-600">{revendeur.revenue}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">📞</span>
                Contact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 mb-1">Email</p>
                    <p className="font-semibold text-slate-900">{userData.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 mb-1">Téléphone</p>
                    <p className="font-semibold text-slate-900">{userData.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 mb-1">Ville</p>
                    <p className="font-semibold text-slate-900">{userData.city}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* EDIT PROFILE TAB */}
        {activeTab === 'edit' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Modifier le profil</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    ✏️ Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      💾 Sauvegarder
                    </button>
                  </div>
                )}
              </div>

              {/* Personal Info Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Informations personnelles</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nom complet</label>
                    <input
                      type="text"
                      value={userData.fullName}
                      onChange={(e) => setUserData({...userData, fullName: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({...userData, email: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={userData.phone}
                      onChange={(e) => setUserData({...userData, phone: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Ville</label>
                    <input
                      type="text"
                      value={userData.city}
                      onChange={(e) => setUserData({...userData, city: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Business Info Section */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Informations de l'entreprise</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nom de l'entreprise</label>
                    <input
                      type="text"
                      value={userData.businessName}
                      onChange={(e) => setUserData({...userData, businessName: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">ID Fiscal</label>
                    <input
                      type="text"
                      value={userData.taxId}
                      onChange={(e) => setUserData({...userData, taxId: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Adresse</label>
                    <input
                      type="text"
                      value={userData.address}
                      onChange={(e) => setUserData({...userData, address: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Code postal</label>
                    <input
                      type="text"
                      value={userData.postalCode}
                      onChange={(e) => setUserData({...userData, postalCode: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Pays</label>
                    <input
                      type="text"
                      value={userData.country}
                      onChange={(e) => setUserData({...userData, country: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="max-w-3xl mx-auto space-y-8">
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Paramètres</h2>
                <p className="text-slate-600">Gérez vos préférences et notifications</p>
              </div>

              {/* Notifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-2xl">🔔</span>
                  Notifications
                </h3>
                
                <div className="space-y-3">
                  <NotificationToggle
                    label="Notifications par email"
                    description="Recevez des mises à jour par email"
                    checked={userData.notifications.email}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, email: checked}
                    })}
                  />
                  
                  <NotificationToggle
                    label="Notifications SMS"
                    description="Recevez des alertes par SMS"
                    checked={userData.notifications.sms}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, sms: checked}
                    })}
                  />
                  
                  <NotificationToggle
                    label="Nouvelles commandes"
                    description="Alerte quand un revendeur passe commande"
                    checked={userData.notifications.newOrders}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, newOrders: checked}
                    })}
                  />
                  
                  <NotificationToggle
                    label="Paiements reçus"
                    description="Confirmation de réception de paiement"
                    checked={userData.notifications.paymentReceived}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, paymentReceived: checked}
                    })}
                  />
                  
                  <NotificationToggle
                    label="Demandes carte grise"
                    description="Nouvelles demandes de carte grise"
                    checked={userData.notifications.carteGriseRequests}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, carteGriseRequests: checked}
                    })}
                  />
                  
                  <NotificationToggle
                    label="Messages revendeurs"
                    description="Notifications pour les messages"
                    checked={userData.notifications.revendeurMessages}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, revendeurMessages: checked}
                    })}
                  />

                  <NotificationToggle
                    label="Alertes de stock"
                    description="Stock faible ou rupture"
                    checked={userData.notifications.stockAlerts}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, stockAlerts: checked}
                    })}
                  />
                  
                  <NotificationToggle
                    label="Offres et promotions"
                    description="Recevez nos offres promotionnelles"
                    checked={userData.notifications.promotions}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, promotions: checked}
                    })}
                  />
                </div>
              </div>

              {/* Language & Region */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-2xl">🌍</span>
                  Langue et région
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Langue</label>
                    <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                      <option>Français</option>
                      <option>العربية</option>
                      <option>English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Fuseau horaire</label>
                    <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                      <option>GMT+1 (Tunis)</option>
                      <option>GMT (UTC)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-6 border-t border-slate-200">
                <button
                  onClick={handleSave}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                >
                  💾 Sauvegarder les paramètres
                </button>
              </div>

            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="max-w-3xl mx-auto space-y-8">
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Sécurité</h2>
                <p className="text-slate-600">Gérez la sécurité de votre compte</p>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-2xl">🔐</span>
                  Mot de passe
                </h3>
                
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-semibold text-slate-900 mb-1">Mot de passe</p>
                    <p className="text-sm text-slate-600">Dernière modification: Il y a 45 jours</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Modifier
                  </button>
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  Authentification à deux facteurs
                </h3>
                
                <div className="flex items-center justify-between p-6 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-green-900 mb-1">Activée</p>
                      <p className="text-sm text-green-700">Votre compte est sécurisé avec 2FA</p>
                    </div>
                  </div>
                  <button className="px-6 py-2 bg-white hover:bg-green-50 text-green-700 font-semibold rounded-lg transition-colors border border-green-300">
                    Configurer
                  </button>
                </div>
              </div>

              {/* Sessions */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-2xl">💻</span>
                  Sessions actives
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Windows - Chrome</p>
                        <p className="text-sm text-slate-600">Tunis, Tunisie • Actif maintenant</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                      Actuelle
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-400 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Mobile - Safari</p>
                        <p className="text-sm text-slate-600">Il y a 1 jour</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-colors">
                      Déconnecter
                    </button>
                  </div>
                </div>

                <button className="w-full py-3 border-2 border-red-200 hover:bg-red-50 text-red-600 font-semibold rounded-lg transition-colors">
                  Déconnecter toutes les autres sessions
                </button>
              </div>

              {/* Danger Zone */}
              <div className="space-y-4 pt-6 border-t border-red-200">
                <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  Zone de danger
                </h3>
                
                <div className="p-6 bg-red-50 rounded-lg border-2 border-red-200">
                  <p className="font-semibold text-slate-900 mb-2">Supprimer le compte</p>
                  <p className="text-sm text-slate-600 mb-4">
                    La suppression de votre compte est permanente et ne peut pas être annulée.
                  </p>
                  <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors">
                    Supprimer mon compte
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Changer le mot de passe</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mot de passe actuel</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Notification Toggle Component
function NotificationToggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors">
      <div>
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-8 rounded-full transition-colors ${
          checked ? 'bg-purple-600' : 'bg-slate-300'
        }`}
      >
        <div
          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
            checked ? 'transform translate-x-6' : ''
          }`}
        />
      </button>
    </div>
  );
}

export default FournisseurProfilePage;
