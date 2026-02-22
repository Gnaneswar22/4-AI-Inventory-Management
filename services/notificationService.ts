const API_BASE_URL = 'http://localhost:5000/api';

export interface Notification {
  id: string;
  type: 'low_stock' | 'sale' | 'alert';
  title: string;
  message: string;
  productId?: string;
  productName?: string;
  metadata?: {
    status?: string;
    priority?: string;
    currentStock?: number;
    minStockLevel?: number;
    daysRemaining?: number;
    optimalOrder?: number;
    minimumOrder?: number;
    reorderPoint?: number;
    manufacturer?: string;
    saleId?: string;
    quantity?: number;
    totalPrice?: number;
    customerName?: string;
    date?: string;
    orderPlaced?: {
      quantity: number;
      type: string;
      timestamp: string;
    };
  };
  read: boolean;
  resolved?: boolean;
  resolvedAt?: string;
  timestamp: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export const notificationsAPI = {
  getAll: async (): Promise<NotificationsResponse> => {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  markAsRead: async (notificationId: string): Promise<{ message: string; notification: Notification }> => {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
  },

  performAction: async (
    notificationId: string,
    action: string,
    quantity: number,
    orderType: 'optimal' | 'minimum'
  ): Promise<{ message: string; notification: Notification }> => {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, quantity, orderType }),
    });
    if (!response.ok) throw new Error('Failed to perform action');
    return response.json();
  },

  clearAllRead: async (): Promise<{ message: string; remaining: number }> => {
    const response = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to clear notifications');
    return response.json();
  },
};
