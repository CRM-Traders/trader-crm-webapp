import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../../core/services/alert.service';
import { SettingsService } from '../../services/settings.service';
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-password-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-settings.component.html',
  styleUrls: ['./password-settings.component.scss'],
})
export class PasswordSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private settingsService = inject(SettingsService);

  passwordForm!: FormGroup;
  isPasswordSaving = false;

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  savePasswordSettings(): void {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.isPasswordSaving = true;

    const passwordData = {
      oldPassword: this.passwordForm.get('currentPassword')?.value,
      newPassword: this.passwordForm.get('newPassword')?.value,
      confirmPassword: this.passwordForm.get('confirmPassword')?.value,
    };

    this.settingsService.changePassword(passwordData)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to update password. Please try again.');
          return of(null);
        }),
        finalize(() => {
          this.isPasswordSaving = false;
        })
      )
      .subscribe({
        next: () => {
          // 204 No Content means success, so we show success message and clear form
          this.alertService.success('Password updated successfully.');
          this.passwordForm.reset();
        },
        error: () => {
          // Error is already handled in catchError pipe
        }
      });
  }

  private passwordMatchValidator(
    form: FormGroup
  ): null | { passwordMismatch: boolean } {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    if (newPassword !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
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
