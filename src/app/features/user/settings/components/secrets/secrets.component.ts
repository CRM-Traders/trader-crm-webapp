import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../../core/services/alert.service';
import {
  AffiliateSecret,
  CreateAffiliateSecretRequest,
  UpdateAffiliateSecretRequest,
} from '../../models/affiliate-secret.model';
import { AffiliateSecretsService } from '../../services/affiliate-secrets.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-secrets',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './secrets.component.html',
  styleUrl: './secrets.component.scss',
})
export class SecretsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private secretsService = inject(AffiliateSecretsService);

  affiliateSecrets: AffiliateSecret[] = [];
  secretForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  showModal = false;
  editingSecret: AffiliateSecret | null = null;
  minDate: string;

  constructor() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.minDate = now.toISOString().slice(0, 16);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadSecrets();
  }

  initForm(): void {
    this.secretForm = this.fb.group({
      expirationDate: [''],
      ipRestriction: [
        '',
        [
          Validators.pattern(
            /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
          ),
        ],
      ],
    });
  }

  loadSecrets(): void {
    this.isLoading = true;
    this.secretsService.getAffiliateSecrets().subscribe({
      next: (secrets: any) => {
        this.affiliateSecrets = secrets.affiliateSecrets;
        this.isLoading = false;
      },
      error: (error) => {
        this.alertService.error('Failed to load API secrets');
        this.isLoading = false;
      },
    });
  }

  openCreateModal(): void {
    this.editingSecret = null;
    this.secretForm.reset();
    this.showModal = true;
  }

  openEditModal(secret: AffiliateSecret): void {
    this.editingSecret = secret;

    // Convert the date string to local datetime format for the input
    let formattedDate = '';
    if (secret.expirationDate) {
      const date = new Date(secret.expirationDate);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      formattedDate = date.toISOString().slice(0, 16);
    }

    this.secretForm.patchValue({
      expirationDate: formattedDate,
      ipRestriction: secret.ipRestriction || '',
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingSecret = null;
    this.secretForm.reset();
  }

  saveSecret(): void {
    if (this.secretForm.invalid) {
      this.markFormGroupTouched(this.secretForm);
      return;
    }

    this.isSaving = true;
    const formValue = this.secretForm.value;

    // Format the expiration date if provided
    const request: CreateAffiliateSecretRequest | UpdateAffiliateSecretRequest =
      {
        expirationDate: formValue.expirationDate || undefined,
        ipRestriction: formValue.ipRestriction || undefined,
      };

    if (this.editingSecret) {
      // Handle update
      this.secretsService
        .updateAffiliateSecret(
          this.editingSecret.id,
          request as UpdateAffiliateSecretRequest
        )
        .subscribe({
          next: () => {
            this.alertService.success('API secret updated successfully');
            this.isSaving = false;
            this.closeModal();
            this.loadSecrets();
          },
          error: (error) => {
            this.alertService.error('Failed to update API secret');
            this.isSaving = false;
          },
        });
    } else {
      // Handle create
      this.secretsService.createAffiliateSecret(request).subscribe({
        next: (newSecret) => {
          this.alertService.success('API secret created successfully');
          this.isSaving = false;
          this.closeModal();
          this.loadSecrets();
        },
        error: (error) => {
          this.alertService.error('Failed to create API secret');
          this.isSaving = false;
        },
      });
    }
  }

  toggleSecretStatus(secret: AffiliateSecret): void {
    const action = secret.isActive ? 'deactivate' : 'activate';
    const observable = secret.isActive
      ? this.secretsService.deactivateAffiliateSecret(secret.id)
      : this.secretsService.activateAffiliateSecret(secret.id);

    observable.subscribe({
      next: () => {
        this.alertService.success(`API secret ${action}d successfully`);
        this.loadSecrets();
      },
      error: (error) => {
        this.alertService.error(`Failed to ${action} API secret`);
      },
    });
  }

  deleteSecret(secret: AffiliateSecret): void {
    if (
      !confirm(
        'Are you sure you want to delete this API secret? This action cannot be undone.'
      )
    ) {
      return;
    }

    this.secretsService.deleteAffiliateSecret(secret.id).subscribe({
      next: () => {
        this.alertService.success('API secret deleted successfully');
        this.loadSecrets();
      },
      error: (error) => {
        this.alertService.error('Failed to delete API secret');
      },
    });
  }

  copySecretKey(secretKey: string): void {
    navigator.clipboard.writeText(secretKey).then(
      () => {
        this.alertService.success('Secret key copied to clipboard');
      },
      (err) => {
        this.alertService.error('Failed to copy secret key');
      }
    );
  }

  maskSecretKey(secretKey: string): string {
    if (secretKey.length <= 8) {
      return '••••••••';
    }
    const firstPart = secretKey.substring(0, 4);
    const lastPart = secretKey.substring(secretKey.length - 4);
    return `${firstPart}••••••••${lastPart}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
