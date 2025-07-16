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
import { TeamsService } from '../../services/teams.service';
import {
  Team,
  TeamUpdateRequest,
  DeskDropdownItem,
  DeskDropdownResponse,
} from '../../models/team.model';

interface BrandDropdownItem {
  id: string;
  value: string;
  description?: string;
}

interface BrandDropdownResponse {
  items: BrandDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

@Component({
  selector: 'app-team-details-modal',
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
            Team Details - {{ team.name || 'Loading...' }}
          </h2>
        </div>
      </div>

      <!-- Loading State -->
      <div
        *ngIf="teamLoading"
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
          <p class="text-gray-600 dark:text-gray-400">Loading team data...</p>
        </div>
      </div>

      <!-- Modal Body -->
      <div
        *ngIf="!teamLoading"
        class="px-6 py-4 bg-white dark:bg-gray-900 max-h-[100vh] overflow-y-auto"
      >
        <div class="space-y-6">
          <!-- Team Information Section -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <form [formGroup]="editForm" class="space-y-4">
              <!-- Team Name -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Team Name
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
                      Team name is required
                    </span>
                    <span *ngIf="editForm.get('name')?.errors?.['minlength']">
                      Team name must be at least 2 characters long
                    </span>
                  </p>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="text-sm text-gray-900 dark:text-white font-medium"
                >
                  {{ team.name }}
                </span>
              </div>

              <!-- Brand Selection -->
              <div class="relative">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Brand
                </label>
                <div *ngIf="isEditing">
                  <!-- Brand Dropdown Button -->
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

                  <!-- Brand Dropdown Panel -->
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
                        <div class="flex flex-col">
                          <span class="font-medium">{{ brand.value }}</span>
                          <span
                            class="text-xs text-gray-500 dark:text-gray-400"
                            *ngIf="brand.description"
                          >
                            {{ brand.description }}
                          </span>
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
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  <svg
                    class="mr-1 h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  {{ team.brandName }}
                </span>
              </div>

              <!-- Desk -->
              <div class="relative">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Desk
                </label>
                <div *ngIf="isEditing">
                  <!-- Custom Dropdown Button -->
                  <button
                    type="button"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center"
                    [class.border-red-500]="
                      editForm.get('deskId')?.invalid &&
                      editForm.get('deskId')?.touched
                    "
                    [class.opacity-50]="!editForm.get('brandId')?.value"
                    [disabled]="!editForm.get('brandId')?.value"
                    (click)="toggleDeskDropdown()"
                  >
                    <span class="truncate">{{ getSelectedDeskName() }}</span>
                    <svg
                      class="w-4 h-4 ml-2 transition-transform"
                      [class.rotate-180]="deskDropdownOpen"
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

                  <!-- Helper text -->
                  <p
                    class="mt-1 text-xs text-gray-500 dark:text-gray-400"
                    *ngIf="!editForm.get('brandId')?.value"
                  >
                    Please select a brand first to choose a desk
                  </p>

                  <!-- Dropdown Panel -->
                  <div
                    *ngIf="deskDropdownOpen && editForm.get('brandId')?.value"
                    class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
                  >
                    <!-- Search Input -->
                    <div
                      class="p-3 border-b border-gray-200 dark:border-gray-700"
                    >
                      <input
                        #deskSearchInput
                        type="text"
                        placeholder="Search desks..."
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        (input)="onDeskSearch($event)"
                        [value]="deskSearchTerm"
                      />
                    </div>

                    <!-- Desks List -->
                    <div
                      class="max-h-48 overflow-y-auto"
                      (scroll)="onDeskDropdownScroll($event)"
                    >
                      <div
                        *ngFor="let desk of availableDesks"
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                        (click)="selectDesk(desk)"
                      >
                        <div class="flex flex-col">
                          <span class="font-medium">{{ desk.value }}</span>
                        </div>
                      </div>

                      <!-- Loading indicator -->
                      <div
                        *ngIf="deskLoading"
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
                        *ngIf="!deskLoading && availableDesks.length === 0"
                        class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No desks found
                      </div>
                    </div>
                  </div>

                  <!-- Validation Error -->
                  <p
                    class="mt-1 text-sm text-red-600 dark:text-red-400"
                    *ngIf="
                      editForm.get('deskId')?.invalid &&
                      editForm.get('deskId')?.touched
                    "
                  >
                    <span *ngIf="editForm.get('deskId')?.errors?.['required']">
                      Desk selection is required
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
                      d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
                    />
                  </svg>
                  {{ team.deskName }}
                </span>
              </div>

              <!-- Office Information (Read-only) -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Office
                </label>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  <svg
                    class="mr-1 h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  {{ team.officeName }}
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
                    Active Team
                  </label>
                </div>
                <span
                  *ngIf="!isEditing"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="{
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                      team.isActive,
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200':
                      !team.isActive
                  }"
                >
                  {{ team.isActive ? 'Active' : 'Inactive' }}
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
                    {{ team.createdAt | date : 'medium' }}
                  </span>
                </div>
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Created By
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ team.createdBy || 'System' }}
                  </span>
                </div>
              </div>

              <!-- Last Modified Information -->
              <div
                class="grid grid-cols-1 md:grid-cols-2 gap-4"
                *ngIf="team.lastModifiedAt"
              >
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Last Modified
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ team.lastModifiedAt | date : 'medium' }}
                  </span>
                </div>
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Modified By
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ team.lastModifiedBy || 'System' }}
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
                  Edit Team
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
                  (click)="saveTeam()"
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
export class TeamDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() team!: Team;
  @ViewChild('deskSearchInput', { static: false })
  deskSearchInput!: ElementRef;
  @ViewChild('brandSearchInput', { static: false })
  brandSearchInput!: ElementRef;

  private fb = inject(FormBuilder);
  private teamsService = inject(TeamsService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;
  teamLoading = false;
  availableDesks: DeskDropdownItem[] = [];
  availableBrands: BrandDropdownItem[] = [];

  // Brand dropdown state
  brandSearchTerm = '';
  brandPageIndex = 0;
  brandPageSize = 20;
  brandTotalCount = 0;
  brandLoading = false;
  brandHasNextPage = false;
  brandDropdownOpen = false;

  // Desk dropdown state
  deskSearchTerm = '';
  deskPageIndex = 0;
  deskPageSize = 20;
  deskTotalCount = 0;
  deskLoading = false;
  deskHasNextPage = false;
  deskDropdownOpen = false;

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
      deskId: ['', [Validators.required]],
      brandSearch: [''],
      deskSearch: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadTeamData();
    this.initializeSearchObservables();
    this.loadInitialBrands();
    this.setupBrandWatcher();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTeamData(): void {
    if (!this.team.id) return;

    this.teamLoading = true;
    this.teamsService
      .getTeamById(this.team.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load team data');
          return of(this.team); // Fallback to input team data
        }),
        finalize(() => (this.teamLoading = false))
      )
      .subscribe((teamData) => {
        this.team = teamData;
        this.updateFormWithTeamData();
      });
  }

  private updateFormWithTeamData(): void {
    if (this.team) {
      this.editForm.patchValue({
        name: this.team.name,
        brandId: this.team.brandId,
        deskId: this.team.deskId,
        isActive: this.team.isActive,
      });
    }
  }

  private initializeSearchObservables(): void {
    // Brand search
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

    // Desk search
    this.editForm
      .get('deskSearch')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.deskSearchTerm = searchTerm || '';
        this.resetDeskDropdown();
        this.loadDesks();
      });
  }

  private setupBrandWatcher(): void {
    this.editForm
      .get('brandId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((brandId: string) => {
        // Clear desk selection when brand changes
        this.editForm.patchValue({ deskId: '' });
        this.resetDeskDropdown();
        if (brandId) {
          this.loadDesks();
        }
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

  private resetDeskDropdown(): void {
    this.deskPageIndex = 0;
    this.availableDesks = [];
    this.deskHasNextPage = false;
  }

  private loadBrands(): void {
    if (this.brandLoading) return;

    this.brandLoading = true;
    const request = {
      pageIndex: this.brandPageIndex,
      pageSize: this.brandPageSize,
      sortField: 'name',
      sortDirection: 'asc',
      visibleColumns: ['array', 'null'],
      globalFilter: this.brandSearchTerm,
      filters: null,
    };

    this.teamsService
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
          });
        })
      )
      .subscribe((response: BrandDropdownResponse) => {
        if (this.brandPageIndex === 0) {
          this.availableBrands = response.items;
        } else {
          this.availableBrands = [...this.availableBrands, ...response.items];
        }

        this.brandTotalCount = response.totalCount;
        this.brandHasNextPage = response.pageIndex < response.totalPages;
        this.brandLoading = false;
      });
  }

  private loadDesks(): void {
    if (this.deskLoading) return;

    const selectedBrandId = this.editForm.get('brandId')?.value;
    if (!selectedBrandId) return;

    this.deskLoading = true;
    const request = {
      brandId: selectedBrandId,
      pageIndex: this.deskPageIndex,
      pageSize: this.deskPageSize,
      sortField: 'name',
      sortDirection: 'asc',
      visibleColumns: ['array', 'null'],
      globalFilter: this.deskSearchTerm,
      filters: null,
    };

    this.teamsService
      .getDesksDropdown(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load desks');
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 1,
            pageSize: 20,
            totalPages: 0,
          });
        })
      )
      .subscribe((response: DeskDropdownResponse) => {
        if (this.deskPageIndex === 0) {
          this.availableDesks = response.items;

          // Ensure the current desk is always available in the list
          const selectedDeskId = this.editForm.get('deskId')?.value;
          if (selectedDeskId && this.team.deskName) {
            const currentDeskExists = this.availableDesks.find(
              (desk) => desk.id === selectedDeskId
            );
            if (!currentDeskExists) {
              // Add the current desk to the list if it's not already there
              this.availableDesks.unshift({
                id: selectedDeskId,
                value: this.team.deskName,
                officeName: this.team.officeName || '',
                language: null,
                type: 1, // Default type
              });
            }
          }
        } else {
          this.availableDesks = [...this.availableDesks, ...response.items];
        }

        this.deskTotalCount = response.totalCount;
        this.deskHasNextPage = response.pageIndex < response.totalPages;
        this.deskLoading = false;
      });
  }

  // Brand dropdown methods
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
    // Close desk dropdown if open
    if (this.deskDropdownOpen) {
      this.deskDropdownOpen = false;
    }
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
      : this.team.brandName || 'Select a brand';
  }

  // Desk dropdown methods
  onDeskDropdownScroll(event: any): void {
    const element = event.target;
    const threshold = 100;

    if (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - threshold
    ) {
      this.loadMoreDesks();
    }
  }

  private loadMoreDesks(): void {
    if (this.deskHasNextPage && !this.deskLoading) {
      this.deskPageIndex++;
      this.loadDesks();
    }
  }

  onDeskSearch(event: any): void {
    const searchTerm = event.target.value;
    this.editForm.patchValue({ deskSearch: searchTerm });
  }

  toggleDeskDropdown(): void {
    if (this.editForm.get('brandId')?.value) {
      // Close brand dropdown if open
      if (this.brandDropdownOpen) {
        this.brandDropdownOpen = false;
      }
      this.deskDropdownOpen = !this.deskDropdownOpen;
    }
  }

  selectDesk(desk: DeskDropdownItem): void {
    this.editForm.patchValue({ deskId: desk.id });
    this.deskDropdownOpen = false;
  }

  getSelectedDeskName(): string {
    const selectedDeskId = this.editForm.get('deskId')?.value;
    const selectedDesk = this.availableDesks.find(
      (desk) => desk.id === selectedDeskId
    );

    // If no desk is selected, show placeholder
    if (!selectedDeskId) {
      return 'Select a desk';
    }

    // If desk is selected but not found in available desks, show placeholder
    // This happens when brand changes and the old desk doesn't belong to the new brand
    if (!selectedDesk) {
      return 'Select a desk';
    }

    return selectedDesk.value;
  }

  startEdit(): void {
    this.isEditing = true;
    // Load desks for the current brand when starting edit
    if (this.editForm.get('brandId')?.value) {
      this.loadDesks();
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.updateFormWithTeamData(); // Reset form to current team data
  }

  saveTeam(): void {
    if (this.editForm.invalid || !this.team) return;

    const updateRequest: TeamUpdateRequest = {
      id: this.team.id,
      name: this.editForm.value.name.trim(),
      brandId: this.editForm.value.brandId,
      deskId: this.editForm.value.deskId,
      isActive: this.editForm.value.isActive,
    };

    this.loading = true;
    this.teamsService
      .updateTeam(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update team');
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        this.alertService.success('Team updated successfully');
        this.isEditing = false;

        // Reload team data to get the updated information
        this.loadTeamData();

        this.modalRef.close({
          updated: true,
          team: this.team,
        });
      });
  }

  onClose(): void {
    this.modalRef.close(this.isEditing ? true : false);
  }
}
