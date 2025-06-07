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
import {
  ClientCreateRequest,
  ClientRegistrationResponse,
} from '../../models/clients.model';
import {
  ClientsService,
  AffiliateDropdownItem,
  AffiliateSearchParams,
  AffiliateSearchResponse,
} from '../../services/clients.service';
import { Observable, map } from 'rxjs';
import {
  FilterableDropdownComponent,
  DropdownItem,
  DropdownSearchParams,
  DropdownSearchResponse,
} from '../../../../shared/components/filterable-dropdown/filterable-dropdown.component';

@Component({
  selector: 'app-client-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FilterableDropdownComponent],
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
        <!-- Success Message with Generated Password -->
        <div
          *ngIf="generatedPassword"
          class="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
        >
          <div class="flex items-center mb-2">
            <svg
              class="w-5 h-5 text-green-600 dark:text-green-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <h5 class="text-sm font-medium text-green-800 dark:text-green-200">
              Client Registered Successfully
            </h5>
          </div>
          <p class="text-sm text-green-700 dark:text-green-300 mb-3">
            A password has been generated for the new client. Please copy and
            securely share this password:
          </p>
          <div class="flex items-center space-x-2">
            <input
              type="text"
              readonly
              [value]="generatedPassword"
              class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-md text-sm font-mono text-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              (click)="copyPassword()"
              class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {{ passwordCopied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>

        <form
          [formGroup]="registrationForm"
          class="space-y-4"
          *ngIf="!generatedPassword"
        >
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

          <!-- Affiliate and Phone Number Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="affiliateId"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Affiliate <span class="text-red-500">*</span>
              </label>
              <app-filterable-dropdown
                formControlName="affiliateId"
                placeholder="Search and select an affiliate..."
                [searchFunction]="affiliateSearchFunction"
                [pageSize]="20"
                containerClass="w-full"
              ></app-filterable-dropdown>
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
          </div>

          <!-- Country and Language Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <!-- Date of Birth and Source Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </form>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3"
      >
        <button
          *ngIf="!generatedPassword"
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          (click)="onCancel()"
        >
          Cancel
        </button>
        <button
          *ngIf="!generatedPassword"
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
        <button
          *ngIf="generatedPassword"
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          (click)="onClose()"
        >
          Close
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
  private alertService = inject(AlertService);

  isSubmitting = false;
  registrationForm: FormGroup;
  generatedPassword: string | null = null;
  passwordCopied = false;

  // Affiliate search function for the filterable dropdown
  affiliateSearchFunction = (
    params: DropdownSearchParams
  ): Observable<DropdownSearchResponse> => {
    const searchParams: AffiliateSearchParams = {
      globalFilter: params.globalFilter,
      pageIndex: params.pageIndex,
      pageSize: params.pageSize,
    };

    return this.clientsService.getAffiliatesDropdown(searchParams).pipe(
      map((response: AffiliateSearchResponse) => ({
        items: response.items.map((affiliate: AffiliateDropdownItem) => ({
          value: affiliate.affiliateId,
          label: affiliate.userFullName,
        })),
        totalCount: response.totalCount,
        hasNextPage: response.hasNextPage,
        hasPreviousPage: response.hasPreviousPage,
      }))
    );
  };

  constructor() {
    this.registrationForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      affiliateId: ['', Validators.required],
      telephone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      country: [''],
      language: [''],
      dateOfBirth: [''],
      source: [''],
    });
  }

  ngOnInit() {
    // Initialization is handled by the search function
  }

  onSubmit() {
    if (this.registrationForm.invalid) {
      Object.keys(this.registrationForm.controls).forEach((key) => {
        this.registrationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.registrationForm.value;

    const clientData: ClientCreateRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      username: formValue.username,
      affiliateId: formValue.affiliateId,
      telephone: formValue.telephone || null,
      country: formValue.country || null,
      language: formValue.language || null,
      dateOfBirth: new Date(formValue.dateOfBirth).toISOString() || null,
      source: formValue.source || null,
    };

    this.clientsService.createClientForAdmin(clientData).subscribe({
      next: (response: ClientRegistrationResponse) => {
        this.isSubmitting = false;

        // Check if a password was generated
        if (response.generatedPassword) {
          this.generatedPassword = response.generatedPassword;
          this.alertService.success(
            'Client registered successfully! A password has been generated.'
          );
        } else {
          this.alertService.success('Client registered successfully!');
          this.modalRef.close(true);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error(
            'A client with this email or username already exists.'
          );
        } else {
          this.alertService.error(
            'Failed to register client. Please try again.'
          );
        }
      },
    });
  }

  async copyPassword() {
    if (!this.generatedPassword) return;

    try {
      await navigator.clipboard.writeText(this.generatedPassword);
      this.passwordCopied = true;
      this.alertService.success('Password copied to clipboard!');

      // Reset the copied state after 3 seconds
      setTimeout(() => {
        this.passwordCopied = false;
      }, 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this.generatedPassword;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      this.passwordCopied = true;
      this.alertService.success('Password copied to clipboard!');

      setTimeout(() => {
        this.passwordCopied = false;
      }, 3000);
    }
  }

  onCancel() {
    this.modalRef.dismiss();
  }

  onClose() {
    this.modalRef.close(true);
  }
}
