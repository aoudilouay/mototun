import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function NotificationsCenter({ userType }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, carte-grise, orders, messages, payments
  const dropdownRef = useRef(null);

  // Mock notifications data based on user type
  useEffect(() => {
    if (userType === 'revendeur') {
      setNotifications([
        {
          id: 1,
          type: 'carte-grise',
          title: 'Carte grise prête',
          message: 'La carte grise de Mohamed Ali est prête pour retrait',
          time: 'Il y a 2 min',
          read: false,
          icon: '📄',
          color: 'blue',
          link: '/revendeur/carte-grise'
        },
        {
          id: 2,
          type: 'message',
          title: 'Nouveau message',
          message: 'Zimota vous a envoyé un message',
          time: 'Il y a 15 min',
          read: false,
          icon: '💬',
          color: 'purple',
          link: '/revendeur/messages'
        },
        {
          id: 3,
          type: 'invoice',
          title: 'Facture créée',
          message: 'Facture #INV-2024-042 générée avec succès',
          time: 'Il y a 1h',
          read: false,
          icon: '📋',
          color: 'green',
          link: '/revendeur/invoices'
        },
        {
          id: 4,
          type: 'carte-grise',
          title: 'Document manquant',
          message: 'CIN manquant pour Ahmed Ben Salah',
          time: 'Il y a 2h',
          read: true,
          icon: '⚠️',
          color: 'amber',
          link: '/revendeur/carte-grise'
        },
        {
          id: 5,
          type: 'client',
          title: 'Nouveau client',
          message: 'Fatma Trabelsi a été ajouté aux clients',
          time: 'Il y a 3h',
          read: true,
          icon: '👤',
          color: 'cyan',
          link: '/revendeur/clients'
        },
        {
          id: 6,
          type: 'message',
          title: 'Message de Forza',
          message: 'Nouvelle promotion sur les Yamaha MT-03',
          time: 'Hier',
          read: true,
          icon: '💬',
          color: 'purple',
          link: '/revendeur/messages'
        },
        {
          id: 7,
          type: 'system',
          title: 'Mise à jour système',
          message: 'Nouvelle version disponible',
          time: 'Il y a 2 jours',
          read: true,
          icon: '🔔',
          color: 'slate',
          link: null
        }
      ]);
    } else if (userType === 'fournisseur') {
      setNotifications([
        {
          id: 1,
          type: 'order',
          title: 'Nouvelle commande',
          message: 'Karim Moto Shop a passé une commande (3 motos)',
          time: 'Il y a 5 min',
          read: false,
          icon: '🛒',
          color: 'green',
          link: '/fournisseur/revendeurs'
        },
        {
          id: 2,
          type: 'payment',
          title: 'Paiement reçu',
          message: 'Moto Plus Tunis - 45,000 TND reçu',
          time: 'Il y a 10 min',
          read: false,
          icon: '💰',
          color: 'emerald',
          link: '/fournisseur/revendeurs'
        },
        {
          id: 3,
          type: 'carte-grise',
          title: 'Demande carte grise',
          message: 'Speed Bikes Sfax demande une carte grise',
          time: 'Il y a 30 min',
          read: false,
          icon: '📄',
          color: 'blue',
          link: '/fournisseur/carte-grise'
        },
        {
          id: 4,
          type: 'message',
          title: 'Message urgent',
          message: 'Racing Moto a envoyé un message urgent',
          time: 'Il y a 1h',
          read: false,
          icon: '🔥',
          color: 'red',
          link: '/fournisseur/messages'
        },
        {
          id: 5,
          type: 'revendeur',
          title: 'Nouveau revendeur',
          message: 'Elite Bikes a rejoint votre réseau',
          time: 'Il y a 2h',
          read: true,
          icon: '🏪',
          color: 'purple',
          link: '/fournisseur/revendeurs'
        },
        {
          id: 6,
          type: 'carte-grise',
          title: 'CG complétée',
          message: 'Carte grise CG-2024-089 traitée',
          time: 'Il y a 3h',
          read: true,
          icon: '✅',
          color: 'green',
          link: '/fournisseur/carte-grise'
        },
        {
          id: 7,
          type: 'message',
          title: 'Message de Pro Moto',
          message: 'Question sur le catalogue 2026',
          time: 'Hier',
          read: true,
          icon: '💬',
          color: 'purple',
          link: '/fournisseur/messages'
        },
        {
          id: 8,
          type: 'system',
          title: 'Rapport mensuel',
          message: 'Votre rapport mensuel est disponible',
          time: 'Il y a 2 jours',
          read: true,
          icon: '📊',
          color: 'slate',
          link: null
        }
      ]);
    }
  }, [userType]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    return notif.type === filter;
  });

  const handleMarkAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      green: 'bg-green-100 text-green-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      amber: 'bg-amber-100 text-amber-600',
      red: 'bg-red-100 text-red-600',
      cyan: 'bg-cyan-100 text-cyan-600',
      slate: 'bg-slate-100 text-slate-600'
    };
    return colors[color] || colors.slate;
  };

  const filterOptions = userType === 'revendeur' 
    ? [
        { id: 'all', label: 'Toutes', icon: '📊' },
        { id: 'unread', label: 'Non lues', icon: '📬' },
        { id: 'carte-grise', label: 'Carte grise', icon: '📄' },
        { id: 'message', label: 'Messages', icon: '💬' },
        { id: 'invoice', label: 'Factures', icon: '📋' },
        { id: 'client', label: 'Clients', icon: '👤' }
      ]
    : [
        { id: 'all', label: 'Toutes', icon: '📊' },
        { id: 'unread', label: 'Non lues', icon: '📬' },
        { id: 'order', label: 'Commandes', icon: '🛒' },
        { id: 'payment', label: 'Paiements', icon: '💰' },
        { id: 'carte-grise', label: 'Carte grise', icon: '📄' },
        { id: 'message', label: 'Messages', icon: '💬' }
      ];

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                🔔 Notifications
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                Tout marquer comme lu
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === option.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium">Aucune notification</p>
                <p className="text-sm text-slate-400 mt-1">Vous êtes à jour!</p>
              </div>
            ) : (
              filteredNotifications.map(notif => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  getColorClasses={getColorClasses}
                  onClose={() => setIsOpen(false)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-semibold text-center">
                Voir toutes les notifications
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

// Notification Item Component
function NotificationItem({ notification, onMarkAsRead, onDelete, getColorClasses, onClose }) {
  const [showActions, setShowActions] = useState(false);

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      onClose();
    }
  };

  const content = (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-all cursor-pointer relative ${
        !notification.read ? 'bg-blue-50/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${getColorClasses(notification.color)}`}>
          {notification.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`font-semibold text-sm ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
              {notification.title}
            </p>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-slate-400">{notification.time}</p>
        </div>

      </div>

      {/* Quick Actions (on hover) */}
      {showActions && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-slate-200 p-1">
          {!notification.read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors"
              title="Marquer comme lu"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
            title="Supprimer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  return notification.link ? (
    <Link to={notification.link} onClick={handleClick}>
      {content}
    </Link>
  ) : (
    <div onClick={handleClick}>
      {content}
    </div>
  );
}

export default NotificationsCenter;
