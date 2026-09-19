import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notifications';

export function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [, forceClockTick] = useReducer((v) => v + 1, 0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((item) => !item.read).length);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void fetchNotifications();
    }, 0);

    const interval = setInterval(() => {
      void fetchNotifications();
    }, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      forceClockTick();
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notification) => {
    try {
      await notificationService.markAsRead(notification.id);
      void fetchNotifications();
      if (notification.action_url) {
        navigate(notification.action_url);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      void fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
      void fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const parseNotificationDate = (value) => {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    // Backend currently returns naive UTC timestamps; treat timezone-less values as UTC.
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const normalized = hasTimezone ? trimmed : `${trimmed}Z`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDate = (dateStr) => {
    const date = parseNotificationDate(dateStr);
    if (!date) {
      return 'Unknown time';
    }

    const now = new Date();
    const diff = Math.max(0, now.getTime() - date.getTime());
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) {
      return `${Math.max(1, minutes)}m ago`;
    }
    if (hours < 24) {
      return `${hours}hr ago`;
    }
    if (days >= 1 && days <= 30) {
      return `${days}d ago`;
    }

    const showYear = date.getFullYear() !== now.getFullYear();
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      ...(showYear ? { year: 'numeric' } : {}),
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-96 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-[70vh] sm:max-h-125 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-white font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleMarkAsRead(notification)}
                  className={`p-4 border-b border-zinc-800 hover:bg-white/5 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-violet-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-white">{notification.title}</h4>
                        {!notification.read && <span className="w-2 h-2 bg-violet-500 rounded-full" />}
                      </div>
                      <p className="text-xs text-zinc-400 mb-1">{notification.message}</p>
                      <span className="text-[10px] text-zinc-500">{formatDate(notification.created_at)}</span>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors text-xs"
                    >
                      x
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
