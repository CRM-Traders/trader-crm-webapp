import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { Alert, AlertType } from '../../../core/models/alert.model';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
})
export class AlertComponent implements OnInit, OnDestroy {
  private alertService = inject(AlertService);

  @Input() id = 'default-alert';
  @Input() position:
    | 'top-right'
    | 'top-center'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-center'
    | 'bottom-left' = 'top-right';

  alerts: Alert[] = [];
  alertSubscription!: Subscription;

  ngOnInit(): void {
    this.alertSubscription = this.alertService
      .onAlert(this.id)
      .subscribe((alert) => {
        if (!alert.message) {
          this.alerts = this.alerts.filter((x) => x.keepAfterRouteChange);

          this.alerts.forEach((x) => delete x.keepAfterRouteChange);
          return;
        }

        this.alerts.push(alert);

        if (alert.autoClose) {
          setTimeout(() => this.removeAlert(alert), alert.timeout);
        }
      });
  }

  ngOnDestroy(): void {
    this.alertSubscription.unsubscribe();
  }

  removeAlert(alert: Alert): void {
    if (!this.alerts.includes(alert)) return;

    this.alerts = this.alerts.filter((x) => x !== alert);
  }

  cssClass(alert: Alert): string {
    if (!alert) return '';

    const classes = ['alert', 'alert-dismissible'];

    const alertTypeClass = {
      [AlertType.SUCCESS]:
        'bg-green-100 border border-green-400 text-green-800 dark:bg-green-900 dark:border-green-800 dark:text-green-50',
      [AlertType.ERROR]:
        'bg-red-100 border border-red-400 text-red-800 dark:bg-red-900 dark:border-red-800 dark:text-red-50',
      [AlertType.INFO]:
        'bg-blue-100 border border-blue-400 text-blue-800 dark:bg-blue-900 dark:border-blue-800 dark:text-white',
      [AlertType.WARNING]:
        'bg-yellow-100 border border-yellow-400 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-800 dark:text-yellow-50',
    };

    classes.push(alertTypeClass[alert.type]);

    return classes.join(' ');
  }

  getAlertIcon(alert: AlertType): string {
    const alertTypeIcons = {
      [AlertType.SUCCESS]: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>`,
      [AlertType.ERROR]: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                       </svg>`,
      [AlertType.INFO]: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>`,
      [AlertType.WARNING]: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                         </svg>`,
    };

    return alertTypeIcons[alert];
  }

  getContainerClass(): string {
    const positions = {
      'top-right': 'fixed top-4 right-4',
      'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2',
      'top-left': 'fixed top-4 left-4',
      'bottom-right': 'fixed bottom-4 right-4',
      'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2',
      'bottom-left': 'fixed bottom-4 left-4',
    };

    return `${positions[this.position]} alert-highest-z max-w-md`;
  }
}
