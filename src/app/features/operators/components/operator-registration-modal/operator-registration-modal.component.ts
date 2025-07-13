// src/app/features/operators/components/operator-registration-modal/operator-registration-modal.component.ts

import { Component, inject, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  OperatorCreateRequest,
  BranchType,
  UserType,
  OperatorRole,
  DepartmentSearchParams,
  DepartmentSearchResponse,
  BranchDropdownItem,
  BranchDropdownResponse,
} from '../../models/operators.model';
import { OperatorsService } from '../../services/operators.service';
import { Observable, map, switchMap, of } from 'rxjs';

interface RoleDropdownItem {
  id: string;
  value: string;
}

@Component({
  selector: 'app-operator-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          New Operator
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <form [formGroup]="registrationForm" class="space-y-4">
          <!-- First Name and Last Name Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="firstName"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                First name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                formControlName="firstName"
                placeholder="First name"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('firstName')?.invalid &&
                  registrationForm.get('firstName')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('firstName')?.invalid &&
                  registrationForm.get('firstName')?.touched
                "
              >
                First name is required
              </p>
            </div>

            <div>
              <label
                for="lastName"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Last name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                formControlName="lastName"
                placeholder="Last name"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('lastName')?.invalid &&
                  registrationForm.get('lastName')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('lastName')?.invalid &&
                  registrationForm.get('lastName')?.touched
                "
              >
                Last name is required
              </p>
            </div>
          </div>

          <!-- Email and Password Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email <span class="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                formControlName="email"
                placeholder="Email"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('email')?.invalid &&
                  registrationForm.get('email')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('email')?.invalid &&
                  registrationForm.get('email')?.touched
                "
              >
                <span
                  *ngIf="registrationForm.get('email')?.errors?.['required']"
                  >Email is required</span
                >
                <span *ngIf="registrationForm.get('email')?.errors?.['email']"
                  >Please enter a valid email</span
                >
              </p>
            </div>

            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  id="password"
                  formControlName="password"
                  placeholder="Password"
                  class="w-full px-3 py-2 pr-20 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.border-red-500]="
                    registrationForm.get('password')?.invalid &&
                    registrationForm.get('password')?.touched
                  "
                />
                <div class="absolute inset-y-0 right-0 flex items-center">
                  <button
                    type="button"
                    class="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border-r border-gray-300 dark:border-gray-600"
                    (click)="generatePassword()"
                    title="Generate Password"
                  >
                    Gen
                  </button>
                  <button
                    type="button"
                    class="px-2 flex items-center"
                    (click)="togglePasswordVisibility()"
                    title="Toggle Password Visibility"
                  >
                    <svg
                      class="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        *ngIf="!showPassword"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        *ngIf="!showPassword"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                      <path
                        *ngIf="showPassword"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('password')?.invalid &&
                  registrationForm.get('password')?.touched
                "
              >
                Password is required
              </p>
            </div>
          </div>

          <!-- Phone and User Type Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="phoneNumber"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Phone
              </label>
              <input
                type="tel"
                id="phoneNumber"
                formControlName="phoneNumber"
                placeholder="Phone"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label
                for="userType"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                User Type <span class="text-red-500">*</span>
              </label>
              <select
                id="userType"
                formControlName="userType"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('userType')?.invalid &&
                  registrationForm.get('userType')?.touched
                "
              >
                <option value="">Select</option>
                <optgroup label="Administrators">
                  <option [value]="UserType.CompanyAdmin">Company Admin</option>
                  <option [value]="UserType.BrandAdmin">Brand Admin</option>
                </optgroup>
                <optgroup label="Heads of Department">
                  <option [value]="UserType.SalesHOD">Sales HOD</option>
                  <option [value]="UserType.RetentionHOD">Retention HOD</option>
                  <option [value]="UserType.SupportHOD">Support HOD</option>
                  <option [value]="UserType.PspHOD">PSP HOD</option>
                </optgroup>
                <optgroup label="Managers">
                  <option [value]="UserType.SalesManager">Sales Manager</option>
                  <option [value]="UserType.RetentionManager">
                    Retention Manager
                  </option>
                  <option [value]="UserType.SupportManager">
                    Support Manager
                  </option>
                  <option [value]="UserType.PSPManager">PSP Manager</option>
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
                  <option [value]="UserType.SupportLead">Support Lead</option>
                </optgroup>
                <optgroup label="Agents">
                  <option [value]="UserType.SalesAgent">Sales Agent</option>
                  <option [value]="UserType.RetentionAgent">
                    Retention Agent
                  </option>
                  <option [value]="UserType.SupportAgent">Support Agent</option>
                </optgroup>
                <optgroup label="Other">
                  <option [value]="UserType.AffiliateManager">
                    Affiliate Manager
                  </option>
                </optgroup>
              </select>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('userType')?.invalid &&
                  registrationForm.get('userType')?.touched
                "
              >
                User type is required
              </p>
            </div>
          </div>

          <!-- Department and Role Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="departmentId"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Department <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <!-- Custom Dropdown Button -->
                <button
                  type="button"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
                  [class.border-red-500]="
                    registrationForm.get('departmentId')?.invalid &&
                    registrationForm.get('departmentId')?.touched
                  "
                  (click)="toggleDepartmentDropdown()"
                >
                  <span class="truncate">{{ getSelectedDepartmentName() }}</span>
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
                  <div class="p-3 border-b border-gray-200 dark:border-gray-700">
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
                      <div>{{ department.value }}</div>
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
                      *ngIf="!departmentLoading && availableDepartments.length === 0"
                      class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No departments found
                    </div>
                  </div>
                </div>
              </div>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('departmentId')?.invalid &&
                  registrationForm.get('departmentId')?.touched
                "
              >
                Department is required
              </p>
            </div>

            <div>
              <label
                for="roleId"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Role <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <!-- Custom Dropdown Button -->
                <button
                  type="button"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
                  [class.border-red-500]="
                    registrationForm.get('roleId')?.invalid &&
                    registrationForm.get('roleId')?.touched
                  "
                  [disabled]="!availableRoles.length"
                  (click)="toggleRoleDropdown()"
                >
                  <span class="truncate">{{ getSelectedRoleName() }}</span>
                  <svg
                    class="w-4 h-4 ml-2 transition-transform"
                    [class.rotate-180]="roleDropdownOpen"
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
                  *ngIf="roleDropdownOpen"
                  class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
                >
                  <!-- Search Input -->
                  <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                    <input
                      #roleSearchInput
                      type="text"
                      placeholder="Search roles..."
                      class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      (input)="onRoleSearch($event)"
                      [value]="roleSearchTerm"
                    />
                  </div>

                  <!-- Roles List -->
                  <div class="max-h-48 overflow-y-auto">
                    <div
                      *ngFor="let role of getFilteredRoles()"
                      class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                      (click)="selectRole(role)"
                    >
                      <div>{{ role.value }}</div>
                    </div>

                    <!-- Loading indicator -->
                    <div
                      *ngIf="roleLoading"
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
                      *ngIf="!roleLoading && getFilteredRoles().length === 0"
                      class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No roles found
                    </div>
                  </div>
                </div>
              </div>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('roleId')?.invalid &&
                  registrationForm.get('roleId')?.touched
                "
              >
                Role is required
              </p>
            </div>
          </div>

          <!-- Branch Type and Branch Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="branchType"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Branch type <span class="text-red-500">*</span>
              </label>
              <select
                id="branchType"
                formControlName="branchType"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  registrationForm.get('branchType')?.invalid &&
                  registrationForm.get('branchType')?.touched
                "
                (change)="onBranchTypeChange($event)"
              >
                <option value="">Select</option>
                <option [value]="BranchType.Office">Office</option>
                <option [value]="BranchType.Desk">Desk</option>
                <option [value]="BranchType.Team">Team</option>
                <option [value]="BranchType.Brand">Brand</option>
              </select>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('branchType')?.invalid &&
                  registrationForm.get('branchType')?.touched
                "
              >
                Branch type is required
              </p>
            </div>

            <div>
              <label
                for="branchId"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Branch <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <!-- Custom Dropdown Button -->
                <button
                  type="button"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
                  [class.border-red-500]="
                    registrationForm.get('branchId')?.invalid &&
                    registrationForm.get('branchId')?.touched
                  "
                  [disabled]="
                    !registrationForm.get('branchType')?.value || branchLoading
                  "
                  (click)="toggleBranchDropdown()"
                >
                  <span class="truncate">{{ getSelectedBranchName() }}</span>
                  <svg
                    class="w-4 h-4 ml-2 transition-transform"
                    [class.rotate-180]="branchDropdownOpen"
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
                  *ngIf="branchDropdownOpen"
                  class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
                >
                  <!-- Search Input -->
                  <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                    <input
                      #branchSearchInput
                      type="text"
                      placeholder="Search branches..."
                      class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      (input)="onBranchSearch($event)"
                      [value]="branchSearchTerm"
                    />
                  </div>

                  <!-- Branches List -->
                  <div
                    class="max-h-28 overflow-y-auto"
                    (scroll)="onBranchDropdownScroll($event)"
                  >
                    <div
                      *ngFor="let branch of availableBranches"
                      class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                      (click)="selectBranch(branch)"
                    >
                      <div>{{ getBranchDisplayText(branch) }}</div>
                    </div>

                    <!-- Loading indicator -->
                    <div
                      *ngIf="branchLoading"
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
                      *ngIf="!branchLoading && availableBranches.length === 0"
                      class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No branches found
                    </div>
                  </div>
                </div>
              </div>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  registrationForm.get('branchId')?.invalid &&
                  registrationForm.get('branchId')?.touched
                "
              >
                Branch is required
              </p>
            </div>
          </div>
        </form>

        <!-- Note -->
        <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/5 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-400">
            <strong>Note:</strong> You will be able to set additional
            departments in operator's profile once it's created
          </p>
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3"
      >
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          (click)="onCancel()"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          (click)="onSubmit()"
          [disabled]="registrationForm.invalid || isSubmitting"
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
            {{ isSubmitting ? 'Creating...' : 'Create & open' }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class OperatorRegistrationModalComponent implements OnInit {
  @Input() modalRef!: ModalRef;

  private fb = inject(FormBuilder);
  private operatorsService = inject(OperatorsService);
  private alertService = inject(AlertService);

  isSubmitting = false;
  showPassword = false;
  loadingBranches = false;
  registrationForm: FormGroup;
  availableRoles: RoleDropdownItem[] = [];
  availableBranches: BranchDropdownItem[] = [];

  // Department dropdown properties
  departmentDropdownOpen = false;
  departmentLoading = false;
  departmentSearchTerm = '';
  availableDepartments: any[] = [];
  selectedDepartment: any = null;
  currentDepartmentPage = 0;
  departmentPageSize = 20;
  hasMoreDepartments = false;

  // Role dropdown properties
  roleDropdownOpen = false;
  roleLoading = false;
  roleSearchTerm = '';
  selectedRole: RoleDropdownItem | null = null;

  // Branch dropdown properties
  branchDropdownOpen = false;
  branchLoading = false;
  branchSearchTerm = '';
  selectedBranch: BranchDropdownItem | null = null;
  currentBranchPage = 0;
  branchPageSize = 20;
  hasMoreBranches = false;

  BranchType = BranchType;
  UserType = UserType;



  constructor() {
    this.registrationForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      phoneNumber: [''],
      departmentId: ['', Validators.required],
      roleId: ['', Validators.required],
      branchType: ['', Validators.required],
      branchId: ['', Validators.required],
      userType: ['', Validators.required],
    });
  }

  ngOnInit() {
    // Initialize component and set up form change listeners
    this.setupFormChangeListeners();
    this.loadDepartments();
  }

  private setupFormChangeListeners(): void {
    // Listen to department changes via form control value changes
    this.registrationForm
      .get('departmentId')
      ?.valueChanges.subscribe((value) => {
        console.log('Department form control changed:', value);
        this.handleDepartmentChange(value);
      });

    // Listen to branch type changes via form control value changes
    this.registrationForm.get('branchType')?.valueChanges.subscribe((value) => {
      console.log('Branch type form control changed:', value);
      this.onBranchTypeChange({ target: { value } } as any);
    });
  }

  private handleDepartmentChange(departmentId: any): void {
    console.log('Handling department change:', departmentId);

    // Clear existing roles first
    this.availableRoles = [];
    this.selectedRole = null;
    this.registrationForm.patchValue({ roleId: '' }, { emitEvent: false });

    if (departmentId) {
      this.loadRolesForDepartment(departmentId);
    }
  }

  onBranchTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const branchType = target.value;
    console.log('Handling branch type change:', branchType);

    // Reset branch selection when branch type changes
    this.registrationForm.patchValue({ branchId: '' }, { emitEvent: false });
    this.selectedBranch = null;
    this.availableBranches = [];
    this.currentBranchPage = 0;
    this.branchSearchTerm = '';

    if (branchType !== '' && branchType !== null && branchType !== undefined) {
      this.loadBranchesForType(parseInt(branchType), true);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  generatePassword(): void {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one character from each type
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');

    this.registrationForm.patchValue({ password });
    this.showPassword = true; // Show the generated password
  }



  private loadRolesForDepartment(departmentId: string): void {
    this.roleLoading = true;
    this.operatorsService.getOperatorRolesByDepartment(departmentId).subscribe({
      next: (roles: any) => {
        this.availableRoles = roles.items || [];
        this.roleLoading = false;
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.availableRoles = [];
        this.roleLoading = false;
      },
    });
  }

  private loadBranchesForType(branchType: BranchType, reset: boolean = false): void {
    if (this.branchLoading) return;

    if (reset) {
      this.currentBranchPage = 0;
      this.availableBranches = [];
    }

    this.branchLoading = true;
    let observable: Observable<BranchDropdownResponse>;

    const params = {
      pageIndex: this.currentBranchPage,
      pageSize: this.branchPageSize,
      globalFilter: this.branchSearchTerm || null,
    };

    switch (branchType) {
      case BranchType.Office:
        observable = this.operatorsService.getOfficesDropdown(params);
        break;
      case BranchType.Desk:
        observable = this.operatorsService.getDesksDropdown(params);
        break;
      case BranchType.Team:
        observable = this.operatorsService.getTeamsDropdown(params);
        break;
      case BranchType.Brand:
        observable = this.operatorsService.getBrandsDropdown(params);
        break;
      default:
        this.branchLoading = false;
        return;
    }

    observable.subscribe({
      next: (response) => {
        if (reset) {
          this.availableBranches = response.items || [];
        } else {
          this.availableBranches = [...this.availableBranches, ...(response.items || [])];
        }
        this.hasMoreBranches = response.hasNextPage;
        this.branchLoading = false;
      },
      error: (error) => {
        console.error('Error loading branches:', error);
        this.availableBranches = [];
        this.branchLoading = false;
        this.alertService.error('Failed to load branches');
      },
    });
  }

  getBranchDisplayText(branch: BranchDropdownItem): string {
    const branchType = parseInt(this.registrationForm.get('branchType')?.value);

    switch (branchType) {
      case BranchType.Brand:
        return `${branch.value}${
          branch.brandName ? ` - ${branch.brandName}` : ''
        }${branch.country ? ` (${branch.country})` : ''}`;
      case BranchType.Office:
        return `${branch.value}${
          branch.officeName ? ` - ${branch.officeName}` : ''
        }${branch.language ? ` - ${branch.language}` : ''}`;
      case BranchType.Desk:
        return `${branch.value}${
          branch.deskName ? ` - ${branch.deskName}` : ''
        }`;
      case BranchType.Team:
        return `${branch.value}${
          branch.deskName ? ` - ${branch.deskName}` : ''
        }`;
      default:
        return branch.value;
    }
  }

  onSubmit() {
    if (this.registrationForm.invalid) {
      Object.keys(this.registrationForm.controls).forEach((key) => {
        this.registrationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.registrationForm.value;

    const operatorData: OperatorCreateRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password,
      phoneNumber: formValue.phoneNumber || null,
      departmentId: formValue.departmentId,
      roleId: formValue.roleId,
      branchType: parseInt(formValue.branchType),
      branchId: formValue.branchId,
      userType: parseInt(formValue.userType),
    };

    this.operatorsService.createOperator(operatorData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.alertService.success('Operator created successfully!');
        this.modalRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error(
            'An operator with this email already exists.'
          );
        } else {
          this.alertService.error(
            'Failed to create operator. Please try again.'
          );
        }
      },
    });
  }

  onCancel() {
    this.modalRef.dismiss();
  }

  // Department dropdown methods
  toggleDepartmentDropdown(): void {
    // Close other dropdowns
    this.roleDropdownOpen = false;
    this.branchDropdownOpen = false;
    
    // Toggle department dropdown
    this.departmentDropdownOpen = !this.departmentDropdownOpen;
    
    if (this.departmentDropdownOpen && this.availableDepartments.length === 0) {
      this.loadDepartments();
    }
  }

  loadDepartments(reset: boolean = false): void {
    if (this.departmentLoading) return;

    if (reset) {
      this.currentDepartmentPage = 0;
      this.availableDepartments = [];
    }

    this.departmentLoading = true;

    const searchParams: DepartmentSearchParams = {
      pageIndex: this.currentDepartmentPage,
      pageSize: this.departmentPageSize,
    };

    this.operatorsService.getDepartmentsDropdown(searchParams).subscribe({
      next: (response) => {
        if (reset) {
          this.availableDepartments = response.items;
        } else {
          this.availableDepartments = [...this.availableDepartments, ...response.items];
        }
        this.hasMoreDepartments = response.hasNextPage;
        this.departmentLoading = false;
      },
      error: (error) => {
        this.departmentLoading = false;
        this.alertService.error('Failed to load departments');
      },
    });
  }

  onDepartmentSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.departmentSearchTerm = target.value;
    this.currentDepartmentPage = 0;
    this.loadDepartments(true);
  }

  onDepartmentDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreDepartments &&
      !this.departmentLoading
    ) {
      this.currentDepartmentPage++;
      this.loadDepartments();
    }
  }

  selectDepartment(department: any): void {
    this.selectedDepartment = department;
    this.registrationForm.patchValue({ departmentId: department.id });
    this.departmentDropdownOpen = false;
    this.handleDepartmentChange(department.id);
  }

  getSelectedDepartmentName(): string {
    if (this.selectedDepartment) {
      return this.selectedDepartment.value;
    }
    return 'Select a department...';
  }

  // Role dropdown methods
  toggleRoleDropdown(): void {
    // Close other dropdowns
    this.departmentDropdownOpen = false;
    this.branchDropdownOpen = false;
    
    // Toggle role dropdown
    this.roleDropdownOpen = !this.roleDropdownOpen;
  }

  onRoleSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.roleSearchTerm = target.value.toLowerCase();
  }

  getFilteredRoles(): RoleDropdownItem[] {
    if (!this.roleSearchTerm) {
      return this.availableRoles;
    }
    return this.availableRoles.filter(role =>
      role.value.toLowerCase().includes(this.roleSearchTerm)
    );
  }

  selectRole(role: RoleDropdownItem): void {
    this.selectedRole = role;
    this.registrationForm.patchValue({ roleId: role.id });
    this.roleDropdownOpen = false;
    this.roleSearchTerm = '';
  }

  getSelectedRoleName(): string {
    if (this.selectedRole) {
      return this.selectedRole.value;
    }
    if (this.availableRoles.length === 0) {
      return 'No roles available';
    }
    return 'Select a role...';
  }

  // Branch dropdown methods
  toggleBranchDropdown(): void {
    // Close other dropdowns
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = false;
    
    // Toggle branch dropdown
    this.branchDropdownOpen = !this.branchDropdownOpen;
    
    if (this.branchDropdownOpen && this.availableBranches.length === 0) {
      const branchType = this.registrationForm.get('branchType')?.value;
      if (branchType) {
        this.loadBranchesForType(parseInt(branchType), true);
      }
    }
  }

  onBranchSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.branchSearchTerm = target.value;
    this.currentBranchPage = 0;
    this.loadBranchesForType(parseInt(this.registrationForm.get('branchType')?.value), true);
  }

  onBranchDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreBranches &&
      !this.branchLoading
    ) {
      this.currentBranchPage++;
      this.loadBranchesForType(parseInt(this.registrationForm.get('branchType')?.value));
    }
  }

  selectBranch(branch: BranchDropdownItem): void {
    this.selectedBranch = branch;
    this.registrationForm.patchValue({ branchId: branch.id });
    this.branchDropdownOpen = false;
  }

  getSelectedBranchName(): string {
    if (this.selectedBranch) {
      return this.getBranchDisplayText(this.selectedBranch);
    }
    const branchType = this.registrationForm.get('branchType')?.value;
    if (!branchType) {
      return 'Select branch type first';
    }
    if (this.branchLoading) {
      return 'Loading...';
    }
    if (this.availableBranches.length === 0) {
      return 'No branches available';
    }
    return 'Select a branch...';
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdowns when clicking outside
    if (!(event.target as Element).closest('.relative')) {
      this.closeAllDropdowns();
    }
  }

  private closeAllDropdowns(): void {
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = false;
    this.branchDropdownOpen = false;
  }
}
