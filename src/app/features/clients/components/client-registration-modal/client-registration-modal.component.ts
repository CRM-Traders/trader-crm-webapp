// src/app/features/clients/components/client-registration-modal/client-registration-modal.component.ts

import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { ClientCreateRequest } from '../../models/clients.model';
import { ClientsService } from '../../services/clients.service';
import { AffiliatesService } from '../../../affiliates/services/affiliates.service';
import { Affiliate } from '../../../affiliates/models/affiliates.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-client-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Register New Client
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <form [formGroup]="registrationForm" class="space-y-4">
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

          <!-- Affiliate Field -->
          <div>
            <label
              for="affiliateId"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Affiliate <span class="text-red-500">*</span>
            </label>
            <select
              id="affiliateId"
              formControlName="affiliateId"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                registrationForm.get('affiliateId')?.invalid &&
                registrationForm.get('affiliateId')?.touched
              "
              [class.focus:ring-red-500]="
                registrationForm.get('affiliateId')?.invalid &&
                registrationForm.get('affiliateId')?.touched
              "
            >
              <option value="">Select an affiliate</option>
              <option
                *ngFor="let affiliate of affiliates$ | async"
                [value]="affiliate.id"
              >
                {{ affiliate.name }}
              </option>
            </select>
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                registrationForm.get('affiliateId')?.invalid &&
                registrationForm.get('affiliateId')?.touched
              "
            >
              <span
                *ngIf="registrationForm.get('affiliateId')?.errors?.['required']"
                >Affiliate is required</span
              >
            </p>
          </div>

          <!-- Phone Field -->
          <div>
            <label
              for="telephone"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="telephone"
              formControlName="telephone"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                registrationForm.get('telephone')?.invalid &&
                registrationForm.get('telephone')?.touched
              "
              [class.focus:ring-red-500]="
                registrationForm.get('telephone')?.invalid &&
                registrationForm.get('telephone')?.touched
              "
              placeholder="+1 (555) 123-4567"
            />
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                registrationForm.get('telephone')?.invalid &&
                registrationForm.get('telephone')?.touched
              "
            >
              <span
                *ngIf="registrationForm.get('telephone')?.errors?.['pattern']"
                >Invalid phone number format</span
              >
            </p>
          </div>

          <!-- Country Field -->
          <div>
            <label
              for="country"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Country
            </label>
            <input
              type="text"
              id="country"
              formControlName="country"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="United States"
            />
          </div>

          <!-- Language Field -->
          <div>
            <label
              for="language"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Language
            </label>
            <input
              type="text"
              id="language"
              formControlName="language"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="English"
            />
          </div>

          <!-- Date of Birth Field -->
          <div>
            <label
              for="dateOfBirth"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              formControlName="dateOfBirth"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <!-- Source Field -->
          <div>
            <label
              for="source"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Source
            </label>
            <input
              type="text"
              id="source"
              formControlName="source"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Web, Referral, etc."
            />
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
            {{ isSubmitting ? 'Registering...' : 'Register Client' }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class ClientRegistrationModalComponent implements OnInit {
  @Input() modalRef!: ModalRef;

  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private affiliatesService = inject(AffiliatesService);
  private alertService = inject(AlertService);

  isSubmitting = false;
  registrationForm: FormGroup;
  affiliates$!: Observable<Affiliate[]>;

  constructor() {
    this.registrationForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      affiliateId: ['', Validators.required],
      telephone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      country: [''],
      language: [''],
      dateOfBirth: [''],
      source: [''],
    });
  }

  ngOnInit() {
    // Load affiliates for the dropdown
    // Note: You'll need to add a method to get all affiliates in the affiliates service
    // this.affiliates$ = this.affiliatesService.getAllAffiliates();
  }

  onSubmit() {
    if (this.registrationForm.invalid) {
      Object.keys(this.registrationForm.controls).forEach((key) => {
        this.registrationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const clientData: ClientCreateRequest = {
      firstName: this.registrationForm.value.firstName,
      lastName: this.registrationForm.value.lastName,
      email: this.registrationForm.value.email,
      affiliateId: this.registrationForm.value.affiliateId,
      telephone: this.registrationForm.value.telephone || undefined,
      country: this.registrationForm.value.country || undefined,
      language: this.registrationForm.value.language || undefined,
      dateOfBirth: this.registrationForm.value.dateOfBirth || undefined,
      source: this.registrationForm.value.source || undefined,
    };

    this.clientsService.createClient(clientData).subscribe({
      next: () => {
        this.alertService.success('Client registered successfully!');
        this.modalRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error('A client with this email already exists.');
        } else {
          this.alertService.error(
            'Failed to register client. Please try again.'
          );
        }
      },
    });
  }

  onCancel() {
    this.modalRef.dismiss();
  }
}
