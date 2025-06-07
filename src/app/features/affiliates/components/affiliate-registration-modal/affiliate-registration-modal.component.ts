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
      <div *ngIf="!registrationSuccess">
        <!-- Modal Header -->
        <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
            Register New Affiliate
          </h4>
        </div>

        <!-- Modal Body -->
        <div class="px-6 py-6">
          <form [formGroup]="registrationForm" class="space-y-4">
            <div>
              <label
                for="name"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                formControlName="name"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('name')?.invalid &&
                  registrationForm.get('name')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('name')?.invalid &&
                  registrationForm.get('name')?.touched
                "
              />
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
                <input
                  type="text"
                  id="username"
                  formControlName="username"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.border-red-500]="
                    registrationForm.get('username')?.invalid &&
                    registrationForm.get('username')?.touched
                  "
                  [class.focus:ring-red-500]="
                    registrationForm.get('username')?.invalid &&
                    registrationForm.get('username')?.touched
                  "
                />
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

      <!-- Success Screen with Generated Password -->
      <div *ngIf="registrationSuccess">
        <!-- Modal Header -->
        <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h4
            class="text-xl font-semibold text-green-600 dark:text-green-400 flex items-center"
          >
            <svg
              class="w-6 h-6 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            Affiliate Registered Successfully!
          </h4>
        </div>

        <!-- Success Body -->
        <div class="px-6 py-6">
          <div class="space-y-6">
            <!-- Success Message -->
            <div
              class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
            >
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg
                    class="h-5 w-5 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
                <div class="ml-3">
                  <h3
                    class="text-sm font-medium text-green-800 dark:text-green-200"
                  >
                    Registration Completed
                  </h3>
                  <div class="mt-2 text-sm text-green-700 dark:text-green-300">
                    <p>
                      The affiliate account has been created successfully.
                      Please save the generated password as it will not be shown
                      again.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Account Details -->
            <div class="space-y-4">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Affiliate ID
                </label>
                <div class="flex items-center space-x-2">
                  <input
                    type="text"
                    readonly
                    [value]="registrationResponse?.affiliateId"
                    class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <button
                    type="button"
                    class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    (click)="
                      copyToClipboard(
                        registrationResponse?.affiliateId || '',
                        'Affiliate ID'
                      )
                    "
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Generated Password (highlighted) -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Generated Password
                  <span class="text-red-500 text-xs ml-1"
                    >(Save this - it won't be shown again)</span
                  >
                </label>
                <div class="flex items-center space-x-2">
                  <input
                    type="text"
                    readonly
                    [value]="registrationResponse?.generatedPassword"
                    class="flex-1 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm font-semibold"
                  />
                  <button
                    type="button"
                    class="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    (click)="
                      copyToClipboard(
                        registrationResponse?.generatedPassword || '',
                        'Password'
                      )
                    "
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  User ID
                </label>
                <div class="flex items-center space-x-2">
                  <input
                    type="text"
                    readonly
                    [value]="registrationResponse?.userId"
                    class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <button
                    type="button"
                    class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    (click)="
                      copyToClipboard(
                        registrationResponse?.userId || '',
                        'User ID'
                      )
                    "
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Success Footer -->
        <div
          class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end"
        >
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            (click)="onClose()"
          >
            Close
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
  registrationSuccess = false;
  registrationResponse: AffiliateCreateResponse | null = null;
  registrationForm: FormGroup;

  constructor() {
    this.registrationForm = this.fb.group({
      name: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      username: ['', Validators.required], // Added username field
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
    });
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
      username: this.registrationForm.value.username, // Include username
      email: this.registrationForm.value.email,
      phone: this.registrationForm.value.phone || undefined,
      website: this.registrationForm.value.website || undefined,
    };

    this.affiliatesService.createAffiliate(affiliateData).subscribe({
      next: (response: AffiliateCreateResponse) => {
        this.isSubmitting = false;
        this.registrationSuccess = true;
        this.registrationResponse = response;
        this.alertService.success('Affiliate registered successfully!');
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

  copyToClipboard(text: string, label: string) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        this.alertService.success(`${label} copied to clipboard!`);
      });
    } else {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        this.alertService.success(`${label} copied to clipboard!`);
      } catch (err) {
        this.alertService.error('Failed to copy to clipboard');
      }
      document.body.removeChild(textArea);
    }
  }

  onCancel() {
    this.modalRef.dismiss();
  }

  onClose() {
    this.modalRef.close(true);
  }
}
