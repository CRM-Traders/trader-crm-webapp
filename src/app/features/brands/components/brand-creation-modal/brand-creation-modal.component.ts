// src/app/features/brands/components/brand-creation-modal/brand-creation-modal.component.ts

import { Component, inject, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { CountryService } from '../../../../core/services/country.service';
import { Country } from '../../../../core/models/country.model';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  BrandCreateRequest,
  BrandCreateResponse,
} from '../../models/brand.model';
import { BrandsService } from '../../services/brands.service';
import { 
  OfficeDropdownItem, 
  OfficesListRequest 
} from '../../../officies/models/office.model';

@Component({
  selector: 'app-brand-creation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Create New Brand
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <form [formGroup]="brandForm" class="space-y-6">
          <!-- Brand Name -->
          <div>
            <label
              for="name"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Brand Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              formControlName="name"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                brandForm.get('name')?.invalid && brandForm.get('name')?.touched
              "
              [class.focus:ring-red-500]="
                brandForm.get('name')?.invalid && brandForm.get('name')?.touched
              "
              placeholder="Enter brand name"
            />
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                brandForm.get('name')?.invalid && brandForm.get('name')?.touched
              "
            >
              <span *ngIf="brandForm.get('name')?.errors?.['required']">
                Brand name is required
              </span>
              <span *ngIf="brandForm.get('name')?.errors?.['minlength']">
                Brand name must be at least 2 characters long
              </span>
              <span *ngIf="brandForm.get('name')?.errors?.['maxlength']">
                Brand name cannot exceed 100 characters
              </span>
            </p>          </div>

          <!-- Country Selection -->
          <div class="relative">
            <label
              for="country"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Country <span class="text-red-500">*</span>
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              [class.border-red-500]="
                brandForm.get('country')?.invalid &&
                brandForm.get('country')?.touched
              "
              (click)="toggleCountryDropdown()"
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
                  *ngFor="let country of filteredCountries"
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-400/30 cursor-pointer text-sm text-gray-900 dark:text-white"
                  (click)="selectCountry(country)"
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
                brandForm.get('country')?.invalid &&
                brandForm.get('country')?.touched
              "
            >
              <span *ngIf="brandForm.get('country')?.errors?.['required']">
                Country selection is required
              </span>
            </p>
          </div>

          <!-- Office Selection -->
          <div class="relative">
            <label
              for="officeId"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Office <span class="text-red-500">*</span>
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              [class.border-red-500]="
                brandForm.get('officeId')?.invalid &&
                brandForm.get('officeId')?.touched
              "
              (click)="toggleOfficeDropdown()"
            >
              <span class="truncate">{{ getSelectedOfficeName() }}</span>
              <svg
                class="w-4 h-4 ml-2 transition-transform"
                [class.rotate-180]="officeDropdownOpen"
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
              *ngIf="officeDropdownOpen"
              class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
            >
              <!-- Search Input -->
              <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  #officeSearchInput
                  type="text"
                  placeholder="Search offices..."
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  (input)="onOfficeSearch($event)"
                  [value]="officeSearchTerm"
                />
              </div>

              <!-- Offices List -->
              <div
                class="max-h-28 overflow-y-auto"
                (scroll)="onOfficeDropdownScroll($event)"
              >
                <div
                  *ngFor="let office of availableOffices"
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-400/30 cursor-pointer text-sm text-gray-900 dark:text-white"
                  (click)="selectOffice(office)"
                >
                  <div>{{ office.value }}</div>
                </div>

                <!-- Loading indicator -->
                <div
                  *ngIf="officeLoading"
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
                  *ngIf="!officeLoading && availableOffices.length === 0"
                  class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No offices found
                </div>
              </div>
            </div>

            <!-- Validation Error -->
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                brandForm.get('officeId')?.invalid &&
                brandForm.get('officeId')?.touched
              "
            >
              <span *ngIf="brandForm.get('officeId')?.errors?.['required']">
                Office selection is required
              </span>
            </p>
          </div>

          <!-- Is Active Checkbox -->
          <div>
            <div class="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                formControlName="isActive"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                for="isActive"
                class="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Active Brand
              </label>
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Active brands are available for use across the system
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
          [disabled]="isSubmitting"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          (click)="onSubmit()"
          [disabled]="brandForm.invalid || isSubmitting"
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
            {{ isSubmitting ? 'Creating...' : 'Create Brand' }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class BrandCreationModalComponent implements OnInit {
  @Input() modalRef!: ModalRef;

  private fb = inject(FormBuilder);
  private brandsService = inject(BrandsService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);

  isSubmitting = false;
  brandForm: FormGroup;

  // Office dropdown properties
  officeDropdownOpen = false;
  officeLoading = false;
  officeSearchTerm = '';
  availableOffices: OfficeDropdownItem[] = [];
  selectedOffice: OfficeDropdownItem | null = null;
  currentOfficePage = 0;
  officePageSize = 20;
  hasMoreOffices = false;

  // Country dropdown properties
  countryDropdownOpen = false;
  countrySearchTerm = '';
  availableCountries: Country[] = [];
  filteredCountries: Country[] = [];
  selectedCountry: Country | null = null;

  constructor() {
    this.brandForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      country: ['', [Validators.required]],
      officeId: ['', [Validators.required]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadOffices();
    this.loadCountries();
  }

  // Office dropdown methods
  toggleOfficeDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.officeDropdownOpen) {
      this.officeDropdownOpen = false;
      return;
    }
    // Close country dropdown and open office dropdown
    this.countryDropdownOpen = false;
    this.officeDropdownOpen = true;
    if (this.availableOffices.length === 0) {
      this.loadOffices();
    }
  }

  loadOffices(reset: boolean = false): void {
    if (this.officeLoading) return;

    if (reset) {
      this.currentOfficePage = 0;
      this.availableOffices = [];
    }

    this.officeLoading = true;

    const request: OfficesListRequest = {
      pageIndex: this.currentOfficePage,
      pageSize: this.officePageSize,
      globalFilter: this.officeSearchTerm || null,
    };

    this.brandsService.getOfficeDropdown(request).subscribe({
      next: (response) => {
        if (reset) {
          this.availableOffices = response.items;
        } else {
          this.availableOffices = [...this.availableOffices, ...response.items];
        }
        this.hasMoreOffices = response.hasNextPage;
        this.officeLoading = false;
      },
      error: (error) => {
        this.officeLoading = false;
        this.alertService.error('Failed to load offices');
      },
    });
  }

  onOfficeSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.officeSearchTerm = target.value;
    this.currentOfficePage = 0;
    this.loadOffices(true);
  }

  onOfficeDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreOffices &&
      !this.officeLoading
    ) {
      this.currentOfficePage++;
      this.loadOffices();
    }
  }

  selectOffice(office: OfficeDropdownItem): void {
    this.selectedOffice = office;
    this.brandForm.patchValue({ officeId: office.id });
    this.officeDropdownOpen = false;
  }

  getSelectedOfficeName(): string {
    if (this.selectedOffice) {
      return `${this.selectedOffice.value}`;
    }
    return 'Select an office...';
  }

  // Country dropdown methods
  loadCountries(): void {
    this.countryService.getCountries().subscribe({
      next: (countries) => {
        this.availableCountries = countries;
        this.filteredCountries = countries;
      },
      error: (error) => {
        this.alertService.error('Failed to load countries');
      },
    });
  }

  toggleCountryDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
      return;
    }
    // Close office dropdown and open country dropdown
    this.officeDropdownOpen = false;
    this.countryDropdownOpen = true;
  }

  onCountrySearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.countrySearchTerm = target.value.toLowerCase();
    
    this.filteredCountries = this.availableCountries.filter(country =>
      country.name.toLowerCase().includes(this.countrySearchTerm)
    );
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.brandForm.patchValue({ country: country.code });
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

  onSubmit(): void {
    if (this.brandForm.invalid) {
      Object.keys(this.brandForm.controls).forEach((key) => {
        this.brandForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.brandForm.value;

    const brandData: BrandCreateRequest = {
      name: formValue.name.trim(),
      country: formValue.country,
      officeId: formValue.officeId,
      isActive: formValue.isActive,
    };

    this.brandsService.createBrand(brandData).subscribe({
      next: (response: BrandCreateResponse) => {
        this.isSubmitting = false;
        this.alertService.success('Brand created successfully!');
        this.modalRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error('A brand with this name already exists.');
        } else {
          this.alertService.error('Failed to create brand. Please try again.');
        }
      },
    });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdowns when clicking outside
    if (!(event.target as Element).closest('.relative')) {
      this.closeAllDropdowns();
    }
  }

  private closeAllDropdowns(): void {
    this.officeDropdownOpen = false;
    this.countryDropdownOpen = false;
  }
}
