// src/app/features/departments/components/department-creation-modal/department-creation-modal.component.ts

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
import {
  DepartmentCreateRequest,
  DepartmentCreateResponse,
} from '../../models/department.model';
import { DepartmentsService } from '../../services/departments.service';

interface DeskDropdownItem {
  id: string;
  value: string;
  brandName: string;
  language: string | null;
  type: number;
}

interface DeskDropdownResponse {
  items: DeskDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

@Component({
  selector: 'app-department-creation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Create New Department
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <form [formGroup]="departmentForm" class="space-y-6">
          <!-- Desk Selection -->
          <div class="relative">
            <label
              for="deskId"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Desk <span class="text-red-500">*</span>
            </label>

            <!-- Custom Dropdown Button -->
            <button
              type="button"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
              [class.border-red-500]="
                departmentForm.get('deskId')?.invalid &&
                departmentForm.get('deskId')?.touched
              "
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

            <!-- Dropdown Panel -->
            <div
              *ngIf="deskDropdownOpen"
              class="absolute !z-[99] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
            >
              <!-- Search Input -->
              <div class="p-3 border-b border-gray-200 dark:border-gray-700">
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
                  class="px-3 py-2 hover:bg-gray-100/30 dark:hover:bg-gray-700/30 cursor-pointer text-sm text-gray-900 dark:text-white"
                  (click)="selectDesk(desk)"
                >
                  <div class="flex flex-col">
                    <span class="font-medium">{{ desk.value }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      Brand: {{ desk.brandName }} | Type:
                      {{ getTypeLabel(desk.type) }}
                    </span>
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
                departmentForm.get('deskId')?.invalid &&
                departmentForm.get('deskId')?.touched
              "
            >
              <span *ngIf="departmentForm.get('deskId')?.errors?.['required']">
                Desk selection is required
              </span>
            </p>
          </div>

          <!-- Department Name -->
          <div>
            <label
              for="name"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Department Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              formControlName="name"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                departmentForm.get('name')?.invalid &&
                departmentForm.get('name')?.touched
              "
              [class.focus:ring-red-500]="
                departmentForm.get('name')?.invalid &&
                departmentForm.get('name')?.touched
              "
              placeholder="Enter department name"
            />
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                departmentForm.get('name')?.invalid &&
                departmentForm.get('name')?.touched
              "
            >
              <span *ngIf="departmentForm.get('name')?.errors?.['required']">
                Department name is required
              </span>
              <span *ngIf="departmentForm.get('name')?.errors?.['minlength']">
                Department name must be at least 2 characters long
              </span>
              <span *ngIf="departmentForm.get('name')?.errors?.['maxlength']">
                Department name cannot exceed 100 characters
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
                Active Department
              </label>
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Active departments are available for use across the system
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
          [disabled]="departmentForm.invalid || isSubmitting"
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
            {{ isSubmitting ? 'Creating...' : 'Create Department' }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class DepartmentCreationModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @ViewChild('deskSearchInput', { static: false })
  deskSearchInput!: ElementRef;

  private fb = inject(FormBuilder);
  private departmentsService = inject(DepartmentsService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  departmentForm: FormGroup;
  availableDesks: DeskDropdownItem[] = [];

  // Desk dropdown state
  deskSearchTerm = '';
  deskPageIndex = 0;
  deskPageSize = 20;
  deskTotalCount = 0;
  deskLoading = false;
  deskHasNextPage = false;
  deskDropdownOpen = false;

  private readonly deskTypes = [
    { value: 0, label: 'Sales' },
    { value: 1, label: 'Retention' },
  ];

  constructor() {
    this.departmentForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      deskId: ['', [Validators.required]],
      deskSearch: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.initializeSearchObservable();
    this.loadInitialDesks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSearchObservable(): void {
    this.departmentForm
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

  private loadInitialDesks(): void {
    this.resetDeskDropdown();
    this.loadDesks();
  }

  private resetDeskDropdown(): void {
    this.deskPageIndex = 0;
    this.availableDesks = [];
    this.deskHasNextPage = false;
  }

  private loadDesks(): void {
    if (this.deskLoading) return;

    this.deskLoading = true;
    const request = {
      brandId: null,
      pageIndex: this.deskPageIndex,
      pageSize: this.deskPageSize,
      sortField: 'name',
      sortDirection: 'asc',
      visibleColumns: ['array', 'null'],
      globalFilter: this.deskSearchTerm,
      filters: null,
    };

    this.departmentsService
      .getDesksDropdown(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading desks:', error);
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
        } else {
          this.availableDesks = [...this.availableDesks, ...response.items];
        }

        this.deskTotalCount = response.totalCount;
        this.deskHasNextPage = response.pageIndex < response.totalPages;
        this.deskLoading = false;
      });
  }

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
    this.departmentForm.patchValue({ deskSearch: searchTerm });
  }

  toggleDeskDropdown(): void {
    this.deskDropdownOpen = !this.deskDropdownOpen;
  }

  selectDesk(desk: DeskDropdownItem): void {
    this.departmentForm.patchValue({ deskId: desk.id });
    this.deskDropdownOpen = false;
  }

  getSelectedDeskName(): string {
    const selectedDeskId = this.departmentForm.get('deskId')?.value;
    const selectedDesk = this.availableDesks.find(
      (desk) => desk.id === selectedDeskId
    );
    return selectedDesk ? selectedDesk.value : 'Select a desk';
  }

  getTypeLabel(type: number): string {
    const typeInfo = this.deskTypes.find((t) => t.value === type);
    return typeInfo ? typeInfo.label : `Type ${type}`;
  }

  onSubmit(): void {
    if (this.departmentForm.invalid) {
      Object.keys(this.departmentForm.controls).forEach((key) => {
        this.departmentForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.departmentForm.value;

    const departmentData: DepartmentCreateRequest = {
      name: formValue.name.trim(),
      deskId: formValue.deskId,
      isActive: formValue.isActive,
    };

    this.departmentsService
      .createDepartment(departmentData)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          if (error.status === 400) {
            this.alertService.error(
              'Invalid data provided. Please check your inputs.'
            );
          } else if (error.status === 409) {
            this.alertService.error(
              'A department with this name already exists.'
            );
          } else {
            this.alertService.error(
              'Failed to create department. Please try again.'
            );
          }
          return of(null);
        })
      )
      .subscribe((response: DepartmentCreateResponse | null) => {
        this.isSubmitting = false;
        if (response) {
          this.alertService.success('Department created successfully!');
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
