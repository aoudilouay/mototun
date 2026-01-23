import { useState } from 'react';

function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('generate'); // generate or archive
  const [currentStep, setCurrentStep] = useState(1); // 1: Client, 2: Motorcycle, 3: Payment, 4: Preview
  const [showPreview, setShowPreview] = useState(false);

  // Form data
  const [invoiceData, setInvoiceData] = useState({
    // Client Info
    clientName: '',
    clientCIN: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientCity: '',
    
    // Motorcycle Info
    motorcycleBrand: '',
    motorcycleModel: '',
    motorcycleYear: new Date().getFullYear(),
    motorcycleColor: '',
    chassisNumber: '',
    engineNumber: '',
    company: 'Zimota',
    motorcyclePrice: '',
    
    // Payment Info
    totalPrice: '',
    advancePayment: '',
    remainingPayment: '',
    paymentMethod: 'cash', // cash, bank_transfer, check
    paymentStatus: 'paid', // paid, partial, pending
    
    // Additional
    notes: '',
    warranty: '12', // months
    deliveryDate: ''
  });

  // Mock archived invoices
  const archivedInvoices = [
    {
      id: 'INV-2024-001',
      clientName: 'Ahmed Ben Salah',
      motorcycle: 'Yamaha R125',
      amount: '12,500 TND',
      date: '15 Jan 2026',
      status: 'paid',
      company: 'Zimota'
    },
    {
      id: 'INV-2024-002',
      clientName: 'Karim Mohamed',
      motorcycle: 'Honda CBR 250',
      amount: '18,900 TND',
      date: '14 Jan 2026',
      status: 'partial',
      company: 'Forza'
    },
    {
      id: 'INV-2024-003',
      clientName: 'Fatma Trabelsi',
      motorcycle: 'Suzuki GSX-S150',
      amount: '9,800 TND',
      date: '13 Jan 2026',
      status: 'paid',
      company: 'GSM'
    }
  ];

  const handleInputChange = (field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calculate remaining payment
    if (field === 'totalPrice' || field === 'advancePayment') {
      const total = parseFloat(field === 'totalPrice' ? value : invoiceData.totalPrice) || 0;
      const advance = parseFloat(field === 'advancePayment' ? value : invoiceData.advancePayment) || 0;
      setInvoiceData(prev => ({
        ...prev,
        remainingPayment: (total - advance).toString()
      }));
    }
  };

  const validateStep = (step) => {
    switch(step) {
      case 1:
        return invoiceData.clientName && invoiceData.clientCIN && invoiceData.clientPhone && invoiceData.clientAddress;
      case 2:
        return invoiceData.motorcycleBrand && invoiceData.motorcycleModel && invoiceData.chassisNumber && invoiceData.motorcyclePrice;
      case 3:
        return invoiceData.totalPrice && invoiceData.paymentMethod;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        setShowPreview(true);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const companies = ['Zimota', 'Forza', 'GSM', 'Sanya'];
  const motorcycleBrands = ['Yamaha', 'Honda', 'Suzuki', 'Kawasaki', 'KTM', 'BMW'];
  const colors = ['Noir', 'Blanc', 'Rouge', 'Bleu', 'Vert', 'Gris', 'Orange', 'Jaune'];
  const cities = ['Tunis', 'Sousse', 'Sfax', 'Monastir', 'Nabeul', 'Kairouan', 'Bizerte', 'Gabès'];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">💰 Gestion des Factures</h1>
          <p className="text-slate-600 mt-1">Créez et gérez vos factures professionnelles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
            activeTab === 'generate'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          ✨ Créer une facture
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
            activeTab === 'archive'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          📂 Archive ({archivedInvoices.length})
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          
          {/* Progress Steps */}
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-8">
              {[
                { num: 1, label: 'Client', icon: '👤' },
                { num: 2, label: 'Moto', icon: '🏍️' },
                { num: 3, label: 'Paiement', icon: '💳' },
                { num: 4, label: 'Aperçu', icon: '📄' }
              ].map((step, index) => (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center font-bold text-lg transition-all ${
                      currentStep >= step.num
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-xl scale-110'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span className="text-2xl">{step.icon}</span>
                    </div>
                    <p className={`text-sm font-semibold mt-3 ${
                      currentStep >= step.num ? 'text-blue-600' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  {index < 3 && (
                    <div className={`flex-1 h-1 mx-4 rounded-full transition-all ${
                      currentStep > step.num ? 'bg-gradient-to-r from-blue-500 to-cyan-600' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            
            {/* Step 1: Client Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-2xl">
                    👤
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Informations Client</h2>
                    <p className="text-slate-600">Entrez les détails du client</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Client Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nom complet <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceData.clientName}
                      onChange={(e) => handleInputChange('clientName', e.target.value)}
                      placeholder="Ahmed Ben Salah"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* CIN */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Numéro CIN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceData.clientCIN}
                      onChange={(e) => handleInputChange('clientCIN', e.target.value)}
                      placeholder="12345678"
                      maxLength={8}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Téléphone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={invoiceData.clientPhone}
                      onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                      placeholder="+216 XX XXX XXX"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={invoiceData.clientEmail}
                      onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                      placeholder="ahmed@email.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Adresse <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceData.clientAddress}
                      onChange={(e) => handleInputChange('clientAddress', e.target.value)}
                      placeholder="Rue de la République, Apt 12"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Ville
                    </label>
                    <select
                      value={invoiceData.clientCity}
                      onChange={(e) => handleInputChange('clientCity', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Sélectionner une ville</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>
            )}

            {/* Step 2: Motorcycle Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                    🏍️
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Informations Moto</h2>
                    <p className="text-slate-600">Détails de la moto vendue</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Company */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Fournisseur <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={invoiceData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      {companies.map(company => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                    </select>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Marque <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={invoiceData.motorcycleBrand}
                      onChange={(e) => handleInputChange('motorcycleBrand', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Sélectionner</option>
                      {motorcycleBrands.map(brand => (
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
                      value={invoiceData.motorcycleModel}
                      onChange={(e) => handleInputChange('motorcycleModel', e.target.value)}
                      placeholder="R125, CBR 250, Ninja 300..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Année
                    </label>
                    <input
                      type="number"
                      value={invoiceData.motorcycleYear}
                      onChange={(e) => handleInputChange('motorcycleYear', e.target.value)}
                      min="2020"
                      max="2026"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Couleur
                    </label>
                    <select
                      value={invoiceData.motorcycleColor}
                      onChange={(e) => handleInputChange('motorcycleColor', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Sélectionner</option>
                      {colors.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>

                  {/* Chassis Number */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Numéro de châssis <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceData.chassisNumber}
                      onChange={(e) => handleInputChange('chassisNumber', e.target.value.toUpperCase())}
                      placeholder="JYARN23E00A000123"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>

                  {/* Engine Number */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Numéro moteur
                    </label>
                    <input
                      type="text"
                      value={invoiceData.engineNumber}
                      onChange={(e) => handleInputChange('engineNumber', e.target.value.toUpperCase())}
                      placeholder="E4G15000123"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>

                  {/* Motorcycle Price */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Prix de la moto (TND) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={invoiceData.motorcyclePrice}
                      onChange={(e) => handleInputChange('motorcyclePrice', e.target.value)}
                      placeholder="12500"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-bold"
                    />
                  </div>

                </div>
              </div>
            )}

            {/* Step 3: Payment Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl">
                    💳
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Paiement</h2>
                    <p className="text-slate-600">Détails de paiement et livraison</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Total Price */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Prix total (TND) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={invoiceData.totalPrice}
                      onChange={(e) => handleInputChange('totalPrice', e.target.value)}
                      placeholder="15000"
                      className="w-full px-4 py-4 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-2xl font-black text-blue-600"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Prix moto + Carte grise + Assurance + Autres frais
                    </p>
                  </div>

                  {/* Advance Payment */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Avance payée (TND)
                    </label>
                    <input
                      type="number"
                      value={invoiceData.advancePayment}
                      onChange={(e) => handleInputChange('advancePayment', e.target.value)}
                      placeholder="5000"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Remaining Payment */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Reste à payer (TND)
                    </label>
                    <input
                      type="number"
                      value={invoiceData.remainingPayment}
                      readOnly
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-bold"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Méthode de paiement <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={invoiceData.paymentMethod}
                      onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="cash">💵 Espèces</option>
                      <option value="bank_transfer">🏦 Virement bancaire</option>
                      <option value="check">📝 Chèque</option>
                      <option value="card">💳 Carte bancaire</option>
                    </select>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Statut paiement
                    </label>
                    <select
                      value={invoiceData.paymentStatus}
                      onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="paid">✓ Payé intégralement</option>
                      <option value="partial">⏳ Paiement partiel</option>
                      <option value="pending">❌ En attente</option>
                    </select>
                  </div>

                  {/* Warranty */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Garantie (mois)
                    </label>
                    <select
                      value={invoiceData.warranty}
                      onChange={(e) => handleInputChange('warranty', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="0">Aucune garantie</option>
                      <option value="6">6 mois</option>
                      <option value="12">12 mois</option>
                      <option value="24">24 mois</option>
                      <option value="36">36 mois</option>
                    </select>
                  </div>

                  {/* Delivery Date */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date de livraison
                    </label>
                    <input
                      type="date"
                      value={invoiceData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Notes supplémentaires
                    </label>
                    <textarea
                      value={invoiceData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Accessoires inclus, conditions spéciales, etc..."
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                </div>
              </div>
            )}

            {/* Step 4: Preview */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-2xl">
                    📄
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Aperçu de la facture</h2>
                    <p className="text-slate-600">Vérifiez les informations avant de générer</p>
                  </div>
                </div>

                {/* Invoice Preview */}
                <div className="border-2 border-slate-300 rounded-xl p-8 bg-white shadow-xl">
                  
                  {/* Invoice Header */}
                  <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-200">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-lg">TM</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">TUNIMOTO</h3>
                          <p className="text-sm text-slate-600">Votre revendeur de confiance</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Tunis, Tunisia<br />
                        Tel: +216 XX XXX XXX<br />
                        Email: contact@tunimoto.tn
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-4 py-2 bg-blue-600 text-white font-bold rounded-lg mb-2">
                        FACTURE
                      </div>
                      <p className="text-sm text-slate-600">
                        N°: <strong>INV-2024-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</strong>
                      </p>
                      <p className="text-sm text-slate-600">
                        Date: <strong>{new Date().toLocaleDateString('fr-FR')}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-8">
                    <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wider">Facturé à:</h4>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="font-bold text-slate-900">{invoiceData.clientName}</p>
                      <p className="text-sm text-slate-600">CIN: {invoiceData.clientCIN}</p>
                      <p className="text-sm text-slate-600">{invoiceData.clientAddress}</p>
                      <p className="text-sm text-slate-600">{invoiceData.clientCity}</p>
                      <p className="text-sm text-slate-600">{invoiceData.clientPhone}</p>
                      {invoiceData.clientEmail && (
                        <p className="text-sm text-slate-600">{invoiceData.clientEmail}</p>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-8">
                    <table className="w-full">
                      <thead className="bg-slate-100 border-y-2 border-slate-300">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-bold text-slate-700">Description</th>
                          <th className="text-right px-4 py-3 text-sm font-bold text-slate-700">Prix</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-900">
                              {invoiceData.motorcycleBrand} {invoiceData.motorcycleModel} ({invoiceData.motorcycleYear})
                            </p>
                            <p className="text-sm text-slate-600">Couleur: {invoiceData.motorcycleColor}</p>
                            <p className="text-xs text-slate-500 font-mono">Châssis: {invoiceData.chassisNumber}</p>
                            <p className="text-xs text-slate-500">Fournisseur: {invoiceData.company}</p>
                            {invoiceData.warranty > 0 && (
                              <p className="text-xs text-green-600 font-semibold mt-1">
                                ✓ Garantie {invoiceData.warranty} mois incluse
                              </p>
                            )}
                          </td>
                          <td className="text-right px-4 py-4 font-bold text-slate-900">
                            {invoiceData.motorcyclePrice} TND
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end mb-8">
                    <div className="w-80 space-y-3">
                      <div className="flex justify-between text-slate-700">
                        <span>Sous-total:</span>
                        <span className="font-semibold">{invoiceData.motorcyclePrice} TND</span>
                      </div>
                      <div className="flex justify-between text-slate-700 border-t pt-3">
                        <span className="text-xl font-bold">TOTAL:</span>
                        <span className="text-xl font-bold text-blue-600">{invoiceData.totalPrice} TND</span>
                      </div>
                      {parseFloat(invoiceData.advancePayment) > 0 && (
                        <>
                          <div className="flex justify-between text-green-700">
                            <span>Avance payée:</span>
                            <span className="font-semibold">- {invoiceData.advancePayment} TND</span>
                          </div>
                          <div className="flex justify-between text-red-700 border-t pt-3">
                            <span className="font-bold">Reste à payer:</span>
                            <span className="font-bold">{invoiceData.remainingPayment} TND</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-bold text-blue-900 mb-2">💳 Informations de paiement</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600">Méthode:</span>
                        <span className="ml-2 font-semibold text-slate-900">
                          {invoiceData.paymentMethod === 'cash' && '💵 Espèces'}
                          {invoiceData.paymentMethod === 'bank_transfer' && '🏦 Virement'}
                          {invoiceData.paymentMethod === 'check' && '📝 Chèque'}
                          {invoiceData.paymentMethod === 'card' && '💳 Carte'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Statut:</span>
                        <span className={`ml-2 font-semibold ${
                          invoiceData.paymentStatus === 'paid' ? 'text-green-700' :
                          invoiceData.paymentStatus === 'partial' ? 'text-amber-700' :
                          'text-red-700'
                        }`}>
                          {invoiceData.paymentStatus === 'paid' && '✓ Payé'}
                          {invoiceData.paymentStatus === 'partial' && '⏳ Partiel'}
                          {invoiceData.paymentStatus === 'pending' && '❌ En attente'}
                        </span>
                      </div>
                    </div>
                    {invoiceData.deliveryDate && (
                      <div className="mt-3 text-sm">
                        <span className="text-slate-600">Livraison prévue:</span>
                        <span className="ml-2 font-semibold text-slate-900">
                          {new Date(invoiceData.deliveryDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {invoiceData.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                      <h4 className="font-bold text-amber-900 mb-2">📝 Notes</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{invoiceData.notes}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-center text-xs text-slate-500 border-t-2 border-slate-200 pt-6">
                    <p>Merci de votre confiance! 🙏</p>
                    <p className="mt-2">Pour toute question, contactez-nous: contact@tunimoto.tn</p>
                  </div>

                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-8 border-t border-slate-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all ${
                  currentStep === 1
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Précédent
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={nextStep}
                  disabled={!validateStep(currentStep)}
                  className={`flex items-center gap-2 px-8 py-3 font-semibold rounded-lg transition-all transform ${
                    validateStep(currentStep)
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:-translate-y-0.5'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Suivant
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Envoyer par email
                  </button>
                  <button className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg shadow-xl transition-all transform hover:-translate-y-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Télécharger PDF
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Archive Tab */}
      {activeTab === 'archive' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">📂 Factures archivées</h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                />
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">
                  📥 Exporter tout
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">N° Facture</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Moto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Fournisseur</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Montant</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {archivedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-slate-900">{invoice.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">{invoice.clientName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700">{invoice.motorcycle}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                        {invoice.company}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{invoice.amount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {invoice.status === 'paid' ? '✓ Payé' : '⏳ Partiel'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{invoice.date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Télécharger">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default InvoicesPage;
