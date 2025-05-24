import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Notification, NotificationType } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notifications.asObservable();

  private unreadCount = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCount.asObservable();

  constructor() {
    this.addNotification({
      title: 'New Trade',
      message: 'Trade #1294 has been executed successfully.',
      type: NotificationType.SUCCESS,
    });

    this.addNotification({
      title: 'Client Request',
      message: 'Alpha Investments Ltd has requested a meeting.',
      type: NotificationType.INFO,
    });

    this.addNotification({
      title: 'System Update',
      message: 'The platform will be updated on May 15, 2025.',
      type: NotificationType.WARNING,
      actionLink: '/settings',
    });
  }

  getNotifications(): Observable<Notification[]> {
    return this.notifications$;
  }

  getUnreadCount(): Observable<number> {
    return this.unreadCount$;
  }

  addNotification(notification: Partial<Notification>): void {
    const current = this.notifications.getValue();
    const newNotification: Notification = {
      id: '1',
      title: notification.title || '',
      message: notification.message || '',
      timestamp: new Date(),
      read: false,
      type: notification.type || NotificationType.INFO,
      actionLink: notification.actionLink,
    };

    const updated = [newNotification, ...current];
    this.notifications.next(updated);
    this.updateUnreadCount();
  }

  markAsRead(id: string): void {
    const current = this.notifications.getValue();
    const updated = current.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    );

    this.notifications.next(updated);
    this.updateUnreadCount();
  }

  markAllAsRead(): void {
    const current = this.notifications.getValue();
    const updated = current.map((notification) => ({
      ...notification,
      read: true,
    }));

    this.notifications.next(updated);
    this.updateUnreadCount();
  }

  removeNotification(id: string): void {
    const current = this.notifications.getValue();
    const updated = current.filter((notification) => notification.id !== id);

    this.notifications.next(updated);
    this.updateUnreadCount();
  }

  clearAllNotifications(): void {
    this.notifications.next([]);
    this.updateUnreadCount();
  }

  private updateUnreadCount(): void {
    const count = this.notifications.getValue().filter((n) => !n.read).length;
    this.unreadCount.next(count);
  }
}
