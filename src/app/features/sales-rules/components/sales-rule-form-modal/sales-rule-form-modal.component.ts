// src/app/features/sales-rules/components/sales-rule-form-modal/sales-rule-form-modal.component.ts

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
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ rule ? 'Edit Sales Rule' : 'Create Sales Rule' }}
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        <form [formGroup]="ruleForm" class="space-y-6">
          <!-- Rule Settings Tab -->
          <div class="space-y-6">
            <h5 class="text-lg font-medium text-gray-900 dark:text-white">
              Rule Settings
            </h5>

            <!-- Rule Name -->
            <div>
              <label
                for="ruleName"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Rule Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ruleName"
                formControlName="ruleName"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  ruleForm.get('ruleName')?.invalid &&
                  ruleForm.get('ruleName')?.touched
                "
                placeholder="Enter rule name"
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  ruleForm.get('ruleName')?.invalid &&
                  ruleForm.get('ruleName')?.touched
                "
              >
                Rule name is required
              </p>
            </div>

            <!-- Priority and Type Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  for="priority"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Rule Priority <span class="text-red-500">*</span>
                </label>
                <select
                  id="priority"
                  formControlName="priority"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    {{ priority.label }}
                  </option>
                </select>
                <p
                  class="mt-1 text-sm text-red-600 dark:text-red-400"
                  *ngIf="
                    ruleForm.get('priority')?.invalid &&
                    ruleForm.get('priority')?.touched
                  "
                >
                  Priority is required
                </p>
              </div>

              <div>
                <label
                  for="type"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Rule Type <span class="text-red-500">*</span>
                </label>
                <select
                  id="type"
                  formControlName="type"
                  class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  [class.border-red-500]="
                    ruleForm.get('type')?.invalid &&
                    ruleForm.get('type')?.touched
                  "
                >
                  <option value="">-- Select --</option>
                  <option *ngFor="let type of types" [value]="type.value">
                    {{ type.label }}
                  </option>
                </select>
                <p
                  class="mt-1 text-sm text-red-600 dark:text-red-400"
                  *ngIf="
                    ruleForm.get('type')?.invalid &&
                    ruleForm.get('type')?.touched
                  "
                >
                  Type is required
                </p>
              </div>
            </div>
          </div>

          <!-- Targeting Settings -->
          <div
            class="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700"
          >
            <h5 class="text-lg font-medium text-gray-900 dark:text-white">
              Targeting Settings
            </h5>

            <!-- Country -->
            <div>
              <label
                for="country"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Country
              </label>
              <select
                id="country"
                formControlName="country"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                multiple
              >
                <option value="">-- Select one or multiple options --</option>
                <option
                  *ngFor="let country of countries$ | async"
                  [value]="country.code"
                >
                  {{ country.name }}
                </option>
              </select>
              <p class="mt-1 text-sm text-gray-500">
                Leave empty to target all countries
              </p>
            </div>

            <!-- Language -->
            <div>
              <label
                for="language"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Language
              </label>
              <select
                id="language"
                formControlName="language"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                multiple
              >
                <option value="">-- Select one or multiple options --</option>
                <option *ngFor="let lang of languages" [value]="lang.key">
                  {{ lang.value }}
                </option>
              </select>
              <p class="mt-1 text-sm text-gray-500">
                Leave empty to target all languages
              </p>
            </div>

            <!-- Partner -->
            <div>
              <label
                for="partners"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Partner
              </label>
              <select
                id="partners"
                formControlName="partners"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                multiple
              >
                <option value="">-- Select one or multiple options --</option>
              </select>
              <p class="mt-1 text-sm text-gray-500">
                Leave empty to target all partners
              </p>
            </div>

            <!-- Affiliate Referrals -->
            <div>
              <label
                for="affiliateReferrals"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Affiliate Referrals
              </label>
              <select
                id="affiliateReferrals"
                formControlName="affiliateReferrals"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                multiple
              >
                <option value="">-- Select one or multiple options --</option>
              </select>
              <p class="mt-1 text-sm text-gray-500">
                Leave empty to target all affiliate referrals
              </p>
            </div>

            <!-- Source -->
            <div>
              <label
                for="sources"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Source
              </label>
              <input
                type="text"
                id="sources"
                formControlName="sources"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter source"
              />
              <p class="mt-1 text-sm text-gray-500">
                Leave empty to target all sources
              </p>
            </div>
          </div>

          <!-- Operators Section (for edit mode) -->
          <div
            *ngIf="rule && rule.operators && rule.operators.length > 0"
            class="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700"
          >
            <h5 class="text-lg font-medium text-gray-900 dark:text-white">
              Assigned Operators ({{ rule.operators.length }})
            </h5>
            <div
              class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-4"
            >
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> Operators can be managed after creating
                or from the rule details view.
              </p>
            </div>
            <div class="space-y-2">
              <div
                *ngFor="let operator of rule.operators"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ operator.operatorName }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ operator.operatorEmail }}
                  </p>
                </div>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                >
                  {{ operator.ratio }}%
                </span>
              </div>
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
  countries$ = this.countryService.getCountries();
  languages: { key: string; value: string }[] = [];

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
      country: [''],
      language: [''],
      partners: [''],
      affiliateReferrals: [''],
      sources: [''],
    });
  }

  private loadLanguages(): void {
    this.languages = this.languageService.getAllLanguages();
  }

  private populateForm(): void {
    if (!this.rule) return;

    this.ruleForm.patchValue({
      ruleName: this.rule.name,
      priority: this.rule.priority,
      type: this.rule.type,
      country: this.rule.country || '',
      language: this.rule.language || '',
      partners: this.rule.partners || '',
      affiliateReferrals: this.rule.affiliateReferrals || '',
      sources: this.rule.sources || '',
    });
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
      country: formValue.country || undefined,
      language: formValue.language || undefined,
      partners: formValue.partners || undefined,
      affiliateReferrals: formValue.affiliateReferrals || undefined,
      sources: formValue.sources || undefined,
    };

    const operation$ = this.rule
      ? this.salesRulesService.updateSalesRule(this.rule.id, request)
      : this.salesRulesService.createSalesRule(request);

    // operation$
    //   .pipe(
    //     takeUntil(this.destroy$),
    //     catchError(error => {
    //       const action = this.rule ? 'update' : 'create';
    //       this.alertService.error(`Failed to ${action} sales rule`);
    //       console.error(`Error ${action} rule:`, error);
    //       return of(null);
    //     }),
    //     finalize(() => this.isSubmitting = false)
    //   )
    //   .subscribe(result => {
    //     if (result !== null) {
    //       const action = this.rule ? 'updated' : 'created';
    //       this.alertService.success(`Sales rule ${action} successfully!`);
    //       this.modalRef.close(result);
    //     }
    //   });
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
