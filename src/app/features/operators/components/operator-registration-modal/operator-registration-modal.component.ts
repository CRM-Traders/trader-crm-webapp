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
          <div>
            <label
              for="username"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Username <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="username"
              formControlName="username"
              placeholder="Username"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                registrationForm.get('username')?.invalid &&
                registrationForm.get('username')?.touched
              "
            />
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                registrationForm.get('username')?.invalid &&
                registrationForm.get('username')?.touched
              "
            >
              Username is required
            </p>
          </div>

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
              <div class="relative">
                <!-- Custom Dropdown Button -->
                <button
                  type="button"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex justify-between items-center"
                  [class.border-red-500]="
                    registrationForm.get('userType')?.invalid &&
                    registrationForm.get('userType')?.touched
                  "
                  (click)="toggleUserTypeDropdown()"
                  (keydown)="onUserTypeButtonKeydown($event)"
                >
                  <span class="truncate">{{ getSelectedUserTypeName() }}</span>
                  <svg
                    class="w-4 h-4 ml-2 transition-transform"
                    [class.rotate-180]="userTypeDropdownOpen"
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
                  *ngIf="userTypeDropdownOpen"
                  class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
                >
                  <!-- Search Input -->
                  <div
                    class="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
                    <input
                      #userTypeSearchInput
                      type="text"
                      placeholder="Search user types..."
                      class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      (input)="onUserTypeSearch($event)"
                      [value]="userTypeSearchTerm"
                    />
                  </div>

                  <!-- User Types List -->
                  <div class="max-h-48 overflow-y-auto">
                    <div
                      *ngFor="let group of getFilteredUserTypeGroups()"
                      class="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <!-- Group Header -->
                      <div
                        class="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                      >
                        {{ group.group }}
                      </div>

                      <!-- Group Options -->
                      <div
                        *ngFor="let option of group.options; let i = index"
                        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-400/30 cursor-pointer text-sm text-gray-900 dark:text-white"
                        [class.bg-blue-100]="isUserTypeFocused(getUserTypeGlobalIndex(group, i))"
                        [class.dark:bg-blue-400]="isUserTypeFocused(getUserTypeGlobalIndex(group, i))"
                        (click)="selectUserType(option)"
                     >
                        <div>{{ option.value }}</div>
                      </div>
                    </div>

                    <!-- No results -->
                    <div
                      *ngIf="getFilteredUserTypeGroups().length === 0"
                      class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      <span *ngIf="userTypeSearchTerm"
                        >No user types match your search</span
                      >
                      <span *ngIf="!userTypeSearchTerm"
                        >No user types found</span
                      >
                    </div>
                  </div>
                </div>
              </div>
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
                  (keydown)="onDepartmentButtonKeydown($event)"
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
                      *ngFor="let department of getFilteredDepartments(); let i = index"
                      class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-400/30 cursor-pointer text-sm text-gray-900 dark:text-white"
                      [class.bg-blue-100]="isDepartmentFocused(i)"
                      [class.dark:bg-blue-400]="isDepartmentFocused(i)"
                      [tabindex]="0"
                      (click)="selectDepartment(department)"
                      (keydown)="onDepartmentKeydown($event, department, i)"
                      (mouseenter)="setFocusedDepartmentIndex(i)"
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
                      *ngIf="
                        !departmentLoading &&
                        getFilteredDepartments().length === 0
                      "
                      class="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      <span *ngIf="departmentSearchTerm"
                        >No departments match your search</span
                      >
                      <span *ngIf="!departmentSearchTerm"
                        >No departments found</span
                      >
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
                  (keydown)="onRoleButtonKeydown($event)"
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
                  <div
                    class="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
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
                      *ngFor="let role of getFilteredRoles(); let i = index"
                      class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-400/30 cursor-pointer text-sm text-gray-900 dark:text-white"
                      [class.bg-blue-100]="isRoleFocused(i)"
                      [class.dark:bg-blue-400]="isRoleFocused(i)"
                      [tabindex]="0"
                      (click)="selectRole(role)"
                      (keydown)="onRoleKeydown($event, role, i)"
                      (mouseenter)="setFocusedRoleIndex(i)"
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
                  (keydown)="onBranchButtonKeydown($event)"
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
                  <div
                    class="p-3 border-b border-gray-200 dark:border-gray-700"
                  >
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
                      *ngFor="let branch of availableBranches; let i = index"
                      class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-400/30 cursor-pointer text-sm text-gray-900 dark:text-white"
                      [class.bg-blue-100]="isBranchFocused(i)"
                      [class.dark:bg-blue-400]="isBranchFocused(i)"
                      [tabindex]="0"
                      (click)="selectBranch(branch)"
                      (keydown)="onBranchKeydown($event, branch, i)"
                      (mouseenter)="setFocusedBranchIndex(i)"
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
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-400/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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

  departmentDropdownOpen = false;
  departmentLoading = false;
  departmentSearchTerm = '';
  availableDepartments: any[] = [];
  selectedDepartment: any = null;
  currentDepartmentPage = 0;
  departmentPageSize = 20;
  hasMoreDepartments = false;

  roleDropdownOpen = false;
  roleLoading = false;
  roleSearchTerm = '';
  selectedRole: RoleDropdownItem | null = null;

  branchDropdownOpen = false;
  branchLoading = false;
  branchSearchTerm = '';
  selectedBranch: BranchDropdownItem | null = null;
  currentBranchPage = 0;
  branchPageSize = 20;
  hasMoreBranches = false;

  userTypeDropdownOpen = false;
  userTypeSearchTerm = '';
  selectedUserType: { id: number; value: string; group: string } | null = null;

  // Keyboard navigation properties
  focusedUserTypeIndex = -1;
  focusedDepartmentIndex = -1;
  focusedRoleIndex = -1;
  focusedBranchIndex = -1;

  BranchType = BranchType;
  UserType = UserType;

  userTypeOptions = [
    {
      group: 'Heads of Department',
      options: [
        {
          id: UserType.SalesHOD,
          value: 'Sales HOD',
          group: 'Heads of Department',
        },
        {
          id: UserType.RetentionHOD,
          value: 'Retention HOD',
          group: 'Heads of Department',
        },
        {
          id: UserType.SupportHOD,
          value: 'Support HOD',
          group: 'Heads of Department',
        },
        { id: UserType.PspHOD, value: 'PSP HOD', group: 'Heads of Department' },
      ],
    },
    {
      group: 'Agents',
      options: [
        { id: UserType.SalesAgent, value: 'Sales Agent', group: 'Agents' },
        {
          id: UserType.RetentionAgent,
          value: 'Retention Agent',
          group: 'Agents',
        },
        { id: UserType.SupportAgent, value: 'Support Agent', group: 'Agents' },
      ],
    },
    {
      group: 'Administrators',
      options: [
        {
          id: UserType.CompanyAdmin,
          value: 'Company Admin',
          group: 'Administrators',
        },
        {
          id: UserType.BrandAdmin,
          value: 'Brand Admin',
          group: 'Administrators',
        },
      ],
    },

    {
      group: 'Managers',
      options: [
        {
          id: UserType.SalesManager,
          value: 'Sales Manager',
          group: 'Managers',
        },
        {
          id: UserType.RetentionManager,
          value: 'Retention Manager',
          group: 'Managers',
        },
        {
          id: UserType.SupportManager,
          value: 'Support Manager',
          group: 'Managers',
        },
        { id: UserType.PSPManager, value: 'PSP Manager', group: 'Managers' },
        { id: UserType.BOManager, value: 'BO Manager', group: 'Managers' },
        {
          id: UserType.ComplianceManager,
          value: 'Compliance Manager',
          group: 'Managers',
        },
        {
          id: UserType.OperationsManager,
          value: 'Operations Manager',
          group: 'Managers',
        },
        {
          id: UserType.DealingManager,
          value: 'Dealing Manager',
          group: 'Managers',
        },
      ],
    },
    {
      group: 'Team Leads',
      options: [
        { id: UserType.SalesLead, value: 'Sales Lead', group: 'Team Leads' },
        {
          id: UserType.RetentionLead,
          value: 'Retention Lead',
          group: 'Team Leads',
        },
        {
          id: UserType.SupportLead,
          value: 'Support Lead',
          group: 'Team Leads',
        },
      ],
    },

    {
      group: 'Other',
      options: [
        {
          id: UserType.AffiliateManager,
          value: 'Affiliate Manager',
          group: 'Other',
        },
      ],
    },
  ];

  constructor() {
    this.registrationForm = this.fb.group({
      username: ['', Validators.required],
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
    this.setupFormChangeListeners();
    this.loadDepartments();
  }

  private setupFormChangeListeners(): void {
    this.registrationForm
      .get('departmentId')
      ?.valueChanges.subscribe((value) => {
        this.handleDepartmentChange(value);
      });

    this.registrationForm.get('branchType')?.valueChanges.subscribe((value) => {
      this.onBranchTypeChange({ target: { value } } as any);
    });
  }

  private handleDepartmentChange(departmentId: any): void {
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
        this.availableRoles = [];
        this.roleLoading = false;
      },
    });
  }

  private loadBranchesForType(
    branchType: BranchType,
    reset: boolean = false
  ): void {
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
          this.availableBranches = [
            ...this.availableBranches,
            ...(response.items || []),
          ];
        }
        this.hasMoreBranches = response.hasNextPage;
        this.branchLoading = false;
      },
      error: (error) => {
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
        return `${branch.value}${branch.brandName ? ` - ${branch.brandName}` : ''
          }${branch.country ? ` (${branch.country})` : ''}`;
      case BranchType.Office:
        return `${branch.value}${branch.officeName ? ` - ${branch.officeName}` : ''
          }${branch.language ? ` - ${branch.language}` : ''}`;
      case BranchType.Desk:
        return `${branch.value}${branch.deskName ? ` - ${branch.deskName}` : ''
          }`;
      case BranchType.Team:
        return `${branch.value}${branch.deskName ? ` - ${branch.deskName}` : ''
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
      username: formValue.username,
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

    if (this.departmentDropdownOpen) {
      if (this.availableDepartments.length === 0) {
        this.loadDepartments();
      } else {
        // Reset search when opening dropdown
        this.departmentSearchTerm = '';
      }
      this.focusedDepartmentIndex = 0; // Start with first item focused
    }
  }

  loadDepartments(reset: boolean = false): void {
    if (this.departmentLoading) return;

    if (reset) {
      this.currentDepartmentPage = 0;
      this.availableDepartments = [];
    }

    this.departmentLoading = true;

    // Create request body with search parameters
    const requestBody = {
      pageIndex: this.currentDepartmentPage,
      pageSize: this.departmentPageSize,
      globalFilter: this.departmentSearchTerm || null,
    };

    this.operatorsService.getDepartmentsDropdown(requestBody).subscribe({
      next: (response) => {
        const sortedDepartments = response.items.sort((a: any, b: any) => {
          if (a.value.toLowerCase() === 'sales') return -1;
          if (b.value.toLowerCase() === 'sales') return 1;
          return a.value.localeCompare(b.value);
        });

        if (reset) {
          this.availableDepartments = sortedDepartments;
        } else {
          this.availableDepartments = [
            ...this.availableDepartments,
            ...sortedDepartments,
          ];
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
    this.departmentSearchTerm = '';
    this.handleDepartmentChange(department.id);
  }

  getSelectedDepartmentName(): string {
    if (this.selectedDepartment) {
      return this.selectedDepartment.value;
    }
    return 'Select a department...';
  }

  getFilteredDepartments(): any[] {
    return this.availableDepartments;
  }

  // Role dropdown methods
  toggleRoleDropdown(): void {
    // Close other dropdowns
    this.departmentDropdownOpen = false;
    this.branchDropdownOpen = false;

    // Toggle role dropdown
    this.roleDropdownOpen = !this.roleDropdownOpen;

    if (this.roleDropdownOpen) {
      // Reset search when opening dropdown
      this.roleSearchTerm = '';
      this.focusedRoleIndex = 0; // Start with first item focused
    }
  }

  onRoleSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.roleSearchTerm = target.value.toLowerCase();
  }

  getFilteredRoles(): RoleDropdownItem[] {
    if (!this.roleSearchTerm) {
      return this.availableRoles;
    }
    return this.availableRoles.filter((role) =>
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
    if (!this.selectedDepartment) {
      return 'Select a department first';
    }
    if (this.availableRoles.length === 0) {
      return 'No roles available for this department';
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

    if (this.branchDropdownOpen) {
      const branchType = this.registrationForm.get('branchType')?.value;
      if (branchType) {
        if (this.availableBranches.length === 0) {
          this.loadBranchesForType(parseInt(branchType), true);
        } else {
          // Reset search when opening dropdown
          this.branchSearchTerm = '';
        }
      }
      this.focusedBranchIndex = 0; // Start with first item focused
    }
  }

  onBranchSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.branchSearchTerm = target.value;
    this.currentBranchPage = 0;

    // Reload branches with search term
    this.availableBranches = [];
    this.loadBranchesForType(
      parseInt(this.registrationForm.get('branchType')?.value),
      true
    );
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
      this.loadBranchesForType(
        parseInt(this.registrationForm.get('branchType')?.value)
      );
    }
  }

  selectBranch(branch: BranchDropdownItem): void {
    this.selectedBranch = branch;
    this.registrationForm.patchValue({ branchId: branch.id });
    this.branchDropdownOpen = false;
    this.branchSearchTerm = '';
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
      return 'Loading branches...';
    }
    if (this.availableBranches.length === 0) {
      return 'No branches available for this type';
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
    this.userTypeDropdownOpen = false;
    
    // Reset focus indices
    this.focusedDepartmentIndex = -1;
    this.focusedRoleIndex = -1;
    this.focusedBranchIndex = -1;
    this.focusedUserTypeIndex = -1;
  }

  // User Type dropdown methods
  toggleUserTypeDropdown(): void {
    // Close other dropdowns
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = false;
    this.branchDropdownOpen = false;

    // Toggle user type dropdown
    this.userTypeDropdownOpen = !this.userTypeDropdownOpen;

    if (this.userTypeDropdownOpen) {
      // Reset search when opening dropdown
      this.userTypeSearchTerm = '';
      this.focusedUserTypeIndex = 0; // Start with first item focused
    }
  }

  selectUserType(userType: { id: number; value: string; group: string }): void {
    this.selectedUserType = userType;
    this.registrationForm.patchValue({ userType: userType.id });
    this.userTypeDropdownOpen = false;
    this.userTypeSearchTerm = '';
  }

  getSelectedUserTypeName(): string {
    if (this.selectedUserType) {
      return this.selectedUserType.value;
    }
    return 'Select a user type...';
  }

  onUserTypeSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.userTypeSearchTerm = target.value.toLowerCase();
  }

  getFilteredUserTypeGroups(): any[] {
    if (!this.userTypeSearchTerm) {
      return this.userTypeOptions;
    }

    return this.userTypeOptions
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (option) =>
            option.value.toLowerCase().includes(this.userTypeSearchTerm) ||
            option.group.toLowerCase().includes(this.userTypeSearchTerm)
        ),
      }))
      .filter((group) => group.options.length > 0);
  }

  // Keyboard navigation methods for User Type dropdown
  isUserTypeFocused(index: number): boolean {
    return this.focusedUserTypeIndex === index;
  }

  setFocusedUserTypeIndex(index: number): void {
    this.focusedUserTypeIndex = index;
  }

  onUserTypeKeydown(event: KeyboardEvent, option: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectUserType(option);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextUserType();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousUserType();
        break;
      case 'Escape':
        this.userTypeDropdownOpen = false;
        break;
    }
  }

  private focusNextUserType(): void {
    const allOptions = this.getAllUserTypeOptions();
    if (this.focusedUserTypeIndex < allOptions.length - 1) {
      this.focusedUserTypeIndex++;
      this.scrollToFocusedUserType();
    }
  }

  private focusPreviousUserType(): void {
    if (this.focusedUserTypeIndex > 0) {
      this.focusedUserTypeIndex--;
      this.scrollToFocusedUserType();
    }
  }

  private scrollToFocusedUserType(): void {
    // This will be implemented if needed for better UX
    // For now, the browser's default focus behavior should handle scrolling
  }

  private getAllUserTypeOptions(): any[] {
    return this.getFilteredUserTypeGroups().flatMap(group => group.options);
  }

  getUserTypeGlobalIndex(group: any, localIndex: number): number {
    const groups = this.getFilteredUserTypeGroups();
    let globalIndex = 0;
    
    for (const g of groups) {
      if (g === group) {
        return globalIndex + localIndex;
      }
      globalIndex += g.options.length;
    }
    
    return globalIndex;
  }

  getUserTypeOptionByGlobalIndex(globalIndex: number): any {
    const allOptions = this.getAllUserTypeOptions();
    return allOptions[globalIndex];
  }

  // Keyboard navigation methods for Department dropdown
  isDepartmentFocused(index: number): boolean {
    return this.focusedDepartmentIndex === index;
  }

  setFocusedDepartmentIndex(index: number): void {
    this.focusedDepartmentIndex = index;
  }

  onDepartmentKeydown(event: KeyboardEvent, department: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDepartment(department);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextDepartment();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousDepartment();
        break;
      case 'Escape':
        this.departmentDropdownOpen = false;
        break;
    }
  }

  private focusNextDepartment(): void {
    const departments = this.getFilteredDepartments();
    if (this.focusedDepartmentIndex < departments.length - 1) {
      this.focusedDepartmentIndex++;
    }
  }

  private focusPreviousDepartment(): void {
    if (this.focusedDepartmentIndex > 0) {
      this.focusedDepartmentIndex--;
    }
  }

  // Keyboard navigation methods for Role dropdown
  isRoleFocused(index: number): boolean {
    return this.focusedRoleIndex === index;
  }

  setFocusedRoleIndex(index: number): void {
    this.focusedRoleIndex = index;
  }

  onRoleKeydown(event: KeyboardEvent, role: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectRole(role);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextRole();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousRole();
        break;
      case 'Escape':
        this.roleDropdownOpen = false;
        break;
    }
  }

  private focusNextRole(): void {
    const roles = this.getFilteredRoles();
    if (this.focusedRoleIndex < roles.length - 1) {
      this.focusedRoleIndex++;
    }
  }

  private focusPreviousRole(): void {
    if (this.focusedRoleIndex > 0) {
      this.focusedRoleIndex--;
    }
  }

  // Keyboard navigation methods for Branch dropdown
  isBranchFocused(index: number): boolean {
    return this.focusedBranchIndex === index;
  }

  setFocusedBranchIndex(index: number): void {
    this.focusedBranchIndex = index;
  }

  onBranchKeydown(event: KeyboardEvent, branch: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectBranch(branch);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextBranch();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousBranch();
        break;
      case 'Escape':
        this.branchDropdownOpen = false;
        break;
    }
  }

  private focusNextBranch(): void {
    if (this.focusedBranchIndex < this.availableBranches.length - 1) {
      this.focusedBranchIndex++;
    }
  }

  private focusPreviousBranch(): void {
    if (this.focusedBranchIndex > 0) {
      this.focusedBranchIndex--;
    }
  }

  // Button keydown handlers for opening dropdowns
  onUserTypeButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.userTypeDropdownOpen) {
          this.toggleUserTypeDropdown();
        }
        break;
    }
  }

  onDepartmentButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.departmentDropdownOpen) {
          this.toggleDepartmentDropdown();
        }
        break;
    }
  }

  onRoleButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.roleDropdownOpen) {
          this.toggleRoleDropdown();
        }
        break;
    }
  }

  onBranchButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.branchDropdownOpen) {
          this.toggleBranchDropdown();
        }
        break;
    }
  }
}
