import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
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
import { DesksService } from '../../services/desks.service';
import {
  DeskCreateRequest,
  DeskCreateResponse,
  OfficeDropdownItem,
  OfficeDropdownRequest,
} from '../../models/desk.model';
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
          <div class="relative" data-dropdown="brand">
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
              (click)="toggleOfficeDropdown()"
            >
              <span class="truncate">{{ getSelectedOfficeName() }}</span>
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
                  (input)="onOfficeSearch($event)"
                  [value]="brandSearchTerm"
                />
              </div>

              <!-- Brands List -->
              <div
                class="max-h-48 overflow-y-auto"
                (scroll)="onOfficeDropdownScroll($event)"
              >
                <div
                  *ngFor="let brand of availableOffices"
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                  (click)="selectOffice(brand)"
                >
                  <div class="flex justify-between items-center">
                    <span>{{ brand.value }}</span>
                    <span class="text-xs text-gray-500">{{ brand.value }}</span>
                  </div>
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
                  *ngIf="!brandLoading && availableOffices.length === 0"
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

          <!-- Language Selection -->
          <div class="relative" data-dropdown="language">
            <label
              for="language"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Language
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              (click)="toggleLanguageDropdown()"
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
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                  (click)="selectLanguage(null)"
                >
                  No specific language
                </div>
                <div
                  *ngFor="let lang of filteredLanguages"
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                  (click)="selectLanguage(lang)"
                >
                  {{ lang.value }}
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

            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Optional: Select a language for this desk
            </p>
          </div>

          <!-- Desk Type -->
          <div class="relative" data-dropdown="deskType">
            <label
              for="type"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Desk Type
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              (click)="toggleDeskTypeDropdown()"
            >
              <span class="truncate">{{ getSelectedDeskTypeName() }}</span>
              <svg
                class="w-4 h-4 ml-2 transition-transform"
                [class.rotate-180]="deskTypeDropdownOpen"
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
              *ngIf="deskTypeDropdownOpen"
              class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
            >
              <!-- Desk Types List -->
              <div class="max-h-48 overflow-y-auto">
                <div
                  *ngFor="let type of deskTypes"
                  class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                  (click)="selectDeskType(type)"
                >
                  {{ type.label }}
                </div>
              </div>
            </div>

            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select the type of desk to create
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
  private languageService = inject(LanguageService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  deskForm: FormGroup;
  availableOffices: BrandDropdownItem[] = [];
  availableLanguages: any[] = [];

  // Brand dropdown state
  brandSearchTerm = '';
  brandPageIndex = 0;
  brandPageSize = 20;
  brandTotalCount = 0;
  brandLoading = false;
  brandHasNextPage = false;
  brandDropdownOpen = false;

  // Language dropdown state
  languageDropdownOpen = false;
  languageSearchTerm = '';
  filteredLanguages: any[] = [];

  // Desk type dropdown state
  deskTypeDropdownOpen = false;

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
      language: ['en'], // Set English as default
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.initializeSearchObservable();
    this.loadInitialOffices();
    this.loadAvailableLanguages();
    this.filteredLanguages = this.availableLanguages;
    
    // Set default language to English
    const englishLanguage = this.availableLanguages.find(lang => lang.key === 'en');
    if (englishLanguage) {
      this.deskForm.patchValue({ language: englishLanguage.key });
    }
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
        this.resetOfficeDropdown();
        this.loadOffices();
      });
  }

  private loadInitialOffices(): void {
    this.resetOfficeDropdown();
    this.loadOffices();
  }

  private resetOfficeDropdown(): void {
    this.brandPageIndex = 0;
    this.availableOffices = [];
    this.brandHasNextPage = false;
  }

  private loadOffices(): void {
    if (this.brandLoading) return;

    this.brandLoading = true;
    const request: BrandDropdownRequest = {
      pageIndex: this.brandPageIndex,
      pageSize: this.brandPageSize,
      globalFilter: this.brandSearchTerm,
      sortField: 'name',
      sortDirection: 'asc',
    };

    this.desksService
      .getBrandsDropdown(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
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
          this.availableOffices = response.items;
        } else {
          this.availableOffices = [...this.availableOffices, ...response.items];
        }

        this.brandTotalCount = response.totalCount;
        this.brandHasNextPage = response.hasNextPage;
        this.brandLoading = false;
      });
  }

  private loadAvailableLanguages(): void {
    this.availableLanguages = this.languageService.getAllLanguages();
  }

  onOfficeDropdownScroll(event: any): void {
    const element = event.target;
    const threshold = 100;

    if (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - threshold
    ) {
      this.loadMoreOffices();
    }
  }

  private loadMoreOffices(): void {
    if (this.brandHasNextPage && !this.brandLoading) {
      this.brandPageIndex++;
      this.loadOffices();
    }
  }

  onOfficeSearch(event: any): void {
    const searchTerm = event.target.value;
    this.deskForm.patchValue({ brandSearch: searchTerm });
  }

  toggleOfficeDropdown(): void {
    // Close other dropdowns if open
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
    }
    if (this.deskTypeDropdownOpen) {
      this.deskTypeDropdownOpen = false;
    }

    // Toggle brand dropdown
    this.brandDropdownOpen = !this.brandDropdownOpen;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Check if click is inside dropdown containers
    const brandDropdown = target.closest('[data-dropdown="brand"]');
    const languageDropdown = target.closest('[data-dropdown="language"]');
    const deskTypeDropdown = target.closest('[data-dropdown="deskType"]');

    // Close dropdowns if click is outside
    if (!brandDropdown) {
      this.brandDropdownOpen = false;
    }
    if (!languageDropdown) {
      this.languageDropdownOpen = false;
    }
    if (!deskTypeDropdown) {
      this.deskTypeDropdownOpen = false;
    }
  }

  // Language dropdown methods
  toggleLanguageDropdown(): void {
    // Close other dropdowns if open
    if (this.brandDropdownOpen) {
      this.brandDropdownOpen = false;
    }
    if (this.deskTypeDropdownOpen) {
      this.deskTypeDropdownOpen = false;
    }

    // Toggle language dropdown
    this.languageDropdownOpen = !this.languageDropdownOpen;
  }

  onLanguageSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.languageSearchTerm = target.value.toLowerCase();

    this.filteredLanguages = this.availableLanguages.filter((lang) =>
      lang.value.toLowerCase().includes(this.languageSearchTerm)
    );
  }

  selectLanguage(lang: any): void {
    if (lang) {
      this.deskForm.patchValue({ language: lang.key });
    } else {
      this.deskForm.patchValue({ language: '' });
    }
    this.languageDropdownOpen = false;
    this.languageSearchTerm = '';
    this.filteredLanguages = this.availableLanguages;
  }

  getSelectedLanguageName(): string {
    const selectedLanguageKey = this.deskForm.get('language')?.value;
    if (!selectedLanguageKey) {
      return 'No specific language';
    }
    const selectedLanguage = this.availableLanguages.find(
      (lang) => lang.key === selectedLanguageKey
    );
    return selectedLanguage ? selectedLanguage.value : 'Select a language...';
  }

  // Desk type dropdown methods
  toggleDeskTypeDropdown(): void {
    // Close other dropdowns if open
    if (this.brandDropdownOpen) {
      this.brandDropdownOpen = false;
    }
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
    }

    // Toggle desk type dropdown
    this.deskTypeDropdownOpen = !this.deskTypeDropdownOpen;
  }

  selectDeskType(type: any): void {
    this.deskForm.patchValue({ type: type.value });
    this.deskTypeDropdownOpen = false;
  }

  getSelectedDeskTypeName(): string {
    const selectedTypeValue = this.deskForm.get('type')?.value;
    const selectedType = this.deskTypes.find(
      (type) => type.value === selectedTypeValue
    );
    return selectedType ? selectedType.label : 'Select a desk type...';
  }

  selectOffice(brand: BrandDropdownItem): void {
    this.deskForm.patchValue({ brandId: brand.id });
    this.brandDropdownOpen = false;
  }

  getSelectedOfficeName(): string {
    const selectedOfficeId = this.deskForm.get('brandId')?.value;
    const selectedOffice = this.availableOffices.find(
      (brand) => brand.id === selectedOfficeId
    );
    return selectedOffice ? selectedOffice.value : 'Select an brand';
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
      type: Number(formValue.type),
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
