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
import { AffiliateCreateRequest } from '../../models/affiliates.model';
import { AffiliatesService } from '../../services/affiliates.service';

@Component({
  selector: 'app-affiliate-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
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

          <!-- First Name Field -->
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

          <!-- Last Name Field -->
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

          <!-- Email Field -->
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
              <span *ngIf="registrationForm.get('email')?.errors?.['required']"
                >Email is required</span
              >
              <span *ngIf="registrationForm.get('email')?.errors?.['email']"
                >Please enter a valid email</span
              >
            </p>
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
              <span *ngIf="registrationForm.get('website')?.errors?.['pattern']"
                >Invalid URL format (must start with http:// or https://)</span
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

  constructor() {
    this.registrationForm = this.fb.group({
      name: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
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
      email: this.registrationForm.value.email,
      phone: this.registrationForm.value.phone || undefined,
      website: this.registrationForm.value.website || undefined,
    };

    this.affiliatesService.createAffiliate(affiliateData).subscribe({
      next: () => {
        this.alertService.success('Affiliate registered successfully!');
        this.modalRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error(
            'An affiliate with this email already exists.'
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
