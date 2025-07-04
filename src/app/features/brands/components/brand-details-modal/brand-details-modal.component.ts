// src/app/features/brands/components/brand-details-modal/brand-details-modal.component.ts

import { Component, inject, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
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
import { Country } from '../../../../core/models/country.model';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { BrandsService } from '../../services/brands.service';
import { Brand, BrandUpdateRequest } from '../../models/brand.model';
import { 
  OfficeDropdownItem, 
  OfficesListRequest 
} from '../../../officies/models/office.model';

@Component({
  selector: 'app-brand-details-modal',
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
            Brand Details - {{ brand.name }}
          </h2>
        </div>
      </div>

      <!-- Modal Body -->
      <div
        class="px-6 py-4 bg-white dark:bg-gray-900 max-h-[70vh] overflow-y-auto"
      >
        <div class="space-y-6">
          <!-- Brand Information Section -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              Brand Information
            </h3>

            <form [formGroup]="editForm" class="space-y-4">
              <!-- Brand Name -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Brand Name
                </label>
                <div *ngIf="isEditing">
                  <input
                    type="text"
                    formControlName="name"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    [class.border-red-500]="
                      editForm.get('name')?.invalid &&
                      editForm.get('name')?.touched
                    "
                  />
                  <p
                    class="mt-1 text-sm text-red-600 dark:text-red-400"
                    *ngIf="
                      editForm.get('name')?.invalid &&
                      editForm.get('name')?.touched
                    "
                  >
                    <span *ngIf="editForm.get('name')?.errors?.['required']">
                      Brand name is required
                    </span>
                    <span *ngIf="editForm.get('name')?.errors?.['minlength']">
                      Brand name must be at least 2 characters long
                    </span>
                  </p>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="text-sm text-gray-900 dark:text-white font-medium"
                >
                  {{ brand.name }}
                </span>
              </div>

              <!-- Country Selection -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Country
                </label>
                <div *ngIf="isEditing" class="relative">
                  <!-- Custom Dropdown Button -->
                  <button
                    type="button"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center"
                    [class.border-red-500]="
                      editForm.get('country')?.invalid &&
                      editForm.get('country')?.touched
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
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
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
                      editForm.get('country')?.invalid &&
                      editForm.get('country')?.touched
                    "
                  >
                    <span *ngIf="editForm.get('country')?.errors?.['required']">
                      Country selection is required
                    </span>
                  </p>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="text-sm text-gray-900 dark:text-white"
                >
                  {{ brand.country }}
                </span>
              </div>

              <!-- Office Selection -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Office
                </label>
                <div *ngIf="isEditing" class="relative">
                  <!-- Custom Dropdown Button -->
                  <button
                    type="button"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center"
                    [class.border-red-500]="
                      editForm.get('officeId')?.invalid &&
                      editForm.get('officeId')?.touched
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
                      class="max-h-48 overflow-y-auto"
                      (scroll)="onOfficeDropdownScroll($event)"
                    >
                      <div
                        *ngFor="let office of availableOffices"
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
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
                      editForm.get('officeId')?.invalid &&
                      editForm.get('officeId')?.touched
                    "
                  >
                    <span *ngIf="editForm.get('officeId')?.errors?.['required']">
                      Office selection is required
                    </span>
                  </p>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="text-sm text-gray-900 dark:text-white"
                >
                  {{ brand.officeName }}
                </span>
              </div>

              <!-- Status -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Status
                </label>
                <div *ngIf="isEditing" class="flex items-center">
                  <input
                    type="checkbox"
                    formControlName="isActive"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    class="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                  >
                    Active Brand
                  </label>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="{
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                      brand.isActive,
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200':
                      !brand.isActive
                  }"
                >
                  {{ brand.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <!-- Desks Count -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Desks
                </label>
                <span class="text-sm text-gray-900 dark:text-white">
                  {{ brand.desksCount || 0 }} desks
                </span>
              </div>

              <!-- Created Information -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Created Date
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ brand.createdAt | date : 'medium' }}
                  </span>
                </div>
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Created By
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ brand.createdBy || 'System' }}
                  </span>
                </div>
              </div>

              <!-- Last Modified Information -->
              <div
                class="grid grid-cols-1 md:grid-cols-2 gap-4"
                *ngIf="brand.lastModifiedAt"
              >
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Last Modified
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ brand.lastModifiedAt | date : 'medium' }}
                  </span>
                </div>
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Modified By
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ brand.lastModifiedBy || 'System' }}
                  </span>
                </div>
              </div>
            </form>

            <!-- Edit Actions -->
            <div class="mt-6 space-y-2">
              <div class="text-end">
                <button
                  *ngIf="!isEditing"
                  type="button"
                  class="w-fit mx-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  (click)="startEdit()"
                >
                  Edit Brand
                </button>
              </div>
              <div
                *ngIf="isEditing"
                class="flex items-center justify-between gap-4"
              >
                <button
                  type="button"
                  class="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200/30 dark:bg-gray-700/30 hover:bg-gray-300/30 dark:hover:bg-gray-600/30 rounded-md transition-colors"
                  (click)="cancelEdit()"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                  [disabled]="editForm.invalid || loading"
                  (click)="saveBrand()"
                >
                  {{ loading ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end"
      >
        <button
          type="button"
          class="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          (click)="onClose()"
        >
          Close
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class BrandDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() brand!: Brand;

  private fb = inject(FormBuilder);
  private brandsService = inject(BrandsService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;

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
    this.editForm = this.fb.group({
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
    this.loadCountries();
    this.loadOffices();
    if (this.brand) {
      this.editForm.patchValue({
        name: this.brand.name,
        country: this.brand.country,
        officeId: this.brand.officeId,
        isActive: this.brand.isActive,
      });
      // Set the selected country and office for display
      this.setSelectedCountryFromName(this.brand.country);
      this.setSelectedOfficeFromName(this.brand.officeName);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startEdit(): void {
    this.isEditing = true;
    // Load fresh data when starting edit
    this.loadOffices(true);
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.brand) {
      this.editForm.patchValue({
        name: this.brand.name,
        country: this.brand.country,
        officeId: this.brand.officeId,
        isActive: this.brand.isActive,
      });
      this.setSelectedCountryFromCode(this.brand.country);
      this.setSelectedOfficeFromName(this.brand.officeName);
    }
  }

  saveBrand(): void {
    if (this.editForm.invalid || !this.brand) return;

    const updateRequest: BrandUpdateRequest = {
      id: this.brand.id,
      name: this.editForm.value.name.trim(),
      country: this.editForm.value.country,
      officeId: this.editForm.value.officeId,
      isActive: this.editForm.value.isActive,
    };

    this.loading = true;
    this.brandsService
      .updateBrand(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update brand');
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.isEditing = false;
                    this.modalRef.close({
            updated: true,
            brand: this.brand,
          });
        })
      )
      .subscribe((result) => {
        if (result) {
          this.alertService.success('Brand updated successfully');
          this.isEditing = false;

          this.brand = {
            ...this.brand,
            name: this.editForm.value.name.trim(),
            country: this.editForm.value.country,
            officeId: this.editForm.value.officeId,
            isActive: this.editForm.value.isActive,
            lastModifiedAt: new Date(),
          };

          this.modalRef.close({
            updated: true,
            brand: this.brand,
          });
        }
      });
  }

  // Office dropdown methods
  toggleOfficeDropdown(): void {
    this.officeDropdownOpen = !this.officeDropdownOpen;
    if (this.officeDropdownOpen && this.availableOffices.length === 0) {
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
        
        // Set selected office from office name if we have the brand's office name
        if (this.brand?.officeName && !this.selectedOffice) {
          this.setSelectedOfficeFromName(this.brand.officeName);
        }
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
    this.editForm.patchValue({ officeId: office.id });
    this.officeDropdownOpen = false;
  }

  setSelectedOfficeFromName(officeName: string): void {
    this.selectedOffice = this.availableOffices.find(o => o.value === officeName) || null;
  }

  getSelectedOfficeName(): string {
    if (this.selectedOffice) {
      return this.selectedOffice.value;
    }
    return 'Select an office...';
  }

  // Country dropdown methods
  loadCountries(): void {
    this.countryService.getCountries().subscribe({
      next: (countries) => {
        this.availableCountries = countries;
        this.filteredCountries = countries;
        
        // Set selected country if we have the brand's country code
        if (this.brand?.country) {
          this.setSelectedCountryFromCode(this.brand.country);
          this.setSelectedCountryFromName(this.brand.country);
        }
      },
      error: (error) => {
        this.alertService.error('Failed to load countries');
      },
    });
  }

  toggleCountryDropdown(): void {
    this.countryDropdownOpen = !this.countryDropdownOpen;
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
    this.editForm.patchValue({ country: country.name });
    this.countryDropdownOpen = false;
    this.countrySearchTerm = '';
    this.filteredCountries = this.availableCountries;
  }

  setSelectedCountryFromCode(countryCode: string): void {
    this.selectedCountry = this.availableCountries.find(c => c.code === countryCode) || null;
  }

    setSelectedCountryFromName(countryName: string): void {
    this.selectedCountry = this.availableCountries.find(c => c.name === countryName) || null;
  }

  getSelectedCountryName(): string {
    if (this.selectedCountry) {
      return this.selectedCountry.name;
    }
    return 'Select a country...';
  }

  getCountryNameByCode(countryCode: string): string {
    const country = this.availableCountries.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.relative');
    
    if (!dropdown) {
      if (this.officeDropdownOpen) {
        this.officeDropdownOpen = false;
      }
      if (this.countryDropdownOpen) {
        this.countryDropdownOpen = false;
      }
    }
  }

  onClose(): void {
    this.modalRef.close(this.isEditing ? true : false);
  }
}