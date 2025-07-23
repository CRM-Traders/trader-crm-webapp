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
  finalize,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { LanguageService } from '../../../../core/services/language.service';
import { DesksService } from '../../services/desks.service';
import {
  OfficeDropdownItem,
  OfficeDropdownRequest,
  Desk,
  DeskUpdateRequest,
} from '../../models/desk.model';
import { BrandDropdownItem } from '../../../brands/models/brand.model';

@Component({
  selector: 'app-desk-details-modal',
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
            Desk Details - {{ desk?.name || 'Loading...' }}
          </h2>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading && !desk" class="px-6 py-8 text-center">
        <svg class="animate-spin h-8 w-8 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Loading desk details...</p>
      </div>

      <!-- Modal Body -->
      <div
        *ngIf="desk"
        class="px-6 py-4 bg-white dark:bg-gray-900 max-h-[100vh] overflow-y-auto"
      >
        <div class="space-y-6">
          <!-- Desk Information Section -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <form [formGroup]="editForm" class="space-y-4">
              <!-- Desk Name -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Desk Name
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
                      Desk name is required
                    </span>
                    <span *ngIf="editForm.get('name')?.errors?.['minlength']">
                      Desk name must be at least 2 characters long
                    </span>
                  </p>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="text-sm text-gray-900 dark:text-white font-medium"
                >
                  {{ desk.name }}
                </span>
              </div>

              <!-- Brand -->
              <div class="relative" data-dropdown="brand">
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
                    (click)="toggleOfficeDropdown()"
                    (keydown)="onBrandButtonKeydown($event)"
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
                    <div
                      class="p-3 border-b border-gray-200 dark:border-gray-700"
                    >
                      <input
                        #officeSearchInput
                        type="text"
                        placeholder="Search brands..."
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        (input)="onOfficeSearch($event)"
                        [value]="officeSearchTerm"
                      />
                    </div>

                    <!-- Brands List -->
                    <div
                      class="max-h-48 overflow-y-auto"
                      (scroll)="onOfficeDropdownScroll($event)"
                    >
                      <div
                        *ngFor="let brand of availableOffices; let i = index"
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                        [class.bg-blue-100]="isBrandFocused(i)"
                        [class.dark:bg-blue-400]="isBrandFocused(i)"
                        [tabindex]="0"
                        (click)="selectOffice(brand)"
                        (keydown)="onBrandKeydown($event, brand, i)"
                        (mouseenter)="setFocusedBrandIndex(i)"
                      >
                        <div class="flex justify-between items-center">
                          <span>{{ brand.value }}</span>
                          <span class="text-xs text-gray-500">{{
                            brand.value
                          }}</span>
                        </div>
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
                  {{ desk.brandName }}
                </span>
              </div>
              <!-- Language -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Language
                </label>
                <div
                  *ngIf="isEditing"
                  class="relative"
                  data-dropdown="language"
                >
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
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                        [class.bg-blue-100]="isLanguageFocused(-1)"
                        [class.dark:bg-blue-400]="isLanguageFocused(-1)"
                        [tabindex]="0"
                        (click)="selectLanguage(null)"
                        (keydown)="onLanguageKeydown($event, null, -1)"
                        (mouseenter)="setFocusedLanguageIndex(-1)"
                      >
                        No specific language
                      </div>
                      <div
                        *ngFor="let lang of filteredLanguages; let i = index"
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                        [class.bg-blue-100]="isLanguageFocused(i)"
                        [class.dark:bg-blue-400]="isLanguageFocused(i)"
                        [tabindex]="0"
                        (click)="selectLanguage(lang)"
                        (keydown)="onLanguageKeydown($event, lang, i)"
                        (mouseenter)="setFocusedLanguageIndex(i)"
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
                </div>
                <span
                  *ngIf="!isEditing && desk.language"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                >
                  {{ getLanguageLabel(desk.language) }}
                </span>
                <span
                  *ngIf="!isEditing && !desk.language"
                  class="text-gray-400 text-sm"
                >
                  No Language
                </span>
              </div>
              <!-- Desk Type -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Desk Type
                </label>
                <div
                  *ngIf="isEditing"
                  class="relative"
                  data-dropdown="deskType"
                >
                  <!-- Custom Dropdown Button -->
                  <button
                    type="button"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center"
                    (click)="toggleDeskTypeDropdown()"
                    (keydown)="onDeskTypeButtonKeydown($event)"
                  >
                    <span class="truncate">{{
                      getSelectedDeskTypeName()
                    }}</span>
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
                        *ngFor="let type of deskTypes; let i = index"
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                        [class.bg-blue-100]="isDeskTypeFocused(i)"
                        [class.dark:bg-blue-400]="isDeskTypeFocused(i)"
                        [tabindex]="0"
                        (click)="selectDeskType(type)"
                        (keydown)="onDeskTypeKeydown($event, type, i)"
                        (mouseenter)="setFocusedDeskTypeIndex(i)"
                      >
                        {{ type.label }}
                      </div>
                    </div>
                  </div>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="getTypeClasses(desk.type)"
                >
                  {{ getTypeLabel(desk.type) }}
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
                    Active Desk
                  </label>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="{
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                      desk.isActive,
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200':
                      !desk.isActive
                  }"
                >
                  {{ desk.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <!-- Teams Count -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Teams Count
                </label>
                <span class="text-sm text-gray-900 dark:text-white">
                  {{ desk.teamsCount || 0 }}
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
                    {{ desk.createdAt | date : 'medium' }}
                  </span>
                </div>
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Created By
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ desk.createdBy || 'System' }}
                  </span>
                </div>
              </div>

              <!-- Last Modified Information -->
              <div
                class="grid grid-cols-1 md:grid-cols-2 gap-4"
                *ngIf="desk.lastModifiedAt"
              >
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Last Modified
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ desk.lastModifiedAt | date : 'medium' }}
                  </span>
                </div>
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Modified By
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ desk.lastModifiedBy || 'System' }}
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
                  Edit Desk
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
                  [disabled]="editForm.invalid || saving"
                  (click)="saveDesk()"
                >
                  {{ saving ? 'Saving...' : 'Save Changes' }}
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
export class DeskDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() deskId!: string;
  @ViewChild('officeSearchInput', { static: false })
  officeSearchInput!: ElementRef;

  private fb = inject(FormBuilder);
  private desksService = inject(DesksService);
  private languageService = inject(LanguageService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;
  saving = false;
  desk: Desk | null = null;
  availableOffices: BrandDropdownItem[] = [];
  availableLanguages: any[] = [];

  // Brand dropdown state
  officeSearchTerm = '';
  officePageIndex = 0;
  officePageSize = 20;
  officeTotalCount = 0;
  officeLoading = false;
  officeHasNextPage = false;
  officeDropdownOpen = false;

  // Language dropdown state
  languageDropdownOpen = false;
  languageSearchTerm = '';
  filteredLanguages: any[] = [];

  // Desk type dropdown state
  deskTypeDropdownOpen = false;

  // Keyboard navigation properties
  focusedBrandIndex = -1;
  focusedLanguageIndex = -1;
  focusedDeskTypeIndex = -1;

  deskTypes = [
    { value: 0, label: 'Sales' },
    { value: 1, label: 'Retention' },
  ];

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
      brandId: ['', [Validators.required]],
      officeSearch: [''],
      type: [0],
      language: ['en'], // Set English as default
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadDeskDetails();
    this.initializeSearchObservable();
    this.loadInitialOffices();
    this.loadAvailableLanguages();
    this.filteredLanguages = this.availableLanguages;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDeskDetails(): void {
    if (!this.deskId) {
      this.alertService.error('Desk ID is required');
      this.modalRef.close();
      return;
    }

    this.loading = true;
    this.desksService
      .getDeskById(this.deskId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load desk details');
          this.modalRef.close();
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((desk) => {
        if (desk) {
          this.desk = desk;
          this.populateForm();
        }
      });
  }

  private populateForm(): void {
    if (!this.desk) return;

    this.editForm.patchValue({
      name: this.desk.name,
      brandId: this.desk.brandId,
      type: this.desk.type,
      language: this.desk.language || '',
      isActive: this.desk.isActive,
    });
  }

  private initializeSearchObservable(): void {
    this.editForm
      .get('officeSearch')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.officeSearchTerm = searchTerm || '';
        this.resetOfficeDropdown();
        this.loadOffices();
      });
  }

  private loadInitialOffices(): void {
    this.resetOfficeDropdown();
    this.loadOffices();
  }

  private resetOfficeDropdown(): void {
    this.officePageIndex = 0;
    this.availableOffices = [];
    this.officeHasNextPage = false;
  }

  private loadOffices(): void {
    if (this.officeLoading) return;

    this.officeLoading = true;
    const request: OfficeDropdownRequest = {
      pageIndex: this.officePageIndex,
      pageSize: this.officePageSize,
      globalFilter: this.officeSearchTerm,
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
        if (this.officePageIndex === 1) {
          this.availableOffices = response.items;
        } else {
          this.availableOffices = [...this.availableOffices, ...response.items];
        }

        this.officeTotalCount = response.totalCount;
        this.officeHasNextPage = response.hasNextPage;
        this.officeLoading = false;
      });
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
    if (this.officeHasNextPage && !this.officeLoading) {
      this.officePageIndex++;
      this.loadOffices();
    }
  }

  onOfficeSearch(event: any): void {
    const searchTerm = event.target.value;
    this.editForm.patchValue({ officeSearch: searchTerm });
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
    this.officeDropdownOpen = !this.officeDropdownOpen;
    if (this.officeDropdownOpen) {
      this.focusedBrandIndex = 0; // Start with first item focused
    }
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
      this.officeDropdownOpen = false;
      this.focusedBrandIndex = -1;
    }
    if (!languageDropdown) {
      this.languageDropdownOpen = false;
      this.focusedLanguageIndex = -1;
    }
    if (!deskTypeDropdown) {
      this.deskTypeDropdownOpen = false;
      this.focusedDeskTypeIndex = -1;
    }
  }

  // Language dropdown methods
  toggleLanguageDropdown(): void {
    // Close other dropdowns if open
    if (this.officeDropdownOpen) {
      this.officeDropdownOpen = false;
    }
    if (this.deskTypeDropdownOpen) {
      this.deskTypeDropdownOpen = false;
    }

    // Toggle language dropdown
    this.languageDropdownOpen = !this.languageDropdownOpen;
    if (this.languageDropdownOpen) {
      this.focusedLanguageIndex = -1; // Start with "No specific language" focused
    }
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
      this.editForm.patchValue({ language: lang.key });
    } else {
      this.editForm.patchValue({ language: '' });
    }
    this.languageDropdownOpen = false;
    this.languageSearchTerm = '';
    this.filteredLanguages = this.availableLanguages;
  }

  getSelectedLanguageName(): string {
    const selectedLanguageKey = this.editForm.get('language')?.value;
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
    if (this.officeDropdownOpen) {
      this.officeDropdownOpen = false;
    }
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
    }

    // Toggle desk type dropdown
    this.deskTypeDropdownOpen = !this.deskTypeDropdownOpen;
    if (this.deskTypeDropdownOpen) {
      this.focusedDeskTypeIndex = 0; // Start with first item focused
    }
  }

  selectDeskType(type: any): void {
    this.editForm.patchValue({ type: type.value });
    this.deskTypeDropdownOpen = false;
  }

  getSelectedDeskTypeName(): string {
    const selectedTypeValue = this.editForm.get('type')?.value;
    const selectedType = this.deskTypes.find(
      (type) => type.value === selectedTypeValue
    );
    return selectedType ? selectedType.label : 'Select a desk type...';
  }

  selectOffice(brand: BrandDropdownItem): void {
    this.editForm.patchValue({ brandId: brand.id });
    this.officeDropdownOpen = false;
  }

  getSelectedOfficeName(): string {
    const selectedOfficeId = this.editForm.get('brandId')?.value;
    const selectedOffice = this.availableOffices.find(
      (brand) => brand.id === selectedOfficeId
    );
    return selectedOffice
      ? selectedOffice.value
      : this.desk?.brandName || 'Select an brand';
  }

  private loadAvailableLanguages(): void {
    this.availableLanguages = this.languageService.getAllLanguages();
  }

  getTypeLabel(type: number): string {
    const typeInfo = this.deskTypes.find((t) => t.value === type);
    return typeInfo ? typeInfo.label : `Type ${type}`;
  }

  getTypeClasses(type: number): string {
    switch (type) {
      case 0:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 1:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 2:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }

  getLanguageLabel(languageCode: string): string {
    const language = this.languageService.getLanguageByKey(languageCode);
    return language || languageCode.toUpperCase();
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.populateForm();
  }

  saveDesk(): void {
    if (this.editForm.invalid || !this.desk || !this.deskId) return;

    const updateRequest: DeskUpdateRequest = {
      id: this.desk.id,
      name: this.editForm.value.name.trim(),
      brandId: this.editForm.value.brandId,
      type: Number(this.editForm.value.type),
      language: this.editForm.value.language || null,
      isActive: this.editForm.value.isActive,
    };

    this.saving = true;
    this.desksService
      .updateDesk(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update desk');
          return of(null);
        }),
        finalize(() => (this.saving = false))
      )
      .subscribe((result) => {
        this.alertService.success('Desk updated successfully');
        this.isEditing = false;

        // Update the desk object with new values
        if (this.desk) {
          this.desk = {
            ...this.desk,
            name: this.editForm.value.name.trim(),
            brandId: this.editForm.value.brandId,
            type: this.editForm.value.type,
            language: this.editForm.value.language || null,
            isActive: this.editForm.value.isActive,
            lastModifiedAt: new Date(),
          };
        }

        this.modalRef.close({
          updated: true,
          desk: this.desk,
        });
      });
  }

  onClose(): void {
    // Only return a result if there were actual changes
    if (this.isEditing) {
      this.modalRef.close({
        updated: true,
        desk: this.desk
      });
    } else {
      this.modalRef.close();
    }
  }

  // Keyboard navigation methods for Brand dropdown
  isBrandFocused(index: number): boolean {
    return this.focusedBrandIndex === index;
  }

  setFocusedBrandIndex(index: number): void {
    this.focusedBrandIndex = index;
  }

  onBrandKeydown(event: KeyboardEvent, brand: BrandDropdownItem, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectOffice(brand);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextBrand();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousBrand();
        break;
      case 'Escape':
        this.officeDropdownOpen = false;
        break;
    }
  }

  private focusNextBrand(): void {
    if (this.focusedBrandIndex < this.availableOffices.length - 1) {
      this.focusedBrandIndex++;
    }
  }

  private focusPreviousBrand(): void {
    if (this.focusedBrandIndex > 0) {
      this.focusedBrandIndex--;
    }
  }

  // Keyboard navigation methods for Language dropdown
  isLanguageFocused(index: number): boolean {
    return this.focusedLanguageIndex === index;
  }

  setFocusedLanguageIndex(index: number): void {
    this.focusedLanguageIndex = index;
  }

  onLanguageKeydown(event: KeyboardEvent, lang: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectLanguage(lang);
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
    const totalItems = this.filteredLanguages.length + 1; // +1 for "No specific language"
    if (this.focusedLanguageIndex < totalItems - 1) {
      this.focusedLanguageIndex++;
    }
  }

  private focusPreviousLanguage(): void {
    if (this.focusedLanguageIndex > -1) {
      this.focusedLanguageIndex--;
    }
  }

  // Keyboard navigation methods for Desk Type dropdown
  isDeskTypeFocused(index: number): boolean {
    return this.focusedDeskTypeIndex === index;
  }

  setFocusedDeskTypeIndex(index: number): void {
    this.focusedDeskTypeIndex = index;
  }

  onDeskTypeKeydown(event: KeyboardEvent, type: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDeskType(type);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextDeskType();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousDeskType();
        break;
      case 'Escape':
        this.deskTypeDropdownOpen = false;
        break;
    }
  }

  private focusNextDeskType(): void {
    if (this.focusedDeskTypeIndex < this.deskTypes.length - 1) {
      this.focusedDeskTypeIndex++;
    }
  }

  private focusPreviousDeskType(): void {
    if (this.focusedDeskTypeIndex > 0) {
      this.focusedDeskTypeIndex--;
    }
  }

  // Button keydown handlers for opening dropdowns
  onBrandButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.officeDropdownOpen) {
          this.toggleOfficeDropdown();
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

  onDeskTypeButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.deskTypeDropdownOpen) {
          this.toggleDeskTypeDropdown();
        }
        break;
    }
  }
}
