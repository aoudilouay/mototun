import { useState } from 'react';

function ProfilePage() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, edit, settings, security
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Mock user data
  const [userData, setUserData] = useState({
    // Personal Info
    fullName: 'Karim Mohamed',
    email: 'karim@motoshop.tn',
    phone: '+216 XX XXX XXX',
    avatar: 'KM',
    
    // Business Info
    businessName: 'Karim Moto Shop',
    businessType: 'Revendeur Premium',
    registrationNumber: 'REV-2024-001',
    taxId: 'TN123456789',
    address: 'Avenue Habib Bourguiba, Sousse',
    city: 'Sousse',
    postalCode: '4000',
    
    // Account Info
    joinDate: '10 Jan 2024',
    status: 'active',
    tier: 'premium',
    
    // Stats
    totalSales: 42,
    totalRevenue: '280,500 TND',
    activeClients: 38,
    completedCarteGrise: 39,
    rating: 4.9,
    
    // Settings
    notifications: {
      email: true,
      sms: false,
      carteGriseUpdates: true,
      invoiceReminders: true,
      promotions: false
    },
    
    // Connected Fournisseurs
    fournisseurs: [
      { id: 1, name: 'Zimota', logo: '🏢', status: 'active', since: 'Jan 2024' },
      { id: 2, name: 'Forza', logo: '🏭', status: 'active', since: 'Feb 2024' },
      { id: 3, name: 'GSM', logo: '🏪', status: 'active', since: 'Mar 2024' },
      { id: 4, name: 'Sanya', logo: '🚀', status: 'pending', since: 'Jan 2026' }
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
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl overflow-hidden shadow-xl">
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
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-5xl font-black shadow-2xl border-4 border-white">
                {userData.avatar}
              </div>
              <button className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <p className="text-xl text-blue-100 mb-1">{userData.businessName}</p>
              <p className="text-blue-200">📍 {userData.city} • Membre depuis {userData.joinDate}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
                <p className="text-3xl font-black text-white">{userData.totalSales}</p>
                <p className="text-xs text-blue-100 mt-1">Ventes</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
                <p className="text-2xl font-black text-white">⭐ {userData.rating}</p>
                <p className="text-xs text-blue-100 mt-1">Note</p>
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
                ? 'bg-blue-600 text-white shadow-lg'
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
                  <span className="text-3xl">👥</span>
                  <svg className="w-8 h-8 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                <p className="text-sm text-green-700 mb-1">Clients actifs</p>
                <p className="text-3xl font-black text-green-900">{userData.activeClients}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">📄</span>
                  <svg className="w-8 h-8 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-sm text-purple-700 mb-1">CG complétées</p>
                <p className="text-3xl font-black text-purple-900">{userData.completedCarteGrise}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">⭐</span>
                  <svg className="w-8 h-8 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
                <p className="text-sm text-amber-700 mb-1">Note moyenne</p>
                <p className="text-3xl font-black text-amber-900">{userData.rating}/5</p>
              </div>
            </div>

            {/* Business Info & Fournisseurs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Business Info */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="text-2xl">🏪</span>
                  Informations professionnelles
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

              {/* Connected Fournisseurs */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  Fournisseurs
                </h2>
                <div className="space-y-3">
                  {userData.fournisseurs.map(fournisseur => (
                    <div key={fournisseur.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="text-3xl">{fournisseur.logo}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{fournisseur.name}</p>
                        <p className="text-xs text-slate-500">Depuis {fournisseur.since}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        fournisseur.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {fournisseur.status === 'active' ? '✓' : '⏳'}
                      </span>
                    </div>
                  ))}
                </div>
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
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
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
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({...userData, email: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={userData.phone}
                      onChange={(e) => setUserData({...userData, phone: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Ville</label>
                    <input
                      type="text"
                      value={userData.city}
                      onChange={(e) => setUserData({...userData, city: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Business Info Section */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Informations professionnelles</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nom de l'entreprise</label>
                    <input
                      type="text"
                      value={userData.businessName}
                      onChange={(e) => setUserData({...userData, businessName: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">ID Fiscal</label>
                    <input
                      type="text"
                      value={userData.taxId}
                      onChange={(e) => setUserData({...userData, taxId: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Adresse</label>
                    <input
                      type="text"
                      value={userData.address}
                      onChange={(e) => setUserData({...userData, address: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Code postal</label>
                    <input
                      type="text"
                      value={userData.postalCode}
                      onChange={(e) => setUserData({...userData, postalCode: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
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
                    label="Mises à jour carte grise"
                    description="Notifications sur l'état des cartes grises"
                    checked={userData.notifications.carteGriseUpdates}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, carteGriseUpdates: checked}
                    })}
                  />
                  
                  <NotificationToggle
                    label="Rappels de factures"
                    description="Rappels pour les factures impayées"
                    checked={userData.notifications.invoiceReminders}
                    onChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, invoiceReminders: checked}
                    })}
                  />
                  
                  <NotificationToggle
                    label="Offres et promotions"
                    description="Recevez les offres promotionnelles"
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
                    <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option>Français</option>
                      <option>العربية</option>
                      <option>English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Fuseau horaire</label>
                    <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
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
                    <p className="text-sm text-slate-600">Dernière modification: Il y a 30 jours</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
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
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Windows - Chrome</p>
                        <p className="text-sm text-slate-600">Sousse, Tunisie • Actif maintenant</p>
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
                        <p className="text-sm text-slate-600">Il y a 2 jours</p>
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
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
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
      <div>
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-8 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
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

export default ProfilePage;
