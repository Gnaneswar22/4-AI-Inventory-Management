import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, ShoppingBag, Clock, Package, TrendingUp, Check, Trash2, Factory } from 'lucide-react';
import { notificationsAPI, Notification } from '../services/notificationService';

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      onUnreadCountChange?.(data.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen, onClose]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleOrder = async (notificationId: string, quantity: number, orderType: 'optimal' | 'minimum') => {
    setOrderingId(notificationId);
    try {
      await notificationsAPI.performAction(notificationId, 'order', quantity, orderType);
      await loadNotifications(); // Reload to get updated state
      alert(`Order placed successfully for ${quantity} units!`);
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setOrderingId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationsAPI.clearAllRead();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (!isOpen) return null;

  const lowStockNotifs = notifications.filter(n => n.type === 'low_stock');
  const salesNotifs = notifications.filter(n => n.type === 'sale');

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-[450px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Bell size={18} className="text-white" />
            </div>
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-[10px] font-bold">{unreadCount}</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
            <p className="text-[10px] text-slate-500">{notifications.length} total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {notifications.filter(n => n.read).length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors uppercase tracking-wider"
            >
              Clear Read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[520px]">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Low Stock Alerts Section */}
            {lowStockNotifs.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-rose-50/70 border-b border-rose-100/50 sticky top-0 z-10">
                  <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Low Stock Alerts ({lowStockNotifs.length})
                  </p>
                </div>
                {lowStockNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-6 py-4 border-b border-slate-100 transition-all ${
                      notif.read ? 'bg-slate-50/50' : 'bg-white hover:bg-rose-50/30'
                    } ${notif.resolved ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                        notif.metadata?.priority === 'Immediate' || notif.metadata?.priority === 'Urgent'
                          ? 'bg-rose-100 animate-pulse'
                          : 'bg-rose-50'
                      }`}>
                        <AlertTriangle size={16} className="text-rose-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-slate-800">{notif.productName}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            notif.metadata?.status === 'Critical'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {notif.metadata?.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-[11px] mb-3 bg-slate-50 rounded-lg p-2">
                          <div>
                            <p className="text-slate-400 font-semibold">Current</p>
                            <p className="text-rose-600 font-bold">{notif.metadata?.currentStock}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold">Min Level</p>
                            <p className="text-slate-700 font-bold">{notif.metadata?.minStockLevel}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold">Days Left</p>
                            <p className="text-amber-600 font-bold">{notif.metadata?.daysRemaining}</p>
                          </div>
                        </div>

                        {!notif.resolved && (notif.metadata?.optimalOrder !== undefined || notif.metadata?.minimumOrder !== undefined) && (
                          <div className="space-y-2 mt-3">
                            {/* Show order recommendation info */}
                            <div className="text-[10px] text-slate-600 bg-slate-50 rounded-lg p-2">
                              <p className="font-semibold mb-1">📦 Order Recommendations:</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-slate-500">Optimal:</span>
                                  <span className="ml-1 font-bold text-indigo-600">{notif.metadata?.optimalOrder || 0} units</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Minimum:</span>
                                  <span className="ml-1 font-bold text-slate-700">{notif.metadata?.minimumOrder || 0} units</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Order buttons */}
                            <div className="flex gap-2">
                              {(notif.metadata?.optimalOrder ?? 0) > 0 && (
                                <button
                                  onClick={() => handleOrder(notif.id, notif.metadata!.optimalOrder!, 'optimal')}
                                  disabled={orderingId === notif.id}
                                  className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg text-[11px] font-bold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                  <Factory size={12} />
                                  Order {notif.metadata.optimalOrder} (Optimal)
                                </button>
                              )}
                              {(notif.metadata?.minimumOrder ?? 0) > 0 && (
                                <button
                                  onClick={() => handleOrder(notif.id, notif.metadata!.minimumOrder!, 'minimum')}
                                  disabled={orderingId === notif.id}
                                  className="flex-1 py-2 px-3 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                                >
                                  <Package size={12} />
                                  Order {notif.metadata.minimumOrder} (Min)
                                </button>
                              )}
                              {(notif.metadata?.optimalOrder ?? 0) === 0 && (notif.metadata?.minimumOrder ?? 0) === 0 && (
                                <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 w-full text-center">
                                  Stock levels being analyzed. Check back soon.
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {notif.metadata?.orderPlaced && (
                          <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
                            <Check size={12} className="flex-shrink-0" />
                            <span className="font-semibold">
                              Ordered {notif.metadata.orderPlaced.quantity} units ({notif.metadata.orderPlaced.type})
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={9} />
                          {formatTime(notif.timestamp)}
                        </span>
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Sales Section */}
            {salesNotifs.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-emerald-50/70 border-b border-emerald-100/50 sticky top-0 z-10">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag size={14} />
                    Recent Sales ({salesNotifs.length})
                  </p>
                </div>
                {salesNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-6 py-4 border-b border-slate-100 transition-all ${
                      notif.read ? 'bg-slate-50/50' : 'bg-white hover:bg-emerald-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-100 rounded-xl flex-shrink-0">
                        <ShoppingBag size={16} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{notif.productName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-slate-500">
                            Qty: <span className="font-bold text-slate-700">{notif.metadata?.quantity}</span>
                          </p>
                          <p className="text-xs text-emerald-600 font-bold">
                            ₹{notif.metadata?.totalPrice?.toLocaleString()}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Customer: {notif.metadata?.customerName}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={9} />
                          {formatTime(notif.timestamp)}
                        </span>
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {notifications.length === 0 && (
              <div className="py-16 text-center">
                <Bell size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-semibold">All caught up!</p>
                <p className="text-xs text-slate-300 mt-1">No new notifications</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
