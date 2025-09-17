// src/app/features/affiliates/components/affiliate-registration-modal/affiliate-registration-modal.component.ts

import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  AffiliateCreateRequest,
  AffiliateCreateResponse,
} from '../../models/affiliates.model';
import { AffiliatesService } from '../../services/affiliates.service';

@Component({
  selector: 'app-affiliate-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Registration Form -->
      <div>
        <!-- Modal Header -->
        <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
            Register New Affiliate
          </h4>
        </div>

        <!-- Modal Body -->
        <div class="px-6 py-6">
          <form [formGroup]="registrationForm" class="space-y-4">
            <!-- First Name and Last Name Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  for="firstName"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  First Name <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  formControlName="firstName"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.border-red-500]="
                    registrationForm.get('firstName')?.invalid &&
                    registrationForm.get('firstName')?.touched
                  "
                  [class.focus:ring-red-500]="
                    registrationForm.get('firstName')?.invalid &&
                    registrationForm.get('firstName')?.touched
                  "
                />
                <p
                  class="mt-1 text-sm text-red-600 dark:text-red-400"
                  *ngIf="
                    registrationForm.get('firstName')?.invalid &&
                    registrationForm.get('firstName')?.touched
                  "
                >
                  <span
                    *ngIf="registrationForm.get('firstName')?.errors?.['required']"
                    >First name is required</span
                  >
                </p>
              </div>

              <div>
                <label
                  for="lastName"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Last Name <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  formControlName="lastName"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.border-red-500]="
                    registrationForm.get('lastName')?.invalid &&
                    registrationForm.get('lastName')?.touched
                  "
                  [class.focus:ring-red-500]="
                    registrationForm.get('lastName')?.invalid &&
                    registrationForm.get('lastName')?.touched
                  "
                />
                <p
                  class="mt-1 text-sm text-red-600 dark:text-red-400"
                  *ngIf="
                    registrationForm.get('lastName')?.invalid &&
                    registrationForm.get('lastName')?.touched
                  "
                >
                  <span
                    *ngIf="registrationForm.get('lastName')?.errors?.['required']"
                    >Last name is required</span
                  >
                </p>
              </div>
            </div>

            <div>
              <label
                for="name"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  type="text"
                  id="name"
                  formControlName="name"
                  placeholder="Auto-generated or enter manually"
                  class="w-full px-3 py-2 pr-10 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.border-red-500]="
                    registrationForm.get('name')?.invalid &&
                    registrationForm.get('name')?.touched
                  "
                  [class.focus:ring-red-500]="
                    registrationForm.get('name')?.invalid &&
                    registrationForm.get('name')?.touched
                  "
                />
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Full name will be auto-generated from first and last name
              </p>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('name')?.invalid &&
                  registrationForm.get('name')?.touched
                "
              >
                <span *ngIf="registrationForm.get('name')?.errors?.['required']"
                  >Name is required</span
                >
              </p>
            </div>

            <!-- Email and Username Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  for="email"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email <span class="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  formControlName="email"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.border-red-500]="
                    registrationForm.get('email')?.invalid &&
                    registrationForm.get('email')?.touched
                  "
                  [class.focus:ring-red-500]="
                    registrationForm.get('email')?.invalid &&
                    registrationForm.get('email')?.touched
                  "
                />
                <p
                  class="mt-1 text-sm text-red-600 dark:text-red-400"
                  *ngIf="
                    registrationForm.get('email')?.invalid &&
                    registrationForm.get('email')?.touched
                  "
                >
                  <span
                    *ngIf="registrationForm.get('email')?.errors?.['required']"
                    >Email is required</span
                  >
                  <span *ngIf="registrationForm.get('email')?.errors?.['email']"
                    >Please enter a valid email</span
                  >
                </p>
              </div>

              <div>
                <label
                  for="username"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Username <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <input
                    type="text"
                    id="username"
                    formControlName="username"
                    placeholder="Auto-generated or enter manually"
                    class="w-full px-3 py-2 pr-10 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    [class.border-red-500]="
                      registrationForm.get('username')?.invalid &&
                      registrationForm.get('username')?.touched
                    "
                    [class.focus:ring-red-500]="
                      registrationForm.get('username')?.invalid &&
                      registrationForm.get('username')?.touched
                    "
                  />

                  <!-- Regenerate button for username -->
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 px-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    (click)="regenerateUsername()"
                    title="Generate new username"
                    [disabled]="
                      !registrationForm.get('firstName')?.value &&
                      !registrationForm.get('lastName')?.value
                    "
                  >
                    <svg
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Username will be auto-generated from name or you can enter
                  manually
                </p>
                <p
                  class="mt-1 text-sm text-red-600 dark:text-red-400"
                  *ngIf="
                    registrationForm.get('username')?.invalid &&
                    registrationForm.get('username')?.touched
                  "
                >
                  <span
                    *ngIf="registrationForm.get('username')?.errors?.['required']"
                    >Username is required</span
                  >
                </p>
              </div>
            </div>

            <!-- Phone Field -->
            <div>
              <label
                for="phone"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                formControlName="phone"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('phone')?.invalid &&
                  registrationForm.get('phone')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('phone')?.invalid &&
                  registrationForm.get('phone')?.touched
                "
                placeholder="+1 (555) 123-4567"
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('phone')?.invalid &&
                  registrationForm.get('phone')?.touched
                "
              >
                <span *ngIf="registrationForm.get('phone')?.errors?.['pattern']"
                  >Invalid phone number format</span
                >
              </p>
            </div>

            <!-- Website Field -->
            <div>
              <label
                for="website"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Website
              </label>
              <input
                type="url"
                id="website"
                formControlName="website"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('website')?.invalid &&
                  registrationForm.get('website')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('website')?.invalid &&
                  registrationForm.get('website')?.touched
                "
                placeholder="https://example.com"
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('website')?.invalid &&
                  registrationForm.get('website')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('website')?.errors?.['pattern']"
                  >Invalid URL format (must start with http:// or
                  https://)</span
                >
              </p>
            </div>

            <!-- Secret Key Field -->
            <div>
              <label
                for="secretKey"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Secret Key <span class="text-red-500">*</span>
              </label>
              <div class="flex space-x-2">
                <input
                  type="text"
                  id="secretKey"
                  formControlName="secretKey"
                  class="flex-1 px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono"
                  [class.border-red-500]="
                    registrationForm.get('secretKey')?.invalid &&
                    registrationForm.get('secretKey')?.touched
                  "
                  [class.focus:ring-red-500]="
                    registrationForm.get('secretKey')?.invalid &&
                    registrationForm.get('secretKey')?.touched
                  "
                  placeholder="Enter or generate secret key"
                />
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center space-x-2"
                  (click)="generateSecretKey()"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    ></path>
                  </svg>
                  <span>Generate</span>
                </button>
              </div>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                The secret key should be 14 characters long
              </p>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('secretKey')?.invalid &&
                  registrationForm.get('secretKey')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('secretKey')?.errors?.['required']"
                  >Secret key is required</span
                >
                <span
                  *ngIf="registrationForm.get('secretKey')?.errors?.['minlength'] || registrationForm.get('secretKey')?.errors?.['maxlength']"
                  >Secret key must be exactly 14 characters</span
                >
              </p>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div
          class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3"
        >
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            (click)="onCancel()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            (click)="onSubmit()"
            [disabled]="registrationForm.invalid || isSubmitting"
          >
            <span class="flex items-center">
              <svg
                *ngIf="isSubmitting"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {{ isSubmitting ? 'Registering...' : 'Register Affiliate' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class AffiliateRegistrationModalComponent {
  @Input() modalRef!: ModalRef;

  private fb = inject(FormBuilder);
  private affiliatesService = inject(AffiliatesService);
  private alertService = inject(AlertService);

  isSubmitting = false;
  registrationForm: FormGroup;

  private usernameManuallyEdited = false;
  private nameManuallyEdited = false;
  private generatedUsernameBase = '';
  private generatedNameBase = '';

  constructor() {
    this.registrationForm = this.fb.group({
      name: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      secretKey: [
        '',
        [
          Validators.required,
          Validators.minLength(14),
          Validators.maxLength(14),
        ],
      ],
    });

    this.setupAutoGeneration();
  }

  private setupAutoGeneration(): void {
    // Listen to firstName changes
    this.registrationForm
      .get('firstName')
      ?.valueChanges.subscribe((firstName) => {
        if (!this.nameManuallyEdited) {
          this.generateName();
        }
        if (!this.usernameManuallyEdited && firstName) {
          this.generateUsername();
        }
      });

    // Listen to lastName changes
    this.registrationForm
      .get('lastName')
      ?.valueChanges.subscribe((lastName) => {
        if (!this.nameManuallyEdited) {
          this.generateName();
        }
        if (!this.usernameManuallyEdited && lastName) {
          this.generateUsername();
        }
      });

    // Listen to name manual changes
    this.registrationForm.get('name')?.valueChanges.subscribe((name) => {
      // Check if the name was manually edited by the user
      if (name && this.generatedNameBase && name !== this.generatedNameBase) {
        this.nameManuallyEdited = true;
      }
    });

    // Listen to username manual changes
    this.registrationForm
      .get('username')
      ?.valueChanges.subscribe((username) => {
        // Check if the username was manually edited by the user
        if (
          username &&
          this.generatedUsernameBase &&
          username !== this.generatedUsernameBase
        ) {
          this.usernameManuallyEdited = true;
        }
      });
  }

  /**
   * Generates a full name from firstName and lastName
   */
  private generateName(): void {
    const firstName = this.registrationForm.get('firstName')?.value || '';
    const lastName = this.registrationForm.get('lastName')?.value || '';

    if (!firstName && !lastName) {
      return;
    }

    // Generate full name - simple concatenation with space
    const fullName = `${firstName} ${lastName}`.trim();

    this.generatedNameBase = fullName;
    // Update the form without triggering valueChanges to avoid infinite loop
    this.registrationForm.patchValue({ name: fullName }, { emitEvent: false });
  }

  /**
   * Generates a unique username based on firstName and lastName
   */
  private generateUsername(): void {
    const firstName = this.registrationForm.get('firstName')?.value || '';
    const lastName = this.registrationForm.get('lastName')?.value || '';

    if (!firstName && !lastName) {
      return;
    }

    // Generate username variations
    const username = this.createUsernameVariation(firstName, lastName);

    this.generatedUsernameBase = username;
    // Update the form without triggering valueChanges to avoid infinite loop
    this.registrationForm.patchValue({ username }, { emitEvent: false });
  }

  /**
   * Creates username variations based on different patterns
   */
  private createUsernameVariation(
    firstName: string,
    lastName: string,
    suffix: string = ''
  ): string {
    // Clean and normalize names
    firstName = this.normalizeString(firstName);
    lastName = this.normalizeString(lastName);

    if (!firstName && !lastName) {
      return '';
    }

    const randomNum =
      suffix || Math.floor(Math.random() * (9999 - 100 + 1) + 100).toString();

    let selectedPattern: string;

    if (firstName && lastName) {
      const patterns = [
        `${firstName}.${lastName}${randomNum}`,
        `${firstName.charAt(0)}.${lastName}${randomNum}`,
        `${firstName}_${lastName.charAt(0)}${randomNum}`,
        `${firstName.charAt(0)}${lastName}${randomNum}`,
        `${firstName}${lastName.charAt(0)}${randomNum}`,
        `${firstName}${lastName}${randomNum}`,
      ];
      const patternIndex = Math.floor(Math.random() * patterns.length);
      selectedPattern = patterns[patternIndex];
    } else if (firstName) {
      selectedPattern = `${firstName}${randomNum}`;
    } else {
      selectedPattern = `${lastName}${randomNum}`;
    }

    return selectedPattern.toLowerCase();
  }

  private normalizeString(str: string): string {
    if (!str) return '';

    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  public regenerateName(): void {
    this.nameManuallyEdited = false;
    this.generateName();
  }

  public regenerateUsername(): void {
    this.usernameManuallyEdited = false;
    this.generateUsername();
  }

  public resetAutoGeneration(): void {
    this.usernameManuallyEdited = false;
    this.nameManuallyEdited = false;
    this.generatedUsernameBase = '';
    this.generatedNameBase = '';
  }

  generateSecretKey(): void {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let secretKey = '';

    // Generate a 14-character secret key
    for (let i = 0; i < 14; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      secretKey += characters[randomIndex];
    }

    // Set the generated secret key to the form control
    this.registrationForm.patchValue({
      secretKey: secretKey,
    });

    // Mark the field as touched to show validation
    this.registrationForm.get('secretKey')?.markAsTouched();
  }

  onSubmit() {
    if (this.registrationForm.invalid) {
      Object.keys(this.registrationForm.controls).forEach((key) => {
        this.registrationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const affiliateData: AffiliateCreateRequest = {
      name: this.registrationForm.value.name,
      firstName: this.registrationForm.value.firstName,
      lastName: this.registrationForm.value.lastName,
      username: this.registrationForm.value.username,
      email: this.registrationForm.value.email,
      phone: this.registrationForm.value.phone || undefined,
      website: this.registrationForm.value.website || undefined,
      secretKey: this.registrationForm.value.secretKey,
    };

    this.affiliatesService.createAffiliate(affiliateData).subscribe({
      next: (response: AffiliateCreateResponse) => {
        this.isSubmitting = false;
        this.alertService.success('Affiliate registered successfully!');
        this.modalRef.close({ success: true, data: response });
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error(
            'An affiliate with this email or username already exists.'
          );
        } else {
          this.alertService.error(
            'Failed to register affiliate. Please try again.'
          );
        }
      },
    });
  }

  onCancel() {
    this.modalRef.dismiss();
  }
}
