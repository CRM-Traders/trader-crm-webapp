// src/app/features/offices/components/office-details-modal/office-details-modal.component.ts

import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Subject,
  takeUntil,
  catchError,
  of,
  finalize,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { CountryService } from '../../../../core/services/country.service';
import { BrandsService } from '../../../brands/services/brands.service';
import { OfficesService } from '../../services/offices.service';
import {
  BrandDropdownItem,
  BrandDropdownRequest,
} from '../../../brands/models/brand.model';
import { Office, OfficeUpdateRequest } from '../../models/office.model';
import { Country } from '../../../../core/models/country.model';

@Component({
  selector: 'app-office-details-modal',
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
            Office Details - {{ office.name }}
          </h2>
        </div>
      </div>

      <!-- Modal Body -->
      <div
        class="px-6 py-4 bg-white dark:bg-gray-900 max-h-[70vh] overflow-y-auto"
      >
        <div class="space-y-6">
          <!-- Office Information Section -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              Office Information
            </h3>

            <form [formGroup]="editForm" class="space-y-4">
              <!-- Office Name -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Office Name
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
                      Office name is required
                    </span>
                    <span *ngIf="editForm.get('name')?.errors?.['minlength']">
                      Office name must be at least 2 characters long
                    </span>
                  </p>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="text-sm text-gray-900 dark:text-white font-medium"
                >
                  {{ office.name }}
                </span>
              </div>

              <!-- Country -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Country
                </label>
                <div *ngIf="isEditing">
                  <select
                    formControlName="country"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    [class.border-red-500]="
                      editForm.get('country')?.invalid &&
                      editForm.get('country')?.touched
                    "
                  >
                    <option value="">Select a country</option>
                    <option
                      *ngFor="let country of availableCountries"
                      [value]="country.code"
                    >
                      {{ country.name }}
                    </option>
                  </select>
                  <p
                    class="mt-1 text-sm text-red-600 dark:text-red-400"
                    *ngIf="
                      editForm.get('country')?.invalid &&
                      editForm.get('country')?.touched
                    "
                  >
                    <span *ngIf="editForm.get('country')?.errors?.['required']">
                      Country is required
                    </span>
                  </p>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  <svg
                    class="mr-1 h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  {{ getCountryName(office.country) }}
                </span>
              </div>

              <!-- Brand -->
              <div class="relative">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Brand
                </label>
                <div *ngIf="isEditing">
                  <!-- Custom Dropdown Button -->
                  <button
                    type="button"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center"
                    [class.border-red-500]="
                      editForm.get('brandId')?.invalid &&
                      editForm.get('brandId')?.touched
                    "
                    (click)="toggleBrandDropdown()"
                  >
                    <span class="truncate">{{ getSelectedBrandName() }}</span>
                    <svg
                      class="w-4 h-4 ml-2 transition-transform"
                      [class.rotate-180]="brandDropdownOpen"
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
                    *ngIf="brandDropdownOpen"
                    class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
                  >
                    <!-- Search Input -->
                    <div
                      class="p-3 border-b border-gray-200 dark:border-gray-700"
                    >
                      <input
                        #brandSearchInput
                        type="text"
                        placeholder="Search brands..."
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        (input)="onBrandSearch($event)"
                        [value]="brandSearchTerm"
                      />
                    </div>

                    <!-- Brands List -->
                    <div
                      class="max-h-48 overflow-y-auto"
                      (scroll)="onBrandDropdownScroll($event)"
                    >
                      <div
                        *ngFor="let brand of availableBrands"
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                        (click)="selectBrand(brand)"
                      >
                        {{ brand.value }}
                      </div>

                      <!-- Loading indicator -->
                      <div
                        *ngIf="brandLoading"
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
                        *ngIf="!brandLoading && availableBrands.length === 0"
                        class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No brands found
                      </div>
                    </div>
                  </div>

                  <!-- Validation Error -->
                  <p
                    class="mt-1 text-sm text-red-600 dark:text-red-400"
                    *ngIf="
                      editForm.get('brandId')?.invalid &&
                      editForm.get('brandId')?.touched
                    "
                  >
                    <span *ngIf="editForm.get('brandId')?.errors?.['required']">
                      Brand selection is required
                    </span>
                  </p>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                >
                  <svg
                    class="mr-1 h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  {{ office.brandName }}
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
                    Active Office
                  </label>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="{
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                      office.isActive,
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200':
                      !office.isActive
                  }"
                >
                  {{ office.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <!-- Desks Count -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Total Desks
                </label>
                <span class="text-sm text-gray-900 dark:text-white">
                  {{ office.desksCount }}
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
                    {{ office.createdAt | date : 'medium' }}
                  </span>
                </div>
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Created By
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ office.createdBy || 'System' }}
                  </span>
                </div>
              </div>

              <!-- Last Modified Information -->
              <div
                class="grid grid-cols-1 md:grid-cols-2 gap-4"
                *ngIf="office.lastModifiedAt"
              >
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Last Modified
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ office.lastModifiedAt | date : 'medium' }}
                  </span>
                </div>
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Modified By
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ office.lastModifiedBy || 'System' }}
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
                  Edit Office
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
                  (click)="saveOffice()"
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
export class OfficeDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() office!: Office;
  @ViewChild('brandSearchInput', { static: false })
  brandSearchInput!: ElementRef;

  private fb = inject(FormBuilder);
  private officesService = inject(OfficesService);
  private brandsService = inject(BrandsService);
  private countryService = inject(CountryService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;
  availableBrands: BrandDropdownItem[] = [];
  availableCountries: Country[] = [];

  // Brand dropdown state
  brandSearchTerm = '';
  brandPageIndex = 0;
  brandPageSize = 20;
  brandTotalCount = 0;
  brandLoading = false;
  brandHasNextPage = false;
  brandDropdownOpen = false;

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
      brandId: ['', [Validators.required]],
      brandSearch: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.initializeSearchObservable();
    this.loadInitialBrands();
    this.loadAvailableCountries();
    if (this.office) {
      this.editForm.patchValue({
        name: this.office.name,
        country: this.office.country,
        brandId: this.office.brandId,
        isActive: this.office.isActive,
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSearchObservable(): void {
    this.editForm
      .get('brandSearch')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.brandSearchTerm = searchTerm || '';
        this.resetBrandDropdown();
        this.loadBrands();
      });
  }

  private loadInitialBrands(): void {
    this.resetBrandDropdown();
    this.loadBrands();
  }

  private resetBrandDropdown(): void {
    this.brandPageIndex = 0;
    this.availableBrands = [];
    this.brandHasNextPage = false;
  }

  private loadBrands(): void {
    if (this.brandLoading) return;

    this.brandLoading = true;
    const request: BrandDropdownRequest = {
      pageIndex: this.brandPageIndex,
      pageSize: this.brandPageSize,
      globalFilter: this.brandSearchTerm,
      sortField: 'name',
      sortDirection: 'asc',
    };

    this.brandsService
      .getBrandsDropdown(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading brands:', error);
          this.alertService.error('Failed to load brands');
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 1,
            pageSize: 20,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          });
        })
      )
      .subscribe((response) => {
        if (this.brandPageIndex === 1) {
          this.availableBrands = response.items;
        } else {
          this.availableBrands = [...this.availableBrands, ...response.items];
        }

        this.brandTotalCount = response.totalCount;
        this.brandHasNextPage = response.hasNextPage;
        this.brandLoading = false;
      });
  }

  private loadAvailableCountries(): void {
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.availableCountries = countries;
      });
  }

  onBrandDropdownScroll(event: any): void {
    const element = event.target;
    const threshold = 100;

    if (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - threshold
    ) {
      this.loadMoreBrands();
    }
  }

  private loadMoreBrands(): void {
    if (this.brandHasNextPage && !this.brandLoading) {
      this.brandPageIndex++;
      this.loadBrands();
    }
  }

  onBrandSearch(event: any): void {
    const searchTerm = event.target.value;
    this.editForm.patchValue({ brandSearch: searchTerm });
  }

  toggleBrandDropdown(): void {
    this.brandDropdownOpen = !this.brandDropdownOpen;
  }

  selectBrand(brand: BrandDropdownItem): void {
    this.editForm.patchValue({ brandId: brand.id });
    this.brandDropdownOpen = false;
  }

  getSelectedBrandName(): string {
    const selectedBrandId = this.editForm.get('brandId')?.value;
    const selectedBrand = this.availableBrands.find(
      (brand) => brand.id === selectedBrandId
    );
    return selectedBrand
      ? selectedBrand.value
      : this.office?.brandName || 'Select a brand';
  }

  getCountryName(countryCode: string): string {
    const country = this.availableCountries.find((c) => c.code === countryCode);
    return country ? country.name : countryCode;
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.office) {
      this.editForm.patchValue({
        name: this.office.name,
        country: this.office.country,
        brandId: this.office.brandId,
        isActive: this.office.isActive,
      });
    }
  }

  saveOffice(): void {
    if (this.editForm.invalid || !this.office) return;

    const updateRequest: OfficeUpdateRequest = {
      id: this.office.id,
      name: this.editForm.value.name.trim(),
      country: this.editForm.value.country,
      brandId: this.editForm.value.brandId,
      isActive: this.editForm.value.isActive,
    };

    this.loading = true;
    this.officesService
      .updateOffice(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update office');
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        this.alertService.success('Office updated successfully');
        this.isEditing = false;

        // Update the office object with new values
        this.office = {
          ...this.office,
          name: this.editForm.value.name.trim(),
          country: this.editForm.value.country,
          brandId: this.editForm.value.brandId,
          isActive: this.editForm.value.isActive,
          lastModifiedAt: new Date(),
        };

        this.modalRef.close({
          updated: true,
          office: this.office,
        });
      });
  }

  onClose(): void {
    this.modalRef.close(this.isEditing ? true : false);
  }
}
