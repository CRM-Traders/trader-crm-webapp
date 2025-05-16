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
  errorMessage = '';

  currentStep: string = '2fa-disabled';

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
        this.currentStep = response.enabled ? '2fa-enabled' : '2fa-disabled';
      },
      error: (error) => {
        console.error('Failed to check 2FA status:', error);
        this.isTwoFactorEnabled = false;
        this.currentStep = '2fa-disabled';
      },
    });
  }

  startSetup(): void {
    this.setup2FA();
    this.currentStep = '2fa-setup';
  }

  startDisable(): void {
    this.isQrCodeVisible = true;
    this.currentStep = '2fa-disable';
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
        this.currentStep = '2fa-disabled';
      },
    });
  }

  verify2FA(code: string): void {
    this.isTwoFactorVerifying = true;
    this.errorMessage = '';

    this.twoFactorService.verify(code).subscribe({
      next: (response) => {
        this.isTwoFactorEnabled = true;

        if (response.recoveryCodes && Array.isArray(response.recoveryCodes)) {
          this.recoveryCodes = response.recoveryCodes;
        }

        this.alertService.success(
          'Two-factor authentication enabled successfully. Please save your recovery codes.'
        );
        this.isTwoFactorVerifying = false;
        this.currentStep = '2fa-enabled';
      },
      error: (error) => {
        console.error('2FA verification error:', error);
        this.errorMessage = 'Invalid verification code. Please try again.';
        this.alertService.error(this.errorMessage);
        this.isTwoFactorVerifying = false;
      },
    });
  }

  disable2FA(code: string): void {
    this.isDisabling2FA = true;
    this.errorMessage = '';

    this.twoFactorService.disable(code).subscribe({
      next: (response) => {
        this.isTwoFactorEnabled = false;
        this.isQrCodeVisible = false;
        this.recoveryCodes = [];
        this.alertService.success(
          'Two-factor authentication disabled successfully.'
        );
        this.isDisabling2FA = false;
        this.currentStep = '2fa-disabled';
      },
      error: (error) => {
        console.error('2FA disable error:', error);
        this.errorMessage = 'Invalid verification code. Please try again.';
        this.alertService.error(this.errorMessage);
        this.isDisabling2FA = false;
      },
    });
  }

  onTwoFactorComplete(code: string): void {
    if (this.currentStep === '2fa-setup') {
      this.verify2FA(code);
    } else if (this.currentStep === '2fa-disable') {
      this.disable2FA(code);
    }
  }

  resetTwoFactorSetupState(): void {
    this.twoFactorSetupData = null;
    this.isQrCodeVisible = false;
    this.errorMessage = '';
    this.currentStep = this.isTwoFactorEnabled ? '2fa-enabled' : '2fa-disabled';
  }

  finishSetup(): void {
    this.isQrCodeVisible = false;
    this.alertService.success(
      'Two-factor authentication setup completed successfully.'
    );
  }

  copyRecoveryCodes(): void {
    const codesText = this.recoveryCodes.join('\n');
    navigator.clipboard.writeText(codesText).then(
      () => {
        this.alertService.success('Recovery codes copied to clipboard');
      },
      (err) => {
        this.alertService.error('Could not copy recovery codes');
        console.error('Could not copy text: ', err);
      }
    );
  }

  downloadRecoveryCodes(): void {
    const codesText =
      'RECOVERY CODES - KEEP THESE SECURE\n\n' +
      this.recoveryCodes.join('\n') +
      '\n\nImportant: Each code can only be used once.';

    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'recovery-codes.txt';
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    this.alertService.success('Recovery codes downloaded');
  }
}
