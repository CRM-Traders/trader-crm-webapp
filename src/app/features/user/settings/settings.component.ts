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
import { TwoFactorService } from '../../../core/services/two-factor.service';
import { TwoFactorComponent } from '../../../features/auth/two-factor/two-factor.component';
import { TwoFactorSetupResponse } from '../../../core/models/two-f.model';
import { QrCodeModule } from 'ng-qrcode';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ThemeSelectorComponent,
    TwoFactorComponent,
    QrCodeModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private themeService = inject(ThemeService);
  private alertService = inject(AlertService);
  private localizationService = inject(LocalizationService);
  private twoFactorService = inject(TwoFactorService);

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  notificationForm!: FormGroup;
  localizationForm!: FormGroup;
  twoFactorForm!: FormGroup;

  activeSection = 'profile';
  isProfileSaving = false;
  isPasswordSaving = false;
  isNotificationSaving = false;
  isLocalizationSaving = false;
  isTwoFactorVerifying = false;
  isDisabling2FA = false;

  currentTheme: ThemeMode = 'system';
  isDarkMode = false;

  timezones: TimezoneOption[] = [];
  timezonesByRegion: Record<string, TimezoneOption[]> = {};

  twoFactorSetupData: TwoFactorSetupResponse | null = null;
  isTwoFactorEnabled = false;
  isQrCodeVisible = false;
  recoveryCodes: string[] = [];

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

    this.check2FAStatus();
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

    this.twoFactorForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
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

    if (section !== 'security') {
      this.resetTwoFactorSetupState();
    }
  }

  resetTwoFactorSetupState(): void {
    this.twoFactorSetupData = null;
    this.isQrCodeVisible = false;
    if (!this.isTwoFactorEnabled) {
      this.recoveryCodes = [];
    }
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

  check2FAStatus(): void {
    this.twoFactorService.getStatus().subscribe({
      next: (response) => {
        this.isTwoFactorEnabled = response.enabled;
      },
      error: (error) => {
        console.error('Failed to check 2FA status:', error);
        this.isTwoFactorEnabled = false;
      },
    });
  }

  setup2FA(): void {
    this.alertService.info('Initiating 2FA setup...');

    this.twoFactorService.setup().subscribe({
      next: (response) => {
        this.twoFactorSetupData = response;
        console.log(this.twoFactorSetupData.qrCodeUri);
        if (!this.twoFactorSetupData.qrCodeUri) {
          const email =
            this.profileForm.get('email')?.value || 'user@example.com';
          this.twoFactorSetupData.qrCodeUri =
            this.twoFactorService.generateOtpauthUrl(
              email,
              this.twoFactorSetupData.secretKey,
              'Trader CRM'
            );
        }

        this.isQrCodeVisible = true;
      },
      error: (error) => {
        console.error('2FA setup error:', error);
        this.alertService.error('Failed to set up 2FA. Please try again.');
      },
    });
  }

  verify2FA(code: string): void {
    this.isTwoFactorVerifying = true;

    this.twoFactorService.verify(code).subscribe({
      next: (response) => {
        this.isTwoFactorEnabled = true;

        if (response.recoveryCodes && Array.isArray(response.recoveryCodes)) {
          this.recoveryCodes = response.recoveryCodes;
        }

        this.alertService.success(
          'Two-factor authentication enabled successfully.'
        );
        this.isTwoFactorVerifying = false;
      },
      error: (error) => {
        console.error('2FA verification error:', error);
        this.alertService.error('Invalid verification code. Please try again.');
        this.isTwoFactorVerifying = false;
      },
    });
  }

  disable2FA(code: string): void {
    this.isDisabling2FA = true;

    this.twoFactorService.disable(code).subscribe({
      next: (response) => {
        this.isTwoFactorEnabled = false;
        this.isQrCodeVisible = false;
        this.recoveryCodes = [];
        this.alertService.success(
          'Two-factor authentication disabled successfully.'
        );
        this.isDisabling2FA = false;
      },
      error: (error) => {
        console.error('2FA disable error:', error);
        this.alertService.error('Invalid verification code. Please try again.');
        this.isDisabling2FA = false;
      },
    });
  }

  onTwoFactorComplete(code: string): void {
    if (this.isQrCodeVisible && this.twoFactorSetupData) {
      this.verify2FA(code);
    } else if (this.isTwoFactorEnabled && this.isQrCodeVisible) {
      this.disable2FA(code);
    }
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
