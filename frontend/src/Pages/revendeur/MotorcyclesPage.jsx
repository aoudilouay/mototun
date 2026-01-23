import { useState } from 'react';

function MotorcyclesPage() {
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMoto, setSelectedMoto] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for adding/editing motorcycle
  const [motoForm, setMotoForm] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    price: '',
    purchasePrice: '',
    chassisNumber: '',
    engineNumber: '',
    company: 'Zimota',
    status: 'in_stock', // in_stock, sold, reserved
    stock: 1,
    images: [],
    description: '',
    features: '',
    arrivalDate: new Date().toISOString().split('T')[0]
  });

  // Mock motorcycles data
  const motorcycles = [
    {
      id: 1,
      brand: 'Yamaha',
      model: 'R125',
      year: 2024,
      color: 'Bleu Racing',
      price: 12500,
      purchasePrice: 10500,
      chassisNumber: 'JYARN23E00A000123',
      engineNumber: 'E4G15000123',
      company: 'Zimota',
      status: 'in_stock',
      stock: 3,
      image: '🏍️',
      arrivalDate: '10 Jan 2026',
      soldDate: null,
      features: ['ABS', 'LED Lights', 'Digital Display'],
      description: 'Sportive et agile, parfaite pour la ville'
    },
    {
      id: 2,
      brand: 'Honda',
      model: 'CBR 250',
      year: 2024,
      color: 'Rouge',
      price: 18900,
      purchasePrice: 16200,
      chassisNumber: 'JH2MC41000K100456',
      engineNumber: 'MC41E2100789',
      company: 'Forza',
      status: 'sold',
      stock: 0,
      image: '🏍️',
      arrivalDate: '08 Jan 2026',
      soldDate: '14 Jan 2026',
      soldTo: 'Karim Mohamed',
      features: ['ABS', 'Sport Mode', 'USB Charger'],
      description: 'Performance et confort pour tous les trajets'
    },
    {
      id: 3,
      brand: 'Suzuki',
      model: 'GSX-S150',
      year: 2024,
      color: 'Noir Mat',
      price: 9800,
      purchasePrice: 8500,
      chassisNumber: 'JS1GD79A902100789',
      engineNumber: 'D13A789012',
      company: 'GSM',
      status: 'reserved',
      stock: 1,
      image: '🏍️',
      arrivalDate: '12 Jan 2026',
      reservedBy: 'Fatma Trabelsi',
      reservedDate: '13 Jan 2026',
      features: ['Injection', 'LED', 'Digital Speedo'],
      description: 'Économique et fiable'
    },
    {
      id: 4,
      brand: 'Kawasaki',
      model: 'Ninja 300',
      year: 2024,
      color: 'Vert Kawasaki',
      price: 22500,
      purchasePrice: 19800,
      chassisNumber: 'JKAEXMJ17DA000234',
      engineNumber: 'EX300E234567',
      company: 'Sanya',
      status: 'in_stock',
      stock: 2,
      image: '🏍️',
      arrivalDate: '09 Jan 2026',
      features: ['ABS', 'Slipper Clutch', 'Twin Cylinder'],
      description: 'La référence des sportives'
    },
    {
      id: 5,
      brand: 'Yamaha',
      model: 'MT-03',
      year: 2024,
      color: 'Gris Foncé',
      price: 16800,
      purchasePrice: 14500,
      chassisNumber: 'JYARN23E00A000567',
      engineNumber: 'E4G15000567',
      company: 'Zimota',
      status: 'in_stock',
      stock: 1,
      image: '🏍️',
      arrivalDate: '11 Jan 2026',
      features: ['ABS', 'Naked Style', 'LED Headlight'],
      description: 'Style agressif et performance'
    },
    {
      id: 6,
      brand: 'Honda',
      model: 'CB 125F',
      year: 2024,
      color: 'Rouge/Noir',
      price: 7500,
      purchasePrice: 6200,
      chassisNumber: 'JH2JC81000K100890',
      engineNumber: 'JC81E890123',
      company: 'Forza',
      status: 'in_stock',
      stock: 5,
      image: '🏍️',
      arrivalDate: '07 Jan 2026',
      features: ['Économique', 'Confortable', 'Fiable'],
      description: 'Idéale pour les débutants'
    }
  ];

  const companies = ['all', 'Zimota', 'Forza', 'GSM', 'Sanya'];
  const brands = ['all', 'Yamaha', 'Honda', 'Suzuki', 'Kawasaki', 'KTM', 'BMW'];
  const colors = ['Noir', 'Blanc', 'Rouge', 'Bleu', 'Vert', 'Gris', 'Orange', 'Jaune', 'Noir Mat', 'Bleu Racing'];

  const getStatusInfo = (status) => {
    const statusMap = {
      in_stock: {
        label: 'En stock',
        icon: '✓',
        bgClass: 'bg-green-50 border-green-300',
        textClass: 'text-green-700',
        badgeClass: 'bg-green-100 text-green-700 border-green-200'
      },
      sold: {
        label: 'Vendu',
        icon: '🎉',
        bgClass: 'bg-slate-50 border-slate-300',
        textClass: 'text-slate-600',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
      },
      reserved: {
        label: 'Réservé',
        icon: '🔒',
        bgClass: 'bg-amber-50 border-amber-300',
        textClass: 'text-amber-700',
        badgeClass: 'bg-amber-100 text-amber-700 border-amber-200'
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

  const filteredMotorcycles = motorcycles.filter(moto => {
    const matchesStatus = filterStatus === 'all' || moto.status === filterStatus;
    const matchesCompany = filterCompany === 'all' || moto.company === filterCompany;
    const matchesBrand = filterBrand === 'all' || moto.brand === filterBrand;
    const matchesSearch = 
      moto.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      moto.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      moto.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCompany && matchesBrand && matchesSearch;
  });

  const stats = {
    total: motorcycles.length,
    inStock: motorcycles.filter(m => m.status === 'in_stock').length,
    sold: motorcycles.filter(m => m.status === 'sold').length,
    reserved: motorcycles.filter(m => m.status === 'reserved').length,
    totalValue: motorcycles
      .filter(m => m.status === 'in_stock')
      .reduce((sum, m) => sum + (m.price * m.stock), 0),
    totalStock: motorcycles
      .filter(m => m.status === 'in_stock')
      .reduce((sum, m) => sum + m.stock, 0)
  };

  const handleFormChange = (field, value) => {
    setMotoForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddMoto = () => {
    // TODO: Add to backend
    console.log('Adding motorcycle:', motoForm);
    setShowAddModal(false);
    // Reset form
    setMotoForm({
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      price: '',
      purchasePrice: '',
      chassisNumber: '',
      engineNumber: '',
      company: 'Zimota',
      status: 'in_stock',
      stock: 1,
      images: [],
      description: '',
      features: '',
      arrivalDate: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🏍️ Stock Motos</h1>
          <p className="text-slate-600 mt-1">Gérez votre inventaire de motos</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg shadow-xl transition-all transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter Moto
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📦</span>
            <span className="text-xs text-slate-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-600 mt-1">Motos</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✓</span>
            <span className="text-xs text-green-700">Stock</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.inStock}</p>
          <p className="text-xs text-green-600 mt-1">{stats.totalStock} unités</p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border border-slate-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🎉</span>
            <span className="text-xs text-slate-600">Vendues</span>
          </div>
          <p className="text-2xl font-bold text-slate-700">{stats.sold}</p>
          <p className="text-xs text-slate-600 mt-1">Ce mois</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🔒</span>
            <span className="text-xs text-amber-700">Réservées</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.reserved}</p>
          <p className="text-xs text-amber-600 mt-1">En attente</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200 hover:shadow-lg transition-all md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💰</span>
            <span className="text-xs text-blue-700">Valeur</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.totalValue.toLocaleString()} TND</p>
          <p className="text-xs text-blue-600 mt-1">Stock actuel</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Left - Search */}
          <div className="flex-1 w-full lg:w-auto">
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
                placeholder="Rechercher par marque, modèle, châssis..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right - Filters & View Mode */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">📊 Tous statuts</option>
              <option value="in_stock">✓ En stock</option>
              <option value="reserved">🔒 Réservées</option>
              <option value="sold">🎉 Vendues</option>
            </select>

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

            {/* Brand Filter */}
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {brands.map(brand => (
                <option key={brand} value={brand}>
                  {brand === 'all' ? '🏍️ Toutes marques' : brand}
                </option>
              ))}
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

      {/* Motorcycles Display - Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMotorcycles.map((moto) => {
            const statusInfo = getStatusInfo(moto.status);
            const profit = moto.price - moto.purchasePrice;
            const profitMargin = ((profit / moto.purchasePrice) * 100).toFixed(1);

            return (
              <div
                key={moto.id}
                className={`bg-white rounded-xl border-2 overflow-hidden hover:shadow-xl transition-all cursor-pointer group ${statusInfo.bgClass}`}
                onClick={() => setSelectedMoto(moto)}
              >
                
                {/* Image/Icon Section */}
                <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 h-48 flex items-center justify-center">
                  <span className="text-7xl group-hover:scale-110 transition-transform">{moto.image}</span>
                  
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                    {statusInfo.icon} {statusInfo.label}
                  </div>

                  {/* Stock Badge */}
                  {moto.status === 'in_stock' && moto.stock > 0 && (
                    <div className="absolute top-3 left-3 px-3 py-1 bg-white rounded-full text-xs font-bold text-slate-900 border border-slate-300 shadow-lg">
                      Stock: {moto.stock}
                    </div>
                  )}

                  {/* Company Badge */}
                  <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold border ${getCompanyColor(moto.company)}`}>
                    {moto.company}
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-5">
                  
                  {/* Brand & Model */}
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {moto.brand} {moto.model}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>{moto.year}</span>
                      <span>•</span>
                      <span>{moto.color}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-blue-600">
                        {moto.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-slate-600">TND</span>
                    </div>
                    {moto.status === 'in_stock' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">
                          Achat: {moto.purchasePrice.toLocaleString()} TND
                        </span>
                        <span className={`text-xs font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          +{profitMargin}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {moto.features.slice(0, 3).map((feature, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Chassis Number */}
                  <div className="text-xs text-slate-500 font-mono mb-4 truncate">
                    {moto.chassisNumber}
                  </div>

                  {/* Additional Info based on status */}
                  {moto.status === 'sold' && moto.soldTo && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-200">
                      <p className="text-xs text-slate-600 mb-1">Vendu à:</p>
                      <p className="text-sm font-semibold text-slate-900">{moto.soldTo}</p>
                      <p className="text-xs text-slate-500 mt-1">{moto.soldDate}</p>
                    </div>
                  )}

                  {moto.status === 'reserved' && moto.reservedBy && (
                    <div className="bg-amber-50 rounded-lg p-3 mb-3 border border-amber-200">
                      <p className="text-xs text-amber-700 mb-1">Réservé par:</p>
                      <p className="text-sm font-semibold text-amber-900">{moto.reservedBy}</p>
                      <p className="text-xs text-amber-600 mt-1">{moto.reservedDate}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMoto(moto);
                      }}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Voir détails
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Edit functionality
                      }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Moto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Fournisseur</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Châssis</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Prix vente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Prix achat</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Marge</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMotorcycles.map((moto) => {
                  const statusInfo = getStatusInfo(moto.status);
                  const profit = moto.price - moto.purchasePrice;
                  const profitMargin = ((profit / moto.purchasePrice) * 100).toFixed(1);

                  return (
                    <tr key={moto.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{moto.image}</span>
                          <div>
                            <p className="font-bold text-slate-900">
                              {moto.brand} {moto.model}
                            </p>
                            <p className="text-sm text-slate-600">
                              {moto.year} • {moto.color}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCompanyColor(moto.company)}`}>
                          {moto.company}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-slate-700">{moto.chassisNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-blue-600">
                          {moto.price.toLocaleString()} TND
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {moto.purchasePrice.toLocaleString()} TND
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className={`text-sm font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            +{profit.toLocaleString()} TND
                          </span>
                          <p className="text-xs text-slate-500">({profitMargin}%)</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-slate-900">{moto.stock}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedMoto(moto)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Voir"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Modifier">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredMotorcycles.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Aucune moto trouvée</h3>
          <p className="text-slate-600 mb-6">Modifiez vos filtres ou ajoutez une nouvelle moto</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Ajouter une moto
          </button>
        </div>
      )}

      {/* Add/Edit Motorcycle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                  🏍️
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Ajouter une moto</h2>
                  <p className="text-slate-600">Ajoutez une nouvelle moto à votre stock</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Company */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Fournisseur <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={motoForm.company}
                    onChange={(e) => handleFormChange('company', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Zimota">Zimota</option>
                    <option value="Forza">Forza</option>
                    <option value="GSM">GSM</option>
                    <option value="Sanya">Sanya</option>
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Marque <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={motoForm.brand}
                    onChange={(e) => handleFormChange('brand', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner</option>
                    {brands.filter(b => b !== 'all').map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Modèle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={motoForm.model}
                    onChange={(e) => handleFormChange('model', e.target.value)}
                    placeholder="R125, CBR 250..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Année
                  </label>
                  <input
                    type="number"
                    value={motoForm.year}
                    onChange={(e) => handleFormChange('year', e.target.value)}
                    min="2020"
                    max="2026"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Couleur
                  </label>
                  <select
                    value={motoForm.color}
                    onChange={(e) => handleFormChange('color', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner</option>
                    {colors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Prix d'achat (TND) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={motoForm.purchasePrice}
                    onChange={(e) => handleFormChange('purchasePrice', e.target.value)}
                    placeholder="10500"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Prix de vente (TND) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={motoForm.price}
                    onChange={(e) => handleFormChange('price', e.target.value)}
                    placeholder="12500"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {motoForm.price && motoForm.purchasePrice && (
                    <p className="text-xs text-green-600 mt-1 font-semibold">
                      Marge: +{(motoForm.price - motoForm.purchasePrice).toLocaleString()} TND
                      ({(((motoForm.price - motoForm.purchasePrice) / motoForm.purchasePrice) * 100).toFixed(1)}%)
                    </p>
                  )}
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Quantité en stock
                  </label>
                  <input
                    type="number"
                    value={motoForm.stock}
                    onChange={(e) => handleFormChange('stock', e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Chassis Number */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Numéro de châssis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={motoForm.chassisNumber}
                    onChange={(e) => handleFormChange('chassisNumber', e.target.value.toUpperCase())}
                    placeholder="JYARN23E00A000123"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Engine Number */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Numéro moteur
                  </label>
                  <input
                    type="text"
                    value={motoForm.engineNumber}
                    onChange={(e) => handleFormChange('engineNumber', e.target.value.toUpperCase())}
                    placeholder="E4G15000123"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Arrival Date */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Date d'arrivée
                  </label>
                  <input
                    type="date"
                    value={motoForm.arrivalDate}
                    onChange={(e) => handleFormChange('arrivalDate', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Features */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Caractéristiques (séparées par des virgules)
                  </label>
                  <input
                    type="text"
                    value={motoForm.features}
                    onChange={(e) => handleFormChange('features', e.target.value)}
                    placeholder="ABS, LED Lights, Digital Display"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={motoForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Sportive et agile, parfaite pour la ville..."
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddMoto}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                Ajouter la moto
              </button>
            </div>

          </div>
        </div>
      )}

      {/* View Motorcycle Detail Modal */}
      {selectedMoto && !showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-br from-blue-600 to-cyan-600 text-white p-8 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-black mb-2">
                  {selectedMoto.brand} {selectedMoto.model}
                </h2>
                <p className="text-blue-100">{selectedMoto.year} • {selectedMoto.color}</p>
              </div>
              <button
                onClick={() => setSelectedMoto(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6">
              
              {/* Price & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <p className="text-sm text-blue-700 mb-1">Prix de vente</p>
                  <p className="text-3xl font-black text-blue-900">
                    {selectedMoto.price.toLocaleString()} TND
                  </p>
                </div>
                <div className={`rounded-xl p-6 border ${getStatusInfo(selectedMoto.status).bgClass}`}>
                  <p className="text-sm text-slate-600 mb-1">Statut</p>
                  <p className={`text-2xl font-black ${getStatusInfo(selectedMoto.status).textClass}`}>
                    {getStatusInfo(selectedMoto.status).icon} {getStatusInfo(selectedMoto.status).label}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-lg mb-4">📋 Détails techniques</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Fournisseur</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getCompanyColor(selectedMoto.company)}`}>
                      {selectedMoto.company}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Stock</p>
                    <p className="font-bold text-slate-900">{selectedMoto.stock} unité(s)</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Numéro châssis</p>
                    <p className="font-mono text-sm font-semibold text-slate-900">{selectedMoto.chassisNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Numéro moteur</p>
                    <p className="font-mono text-sm font-semibold text-slate-900">{selectedMoto.engineNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Prix d'achat</p>
                    <p className="font-bold text-slate-900">{selectedMoto.purchasePrice.toLocaleString()} TND</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Marge bénéficiaire</p>
                    <p className="font-bold text-green-600">
                      +{(selectedMoto.price - selectedMoto.purchasePrice).toLocaleString()} TND
                      ({(((selectedMoto.price - selectedMoto.purchasePrice) / selectedMoto.purchasePrice) * 100).toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-3">✨ Caractéristiques</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMoto.features.map((feature, idx) => (
                    <span key={idx} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              {selectedMoto.description && (
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-3">📝 Description</h3>
                  <p className="text-slate-700 leading-relaxed">{selectedMoto.description}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-3">📅 Historique</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      📦
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Arrivée en stock</p>
                      <p className="text-sm text-slate-600">{selectedMoto.arrivalDate}</p>
                    </div>
                  </div>
                  {selectedMoto.reservedDate && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        🔒
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Réservée par {selectedMoto.reservedBy}</p>
                        <p className="text-sm text-slate-600">{selectedMoto.reservedDate}</p>
                      </div>
                    </div>
                  )}
                  {selectedMoto.soldDate && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        🎉
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Vendue à {selectedMoto.soldTo}</p>
                        <p className="text-sm text-slate-600">{selectedMoto.soldDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                {selectedMoto.status === 'in_stock' && (
                  <>
                    <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
                      📝 Créer facture
                    </button>
                    <button className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors">
                      🔒 Réserver
                    </button>
                  </>
                )}
                <button className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors">
                  ✏️ Modifier
                </button>
                <button className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
                  🗑️ Supprimer
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default MotorcyclesPage;
