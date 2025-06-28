// src/app/features/officies/components/create-rule-modal/create-rule-modal.component.ts

import { Component, OnInit, OnDestroy, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';

import { OfficeRulesService } from '../../services/office-rules.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';

import {
  OfficeRule,
  OfficeRuleCreateRequest,
  OfficeRuleUpdateRequest,
  RuleCategory,
  RulePriority,
  RuleType,
} from '../../models/office-rules.model';
import { Country } from '../../../../core/models/country.model';

@Component({
  selector: 'app-create-rule-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ isEditing ? 'Edit Rule' : 'Create New Rule' }}
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6 max-h-[70vh] overflow-y-auto">
        <!-- Tabs -->
        <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav class="-mb-px flex space-x-8">
            <button
              type="button"
              class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
              [class.border-blue-500]="activeTab === 'settings'"
              [class.text-blue-600]="activeTab === 'settings'"
              [class.border-transparent]="activeTab !== 'settings'"
              [class.text-gray-500]="activeTab !== 'settings'"
              (click)="activeTab = 'settings'"
            >
              Rule settings
            </button>
            <button
              type="button"
              class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
              [class.border-blue-500]="activeTab === 'schedule'"
              [class.text-blue-600]="activeTab === 'schedule'"
              [class.border-transparent]="activeTab !== 'schedule'"
              [class.text-gray-500]="activeTab !== 'schedule'"
              (click)="activeTab = 'schedule'"
            >
              Schedule settings
            </button>
          </nav>
        </div>

        <form [formGroup]="ruleForm" class="space-y-6">
          <!-- Rule Settings Tab -->
          <div *ngIf="activeTab === 'settings'" class="space-y-6">
            <!-- Rule Name -->
            <div>
              <label
                for="ruleName"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Rule name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ruleName"
                formControlName="ruleName"
                placeholder="Rule name"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  ruleForm.get('ruleName')?.invalid &&
                  ruleForm.get('ruleName')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  ruleForm.get('ruleName')?.invalid &&
                  ruleForm.get('ruleName')?.touched
                "
              >
                <span *ngIf="ruleForm.get('ruleName')?.errors?.['required']"
                  >Rule name is required</span
                >
              </p>
            </div>

            <!-- Rule Priority and Type Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Rule Priority -->
              <div>
                <label
                  for="priority"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Rule priority <span class="text-red-500">*</span>
                </label>
                <select
                  id="priority"
                  formControlName="priority"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.border-red-500]="
                    ruleForm.get('priority')?.invalid &&
                    ruleForm.get('priority')?.touched
                  "
                >
                  <option value="">-- Select --</option>
                  <option
                    *ngFor="let priority of priorities"
                    [value]="priority.value"
                  >
                    {{ priority.name }}
                  </option>
                </select>
                <p
                  class="mt-1 text-sm text-red-600 dark:text-red-400"
                  *ngIf="
                    ruleForm.get('priority')?.invalid &&
                    ruleForm.get('priority')?.touched
                  "
                >
                  <span *ngIf="ruleForm.get('priority')?.errors?.['required']"
                    >Priority is required</span
                  >
                </p>
              </div>

              <!-- Rule Type -->
              <div>
                <label
                  for="type"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Rule type <span class="text-red-500">*</span>
                </label>
                <select
                  id="type"
                  formControlName="type"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  [class.border-red-500]="
                    ruleForm.get('type')?.invalid &&
                    ruleForm.get('type')?.touched
                  "
                >
                  <option value="">-- Select --</option>
                  <option *ngFor="let type of types" [value]="type.value">
                    {{ type.name }}
                  </option>
                </select>
                <p
                  class="mt-1 text-sm text-red-600 dark:text-red-400"
                  *ngIf="
                    ruleForm.get('type')?.invalid &&
                    ruleForm.get('type')?.touched
                  "
                >
                  <span *ngIf="ruleForm.get('type')?.errors?.['required']"
                    >Type is required</span
                  >
                </p>
              </div>
            </div>

            <!-- Country -->
            <div>
              <label
                for="country"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Country
              </label>
              <select
                id="country"
                formControlName="country"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">-- Select one or multiple options --</option>
                <option
                  *ngFor="let country of availableCountries"
                  [value]="country.code"
                >
                  {{ country.name }}
                </option>
              </select>
            </div>

            <!-- Language -->
            <div>
              <label
                for="language"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Language
              </label>
              <select
                id="language"
                formControlName="language"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">-- Select one or multiple options --</option>
                <option
                  *ngFor="let language of availableLanguages"
                  [value]="language.key"
                >
                  {{ language.value }}
                </option>
              </select>
            </div>

            <!-- Partner -->
            <div>
              <label
                for="partners"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Partner
              </label>
              <select
                id="partners"
                formControlName="partners"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">-- Select one or multiple options --</option>
                <!-- Add partner options when available -->
              </select>
            </div>

            <!-- Affiliate Referrals -->
            <div>
              <label
                for="affiliateReferrals"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Affiliate referrals
              </label>
              <select
                id="affiliateReferrals"
                formControlName="affiliateReferrals"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">-- Select one or multiple options --</option>
                <!-- Add affiliate referral options when available -->
              </select>
            </div>

            <!-- Source -->
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
                placeholder="Source"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <!-- Schedule Settings Tab -->
          <div *ngIf="activeTab === 'schedule'" class="space-y-6">
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
                />
              </svg>
              <h3
                class="mt-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Schedule Settings
              </h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Schedule configuration will be available in a future update.
              </p>
            </div>
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
          [disabled]="ruleForm.invalid || isSubmitting"
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
            {{
              isSubmitting
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                ? 'Update Rule'
                : 'Create rule'
            }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class CreateRuleModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() officeId!: string;
  @Input() rule?: OfficeRule;
  @Input() categories: RuleCategory[] = [];
  @Input() priorities: RulePriority[] = [];
  @Input() types: RuleType[] = [];
  @Input() isEditing = false;

  private fb = inject(FormBuilder);
  private officeRulesService = inject(OfficeRulesService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  ruleForm: FormGroup;
  isSubmitting = false;
  activeTab: 'settings' | 'schedule' = 'settings';

  availableCountries: Country[] = [];
  availableLanguages: { key: string; value: string }[] = [];

  constructor() {
    this.ruleForm = this.fb.group({
      ruleName: ['', [Validators.required]],
      priority: ['', [Validators.required]],
      type: ['', [Validators.required]],
      country: [''],
      language: [''],
      partners: [''],
      affiliateReferrals: [''],
      sources: [''],
    });
  }

  ngOnInit(): void {
    this.loadLookupData();

    if (this.isEditing && this.rule) {
      this.populateFormForEdit();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLookupData(): void {
    // Load countries
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.availableCountries = countries;
      });

    // Load languages
    this.availableLanguages = this.languageService.getAllLanguages();
  }

  private populateFormForEdit(): void {
    if (!this.rule) return;

    this.ruleForm.patchValue({
      ruleName: this.rule.name,
      priority: this.rule.priority,
      type: this.rule.type,
      country: this.rule.country,
      language: this.rule.language,
      partners: this.rule.partners,
      affiliateReferrals: this.rule.affiliateReferrals,
      sources: this.rule.sources,
    });
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      Object.keys(this.ruleForm.controls).forEach((key) => {
        this.ruleForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.ruleForm.value;

    if (this.isEditing && this.rule) {
      this.updateRule(formValue);
    } else {
      this.createRule(formValue);
    }
  }

  private createRule(formValue: any): void {
    const request: OfficeRuleCreateRequest = {
      ruleName: formValue.ruleName.trim(),
      category: 1, // Default category
      priority: parseInt(formValue.priority),
      type: parseInt(formValue.type),
      objectId: this.officeId,
      country: formValue.country || undefined,
      language: formValue.language || undefined,
      partners: formValue.partners || undefined,
      affiliateReferrals: formValue.affiliateReferrals || undefined,
      sources: formValue.sources || undefined,
    };

    this.officeRulesService
      .createRule(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          if (error.status === 400) {
            this.alertService.error(
              'Invalid data provided. Please check your inputs.'
            );
          } else if (error.status === 409) {
            this.alertService.error('A rule with this name already exists.');
          } else {
            this.alertService.error('Failed to create rule. Please try again.');
          }
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSubmitting = false;
        if (response) {
          this.alertService.success('Rule created successfully!');
          this.modalRef.close(true);
        }
      });
  }

  private updateRule(formValue: any): void {
    if (!this.rule) return;

    const request: OfficeRuleUpdateRequest = {
      id: this.rule.id,
      ruleName: formValue.ruleName.trim(),
      priority: parseInt(formValue.priority),
      country: formValue.country || undefined,
      language: formValue.language || undefined,
      partners: formValue.partners || undefined,
      affiliateReferrals: formValue.affiliateReferrals || undefined,
      sources: formValue.sources || undefined,
    };

    this.officeRulesService
      .updateRule(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          this.alertService.error('Failed to update rule. Please try again.');
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSubmitting = false;
        if (response !== null) {
          this.alertService.success('Rule updated successfully!');
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
