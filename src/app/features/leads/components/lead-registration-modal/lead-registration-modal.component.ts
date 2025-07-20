import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
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
        <!-- Registration Form -->
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
            <!-- Language Selection -->
            <div class="relative">
              <label
                for="language"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Language <span class="text-red-500">*</span>
              </label>

              <!-- Custom Dropdown Button -->
              <button
                type="button"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
                [class.border-red-500]="
                  registrationForm.get('language')?.invalid &&
                  registrationForm.get('language')?.touched
                "
                (click)="toggleLanguageDropdown()"
                (keydown)="onLanguageButtonKeydown($event)"
              >
                <span class="truncate">{{ getSelectedLanguageName() }}</span>
                <svg
                  class="w-4 h-4 ml-2 transition-transform"
                  [class.rotate-180]="languageDropdownOpen"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>

              <!-- Dropdown Panel -->
              <div
                *ngIf="languageDropdownOpen"
                class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
              >
                <!-- Search Input -->
                <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                  <input
                    #languageSearchInput
                    type="text"
                    placeholder="Search languages..."
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    (input)="onLanguageSearch($event)"
                    [value]="languageSearchTerm"
                  />
                </div>

                <!-- Languages List -->
                <div class="max-h-48 overflow-y-auto">
                  <div
                    *ngFor="let language of filteredLanguages; let i = index"
                    class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                    [class.bg-blue-100]="isLanguageFocused(i)"
                    [class.dark:bg-blue-400]="isLanguageFocused(i)"
                    [tabindex]="0"
                    (click)="selectLanguage(language)"
                    (keydown)="onLanguageKeydown($event, language, i)"
                    (mouseenter)="setFocusedLanguageIndex(i)"
                  >
                    {{ language.value }}
                  </div>

                  <!-- No results -->
                  <div
                    *ngIf="filteredLanguages.length === 0"
                    class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No languages found
                  </div>
                </div>
              </div>

              <!-- Validation Error -->
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('language')?.invalid &&
                  registrationForm.get('language')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('language')?.errors?.['required']"
                >
                  Language is required
                </span>
              </p>
            </div>
            <!-- Country Selection -->
            <div class="relative">
              <label
                for="country"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Country <span class="text-red-500">*</span>
              </label>

              <!-- Custom Dropdown Button -->
              <button
                type="button"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
                [class.border-red-500]="
                  registrationForm.get('country')?.invalid &&
                  registrationForm.get('country')?.touched
                "
                (click)="toggleCountryDropdown()"
                (keydown)="onCountryButtonKeydown($event)"
              >
                <span class="truncate">{{ getSelectedCountryName() }}</span>
                <svg
                  class="w-4 h-4 ml-2 transition-transform"
                  [class.rotate-180]="countryDropdownOpen"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>

              <!-- Dropdown Panel -->
              <div
                *ngIf="countryDropdownOpen"
                class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
              >
                <!-- Search Input -->
                <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                  <input
                    #countrySearchInput
                    type="text"
                    placeholder="Search countries..."
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    (input)="onCountrySearch($event)"
                    [value]="countrySearchTerm"
                  />
                </div>

                <!-- Countries List -->
                <div class="max-h-48 overflow-y-auto">
                  <div
                    *ngFor="let country of filteredCountries; let i = index"
                    class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                    [class.bg-blue-100]="isCountryFocused(i)"
                    [class.dark:bg-blue-400]="isCountryFocused(i)"
                    [tabindex]="0"
                    (click)="selectCountry(country)"
                    (keydown)="onCountryKeydown($event, country, i)"
                    (mouseenter)="setFocusedCountryIndex(i)"
                  >
                    {{ country.name }}
                  </div>

                  <!-- No results -->
                  <div
                    *ngIf="filteredCountries.length === 0"
                    class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No countries found
                  </div>
                </div>
              </div>

              <!-- Validation Error -->
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('country')?.invalid &&
                  registrationForm.get('country')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('country')?.errors?.['required']"
                >
                  Country is required
                </span>
              </p>
            </div>
          </div>

          <!-- Language and Date of Birth Row -->
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
              Source
            </label>
            <input
              type="text"
              id="source"
              formControlName="source"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter source (e.g., website, referral, etc.)"
            />
          </div>
        </form>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3"
      >
        <button
          type="button"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          (click)="onCancel()"
          [disabled]="isSubmitting"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          (click)="onSubmit()"
          [disabled]="isSubmitting || registrationForm.invalid"
        >
          <svg
            *ngIf="isSubmitting"
            class="animate-spin -ml-1 mr-2 h-4 w-4 inline"
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
          {{ isSubmitting ? 'Registering...' : 'Register Lead' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./lead-registration-modal.component.scss'],
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

  // Country dropdown properties
  countryDropdownOpen = false;
  countrySearchTerm = '';
  availableCountries: Country[] = [];
  filteredCountries: Country[] = [];
  selectedCountry: Country | null = null;

  // Language dropdown properties
  languageDropdownOpen = false;
  languageSearchTerm = '';
  availableLanguages: Array<{ key: string; value: string }> = [];
  filteredLanguages: Array<{ key: string; value: string }> = [];
  selectedLanguage: { key: string; value: string } | null = null;

  // Keyboard navigation properties
  focusedCountryIndex = -1;
  focusedLanguageIndex = -1;

  ngOnInit(): void {
    this.initForm();
    this.loadCountries();
    this.loadLanguages();
    
    // Set default language to English
    setTimeout(() => {
      const englishLanguage = this.availableLanguages.find(lang => lang.key === 'en');
      if (englishLanguage) {
        this.selectedLanguage = englishLanguage;
      }
    }, 0);
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
        [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)],
      ],
      country: ['', [Validators.required]],
      language: ['en', [Validators.required]],
      dateOfBirth: ['', [Validators.required]],
      source: [''],
    });
  }

  private loadCountries(): void {
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (countries) => {
          this.availableCountries = countries;
          this.filteredCountries = countries;
        },
        error: (error) => {
          this.alertService.error('Failed to load countries');
        },
      });
  }

  private loadLanguages(): void {
    this.availableLanguages = this.languageService.getAllLanguages();
    this.filteredLanguages = this.availableLanguages;
  }

  // Country dropdown methods
  toggleCountryDropdown(): void {
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
      return;
    }
    this.languageDropdownOpen = false;
    this.countryDropdownOpen = true;
    this.focusedCountryIndex = 0; // Start with first item focused
  }

  onCountrySearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.countrySearchTerm = target.value.toLowerCase();

    this.filteredCountries = this.availableCountries.filter(
      (country) =>
        country.name.toLowerCase().includes(this.countrySearchTerm) ||
        country.code.toLowerCase().includes(this.countrySearchTerm)
    );
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.registrationForm.patchValue({ country: country.name });
    this.countryDropdownOpen = false;
    this.countrySearchTerm = '';
    this.filteredCountries = this.availableCountries;
  }

  getSelectedCountryName(): string {
    if (this.selectedCountry) {
      return this.selectedCountry.name;
    }
    return 'Select a country...';
  }

  // Language dropdown methods
  toggleLanguageDropdown(): void {
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
      return;
    }
    this.countryDropdownOpen = false;
    this.languageDropdownOpen = true;
    this.focusedLanguageIndex = 0; // Start with first item focused
  }

  onLanguageSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.languageSearchTerm = target.value.toLowerCase();

    this.filteredLanguages = this.availableLanguages.filter(
      (language) =>
        language.value.toLowerCase().includes(this.languageSearchTerm) ||
        language.key.toLowerCase().includes(this.languageSearchTerm)
    );
  }

  selectLanguage(language: { key: string; value: string }): void {
    this.selectedLanguage = language;
    this.registrationForm.patchValue({ language: language.value });
    this.languageDropdownOpen = false;
    this.languageSearchTerm = '';
    this.filteredLanguages = this.availableLanguages;
  }

  getSelectedLanguageName(): string {
    if (this.selectedLanguage) {
      return this.selectedLanguage.value;
    }
    return 'Select a language...';
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
      country: formValue.country, // This will now be the country name
      language: formValue.language, // This will now be the language name
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
          return of(null);
        }),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe((result) => {
        if (result) {
          this.alertService.success('Lead registered successfully!');
          this.modalRef.close({ success: true, data: result });
        }
      });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registrationForm.controls).forEach((key) => {
      this.registrationForm.get(key)?.markAsTouched();
    });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }

  getCountryNameByCode(countryName: string): string {
    return countryName;
  }

  getLanguageNameByKey(languageName: string): string {
    return languageName;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Close dropdowns if clicking outside
    if (!target.closest('.relative')) {
      this.closeAllDropdowns();
    }
  }

  private closeAllDropdowns(): void {
    this.countryDropdownOpen = false;
    this.languageDropdownOpen = false;
    this.focusedCountryIndex = -1;
    this.focusedLanguageIndex = -1;
  }

  // Keyboard navigation methods for Country dropdown
  isCountryFocused(index: number): boolean {
    return this.focusedCountryIndex === index;
  }

  setFocusedCountryIndex(index: number): void {
    this.focusedCountryIndex = index;
  }

  onCountryKeydown(event: KeyboardEvent, country: Country, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectCountry(country);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextCountry();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousCountry();
        break;
      case 'Escape':
        this.countryDropdownOpen = false;
        break;
    }
  }

  private focusNextCountry(): void {
    if (this.focusedCountryIndex < this.filteredCountries.length - 1) {
      this.focusedCountryIndex++;
    }
  }

  private focusPreviousCountry(): void {
    if (this.focusedCountryIndex > 0) {
      this.focusedCountryIndex--;
    }
  }

  // Keyboard navigation methods for Language dropdown
  isLanguageFocused(index: number): boolean {
    return this.focusedLanguageIndex === index;
  }

  setFocusedLanguageIndex(index: number): void {
    this.focusedLanguageIndex = index;
  }

  onLanguageKeydown(event: KeyboardEvent, language: { key: string; value: string }, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectLanguage(language);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextLanguage();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousLanguage();
        break;
      case 'Escape':
        this.languageDropdownOpen = false;
        break;
    }
  }

  private focusNextLanguage(): void {
    if (this.focusedLanguageIndex < this.filteredLanguages.length - 1) {
      this.focusedLanguageIndex++;
    }
  }

  private focusPreviousLanguage(): void {
    if (this.focusedLanguageIndex > 0) {
      this.focusedLanguageIndex--;
    }
  }

  // Button keydown handlers for opening dropdowns
  onCountryButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.countryDropdownOpen) {
          this.toggleCountryDropdown();
        }
        break;
    }
  }

  onLanguageButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.languageDropdownOpen) {
          this.toggleLanguageDropdown();
        }
        break;
    }
  }
}
