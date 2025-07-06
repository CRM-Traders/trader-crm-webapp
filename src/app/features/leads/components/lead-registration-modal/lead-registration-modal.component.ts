import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable, Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { Country } from '../../../../core/models/country.model';
import {
  LeadCreateResponse,
  LeadCreateRequest,
} from '../../models/leads.model';
import { LeadsService } from '../../services/leads.service';

@Component({
  selector: 'app-lead-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Register New Lead
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <!-- Registration Form (shown before success) -->
        <form
          *ngIf="!registrationSuccess"
          [formGroup]="registrationForm"
          class="space-y-4"
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
                placeholder="Enter first name"
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
                placeholder="Enter last name"
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
                placeholder="Enter email address"
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
                placeholder="Enter username"
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
                <span
                  *ngIf="registrationForm.get('username')?.errors?.['minlength']"
                  >Username must be at least 3 characters</span
                >
              </p>
            </div>
          </div>

          <!-- Phone and Country Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="telephone"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Phone Number <span class="text-red-500">*</span>
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
                  *ngIf="registrationForm.get('telephone')?.errors?.['required']"
                  >Phone number is required</span
                >
                <span
                  *ngIf="registrationForm.get('telephone')?.errors?.['pattern']"
                  >Please enter a valid phone number</span
                >
              </p>
            </div>

            <div>
              <label
                for="country"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Country <span class="text-red-500">*</span>
              </label>
              <select
                id="country"
                formControlName="country"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('country')?.invalid &&
                  registrationForm.get('country')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('country')?.invalid &&
                  registrationForm.get('country')?.touched
                "
              >
                <option value="">Select country</option>
                <option
                  *ngFor="let country of countries"
                  [value]="country.code"
                >
                  {{ country.name }}
                </option>
              </select>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('country')?.invalid &&
                  registrationForm.get('country')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('country')?.errors?.['required']"
                  >Country is required</span
                >
              </p>
            </div>
          </div>

          <!-- Language and Date of Birth Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="language"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Language <span class="text-red-500">*</span>
              </label>
              <select
                id="language"
                formControlName="language"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('language')?.invalid &&
                  registrationForm.get('language')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('language')?.invalid &&
                  registrationForm.get('language')?.touched
                "
              >
                <option value="">Select language</option>
                <option
                  *ngFor="let language of languages"
                  [value]="language.key"
                >
                  {{ language.value }}
                </option>
              </select>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('language')?.invalid &&
                  registrationForm.get('language')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('language')?.errors?.['required']"
                  >Language is required</span
                >
              </p>
            </div>

            <div>
              <label
                for="dateOfBirth"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Date of Birth <span class="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                formControlName="dateOfBirth"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('dateOfBirth')?.invalid &&
                  registrationForm.get('dateOfBirth')?.touched
                "
                [class.focus:ring-red-500]="
                  registrationForm.get('dateOfBirth')?.invalid &&
                  registrationForm.get('dateOfBirth')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('dateOfBirth')?.invalid &&
                  registrationForm.get('dateOfBirth')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('dateOfBirth')?.errors?.['required']"
                  >Date of birth is required</span
                >
              </p>
            </div>
          </div>

          <!-- Source -->
          <div>
            <label
              for="source"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Source <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="source"
              formControlName="source"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                registrationForm.get('source')?.invalid &&
                registrationForm.get('source')?.touched
              "
              [class.focus:ring-red-500]="
                registrationForm.get('source')?.invalid &&
                registrationForm.get('source')?.touched
              "
              placeholder="Enter source (e.g., website, referral, etc.)"
            />
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                registrationForm.get('source')?.invalid &&
                registrationForm.get('source')?.touched
              "
            >
              <span *ngIf="registrationForm.get('source')?.errors?.['required']"
                >Source is required</span
              >
            </p>
          </div>
        </form>

        <!-- Success Message with Generated Password -->
        <div *ngIf="registrationSuccess" class="text-center space-y-6">
          <!-- Success Icon -->
          <div
            class="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center"
          >
            <svg
              class="w-8 h-8 text-green-600 dark:text-green-400"
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
          </div>

          <!-- Success Message -->
          <div>
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            >
              Lead Registered Successfully!
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              The lead has been created and a password has been generated.
            </p>
          </div>

          <!-- Generated Password Section -->
          <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Generated Password
            </h4>

            <!-- Password Display with Copy Button -->
            <div class="flex items-center gap-3">
              <div class="flex-1 relative">
                <input
                  type="text"
                  readonly
                  [value]="registrationResponse?.generatedPassword"
                  id="generatedPassword"
                  class="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                (click)="copyPassword()"
                [class.bg-green-600]="passwordCopied"
                [class.hover:bg-green-700]="passwordCopied"
              >
                <span class="flex items-center">
                  <svg
                    *ngIf="!passwordCopied"
                    class="w-4 h-4 mr-1"
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
                  <svg
                    *ngIf="passwordCopied"
                    class="w-4 h-4 mr-1"
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
                  {{ passwordCopied ? 'Copied!' : 'Copy' }}
                </span>
              </button>
            </div>

            <!-- Additional Info -->
            <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>Lead ID: {{ registrationResponse?.leadId }}</p>
              <p>User ID: {{ registrationResponse?.userId }}</p>
            </div>
          </div>

          <!-- Warning Message -->
          <div
            class="bg-yellow-50 dark:bg-yellow-900/5 border border-yellow-200 dark:border-yellow-800/5 rounded-lg p-3"
          >
            <div class="flex items-start">
              <svg
                class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                ></path>
              </svg>
              <div>
                <h4
                  class="text-sm font-medium text-yellow-800 dark:text-yellow-300"
                >
                  Important
                </h4>
                <p class="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  Please copy and securely share this password with the lead. It
                  will not be displayed again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3"
      >
        <button
          *ngIf="!registrationSuccess"
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          (click)="onCancel()"
        >
          Cancel
        </button>

        <button
          *ngIf="!registrationSuccess"
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
            <svg
              *ngIf="!isSubmitting"
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              ></path>
            </svg>
            {{ isSubmitting ? 'Registering...' : 'Register Lead' }}
          </span>
        </button>

        <button
          *ngIf="registrationSuccess"
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          (click)="onClose()"
        >
          Close
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class LeadRegistrationModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;

  private fb = inject(FormBuilder);
  private leadsService = inject(LeadsService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private destroy$ = new Subject<void>();

  registrationForm!: FormGroup;
  isSubmitting = false;
  registrationSuccess = false;
  registrationResponse: LeadCreateResponse | null = null;
  passwordCopied = false;

  // Dropdown data
  countries: Country[] = [];
  languages: Array<{ key: string; value: string }> = [];

  ngOnInit(): void {
    this.initForm();
    this.loadCountries();
    this.loadLanguages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.registrationForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      telephone: [
        '',
        [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)],
      ],
      country: ['', [Validators.required]],
      language: ['', [Validators.required]],
      dateOfBirth: ['', [Validators.required]],
      source: ['', [Validators.required]],
    });
  }

  private loadCountries(): void {
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (countries) => {
          this.countries = countries;
        },
        error: (error) => {
          console.error('Failed to load countries:', error);
        },
      });
  }

  private loadLanguages(): void {
    this.languages = this.languageService.getAllLanguages();
  }

  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.registrationForm.value;

    // Convert date to ISO format
    const dateOfBirth = formValue.dateOfBirth
      ? new Date(formValue.dateOfBirth).toISOString()
      : '';

    const request: LeadCreateRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      username: formValue.username,
      telephone: formValue.telephone,
      country: formValue.country, // This will now be the country code
      language: formValue.language, // This will now be the language key
      dateOfBirth: dateOfBirth,
      source: formValue.source,
    };

    this.leadsService
      .createLead(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          let errorMessage = 'Failed to register lead. Please try again.';

          if (error.status === 409) {
            errorMessage = 'A user with this email or username already exists.';
          } else if (error.status === 400) {
            errorMessage =
              'Invalid data provided. Please check your input and try again.';
          }

          this.alertService.error(errorMessage);
          console.error('Registration error:', error);
          return of(null);
        }),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe((result) => {
        if (result) {
          this.registrationResponse = result;
          this.registrationSuccess = true;
          this.alertService.success('Lead registered successfully!');
        }
      });
  }

  copyPassword(): void {
    if (this.registrationResponse?.generatedPassword) {
      navigator.clipboard
        .writeText(this.registrationResponse.generatedPassword)
        .then(() => {
          this.passwordCopied = true;
          this.alertService.success('Password copied to clipboard!');

          // Reset the copied state after 3 seconds
          setTimeout(() => {
            this.passwordCopied = false;
          }, 3000);
        })
        .catch(() => {
          this.alertService.error('Failed to copy password to clipboard');
        });
    }
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registrationForm.controls).forEach((key) => {
      this.registrationForm.get(key)?.markAsTouched();
    });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }

  onClose(): void {
    this.modalRef.close(this.registrationResponse);
  }

  getCountryNameByCode(countryCode: string): string {
    const country = this.countries.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  }

  getLanguageNameByKey(languageKey: string): string {
    const language = this.languages.find(l => l.key === languageKey);
    return language ? language.value : languageKey;
  }
}
