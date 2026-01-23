import { useState } from 'react';

function FournisseurCarteGrisePage() {
  const [viewMode, setViewMode] = useState('kanban'); // kanban, list, grouped
  const [selectedDossiers, setSelectedDossiers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRevendeur, setFilterRevendeur] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDossier, setOpenDossier] = useState(null);
  const [showBulkAction, setShowBulkAction] = useState(false);

  // Mock data - Dossiers from multiple revendeurs
  const dossiers = [
    {
      id: 'CG-2024-001',
      clientName: 'Ahmed Ben Salah',
      revendeur: 'Karim Moto Shop',
      revendeurAvatar: 'KM',
      motorcycle: { brand: 'Yamaha', model: 'R125', chassisNumber: 'JYARN23E00A000123' },
      status: 'pending',
      priority: 'urgent',
      submittedDate: '18 Jan 2026',
      documents: { cin: true, photo: true, bonLivraison: false, certificat: false },
      progress: 25,
      notes: ''
    },
    {
      id: 'CG-2024-002',
      clientName: 'Mohamed Ali',
      revendeur: 'Karim Moto Shop',
      revendeurAvatar: 'KM',
      motorcycle: { brand: 'Yamaha', model: 'MT-03', chassisNumber: 'JYARN23E00A000567' },
      status: 'docs_received',
      priority: 'normal',
      submittedDate: '17 Jan 2026',
      documents: { cin: true, photo: true, bonLivraison: true, certificat: false },
      progress: 50,
      notes: ''
    },
    {
      id: 'CG-2024-003',
      clientName: 'Fatma Trabelsi',
      revendeur: 'Moto Plus Tunis',
      revendeurAvatar: 'MP',
      motorcycle: { brand: 'Yamaha', model: 'R125', chassisNumber: 'JYARN23E00A000890' },
      status: 'in_progress',
      priority: 'urgent',
      submittedDate: '16 Jan 2026',
      documents: { cin: true, photo: true, bonLivraison: true, certificat: true },
      progress: 75,
      notes: 'Traitement en cours au ministère'
    },
    {
      id: 'CG-2024-004',
      clientName: 'Salah Eddine',
      revendeur: 'Speed Bikes Sfax',
      revendeurAvatar: 'SB',
      motorcycle: { brand: 'Yamaha', model: 'R125', chassisNumber: 'JYARN23E00A000234' },
      status: 'completed',
      priority: 'normal',
      submittedDate: '15 Jan 2026',
      completedDate: '18 Jan 2026',
      documents: { cin: true, photo: true, bonLivraison: true, certificat: true },
      progress: 100,
      notes: ''
    },
    {
      id: 'CG-2024-005',
      clientName: 'Karim Mohamed',
      revendeur: 'Karim Moto Shop',
      revendeurAvatar: 'KM',
      motorcycle: { brand: 'Yamaha', model: 'R125', chassisNumber: 'JYARN23E00A000456' },
      status: 'pending',
      priority: 'normal',
      submittedDate: '18 Jan 2026',
      documents: { cin: true, photo: false, bonLivraison: false, certificat: false },
      progress: 10,
      notes: ''
    },
    // Add more mock data
    {
      id: 'CG-2024-006',
      clientName: 'Ali Bouazizi',
      revendeur: 'Moto Plus Tunis',
      revendeurAvatar: 'MP',
      motorcycle: { brand: 'Yamaha', model: 'MT-03', chassisNumber: 'JYARN23E00A000789' },
      status: 'docs_received',
      priority: 'urgent',
      submittedDate: '17 Jan 2026',
      documents: { cin: true, photo: true, bonLivraison: true, certificat: false },
      progress: 60,
      notes: ''
    },
    {
      id: 'CG-2024-007',
      clientName: 'Leila Hamdi',
      revendeur: 'Racing Moto',
      revendeurAvatar: 'RM',
      motorcycle: { brand: 'Yamaha', model: 'R125', chassisNumber: 'JYARN23E00A000999' },
      status: 'in_progress',
      priority: 'normal',
      submittedDate: '16 Jan 2026',
      documents: { cin: true, photo: true, bonLivraison: true, certificat: true },
      progress: 80,
      notes: ''
    },
    {
      id: 'CG-2024-008',
      clientName: 'Youssef Gharbi',
      revendeur: 'Speed Bikes Sfax',
      revendeurAvatar: 'SB',
      motorcycle: { brand: 'Yamaha', model: 'MT-03', chassisNumber: 'JYARN23E00A000111' },
      status: 'pending',
      priority: 'urgent',
      submittedDate: '18 Jan 2026',
      documents: { cin: true, photo: true, bonLivraison: false, certificat: false },
      progress: 20,
      notes: ''
    }
  ];

  const revendeurs = ['all', 'Karim Moto Shop', 'Moto Plus Tunis', 'Speed Bikes Sfax', 'Racing Moto'];

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: {
        label: 'En attente',
        icon: '⏳',
        color: 'amber',
        bgClass: 'bg-amber-50 border-amber-300',
        textClass: 'text-amber-700',
        badgeClass: 'bg-amber-100 text-amber-700 border-amber-200'
      },
      docs_received: {
        label: 'Docs reçus',
        icon: '📄',
        color: 'blue',
        bgClass: 'bg-blue-50 border-blue-300',
        textClass: 'text-blue-700',
        badgeClass: 'bg-blue-100 text-blue-700 border-blue-200'
      },
      in_progress: {
        label: 'En traitement',
        icon: '⚙️',
        color: 'purple',
        bgClass: 'bg-purple-50 border-purple-300',
        textClass: 'text-purple-700',
        badgeClass: 'bg-purple-100 text-purple-700 border-purple-200'
      },
      completed: {
        label: 'Terminé',
        icon: '✓',
        color: 'green',
        bgClass: 'bg-green-50 border-green-300',
        textClass: 'text-green-700',
        badgeClass: 'bg-green-100 text-green-700 border-green-200'
      }
    };
    return statusMap[status];
  };

  const filteredDossiers = dossiers.filter(dossier => {
    const matchesStatus = filterStatus === 'all' || dossier.status === filterStatus;
    const matchesRevendeur = filterRevendeur === 'all' || dossier.revendeur === filterRevendeur;
    const matchesPriority = filterPriority === 'all' || dossier.priority === filterPriority;
    const matchesSearch = 
      dossier.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dossier.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dossier.revendeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dossier.motorcycle.brand.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesRevendeur && matchesPriority && matchesSearch;
  });

  const stats = {
    total: dossiers.length,
    pending: dossiers.filter(d => d.status === 'pending').length,
    docsReceived: dossiers.filter(d => d.status === 'docs_received').length,
    inProgress: dossiers.filter(d => d.status === 'in_progress').length,
    completed: dossiers.filter(d => d.status === 'completed').length,
    urgent: dossiers.filter(d => d.priority === 'urgent').length
  };

  // Group dossiers by revendeur for grouped view
  const groupedByRevendeur = revendeurs
    .filter(r => r !== 'all')
    .map(revendeur => ({
      revendeur,
      dossiers: filteredDossiers.filter(d => d.revendeur === revendeur)
    }))
    .filter(group => group.dossiers.length > 0);

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

  const handleBulkStatusUpdate = (newStatus) => {
    console.log('Updating', selectedDossiers.length, 'dossiers to', newStatus);
    setSelectedDossiers([]);
    setShowBulkAction(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">📄 Gestion Carte Grise</h1>
          <p className="text-slate-600 mt-1">Gérez toutes les demandes de vos revendeurs</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedDossiers.length > 0 && (
            <button
              onClick={() => setShowBulkAction(true)}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              Actions groupées ({selectedDossiers.length})
            </button>
          )}
          <button className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg shadow-xl transition-all transform hover:-translate-y-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg hover:shadow-md transition-all cursor-pointer" onClick={() => setFilterStatus('all')}>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-600 mt-1">Total</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg hover:shadow-md transition-all cursor-pointer" onClick={() => setFilterStatus('pending')}>
            <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-amber-700 mt-1">En attente</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg hover:shadow-md transition-all cursor-pointer" onClick={() => setFilterStatus('docs_received')}>
            <p className="text-3xl font-bold text-blue-600">{stats.docsReceived}</p>
            <p className="text-xs text-blue-700 mt-1">Docs reçus</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg hover:shadow-md transition-all cursor-pointer" onClick={() => setFilterStatus('in_progress')}>
            <p className="text-3xl font-bold text-purple-600">{stats.inProgress}</p>
            <p className="text-xs text-purple-700 mt-1">En traitement</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg hover:shadow-md transition-all cursor-pointer" onClick={() => setFilterStatus('completed')}>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-green-700 mt-1">Terminés</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg hover:shadow-md transition-all cursor-pointer border-2 border-red-200" onClick={() => setFilterPriority('urgent')}>
            <p className="text-3xl font-bold text-red-600">{stats.urgent}</p>
            <p className="text-xs text-red-700 mt-1">🔥 Urgents</p>
          </div>
        </div>
      </div>

      {/* Advanced Filters Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Left - Selection & Bulk Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedDossiers.length === filteredDossiers.length && filteredDossiers.length > 0}
                readOnly
                className="w-4 h-4 text-purple-600 border-slate-300 rounded"
              />
              <span className="text-sm font-medium text-slate-700">
                {selectedDossiers.length > 0 ? `${selectedDossiers.length} sélectionné(s)` : 'Tout sélectionner'}
              </span>
            </button>

            {selectedDossiers.length > 0 && (
              <>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm">
                  Docs reçus
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-sm">
                  En traitement
                </button>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm">
                  Marquer terminé
                </button>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm">
                  🔥 Urgent
                </button>
              </>
            )}
          </div>

          {/* Right - Search & Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            
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
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 w-64"
              />
            </div>

            {/* Revendeur Filter */}
            <select
              value={filterRevendeur}
              onChange={(e) => setFilterRevendeur(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              {revendeurs.map(revendeur => (
                <option key={revendeur} value={revendeur}>
                  {revendeur === 'all' ? '🏪 Tous revendeurs' : revendeur}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">📊 Tous statuts</option>
              <option value="pending">⏳ En attente</option>
              <option value="docs_received">📄 Docs reçus</option>
              <option value="in_progress">⚙️ En traitement</option>
              <option value="completed">✓ Terminés</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Toutes priorités</option>
              <option value="urgent">🔥 Urgent</option>
              <option value="normal">Normal</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-2 text-sm font-medium ${viewMode === 'kanban' ? 'bg-purple-50 text-purple-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-2 text-sm font-medium border-x border-slate-200 ${viewMode === 'grouped' ? 'bg-purple-50 text-purple-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Par revendeur
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium ${viewMode === 'list' ? 'bg-purple-50 text-purple-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Liste
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Pending Column */}
          <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-amber-900 flex items-center gap-2">
                <span className="text-2xl">⏳</span>
                En attente
              </h3>
              <span className="px-3 py-1 bg-amber-200 text-amber-900 rounded-full text-sm font-bold">
                {filteredDossiers.filter(d => d.status === 'pending').length}
              </span>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredDossiers.filter(d => d.status === 'pending').map(dossier => (
                <DossierCard 
                  key={dossier.id} 
                  dossier={dossier} 
                  isSelected={selectedDossiers.includes(dossier.id)}
                  onSelect={() => handleSelectDossier(dossier.id)}
                  onClick={() => setOpenDossier(dossier)}
                />
              ))}
            </div>
          </div>

          {/* Docs Received Column */}
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <span className="text-2xl">📄</span>
                Docs reçus
              </h3>
              <span className="px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-sm font-bold">
                {filteredDossiers.filter(d => d.status === 'docs_received').length}
              </span>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredDossiers.filter(d => d.status === 'docs_received').map(dossier => (
                <DossierCard 
                  key={dossier.id} 
                  dossier={dossier} 
                  isSelected={selectedDossiers.includes(dossier.id)}
                  onSelect={() => handleSelectDossier(dossier.id)}
                  onClick={() => setOpenDossier(dossier)}
                />
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-purple-900 flex items-center gap-2">
                <span className="text-2xl">⚙️</span>
                En traitement
              </h3>
              <span className="px-3 py-1 bg-purple-200 text-purple-900 rounded-full text-sm font-bold">
                {filteredDossiers.filter(d => d.status === 'in_progress').length}
              </span>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredDossiers.filter(d => d.status === 'in_progress').map(dossier => (
                <DossierCard 
                  key={dossier.id} 
                  dossier={dossier} 
                  isSelected={selectedDossiers.includes(dossier.id)}
                  onSelect={() => handleSelectDossier(dossier.id)}
                  onClick={() => setOpenDossier(dossier)}
                />
              ))}
            </div>
          </div>

          {/* Completed Column */}
          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-green-900 flex items-center gap-2">
                <span className="text-2xl">✓</span>
                Terminé
              </h3>
              <span className="px-3 py-1 bg-green-200 text-green-900 rounded-full text-sm font-bold">
                {filteredDossiers.filter(d => d.status === 'completed').length}
              </span>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredDossiers.filter(d => d.status === 'completed').map(dossier => (
                <DossierCard 
                  key={dossier.id} 
                  dossier={dossier} 
                  isSelected={selectedDossiers.includes(dossier.id)}
                  onSelect={() => handleSelectDossier(dossier.id)}
                  onClick={() => setOpenDossier(dossier)}
                />
              ))}
            </div>
          </div>

        </div>
      )}

      {/* GROUPED BY REVENDEUR VIEW */}
      {viewMode === 'grouped' && (
        <div className="space-y-6">
          {groupedByRevendeur.map((group) => (
            <div key={group.revendeur} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    {group.dossiers[0].revendeurAvatar}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{group.revendeur}</h3>
                    <p className="text-sm text-slate-600">{group.dossiers.length} dossier(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-bold">
                    {group.dossiers.filter(d => d.status === 'pending').length} en attente
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                    {group.dossiers.filter(d => d.status === 'completed').length} terminés
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {group.dossiers.map(dossier => (
                  <DossierCard 
                    key={dossier.id} 
                    dossier={dossier} 
                    isSelected={selectedDossiers.includes(dossier.id)}
                    onSelect={() => handleSelectDossier(dossier.id)}
                    onClick={() => setOpenDossier(dossier)}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
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
                      className="w-4 h-4 text-purple-600 border-slate-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Dossier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Revendeur</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Moto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Priorité</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDossiers.map((dossier) => {
                  const statusInfo = getStatusInfo(dossier.status);
                  const isSelected = selectedDossiers.includes(dossier.id);
                  const docsCount = Object.values(dossier.documents).filter(d => d).length;

                  return (
                    <tr
                      key={dossier.id}
                      className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectDossier(dossier.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-purple-600 border-slate-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
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
                        <span className="font-medium text-slate-900">{dossier.clientName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {dossier.revendeurAvatar}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{dossier.revendeur}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{dossier.motorcycle.brand} {dossier.motorcycle.model}</p>
                        <p className="text-xs text-slate-500 font-mono">{dossier.motorcycle.chassisNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                dossier.progress === 100 ? 'bg-green-500' :
                                dossier.progress >= 50 ? 'bg-purple-500' :
                                'bg-amber-500'
                              }`}
                              style={{ width: `${dossier.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{docsCount}/4</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {dossier.priority === 'urgent' ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">
                            🔥 Urgent
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{dossier.submittedDate}</p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setOpenDossier(dossier)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
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

      {/* Dossier Detail Modal - Same as revendeur but with additional features */}
      {openDossier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal content same as revendeur with added status update buttons */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <span className="text-3xl">📂</span>
                  {openDossier.id}
                </h2>
                <p className="text-slate-600 mt-1">{openDossier.revendeur} • {openDossier.clientName}</p>
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

            <div className="p-6 space-y-6">
              
              {/* Status Update Buttons */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-3">Mettre à jour le statut:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-sm">
                    ⏳ En attente
                  </button>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm">
                    📄 Docs reçus
                  </button>
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-sm">
                    ⚙️ En traitement
                  </button>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm">
                    ✓ Terminé
                  </button>
                  <button className={`px-4 py-2 ${openDossier.priority === 'urgent' ? 'bg-red-600' : 'bg-slate-300'} hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm`}>
                    🔥 Urgent
                  </button>
                </div>
              </div>

              {/* Rest of modal content similar to revendeur */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="font-bold text-slate-900 mb-4">🏪 Revendeur</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {openDossier.revendeurAvatar}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{openDossier.revendeur}</p>
                      <button className="text-sm text-blue-600 hover:underline">Voir profil</button>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="font-bold text-slate-900 mb-4">👤 Client</h3>
                  <p className="font-semibold text-slate-900">{openDossier.clientName}</p>
                </div>
              </div>

              {/* Motorcycle Info */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <h3 className="font-bold text-slate-900 mb-4">🏍️ Moto</h3>
                <p className="font-semibold text-slate-900">
                  {openDossier.motorcycle.brand} {openDossier.motorcycle.model}
                </p>
                <p className="text-sm text-slate-600 mt-1 font-mono">{openDossier.motorcycle.chassisNumber}</p>
              </div>

              {/* Documents - same as revendeur */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">📄 Documents</h3>
                <div className="space-y-3">
                  {Object.entries(openDossier.documents).map(([key, uploaded]) => (
                    <div key={key} className={`flex items-center justify-between p-4 rounded-lg border ${
                      uploaded ? 'bg-white border-green-200' : 'bg-slate-100 border-slate-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          uploaded ? 'bg-green-100' : 'bg-slate-200'
                        }`}>
                          {uploaded ? (
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </div>
                        <p className="font-medium text-slate-900">{key.toUpperCase()}</p>
                      </div>
                      {uploaded && (
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                          Télécharger
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes internes</label>
                <textarea
                  defaultValue={openDossier.notes}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Ajouter des notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
                  📧 Notifier revendeur
                </button>
                <button className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors">
                  💾 Sauvegarder
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Modal */}
      {showBulkAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">
              Actions groupées ({selectedDossiers.length} dossiers)
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => handleBulkStatusUpdate('docs_received')}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-left px-6"
              >
                📄 Marquer comme "Docs reçus"
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('in_progress')}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors text-left px-6"
              >
                ⚙️ Marquer comme "En traitement"
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('completed')}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-left px-6"
              >
                ✓ Marquer comme "Terminé"
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('urgent')}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-left px-6"
              >
                🔥 Marquer comme "Urgent"
              </button>
              <button
                onClick={() => setShowBulkAction(false)}
                className="w-full py-4 border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Dossier Card Component (reusable)
function DossierCard({ dossier, isSelected, onSelect, onClick, compact = false }) {
  const statusInfo = {
    pending: { color: 'amber', icon: '⏳' },
    docs_received: { color: 'blue', icon: '📄' },
    in_progress: { color: 'purple', icon: '⚙️' },
    completed: { color: 'green', icon: '✓' }
  }[dossier.status];

  const docsCount = Object.values(dossier.documents).filter(d => d).length;

  return (
    <div
      className={`bg-white rounded-lg border-2 ${
        isSelected ? 'border-purple-500 shadow-lg' : 'border-slate-200'
      } p-4 hover:shadow-md transition-all cursor-pointer relative group`}
      onClick={onClick}
    >
      {/* Selection Checkbox */}
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="w-4 h-4 text-purple-600 border-slate-300 rounded"
        />
      </div>

      {/* Priority Badge */}
      {dossier.priority === 'urgent' && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
          🔥
        </div>
      )}

      {/* Content */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">{dossier.id}</p>
          <span className={`text-xl`}>{statusInfo.icon}</span>
        </div>

        <div>
          <p className="text-xs text-slate-500">Client</p>
          <p className="font-semibold text-slate-900 truncate">{dossier.clientName}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {dossier.revendeurAvatar}
          </div>
          <p className="text-xs text-slate-600 truncate">{dossier.revendeur}</p>
        </div>

        {!compact && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Moto</p>
            <p className="text-sm font-medium text-slate-900">
              {dossier.motorcycle.brand} {dossier.motorcycle.model}
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Progress</span>
            <span className="font-semibold">{docsCount}/4</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full bg-${statusInfo.color}-500`}
              style={{ width: `${dossier.progress}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-400">{dossier.submittedDate}</p>
      </div>
    </div>
  );
}

export default FournisseurCarteGrisePage;
