// src/app/features/leads/components/lead-details-modal/lead-details-modal.component.ts

import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  HostListener,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { Country } from '../../../../core/models/country.model';
import { LeadsService } from '../../services/leads.service';
import {
  Lead,
  LeadUpdateRequest,
  LeadStatus,
  LeadStatusLabels,
  LeadStatusColors,
} from '../../models/leads.model';

@Component({
  selector: 'app-lead-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div
        class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            Lead Details - {{ lead?.firstName }} {{ lead?.lastName }}
          </h2>
        </div>
      </div>

      <!-- Loading State -->
      <div
        *ngIf="leadLoading"
        class="px-6 py-8 flex items-center justify-center"
      >
        <div class="text-center">
          <svg
            class="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
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
          <p class="text-gray-600 dark:text-gray-400">Loading lead data...</p>
        </div>
      </div>

      <!-- Modal Body -->
      <div
        *ngIf="!leadLoading"
        class="px-6 py-4 bg-white dark:bg-gray-900 max-h-[100vh] overflow-y-auto"
      >
        <div class="space-y-6">
          <!-- Lead Information Section -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <form [formGroup]="editForm" class="space-y-4">
              <!-- Lead ID (Read-only) -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  ID
                </label>
                <span
                  class="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md block"
                >
                  {{ lead?.id }}
                </span>
              </div>

              <!-- Name Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    First Name
                  </label>
                  <div *ngIf="isEditing">
                    <input
                      type="text"
                      formControlName="firstName"
                      placeholder="First Name"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      [class.border-red-500]="
                        editForm.get('firstName')?.invalid &&
                        editForm.get('firstName')?.touched
                      "
                    />
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="text-sm text-gray-900 dark:text-white font-medium"
                  >
                    {{ lead?.firstName }}
                  </span>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Last Name
                  </label>
                  <div *ngIf="isEditing">
                    <input
                      type="text"
                      formControlName="lastName"
                      placeholder="Last Name"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      [class.border-red-500]="
                        editForm.get('lastName')?.invalid &&
                        editForm.get('lastName')?.touched
                      "
                    />
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="text-sm text-gray-900 dark:text-white font-medium"
                  >
                    {{ lead?.lastName }}
                  </span>
                </div>
              </div>

              <!-- Email and Phone Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email
                  </label>
                  <div *ngIf="isEditing">
                    <input
                      type="email"
                      formControlName="email"
                      placeholder="email@example.com"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      [class.border-red-500]="
                        editForm.get('email')?.invalid &&
                        editForm.get('email')?.touched
                      "
                    />
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="text-sm text-gray-900 dark:text-white"
                  >
                    <a
                      [href]="'mailto:' + lead?.email"
                      class="text-primary-500 hover:text-blue-400 hover:underline"
                    >
                      {{ lead?.email }}
                    </a>
                  </span>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Phone
                  </label>
                  <div *ngIf="isEditing">
                    <input
                      type="text"
                      formControlName="telephone"
                      placeholder="Phone number"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      [class.border-red-500]="
                        editForm.get('telephone')?.invalid &&
                        editForm.get('telephone')?.touched
                      "
                    />
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="text-sm text-gray-900 dark:text-white"
                  >
                    <a
                      *ngIf="lead?.telephone"
                      [href]="'tel:' + lead?.telephone"
                      class="text-primary-500 hover:text-blue-400 hover:underline"
                    >
                      {{ lead?.telephone }}
                    </a>
                    <span *ngIf="!lead?.telephone" class="text-gray-400"
                      >-</span
                    >
                  </span>
                </div>
              </div>

              <!-- Country and Language Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Country Selection -->
                <div class="relative" data-dropdown="country">
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Country
                  </label>
                  <div *ngIf="isEditing">
                    <!-- Custom Dropdown Button -->
                    <button
                      type="button"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center"
                      (click)="toggleCountryDropdown()"
                      (keydown)="onCountryButtonKeydown($event)"
                    >
                      <span class="truncate">{{
                        getSelectedCountryName()
                      }}</span>
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
                      <div
                        class="p-3 border-b border-gray-200 dark:border-gray-700"
                      >
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
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="text-sm text-gray-900 dark:text-white"
                  >
                    {{ getCountryNameByCode(lead?.country || null) || '-' }}
                  </span>
                </div>

                <!-- Language Selection -->
                <div class="relative" data-dropdown="language">
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Language
                  </label>
                  <div *ngIf="isEditing">
                    <!-- Custom Dropdown Button -->
                    <button
                      type="button"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center"
                      (click)="toggleLanguageDropdown()"
                      (keydown)="onLanguageButtonKeydown($event)"
                    >
                      <span class="truncate">{{
                        getSelectedLanguageName()
                      }}</span>
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
                      <div
                        class="p-3 border-b border-gray-200 dark:border-gray-700"
                      >
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
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="text-sm text-gray-900 dark:text-white"
                  >
                    {{ getLanguageNameByKey(lead?.language || null) || '-' }}
                  </span>
                </div>
              </div>

              <!-- Date of Birth -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Date of Birth
                </label>
                <div *ngIf="isEditing">
                  <input
                    type="date"
                    formControlName="dateOfBirth"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <span
                  *ngIf="!isEditing"
                  class="text-sm text-gray-900 dark:text-white"
                >
                  {{
                    lead?.dateOfBirth
                      ? (lead?.dateOfBirth | date : 'MMMM d, y')
                      : '-'
                  }}
                </span>
              </div>
            </form>
          </div>

          <!-- Status and Flags Section -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Status -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Status
                </label>
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                  [ngClass]="
                    LeadStatusColors[lead?.status || LeadStatus.Inactive]
                  "
                >
                  <span
                    class="w-2 h-2 rounded-full mr-2"
                    [ngClass]="{
                      'bg-green-600': lead?.status === LeadStatus.Active,
                      'bg-gray-600': lead?.status === LeadStatus.Inactive,
                      'bg-yellow-600': lead?.status === LeadStatus.Suspended,
                      'bg-red-600': lead?.status === LeadStatus.Closed
                    }"
                  ></span>
                  {{ LeadStatusLabels[lead?.status || LeadStatus.Inactive] }}
                </span>
              </div>

              <!-- Affiliate -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Affiliate
                </label>
                <span class="text-sm text-gray-900 dark:text-white">
                  {{ lead?.affiliateName || '-' }}
                </span>
              </div>

              <!-- Flags -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Flags
                </label>
                <div class="flex flex-wrap gap-1">
                  <span
                    *ngIf="lead?.isProblematic"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                  >
                    Problematic
                  </span>
                  <span
                    *ngIf="lead?.isBonusAbuser"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                  >
                    Bonus Abuser
                  </span>
                  <span
                    *ngIf="lead?.hasInvestments"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                  >
                    Has Investments
                  </span>
                  <span
                    *ngIf="
                      !lead?.isProblematic &&
                      !lead?.isBonusAbuser &&
                      !lead?.hasInvestments
                    "
                    class="text-gray-400 text-sm"
                  >
                    No flags
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Dates Section -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div class="space-y-3">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Registration Date
                </label>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ lead?.registrationDate | date : "MMMM d, y 'at' h:mm a" }}
                </span>
              </div>

              <div *ngIf="lead?.lastLogin">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Last Login
                </label>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ lead?.lastLogin | date : "MMMM d, y 'at' h:mm a" }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
      >
        <div class="flex gap-3">
          <button
            *ngIf="!isEditing"
            type="button"
            class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            (click)="startEdit()"
          >
            <svg
              class="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Details
          </button>

          <button
            *ngIf="isEditing"
            type="button"
            class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            [disabled]="editForm.invalid || loading"
            (click)="saveLead()"
          >
            <svg
              *ngIf="!loading"
              class="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <svg
              *ngIf="loading"
              class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
            {{ loading ? 'Saving...' : 'Save Changes' }}
          </button>

          <button
            *ngIf="isEditing"
            type="button"
            class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            (click)="cancelEdit()"
          >
            Cancel
          </button>

          <button
            type="button"
            class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            (click)="onClose()"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LeadDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() leadId!: string;

  private fb = inject(FormBuilder);
  private leadsService = inject(LeadsService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private ngZone = inject(NgZone);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;
  leadLoading = false;
  lead: Lead | null = null;

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

  // Enums for template
  LeadStatus = LeadStatus;
  LeadStatusLabels = LeadStatusLabels;
  LeadStatusColors = LeadStatusColors;

  constructor() {
    this.editForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      country: [''],
      language: ['en'], // Set English as default
      dateOfBirth: [''],
    });
  }

  ngOnInit(): void {
    this.loadLeadData();
    this.loadCountries();
    this.loadLanguages();

    document.addEventListener('mousedown', this.boundGlobalHandler, true);
    document.addEventListener('touchstart', this.boundGlobalHandler, true);
    document.addEventListener('click', this.boundGlobalHandler, true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    document.removeEventListener('mousedown', this.boundGlobalHandler, true);
    document.removeEventListener('touchstart', this.boundGlobalHandler, true);
    document.removeEventListener('click', this.boundGlobalHandler, true);
  }

  private loadLeadData(): void {
    if (!this.leadId) {
      this.alertService.error('Lead ID is required');
      return;
    }

    this.leadLoading = true;
    this.leadsService
      .getClientById(this.leadId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load lead data');
          return of(null);
        }),
        finalize(() => (this.leadLoading = false))
      )
      .subscribe((lead) => {
        if (lead) {
          this.lead = lead;
          this.updateFormWithLeadData();
        }
      });
  }

  private updateFormWithLeadData(): void {
    if (!this.lead) return;

    this.editForm.patchValue({
      firstName: this.lead.firstName || '',
      lastName: this.lead.lastName || '',
      email: this.lead.email || '',
      telephone: this.lead.telephone || '',
      country: this.lead.country || '',
      language: this.lead.language || '',
      dateOfBirth: this.lead.dateOfBirth
        ? this.lead.dateOfBirth.split('T')[0]
        : '',
    });

    // Set selected country and language
    if (this.lead.country) {
      this.selectedCountry =
        this.availableCountries.find((c) => c.code === this.lead?.country) ||
        null;
    }
    if (this.lead.language) {
      this.selectedLanguage =
        this.availableLanguages.find((l) => l.key === this.lead?.language) ||
        null;
    }
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.updateFormWithLeadData();
  }

  saveLead(): void {
    if (this.editForm.invalid || !this.lead) {
      return;
    }

    this.loading = true;
    const formValue = this.editForm.value;

    const updateRequest: LeadUpdateRequest = {
      id: this.lead.id,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      telephone: formValue.telephone || null,
      country: formValue.country || null,
      language: formValue.language || null,
      dateOfBirth: formValue.dateOfBirth || null,
    };

    this.leadsService
      .updateClient(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update lead');
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        // 204 No Content means success
        this.alertService.success('Lead updated successfully');
        this.isEditing = false;
        this.modalRef.close({ success: true, updated: true });
        this.loadLeadData(); // Reload data to get updated information
      });
  }

  onClose(): void {
    this.modalRef.close();
  }

  // Country dropdown methods
  private loadCountries(): void {
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.availableCountries = countries;
        this.filteredCountries = countries;
      });
  }

  toggleCountryDropdown(): void {
    this.countryDropdownOpen = !this.countryDropdownOpen;
    if (this.countryDropdownOpen) {
      this.languageDropdownOpen = false;
      this.focusedCountryIndex = 0; // Start with first item focused
    }
  }

  onCountrySearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.countrySearchTerm = target.value;
    this.filteredCountries = this.availableCountries.filter((country) =>
      country.name.toLowerCase().includes(this.countrySearchTerm.toLowerCase())
    );
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.editForm.patchValue({ country: country.name });
    this.countryDropdownOpen = false;
    this.countrySearchTerm = '';
    this.filteredCountries = this.availableCountries;
  }

  getSelectedCountryName(): string {
    if (this.selectedCountry) {
      return this.selectedCountry.name;
    }
    const formValue = this.editForm.get('country')?.value;
    if (formValue) {
      const country = this.availableCountries.find((c) => c.code === formValue);
      return country ? country.name : formValue;
    }
    return 'Select Country';
  }

  // Language dropdown methods
  private loadLanguages(): void {
    this.availableLanguages = this.languageService.getAllLanguages();
    this.filteredLanguages = this.availableLanguages;
  }

  toggleLanguageDropdown(): void {
    this.languageDropdownOpen = !this.languageDropdownOpen;
    if (this.languageDropdownOpen) {
      this.countryDropdownOpen = false;
      this.focusedLanguageIndex = 0; // Start with first item focused
    }
  }

  onLanguageSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.languageSearchTerm = target.value;
    this.filteredLanguages = this.availableLanguages.filter((language) =>
      language.value
        .toLowerCase()
        .includes(this.languageSearchTerm.toLowerCase())
    );
  }

  selectLanguage(language: { key: string; value: string }): void {
    this.selectedLanguage = language;
    this.editForm.patchValue({ language: language.key });
    this.languageDropdownOpen = false;
    this.languageSearchTerm = '';
    this.filteredLanguages = this.availableLanguages;
  }

  getSelectedLanguageName(): string {
    if (this.selectedLanguage) {
      return this.selectedLanguage.value;
    }
    const formValue = this.editForm.get('language')?.value;
    if (formValue) {
      const language = this.availableLanguages.find((l) => l.key === formValue);
      return language ? language.value : formValue;
    }
    return 'Select Language';
  }

  getCountryNameByCode(countryCode: string | null): string {
    if (!countryCode) return '';
    const country = this.availableCountries.find((c) => c.code === countryCode);
    return country ? country.name : countryCode;
  }

  getLanguageNameByKey(languageKey: string | null): string {
    if (!languageKey) return '';
    const language = this.availableLanguages.find((l) => l.key === languageKey);
    return language ? language.value : languageKey;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  private handleGlobalPointerEvent(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-dropdown]')) {
      this.countryDropdownOpen = false;
      this.languageDropdownOpen = false;
      this.focusedCountryIndex = -1;
      this.focusedLanguageIndex = -1;
    }
  }

  private boundGlobalHandler = (event: Event) => this.ngZone.run(() => this.handleGlobalPointerEvent(event));

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
