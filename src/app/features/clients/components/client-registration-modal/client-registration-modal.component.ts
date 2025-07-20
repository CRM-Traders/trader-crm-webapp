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
import { AlertService } from '../../../../core/services/alert.service';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { Country } from '../../../../core/models/country.model';
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
import { Observable, map, Subject, takeUntil } from 'rxjs';

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
        <!-- Success Message with Generated Password -->
        <div
          *ngIf="generatedPassword"
          class="mb-6 p-4 bg-green-50/10 dark:bg-green-900/5 border border-green-200/20 dark:border-green-800/20 rounded-lg"
        >
          <div class="flex items-center mb-2">
            <svg
              class="w-5 h-5 text-green-600 mr-2"
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
            <h5 class="text-sm font-medium text-green-800 dark:text-green-500">
              Client Registered Successfully
            </h5>
          </div>
          <p class="text-sm text-green-700 dark:text-green-400 mb-3">
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

          <!-- Password Row -->
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input
                [type]="showPassword ? 'text' : 'password'"
                id="password"
                formControlName="password"
                placeholder="Password"
                class="w-full px-3 py-2 pr-20 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('password')?.invalid &&
                  registrationForm.get('password')?.touched
                "
              />
              <div class="absolute inset-y-0 right-0 flex items-center">
                <button
                  type="button"
                  class="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border-r border-gray-300 dark:border-gray-600"
                  (click)="generatePassword()"
                  title="Generate Password"
                >
                  Gen
                </button>
                <button
                  type="button"
                  class="px-2 flex items-center"
                  (click)="togglePasswordVisibility()"
                  title="Toggle Password Visibility"
                >
                  <svg
                    class="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      *ngIf="!showPassword"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      *ngIf="!showPassword"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                    <path
                      *ngIf="showPassword"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                registrationForm.get('password')?.invalid &&
                registrationForm.get('password')?.touched
              "
            >
              Password is required
            </p>
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
              <div class="relative" data-dropdown="country">
                <!-- Custom Dropdown Button -->
                <button
                  type="button"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
            </div>

            <div>
              <label
                for="language"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Language
              </label>
              <div class="relative" data-dropdown="language">
                <!-- Custom Dropdown Button -->
                <button
                  type="button"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
            </div>
          </div>

          <!-- Affiliate and Phone Number Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="affiliateId"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Affiliate
              </label>
              <div class="relative" data-dropdown="affiliate">
                <!-- Custom Dropdown Button -->
                <button
                  type="button"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  (click)="toggleAffiliateDropdown()"
                  (keydown)="onAffiliateButtonKeydown($event)"
                >
                  <span class="truncate">{{ getSelectedAffiliateName() }}</span>
                  <svg
                    class="w-4 h-4 ml-2 transition-transform"
                    [class.rotate-180]="affiliateDropdownOpen"
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
                  *ngIf="affiliateDropdownOpen"
                  class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
                >
                  <!-- Search Input -->
                  <div
                    class="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
                    <input
                      #affiliateSearchInput
                      type="text"
                      placeholder="Search affiliates..."
                      class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      (input)="onAffiliateSearch($event)"
                      [value]="affiliateSearchTerm"
                    />
                  </div>

                  <!-- Affiliates List -->
                  <div
                    class="max-h-30 overflow-y-auto"
                    (scroll)="onAffiliateDropdownScroll($event)"
                  >
                    <div
                      *ngFor="let affiliate of availableAffiliates; let i = index"
                      class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                      [class.bg-blue-100]="isAffiliateFocused(i)"
                      [class.dark:bg-blue-400]="isAffiliateFocused(i)"
                      [tabindex]="0"
                      (click)="selectAffiliate(affiliate)"
                      (keydown)="onAffiliateKeydown($event, affiliate, i)"
                      (mouseenter)="setFocusedAffiliateIndex(i)"
                    >
                      <div>{{ affiliate.userFullName }}</div>
                    </div>

                    <!-- Loading indicator -->
                    <div
                      *ngIf="affiliateLoading"
                      class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      <svg
                        class="animate-spin h-4 w-4 mx-auto"
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
                    </div>

                    <!-- No results -->
                    <div
                      *ngIf="
                        !affiliateLoading && availableAffiliates.length === 0
                      "
                      class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No affiliates found
                    </div>
                  </div>
                </div>
              </div>
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

          <!-- Date of Birth and Source Row -->
          <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
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

            <!-- <div>
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
            </div> -->
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
export class ClientRegistrationModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;

  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  showPassword = false;
  registrationForm: FormGroup;
  generatedPassword: string | null = null;
  passwordCopied = false;

  // Dropdown data
  countries: Country[] = [];
  languages: Array<{ key: string; value: string }> = [];

  // Country dropdown properties
  countryDropdownOpen = false;
  countrySearchTerm = '';
  filteredCountries: Country[] = [];
  selectedCountry: Country | null = null;

  // Language dropdown properties
  languageDropdownOpen = false;
  languageSearchTerm = '';
  filteredLanguages: Array<{ key: string; value: string }> = [];
  selectedLanguage: { key: string; value: string } | null = null;

  // Affiliate dropdown properties
  affiliateDropdownOpen = false;
  affiliateLoading = false;
  affiliateSearchTerm = '';
  availableAffiliates: AffiliateDropdownItem[] = [];
  selectedAffiliate: AffiliateDropdownItem | null = null;
  currentAffiliatePage = 0;
  affiliatePageSize = 20;
  hasMoreAffiliates = false;

  // Keyboard navigation properties
  focusedCountryIndex = -1;
  focusedLanguageIndex = -1;
  focusedAffiliateIndex = -1;

  constructor() {
    this.registrationForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', Validators.required],
      affiliateId: [null], // Changed from required to optional, default to null
      telephone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      country: [''],
      language: ['en'], // Set English as default
      dateOfBirth: [''],
      //source: [''],
    });
  }

  ngOnInit() {
    this.loadCountries();
    this.loadLanguages();
    this.loadAffiliates();

    // Set default language to English
    setTimeout(() => {
      const englishLanguage = this.languages.find((lang) => lang.key === 'en');
      if (englishLanguage) {
        this.selectedLanguage = englishLanguage;
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  generatePassword(): void {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one character from each type
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');

    this.registrationForm.patchValue({ password });
    this.showPassword = true; // Show the generated password
  }

  private loadCountries(): void {
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (countries) => {
          this.countries = countries;
          this.filteredCountries = countries;
        },
        error: (error) => {},
      });
  }

  private loadLanguages(): void {
    this.languages = this.languageService.getAllLanguages();
    this.filteredLanguages = this.languages;
  }

  private loadAffiliates(reset: boolean = false): void {
    if (this.affiliateLoading) return;

    if (reset) {
      this.currentAffiliatePage = 0;
      this.availableAffiliates = [];
    }

    this.affiliateLoading = true;

    const searchParams: AffiliateSearchParams = {
      globalFilter: this.affiliateSearchTerm || undefined,
      pageIndex: this.currentAffiliatePage,
      pageSize: this.affiliatePageSize,
    };

    this.clientsService.getAffiliatesDropdown(searchParams).subscribe({
      next: (response: AffiliateSearchResponse) => {
        let newAffiliates = response.items;
        
        if (reset) {
          this.availableAffiliates = newAffiliates;
        } else {
          this.availableAffiliates = [
            ...this.availableAffiliates,
            ...newAffiliates,
          ];
        }
        
        // Sort affiliates alphabetically by userFullName
        this.availableAffiliates.sort((a: AffiliateDropdownItem, b: AffiliateDropdownItem) => 
          a.userFullName.localeCompare(b.userFullName)
        );
        
        this.hasMoreAffiliates = response.hasNextPage;
        this.affiliateLoading = false;
      },
      error: (error) => {
        this.affiliateLoading = false;
        this.alertService.error('Failed to load affiliates');
      },
    });
  }

  // Country dropdown methods
  toggleCountryDropdown(): void {
    // Close other dropdowns
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
    }
    if (this.affiliateDropdownOpen) {
      this.affiliateDropdownOpen = false;
    }

    this.countryDropdownOpen = !this.countryDropdownOpen;
    if (this.countryDropdownOpen) {
      this.focusedCountryIndex = 0; // Start with first item focused
    }
  }

  onCountrySearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.countrySearchTerm = target.value.toLowerCase();

    this.filteredCountries = this.countries.filter((country) =>
      country.name.toLowerCase().includes(this.countrySearchTerm)
    );
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.registrationForm.patchValue({ country: country.code });
    this.countryDropdownOpen = false;
    this.countrySearchTerm = '';
    this.filteredCountries = this.countries;
  }

  getSelectedCountryName(): string {
    if (this.selectedCountry) {
      return this.selectedCountry.name;
    }
    return 'Select a country...';
  }

  // Language dropdown methods
  toggleLanguageDropdown(): void {
    // Close other dropdowns
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
    }
    if (this.affiliateDropdownOpen) {
      this.affiliateDropdownOpen = false;
    }

    this.languageDropdownOpen = !this.languageDropdownOpen;
    if (this.languageDropdownOpen) {
      this.focusedLanguageIndex = 0; // Start with first item focused
    }
  }

  onLanguageSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.languageSearchTerm = target.value.toLowerCase();

    this.filteredLanguages = this.languages.filter(
      (language) =>
        language.value.toLowerCase().includes(this.languageSearchTerm) ||
        language.key.toLowerCase().includes(this.languageSearchTerm)
    );
  }

  selectLanguage(language: { key: string; value: string }): void {
    this.selectedLanguage = language;
    this.registrationForm.patchValue({ language: language.key });
    this.languageDropdownOpen = false;
    this.languageSearchTerm = '';
    this.filteredLanguages = this.languages;
  }

  getSelectedLanguageName(): string {
    if (this.selectedLanguage) {
      return this.selectedLanguage.value;
    }
    return 'Select a language...';
  }

  // Affiliate dropdown methods
  toggleAffiliateDropdown(): void {
    // Close other dropdowns
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
    }
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
    }

    this.affiliateDropdownOpen = !this.affiliateDropdownOpen;

    if (this.affiliateDropdownOpen) {
      this.focusedAffiliateIndex = 0; // Start with first item focused
      if (this.availableAffiliates.length === 0) {
        this.loadAffiliates();
      }
    }
  }

  onAffiliateSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.affiliateSearchTerm = target.value;
    this.currentAffiliatePage = 0;
    this.loadAffiliates(true);
  }

  onAffiliateDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreAffiliates &&
      !this.affiliateLoading
    ) {
      this.currentAffiliatePage++;
      this.loadAffiliates();
    }
  }

  selectAffiliate(affiliate: AffiliateDropdownItem): void {
    this.selectedAffiliate = affiliate;
    this.registrationForm.patchValue({ affiliateId: affiliate.affiliateId });
    this.affiliateDropdownOpen = false;
  }

  getSelectedAffiliateName(): string {
    if (this.selectedAffiliate) {
      return this.selectedAffiliate.userFullName;
    }
    return 'None';
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
      password: formValue.password,
      affiliateId:
        formValue.affiliateId === null ? undefined : formValue.affiliateId,
      telephone: formValue.telephone || null,
      country: formValue.country || null,
      language: formValue.language || null,
      dateOfBirth: formValue.dateOfBirth
        ? new Date(formValue.dateOfBirth).toISOString()
        : null,
      //source: formValue.source || null,
    };

    this.clientsService.createClientForAdmin(clientData).subscribe({
      next: (response: ClientRegistrationResponse) => {
        this.isSubmitting = false;
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

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Check if click is inside any dropdown container
    const countryDropdown = target.closest('[data-dropdown="country"]');
    const languageDropdown = target.closest('[data-dropdown="language"]');
    const affiliateDropdown = target.closest('[data-dropdown="affiliate"]');

    // Close dropdowns if click is outside all dropdowns
    if (!countryDropdown && !languageDropdown && !affiliateDropdown) {
      this.countryDropdownOpen = false;
      this.languageDropdownOpen = false;
      this.affiliateDropdownOpen = false;
      this.focusedCountryIndex = -1;
      this.focusedLanguageIndex = -1;
      this.focusedAffiliateIndex = -1;
    }
  }

  getCountryNameByCode(countryCode: string): string {
    const country = this.countries.find((c) => c.code === countryCode);
    return country ? country.name : countryCode;
  }

  getLanguageNameByKey(languageKey: string): string {
    const language = this.languages.find((l) => l.key === languageKey);
    return language ? language.value : languageKey;
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

  // Keyboard navigation methods for Affiliate dropdown
  isAffiliateFocused(index: number): boolean {
    return this.focusedAffiliateIndex === index;
  }

  setFocusedAffiliateIndex(index: number): void {
    this.focusedAffiliateIndex = index;
  }

  onAffiliateKeydown(event: KeyboardEvent, affiliate: AffiliateDropdownItem, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectAffiliate(affiliate);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextAffiliate();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousAffiliate();
        break;
      case 'Escape':
        this.affiliateDropdownOpen = false;
        break;
    }
  }

  private focusNextAffiliate(): void {
    if (this.focusedAffiliateIndex < this.availableAffiliates.length - 1) {
      this.focusedAffiliateIndex++;
    }
  }

  private focusPreviousAffiliate(): void {
    if (this.focusedAffiliateIndex > 0) {
      this.focusedAffiliateIndex--;
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

  onAffiliateButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.affiliateDropdownOpen) {
          this.toggleAffiliateDropdown();
        }
        break;
    }
  }
}
