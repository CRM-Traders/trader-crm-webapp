// src/app/features/operators/components/operator-details-modal/operator-details-modal.component.ts

import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { OperatorsService } from '../../services/operators.service';
import {
  Operator,
  OperatorUpdateRequest,
  BranchType,
  BranchTypeLabels,
  BranchTypeColors,
  UserType,
  UserTypeLabels,
  UserTypeColors,
  OperatorRole,
} from '../../models/operators.model';

@Component({
  selector: 'app-operator-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full max-w-5xl mx-auto">
      <!-- Modal Header -->
      <div
        class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            Operator Details - {{ operator.userFullName }}
          </h2>
        </div>
      </div>

      <!-- Modal Body -->
      <div
        class="px-6 py-6 bg-white dark:bg-gray-900 max-h-[80vh] overflow-y-auto"
      >
        <div class="grid grid-cols-12 gap-6">
          <!-- Operator Information Section (1/3 width) -->
          <div class="col-span-12 lg:col-span-4">
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 h-fit">
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
              >
                Operator Information
              </h3>

              <form [formGroup]="editForm" class="space-y-4">
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Full Name
                  </label>
                  <span
                    class="text-sm text-gray-900 dark:text-white font-medium"
                  >
                    {{ operator.userFullName }}
                  </span>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email
                  </label>
                  <a
                    [href]="'mailto:' + operator.userEmail"
                    class="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {{ operator.userEmail }}
                  </a>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    User ID
                  </label>
                  <span
                    class="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
                  >
                    {{ operator.userId }}
                  </span>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Department
                  </label>
                  <div *ngIf="isEditing">
                    <select
                      formControlName="departmentId"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      (change)="onDepartmentChange()"
                    >
                      <option value="">Select Department</option>
                      <!-- Department options would be loaded here -->
                    </select>
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="text-sm text-gray-900 dark:text-white"
                  >
                    {{ operator.departmentName || '-' }}
                  </span>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Role
                  </label>
                  <div *ngIf="isEditing">
                    <select
                      formControlName="roleId"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      [disabled]="!availableRoles.length"
                    >
                      <option value="">
                        {{
                          availableRoles.length
                            ? 'Select Role'
                            : 'Select department first'
                        }}
                      </option>
                      <option
                        *ngFor="let role of availableRoles"
                        [value]="role.roleId"
                      >
                        {{ role.name }}
                      </option>
                    </select>
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="text-sm text-gray-900 dark:text-white"
                  >
                    {{ operator.roleName || '-' }}
                  </span>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Branch Type
                  </label>
                  <div *ngIf="isEditing">
                    <select
                      formControlName="branchType"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option [value]="BranchType.Office">Office</option>
                      <option [value]="BranchType.Desk">Desk</option>
                      <option [value]="BranchType.Team">Team</option>
                      <option [value]="BranchType.Brand">Brand</option>
                    </select>
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="BranchTypeColors[operator.branchType]"
                  >
                    {{ BranchTypeLabels[operator.branchType] }}
                  </span>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Branch
                  </label>
                  <div *ngIf="isEditing">
                    <input
                      type="text"
                      formControlName="branchId"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="text-sm text-gray-900 dark:text-white"
                  >
                    {{ operator.branchName || '-' }}
                  </span>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    User Type
                  </label>
                  <div *ngIf="isEditing">
                    <select
                      formControlName="userType"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <optgroup label="Administrators">
                        <option [value]="UserType.CompanyAdmin">
                          Company Admin
                        </option>
                        <option [value]="UserType.BrandAdmin">
                          Brand Admin
                        </option>
                      </optgroup>
                      <optgroup label="Heads of Department">
                        <option [value]="UserType.SalesHOD">Sales HOD</option>
                        <option [value]="UserType.RetentionHOD">
                          Retention HOD
                        </option>
                        <option [value]="UserType.SupportHOD">
                          Support HOD
                        </option>
                        <option [value]="UserType.PspHOD">PSP HOD</option>
                      </optgroup>
                      <optgroup label="Managers">
                        <option [value]="UserType.SalesManager">
                          Sales Manager
                        </option>
                        <option [value]="UserType.RetentionManager">
                          Retention Manager
                        </option>
                        <option [value]="UserType.SupportManager">
                          Support Manager
                        </option>
                        <option [value]="UserType.PSPManager">
                          PSP Manager
                        </option>
                        <option [value]="UserType.BOManager">BO Manager</option>
                        <option [value]="UserType.ComplianceManager">
                          Compliance Manager
                        </option>
                        <option [value]="UserType.OperationsManager">
                          Operations Manager
                        </option>
                        <option [value]="UserType.DealingManager">
                          Dealing Manager
                        </option>
                      </optgroup>
                      <optgroup label="Team Leads">
                        <option [value]="UserType.SalesLead">Sales Lead</option>
                        <option [value]="UserType.RetentionLead">
                          Retention Lead
                        </option>
                        <option [value]="UserType.SupportLead">
                          Support Lead
                        </option>
                      </optgroup>
                      <optgroup label="Agents">
                        <option [value]="UserType.SalesAgent">
                          Sales Agent
                        </option>
                        <option [value]="UserType.RetentionAgent">
                          Retention Agent
                        </option>
                        <option [value]="UserType.SupportAgent">
                          Support Agent
                        </option>
                      </optgroup>
                      <optgroup label="Other">
                        <option [value]="UserType.AffiliateManager">
                          Affiliate Manager
                        </option>
                      </optgroup>
                    </select>
                  </div>
                  <span
                    *ngIf="!isEditing"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="UserTypeColors[operator.userType]"
                  >
                    {{ UserTypeLabels[operator.userType] }}
                  </span>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Created
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ operator.createdAt | date : 'medium' }}
                  </span>
                  <br />
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    by {{ operator.createdBy }}
                  </span>
                </div>

                <div *ngIf="operator.lastModifiedAt">
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Last Modified
                  </label>
                  <span class="text-sm text-gray-900 dark:text-white">
                    {{ operator.lastModifiedAt | date : 'medium' }}
                  </span>
                  <br />
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    by {{ operator.lastModifiedBy }}
                  </span>
                </div>
              </form>

              <!-- Edit Actions -->
              <div class="mt-6 space-y-2">
                <button
                  *ngIf="!isEditing"
                  type="button"
                  class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  (click)="startEdit()"
                >
                  Edit Details
                </button>
                <div *ngIf="isEditing" class="space-y-2">
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                    [disabled]="editForm.invalid || loading"
                    (click)="saveOperator()"
                  >
                    {{ loading ? 'Saving...' : 'Save Changes' }}
                  </button>
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                    (click)="cancelEdit()"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content Section (2/3 width) -->
          <div class="col-span-12 lg:col-span-8">
            <!-- Action Buttons -->
            <div
              class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6"
            >
              <button
                type="button"
                class="group relative p-3 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                <div class="flex flex-col items-center gap-2">
                  <div
                    class="p-2 bg-white dark:bg-gray-800 rounded-lg group-hover:shadow-sm transition-shadow"
                  >
                    <svg
                      class="h-4 w-4 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </div>
                  <span
                    class="text-xs font-medium text-blue-700 dark:text-blue-300 text-center leading-tight"
                    >Change Password</span
                  >
                </div>
              </button>

              <button
                type="button"
                class="group relative p-3 bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
              >
                <div class="flex flex-col items-center gap-2">
                  <div
                    class="p-2 bg-white dark:bg-gray-800 rounded-lg group-hover:shadow-sm transition-shadow"
                  >
                    <svg
                      class="h-4 w-4 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <span
                    class="text-xs font-medium text-green-700 dark:text-green-300 text-center leading-tight"
                    >Permissions</span
                  >
                </div>
              </button>

              <button
                type="button"
                class="group relative p-3 bg-orange-50 dark:bg-orange-950 hover:bg-orange-100 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
              >
                <div class="flex flex-col items-center gap-2">
                  <div
                    class="p-2 bg-white dark:bg-gray-800 rounded-lg group-hover:shadow-sm transition-shadow"
                  >
                    <svg
                      class="h-4 w-4 text-orange-600 dark:text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <span
                    class="text-xs font-medium text-orange-700 dark:text-orange-300 text-center leading-tight"
                    >Activity Log</span
                  >
                </div>
              </button>

              <button
                type="button"
                class="group relative p-3 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
              >
                <div class="flex flex-col items-center gap-2">
                  <div
                    class="p-2 bg-white dark:bg-gray-800 rounded-lg group-hover:shadow-sm transition-shadow"
                  >
                    <svg
                      class="h-4 w-4 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <span
                    class="text-xs font-medium text-purple-700 dark:text-purple-300 text-center leading-tight"
                    >Departments</span
                  >
                </div>
              </button>
            </div>

            <!-- Additional Information Section -->
            <div
              class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h4
                class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
              >
                Additional Information
              </h4>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5
                    class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    System Information
                  </h5>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400"
                        >Operator ID:</span
                      >
                      <span
                        class="text-sm text-gray-900 dark:text-white font-mono"
                        >{{ operator.id }}</span
                      >
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400"
                        >User ID:</span
                      >
                      <span
                        class="text-sm text-gray-900 dark:text-white font-mono"
                        >{{ operator.userId }}</span
                      >
                    </div>
                  </div>
                </div>

                <div>
                  <h5
                    class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Assignment Details
                  </h5>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400"
                        >Department ID:</span
                      >
                      <span
                        class="text-sm text-gray-900 dark:text-white font-mono"
                        >{{ operator.departmentId }}</span
                      >
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400"
                        >Role ID:</span
                      >
                      <span
                        class="text-sm text-gray-900 dark:text-white font-mono"
                        >{{ operator.roleId }}</span
                      >
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400"
                        >Branch ID:</span
                      >
                      <span
                        class="text-sm text-gray-900 dark:text-white font-mono"
                        >{{ operator.branchId }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end"
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
export class OperatorDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() operator!: Operator;

  private fb = inject(FormBuilder);
  private operatorsService = inject(OperatorsService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;
  availableRoles: OperatorRole[] = [];

  // Constants
  BranchType = BranchType;
  BranchTypeLabels = BranchTypeLabels;
  BranchTypeColors = BranchTypeColors;
  UserType = UserType;
  UserTypeLabels = UserTypeLabels;
  UserTypeColors = UserTypeColors;

  constructor() {
    this.editForm = this.fb.group({
      departmentId: [''],
      roleId: [''],
      branchType: [BranchType.Office],
      branchId: [''],
      userType: [''],
    });
  }

  ngOnInit(): void {
    if (this.operator) {
      this.editForm.patchValue({
        departmentId: this.operator.departmentId,
        roleId: this.operator.roleId,
        branchType: this.operator.branchType,
        branchId: this.operator.branchId,
        userType: this.operator.userType,
      });

      // Load roles for the current department
      if (this.operator.departmentId) {
        this.loadRolesForDepartment(this.operator.departmentId);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.operator) {
      this.editForm.patchValue({
        departmentId: this.operator.departmentId,
        roleId: this.operator.roleId,
        branchType: this.operator.branchType,
        branchId: this.operator.branchId,
        userType: this.operator.userType,
      });
    }
  }

  onDepartmentChange(): void {
    const departmentId = this.editForm.get('departmentId')?.value;
    if (departmentId) {
      this.loadRolesForDepartment(departmentId);
    } else {
      this.availableRoles = [];
      this.editForm.patchValue({ roleId: '' });
    }
  }

  private loadRolesForDepartment(departmentId: string): void {
    this.operatorsService.getOperatorRolesByDepartment(departmentId).subscribe({
      next: (roles) => {
        this.availableRoles = roles;
        // If editing and current role is not in the new list, reset it
        const currentRoleId = this.editForm.get('roleId')?.value;
        if (currentRoleId && !roles.find((r) => r.roleId === currentRoleId)) {
          this.editForm.patchValue({ roleId: '' });
        }
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.availableRoles = [];
        this.editForm.patchValue({ roleId: '' });
      },
    });
  }

  saveOperator(): void {
    if (this.editForm.invalid || !this.operator) return;

    const updateRequest: OperatorUpdateRequest = {
      id: this.operator.id,
      departmentId: this.editForm.value.departmentId,
      roleId: this.editForm.value.roleId,
      branchType: this.editForm.value.branchType,
      branchId: this.editForm.value.branchId,
      userType: this.editForm.value.userType,
    };

    this.loading = true;
    this.operatorsService
      .updateOperator(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update operator');
          console.error('Error updating operator:', error);
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Operator updated successfully');
          this.isEditing = false;

          // Update the operator object with new values
          this.operator = {
            ...this.operator,
            departmentId: this.editForm.value.departmentId,
            roleId: this.editForm.value.roleId,
            branchType: this.editForm.value.branchType,
            branchId: this.editForm.value.branchId,
            userType: this.editForm.value.userType,
            lastModifiedAt: new Date().toISOString(),
          };
        }
      });
  }

  onClose(): void {
    this.modalRef.close();
  }
}
