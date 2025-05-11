import { Injectable, inject } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Alert, AlertType } from '../models/alert.model';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private router = inject(Router);
  private subject = new Subject<Alert>();
  private defaultId = 'default-alert';
  private keepAfterRouteChange = false;

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => {
        if (this.keepAfterRouteChange) {
          this.keepAfterRouteChange = false;
        } else {
          this.clear();
        }
      });
  }

  onAlert(id = this.defaultId): Observable<Alert> {
    return this.subject.asObservable().pipe(filter((x) => x && x.id === id));
  }

  success(message: string, options: Partial<Alert> = {}): void {
    this.alert(AlertType.SUCCESS, message, options);
  }

  error(message: string, options: Partial<Alert> = {}): void {
    this.alert(AlertType.ERROR, message, options);
  }

  info(message: string, options: Partial<Alert> = {}): void {
    this.alert(AlertType.INFO, message, options);
  }

  warning(message: string, options: Partial<Alert> = {}): void {
    this.alert(AlertType.WARNING, message, options);
  }

  alert(type: AlertType, message: string, options: Partial<Alert> = {}): void {
    const id = options.id || this.defaultId;
    const alert: Alert = {
      id,
      type,
      message,
      autoClose: options.autoClose ?? true,
      keepAfterRouteChange: options.keepAfterRouteChange,
      timeout: options.timeout || 5000,
    };

    this.keepAfterRouteChange = options.keepAfterRouteChange || false;
    this.subject.next(alert);
  }

  clear(id = this.defaultId): void {
    this.subject.next({ id } as Alert);
  }
}
