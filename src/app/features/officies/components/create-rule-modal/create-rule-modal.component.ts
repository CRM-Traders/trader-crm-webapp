// src/app/features/officies/components/create-rule-modal/create-rule-modal.component.ts

import { Component, OnInit, OnDestroy, inject, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';

import { OfficeRulesService } from '../../services/office-rules.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { AffiliatesService } from '../../../affiliates/services/affiliates.service';

import {
  OfficeRule,
  OfficeRuleCreateRequest,
  OfficeRuleUpdateRequest,
  RuleCategory,
  RuleCategoryOption,
  RulePriority,
  RuleType,
} from '../../models/office-rules.model';
import { Country } from '../../../../core/models/country.model';
import { Affiliate } from '../../../affiliates/models/affiliates.model';

@Component({
  selector: 'app-create-rule-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ isEditing ? 'Edit Rule' : 'Create New Rule' }}
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6 max-h-[100vh] overflow-y-auto">
        <form [formGroup]="ruleForm" class="space-y-6">
          <!-- Rule Name -->
          <div>
            <label
              for="ruleName"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Rule name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ruleName"
              formControlName="ruleName"
              placeholder="Rule name"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                ruleForm.get('ruleName')?.invalid &&
                ruleForm.get('ruleName')?.touched
              "
            />
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                ruleForm.get('ruleName')?.invalid &&
                ruleForm.get('ruleName')?.touched
              "
            >
              <span *ngIf="ruleForm.get('ruleName')?.errors?.['required']"
                >Rule name is required</span
              >
            </p>
          </div>

          <!-- Rule Category -->
          <div>
            <label
              for="category"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Rule category <span class="text-red-500">*</span>
            </label>
            <select
              id="category"
              formControlName="category"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                ruleForm.get('category')?.invalid &&
                ruleForm.get('category')?.touched
              "
            >
              <option value="">Select</option>
              <option [value]="RuleCategory.Brand">Brand</option>
              <option [value]="RuleCategory.Desk">Desk</option>
              <option [value]="RuleCategory.Team">Team</option>
              <option [value]="RuleCategory.Sale">Sale</option>
              <option [value]="RuleCategory.Retention">Retention</option>
            </select>
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                ruleForm.get('category')?.invalid &&
                ruleForm.get('category')?.touched
              "
            >
              <span *ngIf="ruleForm.get('category')?.errors?.['required']"
                >Category is required</span
              >
            </p>
          </div>

          <!-- Rule Priority and Type Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Rule Priority -->
            <div>
              <label
                for="priority"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Rule priority <span class="text-red-500">*</span>
              </label>
              <select
                id="priority"
                formControlName="priority"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  ruleForm.get('priority')?.invalid &&
                  ruleForm.get('priority')?.touched
                "
              >
                <option value="">Select</option>
                <option
                  *ngFor="let priority of priorities"
                  [value]="priority.value"
                >
                  {{ priority.name }}
                </option>
              </select>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  ruleForm.get('priority')?.invalid &&
                  ruleForm.get('priority')?.touched
                "
              >
                <span *ngIf="ruleForm.get('priority')?.errors?.['required']"
                  >Priority is required</span
                >
              </p>
            </div>

            <!-- Rule Type -->
            <div>
              <label
                for="type"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Rule type <span class="text-red-500">*</span>
              </label>
              <select
                id="type"
                formControlName="type"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  ruleForm.get('type')?.invalid &&
                  ruleForm.get('type')?.touched
                "
              >
                <option value="">Select</option>
                <option *ngFor="let type of types" [value]="type.value">
                  {{ type.name }}
                </option>
              </select>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  ruleForm.get('type')?.invalid &&
                  ruleForm.get('type')?.touched
                "
              >
                <span *ngIf="ruleForm.get('type')?.errors?.['required']"
                  >Type is required</span
                >
              </p>
            </div>
          </div>

          <!-- Countries Selection -->
          <div class="relative">
            <label
              for="countries"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Countries
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              (click)="toggleCountryDropdown()"
            >
              <span class="truncate">{{ getSelectedCountriesText() }}</span>
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
                  *ngFor="let country of filteredCountries"
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white flex items-center"
                  (click)="toggleCountrySelection(country)"
                >
                  <input
                    type="checkbox"
                    [checked]="isCountrySelected(country)"
                    class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    (click)="$event.stopPropagation()"
                    (change)="toggleCountrySelection(country)"
                  />
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

          <!-- Languages Selection -->
          <div class="relative">
            <label
              for="languages"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Languages
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              (click)="toggleLanguageDropdown()"
            >
              <span class="truncate">{{ getSelectedLanguagesText() }}</span>
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
                  *ngFor="let language of filteredLanguages"
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white flex items-center"
                  (click)="toggleLanguageSelection(language)"
                >
                  <input
                    type="checkbox"
                    [checked]="isLanguageSelected(language)"
                    class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    (click)="$event.stopPropagation()"
                    (change)="toggleLanguageSelection(language)"
                  />
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

          <!-- Partners (Affiliates) Selection -->
          <div class="relative">
            <label
              for="partners"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Partners (Affiliates)
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              (click)="togglePartnerDropdown()"
            >
              <span class="truncate">{{ getSelectedPartnersText() }}</span>
              <svg
                class="w-4 h-4 ml-2 transition-transform"
                [class.rotate-180]="partnerDropdownOpen"
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
              *ngIf="partnerDropdownOpen"
              class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
            >
              <!-- Search Input -->
              <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  #partnerSearchInput
                  type="text"
                  placeholder="Search partners..."
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  (input)="onPartnerSearch($event)"
                  [value]="partnerSearchTerm"
                />
              </div>

              <!-- Partners List -->
              <div class="max-h-48 overflow-y-auto">
                <div
                  *ngFor="let partner of filteredPartners"
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white flex items-center"
                  (click)="togglePartnerSelection(partner)"
                >
                  <input
                    type="checkbox"
                    [checked]="isPartnerSelected(partner)"
                    class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    (click)="$event.stopPropagation()"
                    (change)="togglePartnerSelection(partner)"
                  />
                  {{ partner.name }}
                </div>

                <!-- No results -->
                <div
                  *ngIf="filteredPartners.length === 0"
                  class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No partners found
                </div>
              </div>
            </div>
          </div>

          <!-- Affiliate Referrals Selection -->
          <div class="relative">
            <label
              for="affiliateReferrals"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Affiliate Referrals
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              (click)="toggleAffiliateReferralDropdown()"
            >
              <span class="truncate">{{ getSelectedAffiliateReferralsText() }}</span>
              <svg
                class="w-4 h-4 ml-2 transition-transform"
                [class.rotate-180]="affiliateReferralDropdownOpen"
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
              *ngIf="affiliateReferralDropdownOpen"
              class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
            >
              <!-- Search Input -->
              <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  #affiliateReferralSearchInput
                  type="text"
                  placeholder="Search affiliate referrals..."
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  (input)="onAffiliateReferralSearch($event)"
                  [value]="affiliateReferralSearchTerm"
                />
              </div>

              <!-- Affiliate Referrals List -->
              <div class="max-h-48 overflow-y-auto">
                <div
                  *ngFor="let referral of filteredAffiliateReferrals"
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white flex items-center"
                  (click)="toggleAffiliateReferralSelection(referral)"
                >
                  <input
                    type="checkbox"
                    [checked]="isAffiliateReferralSelected(referral)"
                    class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    (click)="$event.stopPropagation()"
                    (change)="toggleAffiliateReferralSelection(referral)"
                  />
                  {{ referral.name }}
                </div>

                <!-- No results -->
                <div
                  *ngIf="filteredAffiliateReferrals.length === 0"
                  class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No affiliate referrals found
                </div>
              </div>
            </div>
          </div>

          <!-- Source -->
          <div>
            <label
              for="sources"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Source
            </label>
            <input
              type="text"
              id="sources"
              formControlName="sources"
              placeholder="Source"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
          [disabled]="isSubmitting"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          (click)="onSubmit()"
          [disabled]="ruleForm.invalid || isSubmitting"
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
            {{
              isSubmitting
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                ? 'Update Rule'
                : 'Create rule'
            }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class CreateRuleModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() officeId!: string;
  @Input() rule?: OfficeRule;
  @Input() categories: RuleCategoryOption[] = [];
  @Input() priorities: RulePriority[] = [];
  @Input() types: RuleType[] = [];
  @Input() isEditing = false;

  // Make RuleCategory enum available in template
  RuleCategory = RuleCategory;

  private fb = inject(FormBuilder);
  private officeRulesService = inject(OfficeRulesService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private affiliatesService = inject(AffiliatesService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  ruleForm: FormGroup;
  isSubmitting = false;

  // Countries
  availableCountries: Country[] = [];
  filteredCountries: Country[] = [];
  selectedCountries: Country[] = [];
  countryDropdownOpen = false;
  countrySearchTerm = '';

  // Languages
  availableLanguages: { key: string; value: string }[] = [];
  filteredLanguages: { key: string; value: string }[] = [];
  selectedLanguages: { key: string; value: string }[] = [];
  languageDropdownOpen = false;
  languageSearchTerm = '';

  // Partners (Affiliates)
  availablePartners: Affiliate[] = [];
  filteredPartners: Affiliate[] = [];
  selectedPartners: Affiliate[] = [];
  partnerDropdownOpen = false;
  partnerSearchTerm = '';

  // Affiliate Referrals
  availableAffiliateReferrals: Affiliate[] = [];
  filteredAffiliateReferrals: Affiliate[] = [];
  selectedAffiliateReferrals: Affiliate[] = [];
  affiliateReferralDropdownOpen = false;
  affiliateReferralSearchTerm = '';

  constructor() {
    this.ruleForm = this.fb.group({
      ruleName: ['', [Validators.required]],
      category: ['', [Validators.required]],
      priority: ['', [Validators.required]],
      type: ['', [Validators.required]],
      countries: [''],
      languages: [''],
      partners: [''],
      affiliateReferrals: [''],
      sources: [''],
    });
  }

  ngOnInit(): void {
    this.loadLookupData();

    if (this.isEditing && this.rule) {
      this.populateFormForEdit();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdowns when clicking outside
    if (!(event.target as Element).closest('.relative')) {
      this.closeAllDropdowns();
    }
  }

  private closeAllDropdowns(): void {
    this.countryDropdownOpen = false;
    this.languageDropdownOpen = false;
    this.partnerDropdownOpen = false;
    this.affiliateReferralDropdownOpen = false;
  }

  private loadLookupData(): void {
    // Load countries
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.availableCountries = countries;
        this.filteredCountries = countries;
      });

    // Load languages
    this.availableLanguages = this.languageService.getAllLanguages();
    this.filteredLanguages = this.availableLanguages;

    // Load affiliates for partners
    this.affiliatesService
      .getActiveAffiliates()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.availablePartners = response.items || [];
        this.filteredPartners = this.availablePartners;
      });

    // Load affiliates for affiliate referrals (same data for now)
    this.affiliatesService
      .getActiveAffiliates()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.availableAffiliateReferrals = response.items || [];
        this.filteredAffiliateReferrals = this.availableAffiliateReferrals;
      });
  }

  private populateFormForEdit(): void {
    if (!this.rule) return;

    // Parse semicolon-separated values back to arrays
    const countries = this.rule.country ? this.rule.country.split(';').filter(c => c.trim()) : [];
    const languages = this.rule.language ? this.rule.language.split(';').filter(l => l.trim()) : [];
    const partners = this.rule.partners ? this.rule.partners.split(';').filter(p => p.trim()) : [];
    const affiliateReferrals = this.rule.affiliateReferrals ? this.rule.affiliateReferrals.split(';').filter(a => a.trim()) : [];

    // Set selected items
    this.selectedCountries = this.availableCountries.filter(c => countries.includes(c.code));
    this.selectedLanguages = this.availableLanguages.filter(l => languages.includes(l.key));
    this.selectedPartners = this.availablePartners.filter(p => partners.includes(p.id));
    this.selectedAffiliateReferrals = this.availableAffiliateReferrals.filter(a => affiliateReferrals.includes(a.id));

    this.ruleForm.patchValue({
      ruleName: this.rule.name,
      category: this.rule.category,
      priority: this.rule.priority,
      type: this.rule.type,
      sources: this.rule.sources,
    });
  }

  // Countries methods
  toggleCountryDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.countryDropdownOpen = true;
  }

  onCountrySearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.countrySearchTerm = value;
    this.filteredCountries = this.availableCountries.filter(country =>
      country.name.toLowerCase().includes(value)
    );
  }

  toggleCountrySelection(country: Country): void {
    const index = this.selectedCountries.findIndex(c => c.code === country.code);
    if (index > -1) {
      this.selectedCountries.splice(index, 1);
    } else {
      this.selectedCountries.push(country);
    }
    this.updateCountriesFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isCountrySelected(country: Country): boolean {
    return this.selectedCountries.some(c => c.code === country.code);
  }

  getSelectedCountriesText(): string {
    if (this.selectedCountries.length === 0) {
      return 'Select countries...';
    }
    if (this.selectedCountries.length === 1) {
      return this.selectedCountries[0].name;
    }
    return `${this.selectedCountries.length} countries selected`;
  }

  private updateCountriesFormValue(): void {
    const value = this.selectedCountries.map(c => c.code).join(';');
    this.ruleForm.patchValue({ countries: value });
  }

  // Languages methods
  toggleLanguageDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.languageDropdownOpen = true;
  }

  onLanguageSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.languageSearchTerm = value;
    this.filteredLanguages = this.availableLanguages.filter(language =>
      language.value.toLowerCase().includes(value)
    );
  }

  toggleLanguageSelection(language: { key: string; value: string }): void {
    const index = this.selectedLanguages.findIndex(l => l.key === language.key);
    if (index > -1) {
      this.selectedLanguages.splice(index, 1);
    } else {
      this.selectedLanguages.push(language);
    }
    this.updateLanguagesFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isLanguageSelected(language: { key: string; value: string }): boolean {
    return this.selectedLanguages.some(l => l.key === language.key);
  }

  getSelectedLanguagesText(): string {
    if (this.selectedLanguages.length === 0) {
      return 'Select languages...';
    }
    if (this.selectedLanguages.length === 1) {
      return this.selectedLanguages[0].value;
    }
    return `${this.selectedLanguages.length} languages selected`;
  }

  private updateLanguagesFormValue(): void {
    const value = this.selectedLanguages.map(l => l.key).join(';');
    this.ruleForm.patchValue({ languages: value });
  }

  // Partners methods
  togglePartnerDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.partnerDropdownOpen) {
      this.partnerDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.partnerDropdownOpen = true;
  }

  onPartnerSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.partnerSearchTerm = value;
    this.filteredPartners = this.availablePartners.filter(partner =>
      partner.name.toLowerCase().includes(value)
    );
  }

  togglePartnerSelection(partner: Affiliate): void {
    const index = this.selectedPartners.findIndex(p => p.id === partner.id);
    if (index > -1) {
      this.selectedPartners.splice(index, 1);
    } else {
      this.selectedPartners.push(partner);
    }
    this.updatePartnersFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isPartnerSelected(partner: Affiliate): boolean {
    return this.selectedPartners.some(p => p.id === partner.id);
  }

  getSelectedPartnersText(): string {
    if (this.selectedPartners.length === 0) {
      return 'Select partners...';
    }
    if (this.selectedPartners.length === 1) {
      return this.selectedPartners[0].name;
    }
    return `${this.selectedPartners.length} partners selected`;
  }

  private updatePartnersFormValue(): void {
    const value = this.selectedPartners.map(p => p.id).join(';');
    this.ruleForm.patchValue({ partners: value });
  }

  // Affiliate Referrals methods
  toggleAffiliateReferralDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.affiliateReferralDropdownOpen) {
      this.affiliateReferralDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.affiliateReferralDropdownOpen = true;
  }

  onAffiliateReferralSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.affiliateReferralSearchTerm = value;
    this.filteredAffiliateReferrals = this.availableAffiliateReferrals.filter(referral =>
      referral.name.toLowerCase().includes(value)
    );
  }

  toggleAffiliateReferralSelection(referral: Affiliate): void {
    const index = this.selectedAffiliateReferrals.findIndex(r => r.id === referral.id);
    if (index > -1) {
      this.selectedAffiliateReferrals.splice(index, 1);
    } else {
      this.selectedAffiliateReferrals.push(referral);
    }
    this.updateAffiliateReferralsFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isAffiliateReferralSelected(referral: Affiliate): boolean {
    return this.selectedAffiliateReferrals.some(r => r.id === referral.id);
  }

  getSelectedAffiliateReferralsText(): string {
    if (this.selectedAffiliateReferrals.length === 0) {
      return 'Select affiliate referrals...';
    }
    if (this.selectedAffiliateReferrals.length === 1) {
      return this.selectedAffiliateReferrals[0].name;
    }
    return `${this.selectedAffiliateReferrals.length} affiliate referrals selected`;
  }

  private updateAffiliateReferralsFormValue(): void {
    const value = this.selectedAffiliateReferrals.map(r => r.id).join(';');
    this.ruleForm.patchValue({ affiliateReferrals: value });
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      Object.keys(this.ruleForm.controls).forEach((key) => {
        this.ruleForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.ruleForm.value;

    if (this.isEditing && this.rule) {
      this.updateRule(formValue);
    } else {
      this.createRule(formValue);
    }
  }

  private createRule(formValue: any): void {
    const request: OfficeRuleCreateRequest = {
      ruleName: formValue.ruleName.trim(),
      category: parseInt(formValue.category),
      priority: parseInt(formValue.priority),
      type: parseInt(formValue.type),
      objectId: this.officeId,
      operators: null,
      country: formValue.countries || '',
      language: formValue.languages || '',
      partners: formValue.partners || '',
      affiliateReferrals: formValue.affiliateReferrals || '',
      sources: formValue.sources || '',
    };

    this.officeRulesService
      .createRule(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          if (error.status === 400) {
            this.alertService.error(
              'Invalid data provided. Please check your inputs.'
            );
          } else if (error.status === 409) {
            this.alertService.error('A rule with this name already exists.');
          } else {
            this.alertService.error('Failed to create rule. Please try again.');
          }
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSubmitting = false;
        if (response) {
          this.alertService.success('Rule created successfully!');
          this.modalRef.close(true);
        }
      });
  }

  private updateRule(formValue: any): void {
    if (!this.rule) return;

    const request: OfficeRuleUpdateRequest = {
      id: this.rule.id,
      ruleName: formValue.ruleName.trim(),
      priority: parseInt(formValue.priority),
      country: formValue.countries || undefined,
      language: formValue.languages || undefined,
      partners: formValue.partners || undefined,
      affiliateReferrals: formValue.affiliateReferrals || undefined,
      sources: formValue.sources || undefined,
    };

    this.officeRulesService
      .updateRule(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          this.alertService.error('Failed to update rule. Please try again.');
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSubmitting = false;
        if (response !== null) {
          this.alertService.success('Rule updated successfully!');
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
