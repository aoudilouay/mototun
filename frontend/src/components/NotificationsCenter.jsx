import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useI18n } from '../context/I18nContext';

function extractApiData(response) {
  return Array.isArray(response?.data?.data) ? response.data.data : [];
}

function parseDate(value) {
  if (!value) return null;
  let normalized = value;
  if (typeof value === 'string') {
    const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(value);
    if (!hasTimezone) {
      normalized = `${value}Z`;
    }
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeTime(value, t, locale) {
  const date = parseDate(value);
  if (!date) return '-';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return t('notifications.relative.now');
  if (diffMs < 60 * 60 * 1000) return t('notifications.relative.min', { count: Math.floor(diffMs / (60 * 1000)) });
  if (diffMs < 24 * 60 * 60 * 1000) return t('notifications.relative.hour', { count: Math.floor(diffMs / (60 * 60 * 1000)) });
  if (diffMs < 7 * 24 * 60 * 60 * 1000) return t('notifications.relative.day', { count: Math.floor(diffMs / (24 * 60 * 60 * 1000)) });

  return date.toLocaleDateString(locale);
}

function translateServerTitle(title, t) {
  const keyMap = {
    'Carte grise prete': 'notifications.serverTitles.carteGriseReady',
    'Documents manquants': 'notifications.serverTitles.missingDocuments',
    'Facture payee': 'notifications.serverTitles.invoicePaid',
    'Nouvelle facture': 'notifications.serverTitles.invoiceCreated',
    'Nouvelle vente': 'notifications.serverTitles.invoiceCreated',
    'Nouveau client': 'notifications.serverTitles.newClient',
    'Stock faible': 'notifications.serverTitles.lowStock',
    'Rupture de stock': 'notifications.serverTitles.outOfStock',
    'Nouvelle demande partenaire': 'notifications.serverTitles.partnershipRequest',
    'Nouveau dossier carte grise': 'notifications.serverTitles.carteGriseAssigned',
    'Statut dossier mis a jour': 'notifications.serverTitles.carteGriseStatusUpdated',
    'Alerte SLA dossier': 'notifications.serverTitles.slaRisk',
    'Dossier bloque (SLA)': 'notifications.serverTitles.slaStuck'
  };

  const key = keyMap[title];
  return key ? t(key) : title;
}

function mapApiNotification(raw, t) {
  const baseTitle = String(raw?.title ?? 'Notification');

  return {
    id: String(raw?.notificationId ?? raw?.id ?? ''),
    type: String(raw?.type ?? 'system'),
    title: translateServerTitle(baseTitle, t),
    message: String(raw?.message ?? ''),
    icon: String(raw?.icon ?? 'N'),
    color: String(raw?.color ?? 'slate'),
    link: raw?.link ? String(raw.link) : null,
    createdAt: raw?.createdAt ?? null,
    read: Boolean(raw?.isRead)
  };
}

function NotificationsCenter({ userType }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { t, locale, isArabic } = useI18n();

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/Notifications');
      const mapped = extractApiData(response).map((item) => mapApiNotification(item, t)).filter((item) => item.id);
      setNotifications(mapped);
    } catch {
      setNotifications(userType === 'revendeur' ? [] : [
        {
          id: 'fournisseur-fallback-cg',
          type: 'carte-grise',
          title: t('notifications.fallback.dossierTitle'),
          message: t('notifications.fallback.dossierMessage'),
          icon: 'CG',
          color: 'blue',
          link: '/fournisseur/carte-grise',
          createdAt: new Date().toISOString(),
          read: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [t, userType]);

  useEffect(() => {
    let timeoutId = null;
    let idleId = null;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(loadNotifications, { timeout: 1800 });
    } else {
      timeoutId = window.setTimeout(loadNotifications, 350);
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen || loading || notifications.length > 0) {
      return;
    }

    loadNotifications();
  }, [isOpen, loading, loadNotifications, notifications.length]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadNotifications();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handleRefresh = () => {
      loadNotifications();
    };

    window.addEventListener('notifications:refresh', handleRefresh);
    return () => window.removeEventListener('notifications:refresh', handleRefresh);
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !item.read;
      return item.type === filter;
    });
  }, [filter, notifications]);

  const markAsRead = async (notificationId) => {
    const normalizedId = String(notificationId);
    setNotifications((prev) => prev.map((item) => (item.id === normalizedId ? { ...item, read: true } : item)));

    if (userType === 'revendeur') {
      try {
        await api.post('/Notifications/read', { notificationIds: [normalizedId] });
      } catch {
        loadNotifications();
      }
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    if (userType === 'revendeur') {
      try {
        await api.post('/Notifications/read-all');
      } catch {
        loadNotifications();
      }
    }
  };

  const dismissNotification = async (notificationId) => {
    const normalizedId = String(notificationId);
    setNotifications((prev) => prev.filter((item) => item.id !== normalizedId));

    if (userType === 'revendeur') {
      try {
        await api.post('/Notifications/dismiss', { notificationIds: [normalizedId] });
      } catch {
        loadNotifications();
      }
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700',
      indigo: 'bg-indigo-100 text-indigo-700',
      cyan: 'bg-cyan-100 text-cyan-700',
      green: 'bg-green-100 text-green-700',
      emerald: 'bg-emerald-100 text-emerald-700',
      amber: 'bg-amber-100 text-amber-700',
      red: 'bg-rose-100 text-rose-700',
      slate: 'bg-slate-100 text-slate-700'
    };
    return colors[color] || colors.slate;
  };

  const filterOptions = userType === 'revendeur'
    ? [
        { id: 'all', label: t('notifications.filters.all') },
        { id: 'unread', label: t('notifications.filters.unread') },
        { id: 'carte-grise', label: t('notifications.filters.carteGrise') },
        { id: 'partnership', label: t('notifications.filters.orders') },
        { id: 'invoice', label: t('notifications.filters.invoices') },
        { id: 'client', label: t('notifications.filters.clients') },
        { id: 'stock', label: t('notifications.filters.stock') },
        { id: 'sla', label: t('notifications.filters.sla') }
      ]
    : [
        { id: 'all', label: t('notifications.filters.all') },
        { id: 'unread', label: t('notifications.filters.unread') },
        { id: 'partnership', label: t('notifications.filters.orders') },
        { id: 'carte-grise', label: t('notifications.filters.carteGrise') },
        { id: 'sla', label: t('notifications.filters.sla') }
      ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-lg p-2 transition-colors hover:bg-slate-100"
      >
        <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-2 w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ${isArabic ? 'left-0' : 'right-0'}`}>
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{t('notifications.title')}</h3>
              <button
                onClick={markAllAsRead}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                {t('notifications.markAllRead')}
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    filter === option.id
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-600">{t('notifications.noNotifications')}</p>
                <p className="mt-1 text-xs text-slate-400">{t('notifications.upToDate')}</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  getColorClasses={getColorClasses}
                  onMarkAsRead={markAsRead}
                  onDismiss={dismissNotification}
                  onClose={() => setIsOpen(false)}
                  t={t}
                  locale={locale}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, getColorClasses, onMarkAsRead, onDismiss, onClose, t, locale }) {
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
      className={`relative cursor-pointer border-b border-slate-100 p-4 transition-colors hover:bg-slate-50 ${
        !notification.read ? 'bg-blue-50/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${getColorClasses(notification.color)}`}>
          {notification.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
              {notification.title}
            </p>
            {!notification.read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />}
          </div>
          <p className="line-clamp-2 text-sm text-slate-600">{notification.message}</p>
          <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(notification.createdAt, t, locale)}</p>
        </div>
      </div>

      {showActions && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
          {!notification.read && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="rounded p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
              title={t('notifications.markRead')}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDismiss(notification.id);
            }}
            className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-50"
            title={t('notifications.delete')}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div onClick={handleClick}>{content}</div>
  );
}

export default NotificationsCenter;
