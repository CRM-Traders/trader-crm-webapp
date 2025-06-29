// src/app/features/operators/components/operator-details-page/operator-details-page.component.ts

import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OperatorsService } from '../../services/operators.service';
import { UsersService } from '../../../client-details/services/user.service';
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

export enum OperatorDetailSection {
  Profile = 'profile',
  Permissions = 'permissions',
  ActivityLog = 'activity-log',
  Departments = 'departments',
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
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="BranchTypeColors[operator.branchType]"
                >
                  {{ BranchTypeLabels[operator.branchType] }}
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

            <!-- Department -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Department
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ operator.departmentName || 'Not assigned' }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                ID: {{ operator.departmentId }}
              </div>
            </div>

            <!-- Role -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Role
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ operator.roleName || 'Not assigned' }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                ID: {{ operator.roleId }}
              </div>
            </div>

            <!-- Branch Type -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Branch Type
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ BranchTypeLabels[operator.branchType] }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ operator.branchTypeName }}
              </div>
            </div>

            <!-- Branch -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Branch
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ operator.branchName || 'Not assigned' }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                ID: {{ operator.branchId }}
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

          <!-- Personal Information & System Details -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- Personal Information -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3
                class="text-sm font-semibold text-gray-900 dark:text-white mb-3"
              >
                Personal Information
              </h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400"
                    >Full Name:</span
                  >
                  <span class="text-gray-900 dark:text-white">{{
                    operator.userFullName
                  }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-500 dark:text-gray-400">Email:</span>
                  <div class="flex items-center">
                    <span class="text-gray-900 dark:text-white mr-2 break-all">
                      <span
                        *ngIf="emailLoading"
                        class="inline-flex items-center"
                      >
                        <div
                          class="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-1"
                        ></div>
                        Loading...
                      </span>
                      <span *ngIf="!emailLoading">
                        {{
                          showEmail
                            ? operatorEmail
                            : emailFetched
                            ? maskEmail(operatorEmail)
                            : 'Hidden'
                        }}
                      </span>
                    </span>
                    <button
                      class="text-gray-400 hover:text-gray-600 transition-colors"
                      (click)="toggleEmailVisibility()"
                      [disabled]="emailLoading"
                      [title]="
                        showEmail ? 'Hide email address' : 'Show email address'
                      "
                    >
                      <svg
                        *ngIf="!showEmail"
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        ></path>
                      </svg>
                      <svg
                        *ngIf="showEmail"
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-500 dark:text-gray-400">Phone:</span>
                  <div class="flex items-center">
                    <span class="text-gray-900 dark:text-white mr-2">
                      <span
                        *ngIf="phoneLoading"
                        class="inline-flex items-center"
                      >
                        <div
                          class="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-1"
                        ></div>
                        Loading...
                      </span>
                      <span *ngIf="!phoneLoading">
                        {{
                          showPhone
                            ? operatorPhone || 'Not provided'
                            : phoneFetched
                            ? maskPhone(operatorPhone)
                            : 'Hidden'
                        }}
                      </span>
                    </span>
                    <button
                      class="text-gray-400 hover:text-gray-600 transition-colors"
                      (click)="togglePhoneVisibility()"
                      [disabled]="phoneLoading"
                      [title]="
                        showPhone ? 'Hide phone number' : 'Show phone number'
                      "
                    >
                      <svg
                        *ngIf="!showPhone"
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        ></path>
                      </svg>
                      <svg
                        *ngIf="showPhone"
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-500 dark:text-gray-400">User ID:</span>
                  <div class="flex items-center">
                    <span
                      class="text-gray-900 dark:text-white mr-2 font-mono"
                      >{{ operator.userId }}</span
                    >
                    <button
                      class="text-gray-400 hover:text-gray-600"
                      (click)="copyToClipboard(operator.userId)"
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
              </div>
            </div>

            <!-- Hierarchy Information -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3
                class="text-sm font-semibold text-gray-900 dark:text-white mb-3"
              >
                Hierarchy Information
              </h3>
              <div class="space-y-3 text-sm">
                <div>
                  <div class="text-gray-500 dark:text-gray-400 mb-1">
                    Department
                  </div>
                  <div class="text-gray-900 dark:text-white">
                    {{ operator.departmentName || 'Not assigned' }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    ID: {{ operator.departmentId }}
                  </div>
                </div>
                <div>
                  <div class="text-gray-500 dark:text-gray-400 mb-1">Role</div>
                  <div class="text-gray-900 dark:text-white">
                    {{ operator.roleName || 'Not assigned' }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    ID: {{ operator.roleId }}
                  </div>
                </div>
                <div>
                  <div class="text-gray-500 dark:text-gray-400 mb-1">
                    Branch
                  </div>
                  <div class="text-gray-900 dark:text-white">
                    {{ operator.branchName || 'Not assigned' }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Type: {{ BranchTypeLabels[operator.branchType] }} | ID:
                    {{ operator.branchId }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Audit Information -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3
                class="text-sm font-semibold text-gray-900 dark:text-white mb-3"
              >
                Audit Information
              </h3>
              <div class="space-y-3 text-sm">
                <div>
                  <div class="text-gray-500 dark:text-gray-400 mb-1">
                    Created
                  </div>
                  <div class="text-gray-900 dark:text-white">
                    {{ operator.createdAt | date : 'medium' }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    by {{ operator.createdBy }}
                  </div>
                </div>
                <div *ngIf="operator.lastModifiedAt">
                  <div class="text-gray-500 dark:text-gray-400 mb-1">
                    Last Modified
                  </div>
                  <div class="text-gray-900 dark:text-white">
                    {{ operator.lastModifiedAt | date : 'medium' }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    by {{ operator.lastModifiedBy }}
                  </div>
                </div>
                <div *ngIf="!operator.lastModifiedAt">
                  <div class="text-gray-500 dark:text-gray-400 mb-1">
                    Last Modified
                  </div>
                  <div class="text-gray-900 dark:text-white">
                    Never modified
                  </div>
                </div>
              </div>
            </div>
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
                <!-- Permissions Icon -->
                <svg
                  *ngSwitchCase="'permissions'"
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  ></path>
                </svg>
                <!-- Activity Log Icon -->
                <svg
                  *ngSwitchCase="'activity-log'"
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
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
              <!-- Operator Information Form -->
              <div
                class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div class="flex items-center justify-between mb-6">
                  <h3
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    Operator Information
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

                <form [formGroup]="profileForm" class="space-y-6">
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

                  <!-- Department -->
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Department
                    </label>
                    <input
                      type="text"
                      [value]="operator.departmentName || 'Not assigned'"
                      readonly
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  <!-- Role -->
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Role
                    </label>
                    <input
                      type="text"
                      [value]="operator.roleName || 'Not assigned'"
                      readonly
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  <!-- Branch Type -->
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Branch Type
                    </label>
                    <select
                      formControlName="branchType"
                      [disabled]="!isEditingProfile"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      [class.bg-gray-50]="!isEditingProfile"
                      [class.dark:bg-gray-800]="!isEditingProfile"
                    >
                      <option [value]="BranchType.Office">Office</option>
                      <option [value]="BranchType.Desk">Desk</option>
                      <option [value]="BranchType.Team">Team</option>
                      <option [value]="BranchType.Brand">Brand</option>
                    </select>
                  </div>

                  <!-- Branch -->
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Branch
                    </label>
                    <input
                      type="text"
                      formControlName="branchId"
                      [readonly]="!isEditingProfile"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      [class.bg-gray-50]="!isEditingProfile"
                      [class.dark:bg-gray-800]="!isEditingProfile"
                    />
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
                      class="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    >
                      Save Changes
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
                        Department ID
                      </label>
                      <input
                        type="text"
                        [value]="operator.departmentId"
                        readonly
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Role ID
                      </label>
                      <input
                        type="text"
                        [value]="operator.roleId"
                        readonly
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Branch ID
                      </label>
                      <input
                        type="text"
                        [value]="operator.branchId"
                        readonly
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Permissions Section -->
          <!-- <div *ngSwitchCase="'permissions'">
            <div class="max-w-6xl mx-auto">
              <div class="text-center py-12">
                <svg
                  class="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  ></path>
                </svg>
                <h3
                  class="mt-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Permissions Management
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manage operator permissions and access rights.
                </p>
                <div class="mt-6">
                  <button
                    type="button"
                    (click)="managePermissions()"
                    class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg
                      class="-ml-1 mr-2 h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      ></path>
                    </svg>
                    Manage Permissions
                  </button>
                </div>
              </div>
            </div>
          </div> -->

          <!-- Activity Log Section -->
          <!-- <div *ngSwitchCase="'activity-log'">
            <div class="max-w-6xl mx-auto">
              <div class="text-center py-12">
                <svg
                  class="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <h3
                  class="mt-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Activity Log
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  View operator activity history and login records.
                </p>
                <div class="mt-6">
                  <button
                    type="button"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div> -->

          <!-- Departments Section -->
          <div *ngSwitchCase="'departments'">
            <div class="max-w-6xl mx-auto">
              <div class="text-center py-12">
                <svg
                  class="mx-auto h-12 w-12 text-gray-400"
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
                <h3
                  class="mt-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Department Management
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manage operator department assignments and roles.
                </p>
                <div class="mt-6">
                  <button
                    type="button"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Settings Section -->
          <!-- <div *ngSwitchCase="'settings'">
            <div class="max-w-6xl mx-auto">
              <div class="text-center py-12">
                <svg
                  class="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  ></path>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                </svg>
                <h3
                  class="mt-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Operator Settings
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Configure operator preferences and settings.
                </p>
                <div class="mt-6">
                  <button
                    type="button"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div> -->
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

  private destroy$ = new Subject<void>();

  activeSection: OperatorDetailSection = OperatorDetailSection.Profile;
  operator!: Operator;
  operatorId!: string;

  // Visibility properties for email and phone
  showEmail = false;
  showPhone = false;
  emailLoading = false;
  phoneLoading = false;
  emailFetched = false;
  phoneFetched = false;
  operatorEmail = '';
  operatorPhone = '';

  // Form properties
  profileForm: FormGroup;
  isEditingProfile = false;

  // Constants
  BranchType = BranchType;
  BranchTypeLabels = BranchTypeLabels;
  BranchTypeColors = BranchTypeColors;
  UserType = UserType;
  UserTypeLabels = UserTypeLabels;
  UserTypeColors = UserTypeColors;

  navigationSections = [
    { key: OperatorDetailSection.Profile, label: 'Profile' },
    //{ key: OperatorDetailSection.Permissions, label: 'Permissions' },
    //{ key: OperatorDetailSection.ActivityLog, label: 'Activity Log' },
    { key: OperatorDetailSection.Departments, label: 'Departments' },
    //{ key: OperatorDetailSection.Settings, label: 'Settings' },
  ];

  constructor() {
    this.profileForm = this.fb.group({
      userType: ['', Validators.required],
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
          this.operatorEmail = operator.userEmail;
          this.initializeForms();
          console.log('Operator loaded:', this.operator);
        }
      });
  }

  private initializeForms(): void {
    if (this.operator) {
      this.profileForm.patchValue({
        userType: this.operator.userType,
        branchType: this.operator.branchType,
        branchId: this.operator.branchId,
      });
    }
  }

  // Email visibility methods
  toggleEmailVisibility(): void {
    if (!this.showEmail && !this.emailFetched) {
      // Fetch email when showing for the first time
      this.emailLoading = true;
      this.userService.getEmail(this.operator.userId).subscribe(
        (email) => {
          this.operatorEmail = email.email;
          this.emailFetched = true;
          this.emailLoading = false;
          this.showEmail = true;
          console.log('Operator email loaded:', this.operatorEmail);
        },
        (error) => {
          console.error('Error loading operator email:', error);
          this.emailLoading = false;
          this.showEmail = true;
        }
      );
    } else {
      this.showEmail = !this.showEmail;
    }
  }

  maskEmail(email: string | undefined): string {
    if (!email) return 'Not provided';
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';

    const username = parts[0];
    const domain = parts[1];

    const maskedUsername =
      username.length > 4
        ? username.substring(0, 2) + '*'.repeat(username.length - 2)
        : username.substring(0, 1) + '*'.repeat(username.length - 1);

    const domainParts = domain.split('.');
    const maskedDomain = domainParts
      .map((part, index) =>
        index === domainParts.length - 1 ? part : '*'.repeat(part.length)
      )
      .join('.');

    return `${maskedUsername}@${maskedDomain}`;
  }

  // Phone visibility methods
  togglePhoneVisibility(): void {
    if (!this.showPhone && !this.phoneFetched) {
      this.phoneLoading = true;
      this.userService.getPhone(this.operator.userId).subscribe(
        (phone) => {
          this.operatorPhone = phone.phoneNumber;
          this.phoneFetched = true;
          this.phoneLoading = false;
          this.showPhone = true;
          console.log('Operator phone loaded:', this.operatorPhone);
        },
        (error) => {
          console.error('Error loading operator phone:', error);
          this.phoneLoading = false;
          this.showPhone = true;
        }
      );
    } else {
      this.showPhone = !this.showPhone;
    }
  }

  maskPhone(phone: string | undefined): string {
    if (!phone) return 'Not provided';

    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 4) {
      return '*'.repeat(phone.length);
    }

    const lastFour = cleanPhone.slice(-4);
    const maskedPart = '*'.repeat(cleanPhone.length - 4);

    if (phone.includes('-') || phone.includes(' ') || phone.includes('(')) {
      return phone.replace(/\d(?=.*\d{4})/g, '*');
    }

    return maskedPart + lastFour;
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

  goBack(): void {
    this.router.navigate(['/operators']);
  }

  changePassword(): void {
    this.alertService.info('Change password functionality coming soon');
  }

  managePermissions(): void {
    this.alertService.info('Permissions management functionality coming soon');
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
      const updateRequest: OperatorUpdateRequest = {
        id: this.operator.id,
        userType: this.profileForm.value.userType,
        branchType: this.profileForm.value.branchType,
        branchId: this.profileForm.value.branchId,
      };

      this.operatorsService
        .updateOperator(updateRequest)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to update operator profile');
            console.error('Error updating operator:', error);
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result !== null) {
            this.alertService.success('Operator profile updated successfully');
            this.isEditingProfile = false;
            this.loadOperatorDetails(); // Refresh data
          }
        });
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }
}
