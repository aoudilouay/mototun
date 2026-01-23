import { useState } from 'react';

function MessagingPage() {
  const [activeTab, setActiveTab] = useState('inbox'); // inbox, sent, compose
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, fournisseur, client
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Mock conversations data
  const conversations = [
    {
      id: 1,
      type: 'fournisseur',
      name: 'Zimota',
      avatar: '🏢',
      lastMessage: 'Les documents pour la carte grise de Mohamed sont prêts',
      timestamp: 'Il y a 5 min',
      unread: 3,
      online: true,
      messages: [
        { id: 1, sender: 'them', text: 'Bonjour Karim, comment allez-vous?', time: '10:30' },
        { id: 2, sender: 'me', text: 'Très bien merci! Vous avez du nouveau?', time: '10:32' },
        { id: 3, sender: 'them', text: 'Oui, les documents pour la carte grise de Mohamed sont prêts', time: '10:35' },
        { id: 4, sender: 'me', text: 'Excellent! Je passe les récupérer demain', time: '10:36' }
      ]
    },
    {
      id: 2,
      type: 'client',
      name: 'Mohamed Ali',
      avatar: 'MA',
      lastMessage: 'Quand est-ce que ma moto sera prête?',
      timestamp: 'Il y a 15 min',
      unread: 1,
      online: true,
      messages: [
        { id: 1, sender: 'them', text: 'Bonjour, j\'ai une question sur ma commande', time: '14:20' },
        { id: 2, sender: 'me', text: 'Bonjour Mohamed! Je vous écoute', time: '14:22' },
        { id: 3, sender: 'them', text: 'Quand est-ce que ma moto sera prête?', time: '14:25' }
      ]
    },
    {
      id: 3,
      type: 'fournisseur',
      name: 'Forza',
      avatar: '🏭',
      lastMessage: 'Nouvelle promotion sur les Yamaha R125',
      timestamp: 'Il y a 1h',
      unread: 0,
      online: false,
      messages: [
        { id: 1, sender: 'them', text: 'Nouvelle promotion sur les Yamaha R125', time: '13:00' },
        { id: 2, sender: 'them', text: 'Remise de 5% jusqu\'à la fin du mois', time: '13:01' }
      ]
    },
    {
      id: 4,
      type: 'client',
      name: 'Ahmed Ben Salah',
      avatar: 'AB',
      lastMessage: 'Merci pour votre aide!',
      timestamp: 'Il y a 2h',
      unread: 0,
      online: false,
      messages: [
        { id: 1, sender: 'me', text: 'Votre carte grise est prête!', time: '11:30' },
        { id: 2, sender: 'them', text: 'Merci pour votre aide!', time: '11:45' }
      ]
    },
    {
      id: 5,
      type: 'fournisseur',
      name: 'GSM',
      avatar: '🏪',
      lastMessage: 'Votre commande est expédiée',
      timestamp: 'Hier',
      unread: 0,
      online: false,
      messages: [
        { id: 1, sender: 'them', text: 'Votre commande est expédiée', time: 'Hier 16:30' },
        { id: 2, sender: 'them', text: 'Numéro de suivi: TN123456789', time: 'Hier 16:31' }
      ]
    },
    {
      id: 6,
      type: 'client',
      name: 'Fatma Trabelsi',
      avatar: 'FT',
      lastMessage: 'Je viens demain pour signer',
      timestamp: 'Hier',
      unread: 0,
      online: true,
      messages: [
        { id: 1, sender: 'me', text: 'Bonjour Fatma, les documents sont prêts', time: 'Hier 15:00' },
        { id: 2, sender: 'them', text: 'Je viens demain pour signer', time: 'Hier 15:30' }
      ]
    },
    {
      id: 7,
      type: 'fournisseur',
      name: 'Sanya',
      avatar: '🚀',
      lastMessage: 'Bienvenue chez Sanya!',
      timestamp: '2 jours',
      unread: 0,
      online: false,
      messages: [
        { id: 1, sender: 'them', text: 'Bienvenue chez Sanya!', time: 'Lun 10:00' },
        { id: 2, sender: 'them', text: 'Voici le catalogue des produits', time: 'Lun 10:01' }
      ]
    }
  ];

  const filteredConversations = conversations.filter(conv => {
    const matchesType = filterType === 'all' || conv.type === filterType;
    const matchesSearch = 
      conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const unreadCount = conversations.filter(c => c.unread > 0).length;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;
    
    console.log('Sending message:', messageText);
    // Add message to conversation
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
          <p className="text-slate-600 mt-1">Communiquez avec vos fournisseurs et clients</p>
        </div>
        <button
          onClick={() => setShowComposeModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg shadow-xl transition-all transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau message
        </button>
      </div>

      {/* Main Messaging Interface */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
        <div className="grid grid-cols-12 h-full">
          
          {/* LEFT SIDEBAR - Conversations List */}
          <div className="col-span-4 border-r border-slate-200 flex flex-col">
            
            {/* Search & Filters */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              
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
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tous ({conversations.length})
                </button>
                <button
                  onClick={() => setFilterType('fournisseur')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterType === 'fournisseur'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🏢 Fournisseurs
                </button>
                <button
                  onClick={() => setFilterType('client')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterType === 'client'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  👤 Clients
                </button>
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
                  <p className="text-sm text-slate-400 mt-1">Essayez une autre recherche</p>
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
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          conv.type === 'fournisseur' 
                            ? 'bg-gradient-to-br from-purple-400 to-indigo-600' 
                            : 'bg-gradient-to-br from-blue-400 to-cyan-600'
                        }`}>
                          {conv.avatar}
                        </div>
                        {conv.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-semibold truncate ${
                            conv.unread > 0 ? 'text-slate-900' : 'text-slate-700'
                          }`}>
                            {conv.name}
                          </p>
                          <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                            {conv.timestamp}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${
                            conv.unread > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'
                          }`}>
                            {conv.lastMessage}
                          </p>
                          {conv.unread > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-bold">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            conv.type === 'fournisseur'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {conv.type === 'fournisseur' ? '🏢 Fournisseur' : '👤 Client'}
                          </span>
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
                <p className="text-slate-600 mb-6">Choisissez une conversation pour commencer à discuter</p>
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
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          selectedConversation.type === 'fournisseur' 
                            ? 'bg-gradient-to-br from-purple-400 to-indigo-600' 
                            : 'bg-gradient-to-br from-blue-400 to-cyan-600'
                        }`}>
                          {selectedConversation.avatar}
                        </div>
                        {selectedConversation.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{selectedConversation.name}</p>
                        <p className="text-sm text-slate-600">
                          {selectedConversation.online ? (
                            <span className="text-green-600 font-medium">● En ligne</span>
                          ) : (
                            <span className="text-slate-400">Hors ligne</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Appel vocal">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Appel vidéo">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Plus d'options">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {selectedConversation.messages.map((msg, index) => (
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
                    
                    {/* Attachment Button */}
                    <button className="p-3 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>

                    {/* Text Input */}
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

                    {/* Emoji Button */}
                    <button className="p-3 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    {/* Send Button */}
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

      {/* Compose New Message Modal */}
      {showComposeModal && (
        <ComposeMessageModal
          onClose={() => setShowComposeModal(false)}
          onSend={(recipient, message) => {
            console.log('New message to:', recipient, message);
            setShowComposeModal(false);
          }}
        />
      )}

    </div>
  );
}

// Compose Message Modal Component
function ComposeMessageModal({ onClose, onSend }) {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState('fournisseur');

  const fournisseurs = [
    { id: 1, name: 'Zimota', avatar: '🏢' },
    { id: 2, name: 'Forza', avatar: '🏭' },
    { id: 3, name: 'GSM', avatar: '🏪' },
    { id: 4, name: 'Sanya', avatar: '🚀' }
  ];

  const clients = [
    { id: 1, name: 'Mohamed Ali', avatar: 'MA' },
    { id: 2, name: 'Ahmed Ben Salah', avatar: 'AB' },
    { id: 3, name: 'Fatma Trabelsi', avatar: 'FT' },
    { id: 4, name: 'Karim Mohamed', avatar: 'KM' }
  ];

  const recipientsList = recipientType === 'fournisseur' ? fournisseurs : clients;

  const handleSend = () => {
    if (!recipient || !message.trim()) return;
    onSend(recipient, message);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">📝 Nouveau message</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Recipient Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">À qui voulez-vous écrire?</label>
            <div className="flex gap-3">
              <button
                onClick={() => setRecipientType('fournisseur')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  recipientType === 'fournisseur'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-3xl mb-2 block">🏢</span>
                <p className="font-semibold text-slate-900">Fournisseur</p>
              </button>
              <button
                onClick={() => setRecipientType('client')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  recipientType === 'client'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-3xl mb-2 block">👤</span>
                <p className="font-semibold text-slate-900">Client</p>
              </button>
            </div>
          </div>

          {/* Recipient Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Destinataire</label>
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner un destinataire</option>
              {recipientsList.map(item => (
                <option key={item.id} value={item.name}>
                  {item.avatar} {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
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

          {/* Actions */}
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
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📤 Envoyer
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default MessagingPage;
