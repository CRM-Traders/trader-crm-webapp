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
import { Team, TeamUpdateRequest } from '../../models/team.model';

interface DepartmentDropdownItem {
  id: string;
  value: string;
  deskName: string;
  isActive: boolean;
}

interface DepartmentDropdownResponse {
  items: DepartmentDropdownItem[];
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
            Team Details - {{ team.name }}
          </h2>
        </div>
      </div>

      <!-- Modal Body -->
      <div
        class="px-6 py-4 bg-white dark:bg-gray-900 max-h-[70vh] overflow-y-auto"
      >
        <div class="space-y-6">
          <!-- Team Information Section -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              Team Information
            </h3>

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

              <!-- Department -->
              <div class="relative">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Department
                </label>
                <div *ngIf="isEditing">
                  <!-- Custom Dropdown Button -->
                  <button
                    type="button"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex justify-between items-center"
                    [class.border-red-500]="
                      editForm.get('departmentId')?.invalid &&
                      editForm.get('departmentId')?.touched
                    "
                    (click)="toggleDepartmentDropdown()"
                  >
                    <span class="truncate">{{
                      getSelectedDepartmentName()
                    }}</span>
                    <svg
                      class="w-4 h-4 ml-2 transition-transform"
                      [class.rotate-180]="departmentDropdownOpen"
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
                    *ngIf="departmentDropdownOpen"
                    class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
                  >
                    <!-- Search Input -->
                    <div
                      class="p-3 border-b border-gray-200 dark:border-gray-700"
                    >
                      <input
                        #departmentSearchInput
                        type="text"
                        placeholder="Search departments..."
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        (input)="onDepartmentSearch($event)"
                        [value]="departmentSearchTerm"
                      />
                    </div>

                    <!-- Departments List -->
                    <div
                      class="max-h-48 overflow-y-auto"
                      (scroll)="onDepartmentDropdownScroll($event)"
                    >
                      <div
                        *ngFor="let department of availableDepartments"
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                        (click)="selectDepartment(department)"
                      >
                        <div class="flex flex-col">
                          <span class="font-medium">{{
                            department.value
                          }}</span>
                          <span
                            class="text-xs text-gray-500 dark:text-gray-400"
                          >
                            Desk: {{ department.deskName }} |
                            {{ department.isActive ? 'Active' : 'Inactive' }}
                          </span>
                        </div>
                      </div>

                      <!-- Loading indicator -->
                      <div
                        *ngIf="departmentLoading"
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
                          !departmentLoading &&
                          availableDepartments.length === 0
                        "
                        class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No departments found
                      </div>
                    </div>
                  </div>

                  <!-- Validation Error -->
                  <p
                    class="mt-1 text-sm text-red-600 dark:text-red-400"
                    *ngIf="
                      editForm.get('departmentId')?.invalid &&
                      editForm.get('departmentId')?.touched
                    "
                  >
                    <span
                      *ngIf="editForm.get('departmentId')?.errors?.['required']"
                    >
                      Department selection is required
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
                      d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  {{ team.departmentName }}
                </span>
              </div>

              <!-- Desk Information (Read-only) -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Desk
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
                      d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
                    />
                  </svg>
                  {{ team.deskName }}
                </span>
              </div>

              <!-- Brand Information (Read-only) -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Brand
                </label>
                <span
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
  @ViewChild('departmentSearchInput', { static: false })
  departmentSearchInput!: ElementRef;

  private fb = inject(FormBuilder);
  private teamsService = inject(TeamsService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;
  availableDepartments: DepartmentDropdownItem[] = [];

  // Department dropdown state
  departmentSearchTerm = '';
  departmentPageIndex = 0;
  departmentPageSize = 20;
  departmentTotalCount = 0;
  departmentLoading = false;
  departmentHasNextPage = false;
  departmentDropdownOpen = false;

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
      departmentId: ['', [Validators.required]],
      departmentSearch: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.initializeSearchObservable();
    this.loadInitialDepartments();
    if (this.team) {
      this.editForm.patchValue({
        name: this.team.name,
        departmentId: this.team.departmentId,
        isActive: this.team.isActive,
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSearchObservable(): void {
    this.editForm
      .get('departmentSearch')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.departmentSearchTerm = searchTerm || '';
        this.resetDepartmentDropdown();
        this.loadDepartments();
      });
  }

  private loadInitialDepartments(): void {
    this.resetDepartmentDropdown();
    this.loadDepartments();
  }

  private resetDepartmentDropdown(): void {
    this.departmentPageIndex = 0;
    this.availableDepartments = [];
    this.departmentHasNextPage = false;
  }

  private loadDepartments(): void {
    if (this.departmentLoading) return;

    this.departmentLoading = true;
    const request = {
      brandId: null,
      pageIndex: this.departmentPageIndex,
      pageSize: this.departmentPageSize,
      sortField: 'name',
      sortDirection: 'asc',
      visibleColumns: ['array', 'null'],
      globalFilter: this.departmentSearchTerm,
      filters: null,
    };

    this.teamsService
      .getDepartmentsDropdown(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading departments:', error);
          this.alertService.error('Failed to load departments');
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 1,
            pageSize: 20,
            totalPages: 0,
          });
        })
      )
      .subscribe((response: DepartmentDropdownResponse) => {
        if (this.departmentPageIndex === 0) {
          this.availableDepartments = response.items;
        } else {
          this.availableDepartments = [
            ...this.availableDepartments,
            ...response.items,
          ];
        }

        this.departmentTotalCount = response.totalCount;
        this.departmentHasNextPage = response.pageIndex < response.totalPages;
        this.departmentLoading = false;
      });
  }

  onDepartmentDropdownScroll(event: any): void {
    const element = event.target;
    const threshold = 100;

    if (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - threshold
    ) {
      this.loadMoreDepartments();
    }
  }

  private loadMoreDepartments(): void {
    if (this.departmentHasNextPage && !this.departmentLoading) {
      this.departmentPageIndex++;
      this.loadDepartments();
    }
  }

  onDepartmentSearch(event: any): void {
    const searchTerm = event.target.value;
    this.editForm.patchValue({ departmentSearch: searchTerm });
  }

  toggleDepartmentDropdown(): void {
    this.departmentDropdownOpen = !this.departmentDropdownOpen;
  }

  selectDepartment(department: DepartmentDropdownItem): void {
    this.editForm.patchValue({ departmentId: department.id });
    this.departmentDropdownOpen = false;
  }

  getSelectedDepartmentName(): string {
    const selectedDepartmentId = this.editForm.get('departmentId')?.value;
    const selectedDepartment = this.availableDepartments.find(
      (department) => department.id === selectedDepartmentId
    );
    return selectedDepartment
      ? selectedDepartment.value
      : this.team?.departmentName || 'Select a department';
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.team) {
      this.editForm.patchValue({
        name: this.team.name,
        departmentId: this.team.departmentId,
        isActive: this.team.isActive,
      });
    }
  }

  saveTeam(): void {
    if (this.editForm.invalid || !this.team) return;

    const updateRequest: TeamUpdateRequest = {
      id: this.team.id,
      name: this.editForm.value.name.trim(),
      departmentId: this.editForm.value.departmentId,
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

        // Update the team object with new values
        this.team = {
          ...this.team,
          name: this.editForm.value.name.trim(),
          departmentId: this.editForm.value.departmentId,
          isActive: this.editForm.value.isActive,
          lastModifiedAt: new Date(),
        };

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
