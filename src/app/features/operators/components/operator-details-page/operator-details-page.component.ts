import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, switchMap } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OperatorsService } from '../../services/operators.service';
import { UsersService } from '../../../client-details/services/user.service';
import { CountryService } from '../../../../core/services/country.service';
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
  UserProfileUpdateRequest,
  UserOrganizationAssignRequest,
  OperatorDepartmentRoleAssignRequest,
  OperatorBranch,
  OperatorDepartment,
} from '../../models/operators.model';
import { Country } from '../../../../core/models/country.model';

export enum OperatorDetailSection {
  Profile = 'profile',
  Departments = 'departments',
  Branches = 'branches',
  ActivityLog = 'activity-log',
  Settings = 'settings',
}

@Component({
  selector: 'app-operator-details-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="general-container w-full mx-auto bg-white dark:bg-gray-900">
      <!-- Header Section -->
      <div class="relative z-10 bg-white dark:bg-gray-900">
        <div class="px-6 py-4">
          <!-- Top Header -->
          <div
            class="sticky z-50 py-3 bg-white top-0 flex items-center justify-between mb-4"
          >
            <div class="flex items-center space-x-4">
              <button
                type="button"
                (click)="goBack()"
                class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  ></path>
                </svg>
                Back to Operators
              </button>
              <div class="flex items-center space-x-2">
                <div
                  class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg"
                >
                  {{ getInitials(operator.userFullName) }}
                </div>
                <div>
                  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ operator.userFullName }}
                  </h1>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Operator ID: {{ operator.id }}
                  </p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="UserTypeColors[operator.userType]"
                >
                  {{ UserTypeLabels[operator.userType] }}
                </span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-3">
              <button
                type="button"
                (click)="changePassword()"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  ></path>
                </svg>
                Change Password
              </button>
              <button
                type="button"
                (click)="refreshData()"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <!-- Operator Summary Cards -->
          <div
            class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6"
          >
            <!-- User Type -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                User Type
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ UserTypeLabels[operator.userType] }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ operator.userTypeName }}
              </div>
            </div>

            <!-- Departments -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Departments
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ operator.departments?.length || 0 }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ getDepartmentsSummary() }}
              </div>
            </div>

            <!-- Primary Role -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Primary Role
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ operator.roleName || 'Not assigned' }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ operator.departmentName }}
              </div>
            </div>

            <!-- Branches -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Branches
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ operator.branches?.length || 0 }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ getBranchesSummary() }}
              </div>
            </div>

            <!-- Primary Branch -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Primary Branch
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ operator.branchName || 'Not assigned' }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ BranchTypeLabels[operator.branchType] }}
              </div>
            </div>

            <!-- Created Date -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Created
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ operator.createdAt | date : 'short' }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                by {{ operator.createdBy }}
              </div>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="sticky top-0 z-10 bg-white">
            <div
              class="flex justify-center flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700"
            >
              <button
                *ngFor="let section of navigationSections"
                type="button"
                class="px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors"
                [ngClass]="{
                  'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20':
                    activeSection === section.key,
                  'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600':
                    activeSection !== section.key
                }"
                (click)="setActiveSection(section.key)"
              >
                <div class="flex items-center">
                  <ng-container [ngSwitch]="section.key">
                    <!-- Profile Icon -->
                    <svg
                      *ngSwitchCase="'profile'"
                      class="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      ></path>
                    </svg>
                    <!-- Departments Icon -->
                    <svg
                      *ngSwitchCase="'departments'"
                      class="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      ></path>
                    </svg>
                    <!-- Branches Icon -->
                    <svg
                      *ngSwitchCase="'branches'"
                      class="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      ></path>
                    </svg>
                    <!-- Default Icon for other sections -->
                    <svg
                      *ngSwitchDefault
                      class="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                  </ng-container>
                  {{ section.label }}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Section -->
      <div class="px-6 py-6">
        <div [ngSwitch]="activeSection">
          <!-- Profile Section -->
          <div *ngSwitchCase="'profile'" class="max-w-6xl mx-auto">
            <div class="mb-6">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Operator Profile
              </h2>
              <p class="text-gray-600 dark:text-gray-400">
                Manage operator information and assignments
              </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <!-- Personal Information Form -->
              <div
                class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div class="flex items-center justify-between mb-6">
                  <h3
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    Personal Information
                  </h3>
                  <button
                    type="button"
                    *ngIf="!isEditingProfile"
                    (click)="startEditProfile()"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg
                      class="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      ></path>
                    </svg>
                    Edit
                  </button>
                </div>

                <form [formGroup]="profileForm" class="space-y-4">
                  <!-- First Name and Last Name -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        First Name <span class="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        formControlName="firstName"
                        [readonly]="!isEditingProfile"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        [class.bg-gray-50]="!isEditingProfile"
                        [class.dark:bg-gray-800]="!isEditingProfile"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Last Name <span class="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        formControlName="lastName"
                        [readonly]="!isEditingProfile"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        [class.bg-gray-50]="!isEditingProfile"
                        [class.dark:bg-gray-800]="!isEditingProfile"
                      />
                    </div>
                  </div>

                  <!-- Email -->
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Email <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      formControlName="email"
                      [readonly]="!isEditingProfile"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      [class.bg-gray-50]="!isEditingProfile"
                      [class.dark:bg-gray-800]="!isEditingProfile"
                    />
                  </div>

                  <!-- Phone Number -->
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      formControlName="phoneNumber"
                      [readonly]="!isEditingProfile"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      [class.bg-gray-50]="!isEditingProfile"
                      [class.dark:bg-gray-800]="!isEditingProfile"
                    />
                  </div>

                  <!-- Country -->
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Country <span class="text-red-500">*</span>
                    </label>
                    <select
                      formControlName="countryCode"
                      [disabled]="!isEditingProfile"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      [class.bg-gray-50]="!isEditingProfile"
                      [class.dark:bg-gray-800]="!isEditingProfile"
                    >
                      <option value="">-- Select Country --</option>
                      <option
                        *ngFor="let country of countries$ | async"
                        [value]="country.code"
                      >
                        {{ country.name }}
                      </option>
                    </select>
                  </div>

                  <!-- User Type -->
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      User Type <span class="text-red-500">*</span>
                    </label>
                    <select
                      formControlName="userType"
                      [disabled]="!isEditingProfile"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      [class.bg-gray-50]="!isEditingProfile"
                      [class.dark:bg-gray-800]="!isEditingProfile"
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

                  <!-- Action Buttons for Profile -->
                  <div
                    *ngIf="isEditingProfile"
                    class="flex justify-end space-x-3 pt-4"
                  >
                    <button
                      type="button"
                      (click)="cancelEditProfile()"
                      class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      (click)="saveProfileInfo()"
                      [disabled]="profileForm.invalid || isSavingProfile"
                      class="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {{ isSavingProfile ? 'Saving...' : 'Save Changes' }}
                    </button>
                  </div>
                </form>
              </div>

              <!-- System Information -->
              <div
                class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-6"
                >
                  System Information
                </h3>

                <div class="space-y-4">
                  <div class="grid grid-cols-1 gap-4">
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Operator ID
                      </label>
                      <div class="flex items-center space-x-2">
                        <input
                          type="text"
                          [value]="operator.id"
                          readonly
                          class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                        />
                        <button
                          type="button"
                          (click)="copyToClipboard(operator.id)"
                          class="p-2 text-gray-400 hover:text-gray-600"
                          title="Copy Operator ID"
                        >
                          <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        User ID
                      </label>
                      <div class="flex items-center space-x-2">
                        <input
                          type="text"
                          [value]="operator.userId"
                          readonly
                          class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                        />
                        <button
                          type="button"
                          (click)="copyToClipboard(operator.userId)"
                          class="p-2 text-gray-400 hover:text-gray-600"
                          title="Copy User ID"
                        >
                          <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Created
                      </label>
                      <input
                        type="text"
                        [value]="operator.createdAt | date : 'medium'"
                        readonly
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                      />
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        by {{ operator.createdBy }}
                      </p>
                    </div>

                    <div *ngIf="operator.lastModifiedAt">
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Last Modified
                      </label>
                      <input
                        type="text"
                        [value]="operator.lastModifiedAt | date : 'medium'"
                        readonly
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                      />
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        by {{ operator.lastModifiedBy }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Departments Section -->
          <div *ngSwitchCase="'departments'" class="max-w-6xl mx-auto">
            <div class="mb-6">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Department Assignments
              </h2>
              <p class="text-gray-600 dark:text-gray-400">
                Manage operator department and role assignments
              </p>
            </div>

            <!-- Add Department Form -->
            <div
              class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6"
            >
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
              >
                Add Department
              </h3>
              <form [formGroup]="departmentForm" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Department <span class="text-red-500">*</span>
                    </label>
                    <select
                      formControlName="departmentId"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      (change)="onDepartmentChange($event.target)"
                    >
                      <option value="">-- Select --</option>
                      <option
                        *ngFor="let dept of availableDepartments"
                        [value]="dept.id"
                      >
                        {{ dept.value }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Role <span class="text-red-500">*</span>
                    </label>
                    <select
                      formControlName="roleId"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      [disabled]="!availableRoles.length"
                    >
                      <option value="">
                        {{
                          availableRoles.length
                            ? '-- Select --'
                            : '-- No items --'
                        }}
                      </option>
                      <option
                        *ngFor="let role of availableRoles"
                        [value]="role.id"
                      >
                        {{ role.value }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="flex justify-end">
                  <button
                    type="button"
                    (click)="addDepartment()"
                    [disabled]="departmentForm.invalid || isAddingDepartment"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      class="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      ></path>
                    </svg>
                    {{ isAddingDepartment ? 'Adding...' : 'Add Department' }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Departments List -->
            <div
              class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div
                class="px-6 py-4 border-b border-gray-200 dark:border-gray-700"
              >
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Assigned Departments
                </h3>
              </div>
              <div class="divide-y divide-gray-200 dark:divide-gray-700">
                <div
                  *ngFor="let dept of operator.departments"
                  class="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div>
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {{ dept.departmentName }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Role: {{ dept.roleName }}
                    </p>
                  </div>
                  <button
                    type="button"
                    (click)="removeDepartment(dept.operatorDepartmentRoleId)"
                    class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Remove Department"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
                <div
                  *ngIf="
                    !operator.departments || operator.departments.length === 0
                  "
                  class="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No departments assigned yet
                </div>
              </div>
            </div>
          </div>

          <!-- Branches Section -->
          <div *ngSwitchCase="'branches'" class="max-w-6xl mx-auto">
            <div class="mb-6">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Branch Assignments
              </h2>
              <p class="text-gray-600 dark:text-gray-400">
                Manage operator branch assignments
              </p>
            </div>

            <!-- Add Branch Form -->
            <div
              class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6"
            >
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
              >
                Add Branch
              </h3>
              <form [formGroup]="branchForm" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Branch Type <span class="text-red-500">*</span>
                    </label>
                    <select
                      formControlName="branchType"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      (change)="onBranchTypeChange()"
                    >
                      <option value="">-- Select --</option>
                      <option [value]="BranchType.Office">Office</option>
                      <option [value]="BranchType.Desk">Desk</option>
                      <option [value]="BranchType.Team">Team</option>
                      <option [value]="BranchType.Brand">Brand</option>
                    </select>
                  </div>

                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Branch <span class="text-red-500">*</span>
                    </label>
                    <select
                      formControlName="branchId"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      [disabled]="
                        !branchForm.get('branchType')?.value || loadingBranches
                      "
                    >
                      <option value="">
                        {{
                          branchForm.get('branchType')?.value
                            ? loadingBranches
                              ? 'Loading...'
                              : availableBranches.length
                              ? '-- Select --'
                              : 'No branches available'
                            : 'Select branch type first'
                        }}
                      </option>
                      <option
                        *ngFor="let branch of availableBranches"
                        [value]="branch.id"
                      >
                        {{ branch.value }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="flex justify-end">
                  <button
                    type="button"
                    (click)="addBranch()"
                    [disabled]="branchForm.invalid || isAddingBranch"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      class="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      ></path>
                    </svg>
                    {{ isAddingBranch ? 'Adding...' : 'Add Branch' }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Branches List -->
            <div
              class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div
                class="px-6 py-4 border-b border-gray-200 dark:border-gray-700"
              >
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Assigned Branches
                </h3>
              </div>
              <div class="divide-y divide-gray-200 dark:divide-gray-700">
                <div
                  *ngFor="let branch of operator.branches"
                  class="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div>
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Type: {{ branch.type }}
                    </p>
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Branch: {{ branch.name }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      ID: {{ branch.id }}
                    </p>
                  </div>
                  <button
                    type="button"
                    (click)="removeBranch(branch.id)"
                    class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Remove Branch"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
                <div
                  *ngIf="!operator.branches || operator.branches.length === 0"
                  class="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No branches assigned yet
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .sticky {
        position: -webkit-sticky;
        position: sticky;
      }
    `,
  ],
})
export class OperatorDetailsPageComponent implements OnInit, OnDestroy {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private operatorsService = inject(OperatorsService);
  private userService = inject(UsersService);
  private countryService = inject(CountryService);

  private destroy$ = new Subject<void>();

  activeSection: OperatorDetailSection = OperatorDetailSection.Profile;
  operator!: Operator;
  operatorId!: string;

  // Form properties
  profileForm: FormGroup;
  departmentForm: FormGroup;
  branchForm: FormGroup;
  isEditingProfile = false;
  isSavingProfile = false;
  isAddingDepartment = false;
  isAddingBranch = false;
  loadingBranches = false;

  // Data properties
  countries$ = this.countryService.getCountries();
  availableDepartments: any[] = [];
  availableRoles: OperatorRole[] = [];
  availableBranches: any[] = [];

  // Constants
  BranchType = BranchType;
  BranchTypeLabels = BranchTypeLabels;
  BranchTypeColors = BranchTypeColors;
  UserType = UserType;
  UserTypeLabels = UserTypeLabels;
  UserTypeColors = UserTypeColors;

  navigationSections = [
    { key: OperatorDetailSection.Profile, label: 'Profile' },
    { key: OperatorDetailSection.Departments, label: 'Departments' },
    { key: OperatorDetailSection.Branches, label: 'Branches' },
  ];

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      countryCode: ['', Validators.required],
      userType: ['', Validators.required],
    });

    this.departmentForm = this.fb.group({
      departmentId: ['', Validators.required],
      roleId: ['', Validators.required],
    });

    this.branchForm = this.fb.group({
      branchType: ['', Validators.required],
      branchId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const operatorId = this.activatedRoute.snapshot.paramMap.get('id');

    if (!operatorId) {
      this.router.navigate(['/operators']);
      return;
    }

    this.operatorId = operatorId;
    this.loadOperatorDetails();
    this.loadDepartments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOperatorDetails(): void {
    this.operatorsService
      .getOperatorById(this.operatorId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading operator details:', error);
          this.alertService.error('Failed to load operator details');
          this.router.navigate(['/operators']);
          return of(null);
        })
      )
      .subscribe((operator) => {
        if (operator) {
          this.operator = operator;
          this.initializeForms();
          console.log('Operator loaded:', this.operator);
        }
      });
  }

  private initializeForms(): void {
    if (this.operator) {
      // Parse full name into first and last name
      const names = this.operator.userFullName.split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      this.profileForm.patchValue({
        firstName: firstName,
        lastName: lastName,
        email: this.operator.userEmail,
        phoneNumber: '', // Will be loaded separately if needed
        countryCode: '', // Will be loaded separately if needed
        userType: this.operator.userType,
      });

      // Load user details for phone and country
      this.loadUserDetails();
    }
  }

  private loadUserDetails(): void {
    // Load email
    this.userService.getEmail(this.operator.userId).subscribe(
      (email) => {
        this.profileForm.patchValue({ email: email.email });
      },
      (error) => {
        console.error('Error loading email:', error);
      }
    );

    // Load phone
    this.userService.getPhone(this.operator.userId).subscribe(
      (phone) => {
        this.profileForm.patchValue({ phoneNumber: phone.phoneNumber });
      },
      (error) => {
        console.error('Error loading phone:', error);
      }
    );

    // TODO: Load country when endpoint is available
    // For now, defaulting to empty
  }

  private loadDepartments(): void {
    this.operatorsService.getDepartmentsDropdown({ pageSize: 100 }).subscribe(
      (response) => {
        this.availableDepartments = response.items;
      },
      (error) => {
        console.error('Error loading departments:', error);
      }
    );
  }

  setActiveSection(section: OperatorDetailSection): void {
    this.activeSection = section;
  }

  getInitials(fullName: string): string {
    const names = fullName.split(' ');
    return names.length >= 2
      ? `${names[0].charAt(0)}${names[names.length - 1].charAt(
          0
        )}`.toUpperCase()
      : fullName.substring(0, 2).toUpperCase();
  }

  getDepartmentsSummary(): string {
    const count = this.operator.departments?.length || 0;
    if (count === 0) return 'No departments';
    if (count === 1) return '1 department';
    return `${count} departments`;
  }

  getBranchesSummary(): string {
    const count = this.operator.branches?.length || 0;
    if (count === 0) return 'No branches';
    if (count === 1) return '1 branch';
    return `${count} branches`;
  }

  getRoleName(operatorDepartmentRoleId: string): string {
    // TODO: Implement role name lookup
    return 'Role';
  }

  goBack(): void {
    this.router.navigate(['/operators']);
  }

  changePassword(): void {
    this.alertService.info('Change password functionality coming soon');
  }

  refreshData(): void {
    this.loadOperatorDetails();
    this.alertService.success('Data refreshed successfully');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.alertService.success('Copied to clipboard');
    });
  }

  // Profile editing methods
  startEditProfile(): void {
    this.isEditingProfile = true;
  }

  cancelEditProfile(): void {
    this.isEditingProfile = false;
    this.initializeForms();
  }

  saveProfileInfo(): void {
    if (this.profileForm.valid) {
      this.isSavingProfile = true;

      // Update user profile
      const profileRequest: UserProfileUpdateRequest = {
        firstName: this.profileForm.value.firstName,
        lastName: this.profileForm.value.lastName,
        email: this.profileForm.value.email,
        phoneNumber: this.profileForm.value.phoneNumber || '',
        countryCode: this.profileForm.value.countryCode,
      };

      this.operatorsService
        .updateUserProfile(this.operator.userId, profileRequest)
        .pipe(
          switchMap(() => {
            // Update operator user type if changed
            if (this.profileForm.value.userType !== this.operator.userType) {
              const updateRequest: OperatorUpdateRequest = {
                id: this.operator.id,
                userType: this.profileForm.value.userType,
              };
              return this.operatorsService.updateOperator(updateRequest);
            }
            return of(null);
          }),
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to update profile');
            console.error('Error updating profile:', error);
            this.isSavingProfile = false;
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result) {
            this.alertService.success('Profile updated successfully');
            this.isEditingProfile = false;
            this.isSavingProfile = false;
            this.loadOperatorDetails(); // Refresh data
          }
        });
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }

  onDepartmentChange(departmentId: any): void {
    this.availableRoles = [];
    this.departmentForm.patchValue({ roleId: '' });

    if (departmentId.value) {
      this.operatorsService
        .getOperatorRolesByDepartment(departmentId.value)
        .subscribe({
          next: (roles: any) => {
            this.availableRoles = roles.items;
          },
          error: (error) => {
            console.error('Error loading roles:', error);
            this.availableRoles = [];
          },
        });
    }
  }

  addDepartment(): void {
    if (this.departmentForm.valid) {
      this.isAddingDepartment = true;

      const request: OperatorDepartmentRoleAssignRequest = {
        operatorId: this.operator.id,
        operatorRoleId: this.departmentForm.value.roleId,
      };

      this.operatorsService
        .assignOperatorDepartmentRole(request)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to add department');
            console.error('Error adding department:', error);
            this.isAddingDepartment = false;
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result) {
            this.alertService.success('Department added successfully');
            this.isAddingDepartment = false;
            this.departmentForm.reset();
            this.loadOperatorDetails(); // Refresh data
          }
        });
    }
  }

  removeDepartment(operatorDepartmentRoleId: string): void {
    // TODO: Need to implement this based on the API
    this.alertService.info('Remove department functionality coming soon');
  }

  // Branch management methods
  onBranchTypeChange(): void {
    const branchType = this.branchForm.get('branchType')?.value;
    this.branchForm.patchValue({ branchId: '' });
    this.availableBranches = [];

    if (branchType !== '' && branchType !== null && branchType !== undefined) {
      this.loadBranchesForType(parseInt(branchType));
    }
  }

  private loadBranchesForType(branchType: BranchType): void {
    this.loadingBranches = true;
    let observable;

    switch (branchType) {
      case BranchType.Office:
        observable = this.operatorsService.getOfficesDropdown();
        break;
      case BranchType.Desk:
        observable = this.operatorsService.getDesksDropdown();
        break;
      case BranchType.Team:
        observable = this.operatorsService.getTeamsDropdown();
        break;
      case BranchType.Brand:
        observable = this.operatorsService.getBrandsDropdown();
        break;
      default:
        this.loadingBranches = false;
        return;
    }

    observable.subscribe({
      next: (response) => {
        this.availableBranches = response.items || [];
        this.loadingBranches = false;
      },
      error: (error) => {
        console.error('Error loading branches:', error);
        this.availableBranches = [];
        this.loadingBranches = false;
        this.alertService.error('Failed to load branches');
      },
    });
  }

  addBranch(): void {
    if (this.branchForm.valid) {
      this.isAddingBranch = true;

      const request: UserOrganizationAssignRequest = {
        userId: this.operator.userId,
        level: parseInt(this.branchForm.value.branchType),
        entityId: this.branchForm.value.branchId,
      };

      this.operatorsService
        .assignUserOrganization(request)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to add branch');
            console.error('Error adding branch:', error);
            this.isAddingBranch = false;
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result) {
            this.alertService.success('Branch added successfully');
            this.isAddingBranch = false;
            this.branchForm.reset();
            this.loadOperatorDetails(); // Refresh data
          }
        });
    }
  }

  removeBranch(branchId: string): void {
    this.operatorsService.removeUserOrganization(branchId).subscribe();
    // TODO: Need to implement this based on the API
    // this.alertService.info('Remove branch functionality coming soon');
  }
}
