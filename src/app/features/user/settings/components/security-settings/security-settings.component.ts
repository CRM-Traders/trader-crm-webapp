import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TwoFactorComponent } from '../../../../../features/auth/two-factor/two-factor.component';
import { TwoFactorService } from '../../../../../core/services/two-factor.service';
import { TwoFactorSetupResponse } from '../../../../../core/models/two-f.model';
import { AlertService } from '../../../../../core/services/alert.service';
import { QrCodeModule } from 'ng-qrcode';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TwoFactorComponent,
    QrCodeModule,
  ],
  templateUrl: './security-settings.component.html',
  styleUrls: ['./security-settings.component.scss'],
})
export class SecuritySettingsComponent implements OnInit {
  private twoFactorService = inject(TwoFactorService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);

  twoFactorForm!: FormGroup;
  twoFactorSetupData: TwoFactorSetupResponse | null = null;
  isTwoFactorEnabled = false;
  isQrCodeVisible = false;
  recoveryCodes: string[] = [];
  isTwoFactorVerifying = false;
  isDisabling2FA = false;

  ngOnInit(): void {
    this.initForm();
    this.check2FAStatus();
  }

  initForm(): void {
    this.twoFactorForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
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
        if (!this.twoFactorSetupData.qrCodeUri) {
          const email = 'user@example.com';
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

  resetTwoFactorSetupState(): void {
    this.twoFactorSetupData = null;
    this.isQrCodeVisible = false;
    if (!this.isTwoFactorEnabled) {
      this.recoveryCodes = [];
    }
  }
}
