// src/app/features/desks/components/desk-creation-modal/desk-creation-modal.component.ts

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
import { LanguageService } from '../../../../core/services/language.service';
import { BrandsService } from '../../../brands/services/brands.service';
import { DeskCreateRequest, DeskCreateResponse } from '../../models/desk.model';
import { DesksService } from '../../services/desks.service';
import {
  BrandDropdownItem,
  BrandDropdownRequest,
} from '../../../brands/models/brand.model';

@Component({
  selector: 'app-desk-creation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Create New Desk
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <form [formGroup]="deskForm" class="space-y-6">
          <!-- Desk Name -->
          <div>
            <label
              for="name"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Desk Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              formControlName="name"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                deskForm.get('name')?.invalid && deskForm.get('name')?.touched
              "
              [class.focus:ring-red-500]="
                deskForm.get('name')?.invalid && deskForm.get('name')?.touched
              "
              placeholder="Enter desk name"
            />
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                deskForm.get('name')?.invalid && deskForm.get('name')?.touched
              "
            >
              <span *ngIf="deskForm.get('name')?.errors?.['required']">
                Desk name is required
              </span>
              <span *ngIf="deskForm.get('name')?.errors?.['minlength']">
                Desk name must be at least 2 characters long
              </span>
              <span *ngIf="deskForm.get('name')?.errors?.['maxlength']">
                Desk name cannot exceed 100 characters
              </span>
            </p>
          </div>

          <!-- Brand Selection -->
          <div class="relative">
            <label
              for="brandId"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Brand <span class="text-red-500">*</span>
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              [class.border-red-500]="
                deskForm.get('brandId')?.invalid &&
                deskForm.get('brandId')?.touched
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
              <div class="p-3 border-b border-gray-200 dark:border-gray-700">
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
                deskForm.get('brandId')?.invalid &&
                deskForm.get('brandId')?.touched
              "
            >
              <span *ngIf="deskForm.get('brandId')?.errors?.['required']">
                Brand selection is required
              </span>
            </p>
          </div>

          <!-- Desk Type -->
          <div>
            <label
              for="type"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Desk Type
            </label>
            <select
              id="type"
              formControlName="type"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option *ngFor="let type of deskTypes" [value]="type.value">
                {{ type.label }}
              </option>
            </select>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select the type of desk to create
            </p>
          </div>

          <!-- Language Selection -->
          <div>
            <label
              for="language"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Language
            </label>
            <select
              id="language"
              formControlName="language"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">No specific language</option>
              <option
                *ngFor="let lang of availableLanguages"
                [value]="lang.key"
              >
                {{ lang.value }}
              </option>
            </select>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Optional: Select a language for this desk
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
                Active Desk
              </label>
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Active desks are available for use across the system
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
          [disabled]="deskForm.invalid || isSubmitting"
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
            {{ isSubmitting ? 'Creating...' : 'Create Desk' }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class DeskCreationModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @ViewChild('brandSearchInput', { static: false })
  brandSearchInput!: ElementRef;

  private fb = inject(FormBuilder);
  private desksService = inject(DesksService);
  private brandsService = inject(BrandsService);
  private languageService = inject(LanguageService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  deskForm: FormGroup;
  availableBrands: BrandDropdownItem[] = [];
  availableLanguages: any[] = [];

  // Brand dropdown state
  brandSearchTerm = '';
  brandPageIndex = 0;
  brandPageSize = 20;
  brandTotalCount = 0;
  brandLoading = false;
  brandHasNextPage = false;
  brandDropdownOpen = false;

  deskTypes = [
    { value: 0, label: 'Sales' },
    { value: 1, label: 'Retention' },
  ];

  constructor() {
    this.deskForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      brandId: ['', [Validators.required]],
      brandSearch: [''],
      type: [0],
      language: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.initializeSearchObservable();
    this.loadInitialBrands();
    this.loadAvailableLanguages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSearchObservable(): void {
    this.deskForm
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

  private loadAvailableLanguages(): void {
    this.availableLanguages = this.languageService.getAllLanguages();
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
    this.deskForm.patchValue({ brandSearch: searchTerm });
  }

  toggleBrandDropdown(): void {
    this.brandDropdownOpen = !this.brandDropdownOpen;
  }

  selectBrand(brand: BrandDropdownItem): void {
    this.deskForm.patchValue({ brandId: brand.id });
    this.brandDropdownOpen = false;
  }

  getSelectedBrandName(): string {
    const selectedBrandId = this.deskForm.get('brandId')?.value;
    const selectedBrand = this.availableBrands.find(
      (brand) => brand.id === selectedBrandId
    );
    return selectedBrand ? selectedBrand.value : 'Select a brand';
  }

  onSubmit(): void {
    if (this.deskForm.invalid) {
      Object.keys(this.deskForm.controls).forEach((key) => {
        this.deskForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.deskForm.value;

    const deskData: DeskCreateRequest = {
      name: formValue.name.trim(),
      brandId: formValue.brandId,
      type: formValue.type,
      language: formValue.language || null,
      isActive: formValue.isActive,
    };

    this.desksService
      .createDesk(deskData)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          if (error.status === 400) {
            this.alertService.error(
              'Invalid data provided. Please check your inputs.'
            );
          } else if (error.status === 409) {
            this.alertService.error('A desk with this name already exists.');
          } else {
            this.alertService.error('Failed to create desk. Please try again.');
          }
          return of(null);
        })
      )
      .subscribe((response: DeskCreateResponse | null) => {
        this.isSubmitting = false;
        if (response) {
          this.alertService.success('Desk created successfully!');
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
