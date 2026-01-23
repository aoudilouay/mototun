import { useState } from 'react';

function CarteGrisePage() {
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [selectedDossiers, setSelectedDossiers] = useState([]);
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDossier, setOpenDossier] = useState(null);

  // Mock data - Dossiers (like folders)
  const dossiers = [
    {
      id: 'CG-2024-001',
      clientName: 'Ahmed Ben Salah',
      clientAvatar: 'AB',
      motorcycle: {
        brand: 'Yamaha',
        model: 'R125',
        company: 'Zimota',
        chassisNumber: 'JYARN23E00A000123'
      },
      status: 'pending', // pending, docs_received, sent_to_company, completed
      progress: 25,
      documents: {
        cin: { uploaded: true, fileName: 'CIN_Ahmed.pdf', date: '15 Jan 2026' },
        photo: { uploaded: true, fileName: 'Photo_Ahmed.jpg', date: '15 Jan 2026' },
        bonLivraison: { uploaded: false, fileName: null, date: null },
        certificat: { uploaded: false, fileName: null, date: null }
      },
      submittedDate: '15 Jan 2026',
      lastUpdate: '16 Jan 2026',
      sentToCompany: false,
      priority: 'normal' // normal, urgent
    },
    {
      id: 'CG-2024-002',
      clientName: 'Karim Mohamed',
      clientAvatar: 'KM',
      motorcycle: {
        brand: 'Honda',
        model: 'CBR 250',
        company: 'Forza',
        chassisNumber: 'JH2MC41000K100456'
      },
      status: 'docs_received',
      progress: 50,
      documents: {
        cin: { uploaded: true, fileName: 'CIN_Karim.pdf', date: '14 Jan 2026' },
        photo: { uploaded: true, fileName: 'Photo_Karim.jpg', date: '14 Jan 2026' },
        bonLivraison: { uploaded: true, fileName: 'BonLivraison_Karim.pdf', date: '14 Jan 2026' },
        certificat: { uploaded: false, fileName: null, date: null }
      },
      submittedDate: '14 Jan 2026',
      lastUpdate: '17 Jan 2026',
      sentToCompany: false,
      priority: 'urgent'
    },
    {
      id: 'CG-2024-003',
      clientName: 'Fatma Trabelsi',
      clientAvatar: 'FT',
      motorcycle: {
        brand: 'Suzuki',
        model: 'GSX-S150',
        company: 'GSM',
        chassisNumber: 'JS1GD79A902100789'
      },
      status: 'sent_to_company',
      progress: 75,
      documents: {
        cin: { uploaded: true, fileName: 'CIN_Fatma.pdf', date: '13 Jan 2026' },
        photo: { uploaded: true, fileName: 'Photo_Fatma.jpg', date: '13 Jan 2026' },
        bonLivraison: { uploaded: true, fileName: 'BonLivraison_Fatma.pdf', date: '13 Jan 2026' },
        certificat: { uploaded: true, fileName: 'Certificat_Fatma.pdf', date: '13 Jan 2026' }
      },
      submittedDate: '13 Jan 2026',
      lastUpdate: '18 Jan 2026',
      sentToCompany: true,
      sentDate: '18 Jan 2026',
      priority: 'normal'
    },
    {
      id: 'CG-2024-004',
      clientName: 'Mohamed Ali',
      clientAvatar: 'MA',
      motorcycle: {
        brand: 'Kawasaki',
        model: 'Ninja 300',
        company: 'Sanya',
        chassisNumber: 'JKAEXMJ17DA000234'
      },
      status: 'completed',
      progress: 100,
      documents: {
        cin: { uploaded: true, fileName: 'CIN_Mohamed.pdf', date: '10 Jan 2026' },
        photo: { uploaded: true, fileName: 'Photo_Mohamed.jpg', date: '10 Jan 2026' },
        bonLivraison: { uploaded: true, fileName: 'BonLivraison_Mohamed.pdf', date: '10 Jan 2026' },
        certificat: { uploaded: true, fileName: 'Certificat_Mohamed.pdf', date: '10 Jan 2026' }
      },
      submittedDate: '10 Jan 2026',
      lastUpdate: '18 Jan 2026',
      completedDate: '18 Jan 2026',
      sentToCompany: true,
      sentDate: '17 Jan 2026',
      priority: 'normal'
    },
    {
      id: 'CG-2024-005',
      clientName: 'Salah Eddine',
      clientAvatar: 'SE',
      motorcycle: {
        brand: 'Yamaha',
        model: 'MT-03',
        company: 'Zimota',
        chassisNumber: 'JYARN23E00A000567'
      },
      status: 'pending',
      progress: 10,
      documents: {
        cin: { uploaded: true, fileName: 'CIN_Salah.pdf', date: '12 Jan 2026' },
        photo: { uploaded: false, fileName: null, date: null },
        bonLivraison: { uploaded: false, fileName: null, date: null },
        certificat: { uploaded: false, fileName: null, date: null }
      },
      submittedDate: '12 Jan 2026',
      lastUpdate: '12 Jan 2026',
      sentToCompany: false,
      priority: 'urgent'
    }
  ];

  const companies = ['all', 'Zimota', 'Forza', 'GSM', 'Sanya'];

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: {
        label: 'En attente docs',
        color: 'amber',
        icon: '⏳',
        bgClass: 'bg-amber-50 border-amber-300',
        textClass: 'text-amber-700'
      },
      docs_received: {
        label: 'Docs reçus',
        color: 'blue',
        icon: '📄',
        bgClass: 'bg-blue-50 border-blue-300',
        textClass: 'text-blue-700'
      },
      sent_to_company: {
        label: 'Envoyé à fournisseur',
        color: 'purple',
        icon: '📤',
        bgClass: 'bg-purple-50 border-purple-300',
        textClass: 'text-purple-700'
      },
      completed: {
        label: 'Terminé',
        color: 'green',
        icon: '✓',
        bgClass: 'bg-green-50 border-green-300',
        textClass: 'text-green-700'
      }
    };
    return statusMap[status];
  };

  const getCompanyColor = (company) => {
    const colors = {
      'Zimota': 'bg-blue-100 text-blue-700 border-blue-200',
      'Forza': 'bg-red-100 text-red-700 border-red-200',
      'GSM': 'bg-green-100 text-green-700 border-green-200',
      'Sanya': 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return colors[company] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const handleSelectDossier = (dossierId) => {
    if (selectedDossiers.includes(dossierId)) {
      setSelectedDossiers(selectedDossiers.filter(id => id !== dossierId));
    } else {
      setSelectedDossiers([...selectedDossiers, dossierId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDossiers.length === filteredDossiers.length) {
      setSelectedDossiers([]);
    } else {
      setSelectedDossiers(filteredDossiers.map(d => d.id));
    }
  };

  const filteredDossiers = dossiers.filter(dossier => {
    const matchesCompany = filterCompany === 'all' || dossier.motorcycle.company === filterCompany;
    const matchesStatus = filterStatus === 'all' || dossier.status === filterStatus;
    const matchesSearch = dossier.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          dossier.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          dossier.motorcycle.brand.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCompany && matchesStatus && matchesSearch;
  });

  const stats = {
    total: dossiers.length,
    pending: dossiers.filter(d => d.status === 'pending').length,
    docsReceived: dossiers.filter(d => d.status === 'docs_received').length,
    sentToCompany: dossiers.filter(d => d.status === 'sent_to_company').length,
    completed: dossiers.filter(d => d.status === 'completed').length,
    urgent: dossiers.filter(d => d.priority === 'urgent').length
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">📁 Gestion Carte Grise</h1>
          <p className="text-slate-600 mt-1">Gérez vos dossiers comme des fichiers</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Dossier
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-600 mt-1">Total</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-amber-700 mt-1">En attente</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats.docsReceived}</p>
            <p className="text-xs text-blue-700 mt-1">Docs reçus</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{stats.sentToCompany}</p>
            <p className="text-xs text-purple-700 mt-1">Envoyés</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-green-700 mt-1">Terminés</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
            <p className="text-xs text-red-700 mt-1">🔥 Urgents</p>
          </div>
        </div>
      </div>

      {/* Toolbar - Windows Explorer Style */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Left Side - Selection & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedDossiers.length === filteredDossiers.length && filteredDossiers.length > 0}
                readOnly
                className="w-4 h-4 text-blue-600 border-slate-300 rounded"
              />
              <span className="text-sm font-medium text-slate-700">
                {selectedDossiers.length > 0 ? `${selectedDossiers.length} sélectionné(s)` : 'Tout sélectionner'}
              </span>
            </button>

            {selectedDossiers.length > 0 && (
              <>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Envoyer par email
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Envoyer à fournisseur
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exporter Excel
                </button>
              </>
            )}
          </div>

          {/* Right Side - View Mode & Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
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
                placeholder="Rechercher..."
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* Company Filter */}
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {companies.map(company => (
                <option key={company} value={company}>
                  {company === 'all' ? '🏢 Tous fournisseurs' : company}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">📊 Tous statuts</option>
              <option value="pending">⏳ En attente</option>
              <option value="docs_received">📄 Docs reçus</option>
              <option value="sent_to_company">📤 Envoyés</option>
              <option value="completed">✓ Terminés</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 border-l border-slate-200 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Dossiers Display - Grid View (Like Windows Explorer) */}
      {viewMode === 'grid' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDossiers.map((dossier) => {
              const statusInfo = getStatusInfo(dossier.status);
              const isSelected = selectedDossiers.includes(dossier.id);
              const docsCount = Object.values(dossier.documents).filter(doc => doc.uploaded).length;
              const totalDocs = Object.keys(dossier.documents).length;

              return (
                <div
                  key={dossier.id}
                  className={`relative group border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                  onClick={() => setOpenDossier(dossier)}
                >
                  {/* Selection Checkbox */}
                  <div
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectDossier(dossier.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* Priority Badge */}
                  {dossier.priority === 'urgent' && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                      🔥 URGENT
                    </div>
                  )}

                  {/* Folder Icon */}
                  <div className="flex justify-center mb-4 mt-6">
                    <div className="relative">
                      <div className={`text-7xl ${statusInfo.textClass}`}>
                        📁
                      </div>
                      {/* Status Badge on Folder */}
                      <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full ${statusInfo.bgClass} border-2 flex items-center justify-center text-lg`}>
                        {statusInfo.icon}
                      </div>
                    </div>
                  </div>

                  {/* Dossier Info */}
                  <div className="space-y-2">
                    {/* Dossier ID */}
                    <div className="text-center">
                      <p className="font-bold text-slate-900 text-sm">{dossier.id}</p>
                      <p className="text-xs text-slate-500">{dossier.submittedDate}</p>
                    </div>

                    {/* Client Name */}
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {dossier.clientAvatar}
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {dossier.clientName}
                      </p>
                    </div>

                    {/* Motorcycle Info */}
                    <div className="text-center space-y-1">
                      <p className="text-xs font-semibold text-slate-700">
                        {dossier.motorcycle.brand} {dossier.motorcycle.model}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getCompanyColor(dossier.motorcycle.company)}`}>
                        {dossier.motorcycle.company}
                      </span>
                    </div>

                    {/* Documents Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Documents</span>
                        <span className="font-semibold text-slate-900">{docsCount}/{totalDocs}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            dossier.progress === 100 ? 'bg-green-500' :
                            dossier.progress >= 50 ? 'bg-blue-500' :
                            'bg-amber-500'
                          }`}
                          style={{ width: `${dossier.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`text-center py-2 rounded-lg border ${statusInfo.bgClass}`}>
                      <span className={`text-xs font-semibold ${statusInfo.textClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Sent Status */}
                    {dossier.sentToCompany && (
                      <div className="text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                          </svg>
                          Envoyé le {dossier.sentDate}
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {filteredDossiers.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📂</div>
              <p className="text-xl font-semibold text-slate-900 mb-2">Aucun dossier trouvé</p>
              <p className="text-slate-600">Modifiez vos filtres ou créez un nouveau dossier</p>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDossiers.length === filteredDossiers.length && filteredDossiers.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Dossier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Moto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Fournisseur</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Documents</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDossiers.map((dossier) => {
                  const statusInfo = getStatusInfo(dossier.status);
                  const isSelected = selectedDossiers.includes(dossier.id);
                  const docsCount = Object.values(dossier.documents).filter(doc => doc.uploaded).length;
                  const totalDocs = Object.keys(dossier.documents).length;

                  return (
                    <tr
                      key={dossier.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setOpenDossier(dossier)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDossier(dossier.id);
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📁</span>
                          <div>
                            <p className="font-semibold text-slate-900">{dossier.id}</p>
                            {dossier.priority === 'urgent' && (
                              <span className="text-xs text-red-600 font-bold">🔥 URGENT</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {dossier.clientAvatar}
                          </div>
                          <span className="font-medium text-slate-900">{dossier.clientName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{dossier.motorcycle.brand} {dossier.motorcycle.model}</p>
                        <p className="text-xs text-slate-500">{dossier.motorcycle.chassisNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCompanyColor(dossier.motorcycle.company)}`}>
                          {dossier.motorcycle.company}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                dossier.progress === 100 ? 'bg-green-500' :
                                dossier.progress >= 50 ? 'bg-blue-500' :
                                'bg-amber-500'
                              }`}
                              style={{ width: `${dossier.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{docsCount}/{totalDocs}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{dossier.submittedDate}</p>
                        <p className="text-xs text-slate-400">MAJ: {dossier.lastUpdate}</p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDossier(dossier);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          Ouvrir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dossier Detail Modal (when folder is opened) */}
      {openDossier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <span className="text-3xl">📂</span>
                  {openDossier.id}
                </h2>
                <p className="text-slate-600 mt-1">Dossier de {openDossier.clientName}</p>
              </div>
              <button
                onClick={() => setOpenDossier(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              
              {/* Client & Motorcycle Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="font-bold text-slate-900 mb-4">👤 Informations Client</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                        {openDossier.clientAvatar}
                      </div>
                      <span className="font-semibold text-slate-900">{openDossier.clientName}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h3 className="font-bold text-slate-900 mb-4">🏍️ Moto</h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-slate-900">
                      {openDossier.motorcycle.brand} {openDossier.motorcycle.model}
                    </p>
                    <p className="text-slate-600">Châssis: {openDossier.motorcycle.chassisNumber}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getCompanyColor(openDossier.motorcycle.company)}`}>
                      {openDossier.motorcycle.company}
                    </span>
                  </div>
                </div>
              </div>

              {/* Documents List */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">📄 Documents</h3>
                <div className="space-y-3">
                  {Object.entries(openDossier.documents).map(([key, doc]) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        doc.uploaded
                          ? 'bg-white border-green-200'
                          : 'bg-slate-100 border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          doc.uploaded ? 'bg-green-100' : 'bg-slate-200'
                        }`}>
                          {doc.uploaded ? (
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{key.toUpperCase()}</p>
                          {doc.uploaded && (
                            <>
                              <p className="text-xs text-slate-500">{doc.fileName}</p>
                              <p className="text-xs text-slate-400">{doc.date}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {doc.uploaded ? (
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                          Télécharger
                        </button>
                      ) : (
                        <button className="px-4 py-2 bg-slate-300 text-slate-600 text-sm font-semibold rounded-lg cursor-not-allowed">
                          Manquant
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Envoyer par email
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Envoyer à {openDossier.motorcycle.company}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default CarteGrisePage;
