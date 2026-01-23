import { Link } from 'react-router-dom';
import { useState } from 'react';

function ClientPortalPage() {
  const [portalCode, setPortalCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clientData, setClientData] = useState(null);

  // Mock client data (replace with real API call)
  const mockClientData = {
    code: 'ABC123',
    name: 'Ahmed Ben Salah',
    motorcycle: {
      brand: 'Yamaha',
      model: 'YZF-R125',
      year: 2024,
      color: 'Bleu',
      chassisNumber: 'JYARN23E00A000123',
      price: '12,500 TND'
    },
    dealer: {
      name: 'Moto Shop Tunis',
      phone: '+216 XX XXX XXX',
      email: 'contact@motoshop.tn'
    },
    status: {
      payment: 'completed',
      documents: 'received',
      carteGrise: 'in_progress',
      delivery: 'pending'
    },
    timeline: [
      { date: '15 Jan 2026', title: 'Commande confirmée', status: 'completed', icon: '✓' },
      { date: '16 Jan 2026', title: 'Paiement reçu', status: 'completed', icon: '✓' },
      { date: '17 Jan 2026', title: 'Documents reçus', status: 'completed', icon: '✓' },
      { date: '18 Jan 2026', title: 'Carte grise en traitement', status: 'active', icon: '⏳' },
      { date: 'En attente', title: 'Livraison', status: 'pending', icon: '○' }
    ],
    documents: [
      { name: 'Facture d\'achat', type: 'pdf', size: '245 KB', url: '#' },
      { name: 'Bon de livraison', type: 'pdf', size: '128 KB', url: '#' },
      { name: 'Certificat de conformité', type: 'pdf', size: '312 KB', url: '#' }
    ],
    uploads: {
      cin: { uploaded: true, fileName: 'CIN_Ahmed.pdf' },
      photo: { uploaded: true, fileName: 'Photo_Ahmed.jpg' },
      justificatif: { uploaded: false, fileName: null }
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // TODO: Replace with real authentication
    if (portalCode.toUpperCase() === 'ABC123') {
      setIsAuthenticated(true);
      setClientData(mockClientData);
    } else {
      alert('Code incorrect. Essayez ABC123 pour la démo.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setClientData(null);
    setPortalCode('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'in_progress': return 'En cours';
      case 'pending': return 'En attente';
      default: return 'Inconnu';
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 flex items-center justify-center p-6 relative overflow-hidden">
        
        {/* Animated background orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

        <div className="w-full max-w-md relative z-10">
          
          {/* Logo Section */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">TM</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-500 bg-clip-text text-transparent">
                Tunimoto
              </span>
            </Link>
            <div className="inline-block px-4 py-2 bg-cyan-100 rounded-full border border-cyan-200 mb-4">
              <span className="text-sm font-semibold text-cyan-700">🔐 Espace Client</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Bienvenue !
            </h1>
            <p className="text-slate-600">
              Suivez votre commande et carte grise en temps réel
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Portal Code Field */}
              <div>
                <label htmlFor="portalCode" className="block text-sm font-semibold text-slate-700 mb-2">
                  Code d'accès
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <input
                    id="portalCode"
                    type="text"
                    value={portalCode}
                    onChange={(e) => setPortalCode(e.target.value)}
                    placeholder="Ex: ABC123"
                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all uppercase"
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Vous avez reçu ce code par email ou SMS de votre revendeur
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all transform hover:-translate-y-0.5"
              >
                Accéder à mon espace
              </button>

            </form>

            {/* Demo Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <div className="text-sm text-slate-700">
                  <strong className="font-semibold">Mode démo :</strong> Utilisez le code <span className="px-2 py-0.5 bg-white rounded font-mono font-bold">ABC123</span> pour tester
                </div>
              </div>
            </div>

          </div>

          {/* Help Links */}
          <div className="text-center mt-6 space-y-3">
            <p className="text-sm text-slate-600">
              Code perdu ?{' '}
              <a href="#" className="text-cyan-600 hover:text-cyan-700 font-semibold">
                Contactez votre revendeur
              </a>
            </p>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour à l'accueil
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // Client Dashboard
  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">TM</span>
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">Espace Client</span>
              <p className="text-xs text-slate-500">Code: {clientData.code}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Bonjour {clientData.name} 👋
          </h1>
          <p className="text-slate-600">
            Voici l'état d'avancement de votre commande
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-white rounded-xl p-5 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl">💰</div>
                  <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    ✓
                  </div>
                </div>
                <div className="text-sm text-slate-600 mb-1">Paiement</div>
                <div className="text-lg font-bold text-slate-900">Reçu</div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl">📄</div>
                  <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    ✓
                  </div>
                </div>
                <div className="text-sm text-slate-600 mb-1">Documents</div>
                <div className="text-lg font-bold text-slate-900">Validés</div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl">🏍️</div>
                  <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold animate-pulse">
                    ⏳
                  </div>
                </div>
                <div className="text-sm text-slate-600 mb-1">Carte grise</div>
                <div className="text-lg font-bold text-slate-900">En cours</div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl">🚚</div>
                  <div className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                    ○
                  </div>
                </div>
                <div className="text-sm text-slate-600 mb-1">Livraison</div>
                <div className="text-lg font-bold text-slate-900">Bientôt</div>
              </div>

            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Suivi de votre commande</h2>
              
              <div className="space-y-6">
                {clientData.timeline.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        item.status === 'completed' ? 'bg-green-500 text-white' :
                        item.status === 'active' ? 'bg-blue-500 text-white animate-pulse' :
                        'bg-slate-200 text-slate-400'
                      }`}>
                        {item.icon}
                      </div>
                      {index < clientData.timeline.length - 1 && (
                        <div className={`w-0.5 h-12 ${
                          item.status === 'completed' ? 'bg-green-300' : 'bg-slate-200'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold ${
                          item.status === 'active' ? 'text-blue-600' : 'text-slate-900'
                        }`}>
                          {item.title}
                        </h3>
                        <span className="text-xs text-slate-500">{item.date}</span>
                      </div>
                      {item.status === 'active' && (
                        <p className="text-sm text-slate-600 mt-1">
                          Votre dossier est en cours de traitement. Délai estimé : 48h.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Vos documents</h2>
              
              <div className="space-y-3">
                {clientData.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{doc.name}</div>
                        <div className="text-xs text-slate-500">{doc.size}</div>
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                    >
                      Télécharger
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Documents requis</h2>
              
              <div className="space-y-3">
                
                {/* CIN */}
                <div className={`p-4 rounded-lg border ${
                  clientData.uploads.cin.uploaded 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        clientData.uploads.cin.uploaded ? 'bg-green-100' : 'bg-amber-100'
                      }`}>
                        {clientData.uploads.cin.uploaded ? (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Carte d'identité (CIN)</div>
                        {clientData.uploads.cin.uploaded && (
                          <div className="text-xs text-slate-500">{clientData.uploads.cin.fileName}</div>
                        )}
                      </div>
                    </div>
                    {clientData.uploads.cin.uploaded ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        ✓ Envoyé
                      </span>
                    ) : (
                      <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition">
                        Envoyer
                      </button>
                    )}
                  </div>
                </div>

                {/* Photo */}
                <div className={`p-4 rounded-lg border ${
                  clientData.uploads.photo.uploaded 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        clientData.uploads.photo.uploaded ? 'bg-green-100' : 'bg-amber-100'
                      }`}>
                        {clientData.uploads.photo.uploaded ? (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Photo d'identité</div>
                        {clientData.uploads.photo.uploaded && (
                          <div className="text-xs text-slate-500">{clientData.uploads.photo.fileName}</div>
                        )}
                      </div>
                    </div>
                    {clientData.uploads.photo.uploaded ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        ✓ Envoyé
                      </span>
                    ) : (
                      <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition">
                        Envoyer
                      </button>
                    )}
                  </div>
                </div>

                {/* Justificatif */}
                <div className={`p-4 rounded-lg border ${
                  clientData.uploads.justificatif.uploaded 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        clientData.uploads.justificatif.uploaded ? 'bg-green-100' : 'bg-slate-200'
                      }`}>
                        <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Justificatif de domicile</div>
                        <div className="text-xs text-slate-500">Optionnel</div>
                      </div>
                    </div>
                    <button className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg transition">
                      Envoyer
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Motorcycle Info */}
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
              <h3 className="text-lg font-bold mb-4">Votre moto</h3>
              <div className="text-5xl mb-4">🏍️</div>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{clientData.motorcycle.brand}</div>
                <div className="text-lg opacity-90">{clientData.motorcycle.model}</div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                    {clientData.motorcycle.year}
                  </span>
                  <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                    {clientData.motorcycle.color}
                  </span>
                </div>
                <div className="text-sm opacity-75 mt-3">
                  Châssis: {clientData.motorcycle.chassisNumber}
                </div>
                <div className="text-2xl font-bold mt-4 pt-4 border-t border-white/20">
                  {clientData.motorcycle.price}
                </div>
              </div>
            </div>

            {/* Dealer Info */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Votre revendeur</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-slate-500 mb-1">Nom</div>
                  <div className="font-semibold text-slate-900">{clientData.dealer.name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Téléphone</div>
                  <a href={`tel:${clientData.dealer.phone}`} className="font-semibold text-blue-600 hover:text-blue-700">
                    {clientData.dealer.phone}
                  </a>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Email</div>
                  <a href={`mailto:${clientData.dealer.email}`} className="font-semibold text-blue-600 hover:text-blue-700 text-sm">
                    {clientData.dealer.email}
                  </a>
                </div>
              </div>
              <button className="w-full mt-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition">
                Contacter le revendeur
              </button>
            </div>

            {/* Help Section */}
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <div>
                  <h4 className="font-bold text-amber-900 mb-2">Besoin d'aide ?</h4>
                  <p className="text-sm text-amber-800 mb-3">
                    Notre équipe support est disponible pour répondre à vos questions.
                  </p>
                  <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition">
                    Contacter le support
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default ClientPortalPage;
