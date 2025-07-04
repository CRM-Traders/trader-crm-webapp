// src/app/features/sales-rules/components/sales-rule-form-modal/sales-rule-form-modal.component.ts

import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { SalesRulesService } from '../../services/sales-rules.service';
import {
  CreateSalesRuleRequest,
  SalesRuleDetails,
  RuleCategory,
  RulePriority,
  RuleType,
  RuleCategoryLabels,
  RulePriorityLabels,
  RuleTypeLabels,
} from '../../models/sales-rules.model';

@Component({
  selector: 'app-sales-rule-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="w-full max-w-4xl mx-auto">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ rule ? 'Edit Sales Rule' : 'Create New Sales Rule' }}
            </h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {{ rule ? 'Modify the sales rule settings below' : 'Configure your new sales rule with targeting options' }}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
              {{ rule ? 'Edit Mode' : 'Create Mode' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        <form [formGroup]="ruleForm" class="space-y-8">
          
          <!-- Basic Information Card -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center mb-4">
              <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h5 class="text-lg font-semibold text-gray-900 dark:text-white">
                Basic Information
              </h5>
            </div>

            <!-- Rule Name -->
            <div class="mb-6">
              <label
                for="ruleName"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Rule Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ruleName"
                formControlName="ruleName"
                class="w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                [class.border-red-500]="
                  ruleForm.get('ruleName')?.invalid &&
                  ruleForm.get('ruleName')?.touched
                "
                [class.ring-red-500]="
                  ruleForm.get('ruleName')?.invalid &&
                  ruleForm.get('ruleName')?.touched
                "
                placeholder="Enter a descriptive name for your rule"
              />
              <div
                class="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center"
                *ngIf="
                  ruleForm.get('ruleName')?.invalid &&
                  ruleForm.get('ruleName')?.touched
                "
              >
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                Rule name is required
              </div>
            </div>

            <!-- Priority and Type Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Priority -->
              <div>
                <label
                  for="priority"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Rule Priority <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <select
                    id="priority"
                    formControlName="priority"
                    class="w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                    [class.border-red-500]="
                      ruleForm.get('priority')?.invalid &&
                      ruleForm.get('priority')?.touched
                    "
                  >
                    <option value="" disabled>Select priority level</option>
                    <option
                      *ngFor="let priority of priorities"
                      [value]="priority.value"
                    >
                      {{ priority.label }}
                    </option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
                <div
                  class="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center"
                  *ngIf="
                    ruleForm.get('priority')?.invalid &&
                    ruleForm.get('priority')?.touched
                  "
                >
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  Priority is required
                </div>
              </div>

              <!-- Type -->
              <div>
                <label
                  for="type"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Rule Type <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <select
                    id="type"
                    formControlName="type"
                    class="w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                    [class.border-red-500]="
                      ruleForm.get('type')?.invalid &&
                      ruleForm.get('type')?.touched
                    "
                  >
                    <option value="" disabled>Select rule type</option>
                    <option *ngFor="let type of types" [value]="type.value">
                      {{ type.label }}
                    </option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
                <div
                  class="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center"
                  *ngIf="
                    ruleForm.get('type')?.invalid &&
                    ruleForm.get('type')?.touched
                  "
                >
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  Type is required
                </div>
              </div>
            </div>
          </div>

          <!-- Targeting Settings Card -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
                  <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <div>
                  <h5 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Targeting Settings
                  </h5>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Define who this rule applies to
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                (click)="clearAllTargeting()"
              >
                Clear All
              </button>
            </div>

            <div class="space-y-6">
              <!-- Country Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Countries
                </label>
                <div class="space-y-3">
                  <div class="relative">
                    <input
                      type="text"
                      placeholder="Search countries..."
                      class="w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      [(ngModel)]="countrySearchTerm"
                      (input)="onCountrySearchInput($event)"
                      (focus)="showCountryDropdown = true"
                    />
                    <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Selected Countries -->
                  <div *ngIf="selectedCountries.length > 0" class="flex flex-wrap gap-2">
                    <span
                      *ngFor="let country of selectedCountries"
                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                    >
                      {{ country.name }}
                      <button
                        type="button"
                        class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none"
                        (click)="removeCountry(country)"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </span>
                  </div>
                  
                  <!-- Country Options -->
                  <div *ngIf="showCountryDropdown" class="border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 shadow-lg max-h-48 overflow-y-auto">
                    <button
                      *ngFor="let country of filteredCountries"
                      type="button"
                      class="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                      (click)="selectCountry(country)"
                    >
                      <span class="text-sm text-gray-900 dark:text-white">{{ country.name }}</span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">{{ country.code }}</span>
                    </button>
                  </div>
                  
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    <span class="inline-flex items-center mr-2">
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                      </svg>
                      {{ selectedCountries.length === 0 ? 'All countries' : selectedCountries.length + ' selected' }}
                    </span>
                  </p>
                </div>
              </div>

              <!-- Language Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Languages
                </label>
                <div class="space-y-3">
                  <div class="relative">
                    <input
                      type="text"
                      placeholder="Search languages..."
                      class="w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      [(ngModel)]="languageSearchTerm"
                      (input)="onLanguageSearchInput($event)"
                      (focus)="showLanguageDropdown = true"
                    />
                    <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Selected Languages -->
                  <div *ngIf="selectedLanguages.length > 0" class="flex flex-wrap gap-2">
                    <span
                      *ngFor="let language of selectedLanguages"
                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                    >
                      {{ language.value }}
                      <button
                        type="button"
                        class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-600 focus:outline-none"
                        (click)="removeLanguage(language)"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </span>
                  </div>
                  
                  <!-- Language Options -->
                  <div *ngIf="showLanguageDropdown" class="border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 shadow-lg max-h-48 overflow-y-auto">
                    <button
                      *ngFor="let language of filteredLanguages"
                      type="button"
                      class="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                      (click)="selectLanguage(language)"
                    >
                      <span class="text-sm text-gray-900 dark:text-white">{{ language.value }}</span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">{{ language.key }}</span>
                    </button>
                  </div>
                  
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    <span class="inline-flex items-center mr-2">
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                      </svg>
                      {{ selectedLanguages.length === 0 ? 'All languages' : selectedLanguages.length + ' selected' }}
                    </span>
                  </p>
                </div>
              </div>

              <!-- Source Input -->
              <div>
                <label
                  for="sources"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Source
                </label>
                <input
                  type="text"
                  id="sources"
                  formControlName="sources"
                  class="w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter source (e.g., Google, Facebook, Direct)"
                />
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Leave empty to target all sources
                </p>
              </div>
            </div>
          </div>

          <!-- Operators Section (for edit mode) -->
          <div
            *ngIf="rule && rule.operators && rule.operators.length > 0"
            class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center mb-4">
              <div class="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
              <div>
                <h5 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Assigned Operators
                </h5>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ rule.operators.length }} operator(s) assigned
                </p>
              </div>
            </div>
            
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-4">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <p class="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Operators can be managed after saving or from the rule details view.
                </p>
              </div>
            </div>
            
            <div class="space-y-3">
              <div
                *ngFor="let operator of rule.operators"
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
              >
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-3">
                    <span class="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {{ getOperatorInitials(operator.operatorName) }}
                    </span>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ operator.operatorName }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ operator.operatorEmail }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                    {{ operator.ratio }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
          </svg>
          All changes will be saved automatically
        </div>
        
        <div class="flex gap-3">
          <button
            type="button"
            class="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            (click)="onCancel()"
          >
            Cancel
          </button>

          <button
            type="button"
            class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            (click)="onSubmit()"
            [disabled]="ruleForm.invalid || isSubmitting"
          >
            <span class="flex items-center">
              <svg
                *ngIf="isSubmitting"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              {{
                isSubmitting ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'
              }}
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class SalesRuleFormModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() rule?: SalesRuleDetails;

  private fb = inject(FormBuilder);
  private salesRulesService = inject(SalesRulesService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private destroy$ = new Subject<void>();

  ruleForm!: FormGroup;
  isSubmitting = false;
  
  // Countries
  countries: any[] = [];
  selectedCountries: any[] = [];
  filteredCountries: any[] = [];
  countrySearchTerm = '';
  showCountryDropdown = false;
  
  // Languages
  languages: { key: string; value: string }[] = [];
  selectedLanguages: { key: string; value: string }[] = [];
  filteredLanguages: { key: string; value: string }[] = [];
  languageSearchTerm = '';
  showLanguageDropdown = false;

  priorities = Object.keys(RulePriority)
    .filter((k) => !isNaN(Number(k)))
    .map((k) => ({
      value: Number(k),
      label: RulePriorityLabels[Number(k) as RulePriority],
    }));

  types = Object.keys(RuleType)
    .filter((k) => !isNaN(Number(k)))
    .map((k) => ({
      value: Number(k),
      label: RuleTypeLabels[Number(k) as RuleType],
    }));

  ngOnInit(): void {
    this.initForm();
    this.loadCountries();
    this.loadLanguages();

    if (this.rule) {
      this.populateForm();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.ruleForm = this.fb.group({
      ruleName: ['', [Validators.required]],
      priority: ['', [Validators.required]],
      type: ['', [Validators.required]],
      sources: [''],
    });
  }

  private loadCountries(): void {
    this.countryService.getCountries().subscribe(countries => {
      this.countries = countries;
      this.filteredCountries = countries;
    });
  }

  private loadLanguages(): void {
    this.languages = this.languageService.getAllLanguages();
    this.filteredLanguages = this.languages;
  }

  private populateForm(): void {
    if (!this.rule) return;

    this.ruleForm.patchValue({
      ruleName: this.rule.name,
      priority: this.rule.priority,
      type: this.rule.type,
      sources: this.rule.sources || '',
    });

    // TODO: Populate selected countries and languages based on rule data
  }

  // Country methods
  onCountrySearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.onCountrySearch(target.value);
  }

  onCountrySearch(term: string): void {
    this.countrySearchTerm = term;
    this.showCountryDropdown = true;
    this.filteredCountries = this.countries.filter(country =>
      country.name.toLowerCase().includes(term.toLowerCase()) ||
      country.code.toLowerCase().includes(term.toLowerCase())
    );
  }

  selectCountry(country: any): void {
    if (!this.selectedCountries.find(c => c.code === country.code)) {
      this.selectedCountries.push(country);
    }
    this.countrySearchTerm = '';
    this.showCountryDropdown = false;
  }

  removeCountry(country: any): void {
    this.selectedCountries = this.selectedCountries.filter(c => c.code !== country.code);
  }

  // Language methods
  onLanguageSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.onLanguageSearch(target.value);
  }

  onLanguageSearch(term: string): void {
    this.languageSearchTerm = term;
    this.showLanguageDropdown = true;
    this.filteredLanguages = this.languages.filter(language =>
      language.value.toLowerCase().includes(term.toLowerCase()) ||
      language.key.toLowerCase().includes(term.toLowerCase())
    );
  }

  selectLanguage(language: { key: string; value: string }): void {
    if (!this.selectedLanguages.find(l => l.key === language.key)) {
      this.selectedLanguages.push(language);
    }
    this.languageSearchTerm = '';
    this.showLanguageDropdown = false;
  }

  removeLanguage(language: { key: string; value: string }): void {
    this.selectedLanguages = this.selectedLanguages.filter(l => l.key !== language.key);
  }

  clearAllTargeting(): void {
    this.selectedCountries = [];
    this.selectedLanguages = [];
    this.ruleForm.patchValue({
      sources: ''
    });
  }

  getOperatorInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.ruleForm.value;

    const request: CreateSalesRuleRequest = {
      ruleName: formValue.ruleName,
      priority: Number(formValue.priority),
      type: Number(formValue.type),
      country: this.selectedCountries.length > 0 ? this.selectedCountries.map(c => c.code).join(',') : undefined,
      language: this.selectedLanguages.length > 0 ? this.selectedLanguages.map(l => l.key).join(',') : undefined,
      sources: formValue.sources || undefined,
    };

    if (this.rule) {
      // Update existing rule
      this.salesRulesService.updateSalesRule(this.rule.id, request)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.alertService.error('Failed to update sales rule');
            console.error('Error updating rule:', error);
            return of(null);
          }),
          finalize(() => this.isSubmitting = false)
        )
        .subscribe(result => {
          if (result !== null) {
            this.alertService.success('Sales rule updated successfully!');
            this.modalRef.close({ id: this.rule!.id, ...request });
          }
        });
    } else {
      // Create new rule
      this.salesRulesService.createSalesRule(request)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.alertService.error('Failed to create sales rule');
            console.error('Error creating rule:', error);
            return of(null);
          }),
          finalize(() => this.isSubmitting = false)
        )
        .subscribe(result => {
          if (result !== null) {
            this.alertService.success('Sales rule created successfully!');
            this.modalRef.close(result);
          }
        });
    }
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.ruleForm.controls).forEach((key) => {
      this.ruleForm.get(key)?.markAsTouched();
    });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}