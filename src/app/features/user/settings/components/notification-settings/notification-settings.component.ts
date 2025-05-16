import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AlertService } from '../../../../../core/services/alert.service';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './notification-settings.component.html',
  styleUrls: ['./notification-settings.component.scss'],
})
export class NotificationSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);

  notificationForm!: FormGroup;
  isNotificationSaving = false;

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.notificationForm = this.fb.group({
      emailNotifications: [true],
      tradeAlerts: [true],
      marketUpdates: [false],
      weeklyReports: [true],
      systemAnnouncements: [true],
    });
  }

  saveNotificationSettings(): void {
    if (this.notificationForm.invalid) {
      this.markFormGroupTouched(this.notificationForm);
      return;
    }

    this.isNotificationSaving = true;

    setTimeout(() => {
      this.isNotificationSaving = false;
      this.alertService.success(
        'Notification preferences updated successfully.'
      );
    }, 1000);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
}
