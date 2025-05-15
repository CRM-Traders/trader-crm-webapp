import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ThemeSelectorComponent } from '../../../shared/components/theme-selector/theme-selector.component';
import { AlertService } from '../../../core/services/alert.service';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';
import { LocalizationService } from '../../../core/services/localization.service';
import { TimezoneOption } from '../../../core/models/timezone.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ThemeSelectorComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private themeService = inject(ThemeService);
  private alertService = inject(AlertService);
  private localizationService = inject(LocalizationService);

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  notificationForm!: FormGroup;
  localizationForm!: FormGroup;

  activeSection = 'profile';
  isProfileSaving = false;
  isPasswordSaving = false;
  isNotificationSaving = false;
  isLocalizationSaving = false;

  currentTheme: ThemeMode = 'system';
  isDarkMode = false;

  timezones: TimezoneOption[] = [];
  timezonesByRegion: Record<string, TimezoneOption[]> = {};

  ngOnInit(): void {
    this.initForms();

    this.themeService.currentTheme$.subscribe((theme) => {
      this.currentTheme = theme;
    });

    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });

    this.timezones = this.localizationService.getTimezoneOptions();
    this.timezonesByRegion =
      this.localizationService.getTimezoneOptionsByRegion();

    this.localizationForm
      .get('timezone')
      ?.setValue(this.localizationService.currentTimezone());
  }

  initForms(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\+?[0-9\s\-\(\)]+$/)]],
      jobTitle: [''],
      company: [''],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
            ),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );

    this.notificationForm = this.fb.group({
      emailNotifications: [true],
      tradeAlerts: [true],
      marketUpdates: [false],
      weeklyReports: [true],
      systemAnnouncements: [true],
    });

    this.localizationForm = this.fb.group({
      timezone: ['', [Validators.required]],
      dateFormat: ['MMM d, yyyy'],
      timeFormat: ['h:mm a'],
    });

    this.loadUserData();
  }

  loadUserData(): void {
    const mockUserData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      jobTitle: 'Trader',
      company: 'Acme Trading Co.',
    };

    this.profileForm.patchValue(mockUserData);
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
  }

  saveProfileSettings(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.isProfileSaving = true;

    setTimeout(() => {
      this.isProfileSaving = false;
      this.alertService.success('Profile settings updated successfully.');
    }, 1000);
  }

  savePasswordSettings(): void {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.isPasswordSaving = true;

    setTimeout(() => {
      this.isPasswordSaving = false;
      this.alertService.success('Password updated successfully.');
      this.passwordForm.reset();
    }, 1000);
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

  saveLocalizationSettings(): void {
    if (this.localizationForm.invalid) {
      this.markFormGroupTouched(this.localizationForm);
      return;
    }

    this.isLocalizationSaving = true;

    const timezone = this.localizationForm.get('timezone')?.value;
    this.localizationService.setTimezone(timezone);

    setTimeout(() => {
      this.isLocalizationSaving = false;
      this.alertService.success('Localization settings updated successfully.');
    }, 1000);
  }

  setTheme(theme: ThemeMode): void {
    this.themeService.setTheme(theme);
  }

  getCurrentFormattedTime(): string {
    return this.localizationService.formatDate(new Date());
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  formatOffset(offset: number): string {
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
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
