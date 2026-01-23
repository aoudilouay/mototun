import { useState } from 'react';

function FournisseurMessagingPage() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, unread, urgent, archived
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Mock conversations data - All with revendeurs
  const conversations = [
    {
      id: 1,
      revendeur: 'Karim Moto Shop',
      revendeurAvatar: 'KM',
      contact: 'Karim Mohamed',
      city: 'Sousse',
      lastMessage: 'Quand arrivent les Yamaha R125?',
      timestamp: 'Il y a 2 min',
      unread: 2,
      online: true,
      urgent: true,
      archived: false,
      messages: [
        { id: 1, sender: 'them', text: 'Bonjour, j\'ai besoin d\'informations', time: '14:30' },
        { id: 2, sender: 'me', text: 'Bonjour Karim! Comment puis-je vous aider?', time: '14:32' },
        { id: 3, sender: 'them', text: 'Quand arrivent les Yamaha R125?', time: '14:35' }
      ]
    },
    {
      id: 2,
      revendeur: 'Moto Plus Tunis',
      revendeurAvatar: 'MP',
      contact: 'Ahmed Benali',
      city: 'Tunis',
      lastMessage: 'Les documents sont prêts',
      timestamp: 'Il y a 10 min',
      unread: 1,
      online: true,
      urgent: false,
      archived: false,
      messages: [
        { id: 1, sender: 'me', text: 'Bonjour Ahmed, votre commande est prête', time: '13:00' },
        { id: 2, sender: 'them', text: 'Les documents sont prêts', time: '13:15' }
      ]
    },
    {
      id: 3,
      revendeur: 'Speed Bikes Sfax',
      revendeurAvatar: 'SB',
      contact: 'Mohamed Trabelsi',
      city: 'Sfax',
      lastMessage: 'Merci pour la livraison rapide!',
      timestamp: 'Il y a 1h',
      unread: 0,
      online: false,
      urgent: false,
      archived: false,
      messages: [
        { id: 1, sender: 'them', text: 'Merci pour la livraison rapide!', time: '12:00' },
        { id: 2, sender: 'me', text: 'Avec plaisir! N\'hésitez pas pour vos prochaines commandes', time: '12:05' }
      ]
    },
    {
      id: 4,
      revendeur: 'Racing Moto',
      revendeurAvatar: 'RM',
      contact: 'Salah Eddine',
      city: 'Monastir',
      lastMessage: 'Question sur la facture #INV-2024-089',
      timestamp: 'Il y a 2h',
      unread: 3,
      online: true,
      urgent: true,
      archived: false,
      messages: [
        { id: 1, sender: 'them', text: 'Question sur la facture #INV-2024-089', time: '11:30' },
        { id: 2, sender: 'them', text: 'Il y a une erreur sur le montant', time: '11:31' },
        { id: 3, sender: 'them', text: 'Pouvez-vous vérifier?', time: '11:32' }
      ]
    },
    {
      id: 5,
      revendeur: 'Moto Center',
      revendeurAvatar: 'MC',
      contact: 'Youssef Gharbi',
      city: 'Bizerte',
      lastMessage: 'Besoin de 5 Yamaha MT-03 urgents',
      timestamp: 'Il y a 3h',
      unread: 1,
      online: false,
      urgent: true,
      archived: false,
      messages: [
        { id: 1, sender: 'them', text: 'Besoin de 5 Yamaha MT-03 urgents', time: '10:00' }
      ]
    },
    {
      id: 6,
      revendeur: 'Elite Bikes',
      revendeurAvatar: 'EB',
      contact: 'Fatma Ben Said',
      city: 'Nabeul',
      lastMessage: 'OK merci!',
      timestamp: 'Hier',
      unread: 0,
      online: false,
      urgent: false,
      archived: false,
      messages: [
        { id: 1, sender: 'me', text: 'Votre commande sera livrée demain', time: 'Hier 16:00' },
        { id: 2, sender: 'them', text: 'OK merci!', time: 'Hier 16:05' }
      ]
    },
    {
      id: 7,
      revendeur: 'Pro Moto',
      revendeurAvatar: 'PM',
      contact: 'Ali Bouazizi',
      city: 'Gabès',
      lastMessage: 'Catalogue 2026 disponible?',
      timestamp: '2 jours',
      unread: 0,
      online: true,
      urgent: false,
      archived: false,
      messages: [
        { id: 1, sender: 'them', text: 'Catalogue 2026 disponible?', time: 'Lun 14:00' },
        { id: 2, sender: 'me', text: 'Oui, je vous l\'envoie par email', time: 'Lun 14:15' }
      ]
    },
    {
      id: 8,
      revendeur: 'Turbo Bikes',
      revendeurAvatar: 'TB',
      contact: 'Karim Jebali',
      city: 'Sousse',
      lastMessage: 'Promotion terminée?',
      timestamp: '3 jours',
      unread: 0,
      online: false,
      urgent: false,
      archived: true,
      messages: [
        { id: 1, sender: 'them', text: 'Promotion terminée?', time: 'Sam 10:00' },
        { id: 2, sender: 'me', text: 'Oui, mais nouvelle promo la semaine prochaine', time: 'Sam 10:30' }
      ]
    }
  ];

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.revendeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' ? !conv.archived :
      filterStatus === 'unread' ? conv.unread > 0 :
      filterStatus === 'urgent' ? conv.urgent :
      filterStatus === 'archived' ? conv.archived :
      true;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: conversations.filter(c => !c.archived).length,
    unread: conversations.filter(c => c.unread > 0).length,
    urgent: conversations.filter(c => c.urgent && !c.archived).length,
    online: conversations.filter(c => c.online && !c.archived).length,
    archived: conversations.filter(c => c.archived).length
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;
    
    console.log('Sending message:', messageText);
    selectedConversation.messages.push({
      id: selectedConversation.messages.length + 1,
      sender: 'me',
      text: messageText,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
    setMessageText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMarkAsUrgent = (convId) => {
    console.log('Marking conversation as urgent:', convId);
  };

  const handleArchive = (convId) => {
    console.log('Archiving conversation:', convId);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            💬 Messagerie
            {totalUnread > 0 && (
              <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold animate-pulse">
                {totalUnread} nouveau{totalUnread > 1 ? 'x' : ''}
              </span>
            )}
          </h1>
          <p className="text-slate-600 mt-1">Communiquez avec vos revendeurs</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Diffusion
          </button>
          <button
            onClick={() => setShowComposeModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau message
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3 overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="text-lg">📊</span>
            <span>Tous ({stats.total})</span>
          </button>

          <button
            onClick={() => setFilterStatus('unread')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filterStatus === 'unread'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="text-lg">📬</span>
            <span>Non lus ({stats.unread})</span>
          </button>

          <button
            onClick={() => setFilterStatus('urgent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filterStatus === 'urgent'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
            }`}
          >
            <span className="text-lg">🔥</span>
            <span>Urgents ({stats.urgent})</span>
          </button>

          <button
            onClick={() => setFilterStatus('online')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filterStatus === 'online'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
            }`}
          >
            <span className="text-lg">🟢</span>
            <span>En ligne ({stats.online})</span>
          </button>

          <button
            onClick={() => setFilterStatus('archived')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filterStatus === 'archived'
                ? 'bg-slate-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="text-lg">📦</span>
            <span>Archivés ({stats.archived})</span>
          </button>
        </div>
      </div>

      {/* Main Messaging Interface */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 320px)' }}>
        <div className="grid grid-cols-12 h-full">
          
          {/* LEFT SIDEBAR - Conversations List */}
          <div className="col-span-4 border-r border-slate-200 flex flex-col">
            
            {/* Search */}
            <div className="p-4 border-b border-slate-200">
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
                  placeholder="Rechercher revendeur, ville..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium">Aucune conversation trouvée</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${
                      selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {conv.revendeurAvatar}
                        </div>
                        {conv.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                        {conv.urgent && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs">🔥</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-bold truncate ${
                            conv.unread > 0 ? 'text-slate-900' : 'text-slate-700'
                          }`}>
                            {conv.revendeur}
                          </p>
                          <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                            {conv.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{conv.contact} • {conv.city}</p>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${
                            conv.unread > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'
                          }`}>
                            {conv.lastMessage}
                          </p>
                          {conv.unread > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-bold flex-shrink-0">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* RIGHT SIDE - Chat Area */}
          <div className="col-span-8 flex flex-col">
            
            {!selectedConversation ? (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Sélectionnez une conversation</h3>
                <p className="text-slate-600 mb-6">Choisissez un revendeur pour commencer à discuter</p>
                <button
                  onClick={() => setShowComposeModal(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Nouveau message
                </button>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {selectedConversation.revendeurAvatar}
                        </div>
                        {selectedConversation.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-2">
                          {selectedConversation.revendeur}
                          {selectedConversation.urgent && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-bold">
                              🔥 Urgent
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-600">
                          {selectedConversation.contact} • {selectedConversation.city}
                          {selectedConversation.online && (
                            <span className="ml-2 text-green-600 font-medium">● En ligne</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMarkAsUrgent(selectedConversation.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedConversation.urgent
                            ? 'bg-red-100 text-red-600'
                            : 'hover:bg-slate-200 text-slate-600'
                        }`}
                        title="Marquer comme urgent"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Appel vocal">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Voir le profil">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleArchive(selectedConversation.id)}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Archiver"
                      >
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {selectedConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${msg.sender === 'me' ? 'order-2' : 'order-1'}`}>
                        <div className={`rounded-2xl px-4 py-3 ${
                          msg.sender === 'me'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-900'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                        </div>
                        <p className={`text-xs text-slate-400 mt-1 px-2 ${
                          msg.sender === 'me' ? 'text-right' : 'text-left'
                        }`}>
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-slate-200 bg-white">
                  <div className="flex items-end gap-3">
                    
                    <button className="p-3 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>

                    <div className="flex-1 relative">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Écrivez votre message..."
                        rows={1}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                        style={{ maxHeight: '120px' }}
                      />
                    </div>

                    <button className="p-3 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    <button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                      className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>

                  </div>
                </div>
              </>
            )}

          </div>

        </div>
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <ComposeMessageModal onClose={() => setShowComposeModal(false)} />
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <BroadcastModal onClose={() => setShowBroadcastModal(false)} />
      )}

    </div>
  );
}

// Compose Message Modal
function ComposeMessageModal({ onClose }) {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');

  const revendeurs = [
    { id: 1, name: 'Karim Moto Shop', avatar: 'KM', city: 'Sousse' },
    { id: 2, name: 'Moto Plus Tunis', avatar: 'MP', city: 'Tunis' },
    { id: 3, name: 'Speed Bikes Sfax', avatar: 'SB', city: 'Sfax' },
    { id: 4, name: 'Racing Moto', avatar: 'RM', city: 'Monastir' },
    { id: 5, name: 'Moto Center', avatar: 'MC', city: 'Bizerte' }
  ];

  const handleSend = () => {
    if (!recipient || !message.trim()) return;
    console.log('Sending message to:', recipient, message);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">📝 Nouveau message</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Revendeur</label>
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner un revendeur</option>
              {revendeurs.map(r => (
                <option key={r.id} value={r.name}>
                  {r.avatar} {r.name} - {r.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              rows={8}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={!recipient || !message.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
            >
              📤 Envoyer
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

// Broadcast Modal (Send to multiple revendeurs)
function BroadcastModal({ onClose }) {
  const [message, setMessage] = useState('');
  const [selectedRevendeurs, setSelectedRevendeurs] = useState([]);

  const revendeurs = [
    { id: 1, name: 'Karim Moto Shop', avatar: 'KM', city: 'Sousse' },
    { id: 2, name: 'Moto Plus Tunis', avatar: 'MP', city: 'Tunis' },
    { id: 3, name: 'Speed Bikes Sfax', avatar: 'SB', city: 'Sfax' },
    { id: 4, name: 'Racing Moto', avatar: 'RM', city: 'Monastir' },
    { id: 5, name: 'Moto Center', avatar: 'MC', city: 'Bizerte' },
    { id: 6, name: 'Elite Bikes', avatar: 'EB', city: 'Nabeul' },
    { id: 7, name: 'Pro Moto', avatar: 'PM', city: 'Gabès' }
  ];

  const toggleRevendeur = (id) => {
    if (selectedRevendeurs.includes(id)) {
      setSelectedRevendeurs(selectedRevendeurs.filter(r => r !== id));
    } else {
      setSelectedRevendeurs([...selectedRevendeurs, id]);
    }
  };

  const selectAll = () => {
    setSelectedRevendeurs(revendeurs.map(r => r.id));
  };

  const handleBroadcast = () => {
    if (selectedRevendeurs.length === 0 || !message.trim()) return;
    console.log('Broadcasting to:', selectedRevendeurs, message);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              📢 Diffusion de message
            </h2>
            <p className="text-sm text-slate-600 mt-1">Envoyer un message à plusieurs revendeurs en même temps</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-slate-700">
                Destinataires ({selectedRevendeurs.length}/{revendeurs.length})
              </label>
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                {selectedRevendeurs.length === revendeurs.length ? 'Désélectionner tout' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
              {revendeurs.map(revendeur => (
                <div
                  key={revendeur.id}
                  onClick={() => toggleRevendeur(revendeur.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRevendeurs.includes(revendeur.id)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRevendeurs.includes(revendeur.id)}
                      onChange={() => {}}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                    />
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {revendeur.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{revendeur.name}</p>
                      <p className="text-xs text-slate-500">{revendeur.city}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez votre message de diffusion..."
              rows={6}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleBroadcast}
              disabled={selectedRevendeurs.length === 0 || !message.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
            >
              📢 Diffuser à {selectedRevendeurs.length} revendeur{selectedRevendeurs.length > 1 ? 's' : ''}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default FournisseurMessagingPage;
