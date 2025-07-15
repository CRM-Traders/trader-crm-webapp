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
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { CountryService } from '../../../../core/services/country.service';
import { BrandsService } from '../../../brands/services/brands.service';
import {
  OfficeCreateRequest,
  OfficeCreateResponse,
} from '../../models/office.model';
import { OfficesService } from '../../services/offices.service';
import {
  BrandDropdownItem,
  BrandDropdownRequest,
} from '../../../brands/models/brand.model';
import { Country } from '../../../../core/models/country.model';

@Component({
  selector: 'app-office-creation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full modal-content">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Create New Office
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <form [formGroup]="officeForm" class="space-y-6">
          <!-- Office Name -->
          <div>
            <label
              for="name"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Office Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              formControlName="name"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                officeForm.get('name')?.invalid &&
                officeForm.get('name')?.touched
              "
              [class.focus:ring-red-500]="
                officeForm.get('name')?.invalid &&
                officeForm.get('name')?.touched
              "
              placeholder="Enter office name"
            />
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                officeForm.get('name')?.invalid &&
                officeForm.get('name')?.touched
              "
            >
              <span *ngIf="officeForm.get('name')?.errors?.['required']">
                Office name is required
              </span>
              <span *ngIf="officeForm.get('name')?.errors?.['minlength']">
                Office name must be at least 2 characters long
              </span>
              <span *ngIf="officeForm.get('name')?.errors?.['maxlength']">
                Office name cannot exceed 100 characters
              </span>
            </p>
          </div>

          <!-- Source -->
          <div>
            <label
              for="source"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Source
            </label>
            <input
              type="text"
              id="source"
              formControlName="source"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter source (optional)"
            />
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Optional field to track the source of this office
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
                Active Office
              </label>
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Active offices are available for use across the system
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
          [disabled]="officeForm.invalid || isSubmitting"
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
            {{ isSubmitting ? 'Creating...' : 'Create Office' }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class OfficeCreationModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @ViewChild('brandSearchInput', { static: false })
  brandSearchInput!: ElementRef;

  private fb = inject(FormBuilder);
  private officesService = inject(OfficesService);
  private brandsService = inject(BrandsService);
  private countryService = inject(CountryService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  officeForm: FormGroup;
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
    this.officeForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      isActive: [true],
      source: [''],
    });
  }

  ngOnInit(): void {
    this.initializeSearchObservable();
    this.loadInitialBrands();
    this.loadAvailableCountries();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSearchObservable(): void {
    this.officeForm
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
    this.officeForm.patchValue({ brandSearch: searchTerm });
  }

  toggleBrandDropdown(): void {
    this.brandDropdownOpen = !this.brandDropdownOpen;
  }

  selectBrand(brand: BrandDropdownItem): void {
    this.officeForm.patchValue({ brandId: brand.id });
    this.brandDropdownOpen = false;
  }

  getSelectedBrandName(): string {
    const selectedBrandId = this.officeForm.get('brandId')?.value;
    const selectedBrand = this.availableBrands.find(
      (brand) => brand.id === selectedBrandId
    );
    return selectedBrand ? selectedBrand.value : 'Select a brand';
  }

  onSubmit(): void {
    if (this.officeForm.invalid) {
      Object.keys(this.officeForm.controls).forEach((key) => {
        this.officeForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.officeForm.value;

    const officeData: OfficeCreateRequest = {
      name: formValue.name.trim(),
      country: formValue.country,
      isActive: formValue.isActive,
      source: formValue.source?.trim() || undefined,
    };

    this.officesService
      .createOffice(officeData)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          if (error.status === 400) {
            this.alertService.error(
              'Invalid data provided. Please check your inputs.'
            );
          } else if (error.status === 409) {
            this.alertService.error('An office with this name already exists.');
          } else {
            this.alertService.error(
              'Failed to create office. Please try again.'
            );
          }
          return of(null);
        })
      )
      .subscribe((response: OfficeCreateResponse | null) => {
        this.isSubmitting = false;
        if (response) {
          this.alertService.success('Office created successfully!');
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
