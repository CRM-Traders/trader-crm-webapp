import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ChatNotification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatNotificationService {
  private notification$ = new Subject<ChatNotification>();

  get notifications() {
    return this.notification$.asObservable();
  }

  success(message: string, duration: number = 3000): void {
    this.show({ type: 'success', message, duration });
  }

  error(message: string, duration: number = 5000): void {
    this.show({ type: 'error', message, duration });
  }

  info(message: string, duration: number = 3000): void {
    this.show({ type: 'info', message, duration });
  }

  warning(message: string, duration: number = 4000): void {
    this.show({ type: 'warning', message, duration });
  }

  private show(notification: ChatNotification): void {
    this.notification$.next(notification);
  }
}
