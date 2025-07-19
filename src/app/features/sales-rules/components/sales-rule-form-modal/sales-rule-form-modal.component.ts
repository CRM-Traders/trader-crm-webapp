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
  RulePriority,
  RuleType,
  RulePriorityLabels,
  RuleTypeLabels,
  OperatorDropdownRequest,
  OperatorDropdownResponse,
} from '../../models/sales-rules.model';

interface OperatorSelection {
  id: string;
  name: string;
  department: string;
  role: string;
  ratio: number;
}

@Component({
  selector: 'app-sales-rule-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="w-full max-w-2xl mx-auto">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ rule ? 'Edit Sales Rule' : 'Create Sales Rule' }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure rule settings and targeting options
        </p>
      </div>

      <!-- Form -->
      <div class="px-6 py-6 max-h-[90vh] overflow-y-auto">
        <form [formGroup]="ruleForm" class="space-y-6">
          <!-- Rule Name -->
          <div>
            <label
              for="ruleName"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Rule Name *
            </label>
            <input
              type="text"
              id="ruleName"
              formControlName="ruleName"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          <!-- Priority and Type -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="priority"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Priority *
              </label>
              <select
                id="priority"
                formControlName="priority"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                [class.border-red-500]="
                  ruleForm.get('priority')?.invalid &&
                  ruleForm.get('priority')?.touched
                "
              >
                <option value="">Select priority</option>
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
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Type *
              </label>
              <select
                id="type"
                formControlName="type"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                [class.border-red-500]="
                  ruleForm.get('type')?.invalid && ruleForm.get('type')?.touched
                "
              >
                <option value="">Select type</option>
                <option *ngFor="let type of types" [value]="type.value">
                  {{ type.label }}
                </option>
              </select>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  ruleForm.get('type')?.invalid && ruleForm.get('type')?.touched
                "
              >
                Type is required
              </p>
            </div>
          </div>

          <!-- Targeting Section -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 class="text-md font-medium text-gray-900 dark:text-white mb-4">
              Targeting Options
            </h4>

            <div class="space-y-4">
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
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  (change)="onTargetingChange()"
                >
                  <option value="">All countries</option>
                  <option
                    *ngFor="let country of countries"
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
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  (change)="onTargetingChange()"
                >
                  <option value="">All languages</option>
                  <option
                    *ngFor="let language of languages"
                    [value]="language.key"
                  >
                    {{ language.value }}
                  </option>
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
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Google, Facebook, Direct"
                  (input)="onTargetingChange()"
                />
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Leave empty to target all sources
                </p>
              </div>
            </div>
          </div>

          <!-- Operators Section -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-md font-medium text-gray-900 dark:text-white">
                Assign Operators ({{ selectedOperators.length }}/4)
              </h4>
              <div class="relative">
                <button
                  type="button"
                  class="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  (click)="toggleOperatorDropdown()"
                  [disabled]="
                    selectedOperators.length >= 4 || isLoadingOperators
                  "
                >
                  <span class="flex items-center">
                    <svg
                      class="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      ></path>
                    </svg>
                    Select Operator
                  </span>
                </button>

                <!-- Dropdown Menu -->
                <div
                  *ngIf="showOperatorDropdown"
                  class="absolute bottom-[120%] right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50"
                >
                  <div class="p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h5
                        class="text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Select Operator
                      </h5>
                      <button
                        type="button"
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        (click)="hideOperatorDropdown()"
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
                            d="M6 18L18 6M6 6l12 12"
                          ></path>
                        </svg>
                      </button>
                    </div>

                    <div
                      *ngIf="isLoadingOperators"
                      class="flex items-center justify-center py-4"
                    >
                      <svg
                        class="animate-spin h-5 w-5 text-blue-500"
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
                      <span
                        class="ml-2 text-sm text-gray-600 dark:text-gray-400"
                        >Loading operators...</span
                      >
                    </div>

                    <div
                      *ngIf="
                        !isLoadingOperators && availableOperators.length === 0
                      "
                      class="text-center py-4"
                    >
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        No operators available
                      </p>
                    </div>

                    <div
                      *ngIf="
                        !isLoadingOperators && availableOperators.length > 0
                      "
                      class="space-y-2 max-h-60 overflow-y-auto"
                    >
                      <div
                        *ngFor="let operator of availableOperators"
                        class="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/20 cursor-pointer"
                        (click)="selectOperator(operator)"
                      >
                        <div class="flex items-center">
                          <div
                            class="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-2"
                          >
                            <span
                              class="text-xs font-medium text-blue-600 dark:text-blue-400"
                            >
                              {{ getOperatorInitials(operator.value) }}
                            </span>
                          </div>
                          <div>
                            <p
                              class="text-sm font-medium text-gray-900 dark:text-white"
                            >
                              {{ operator.value }}
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              {{ operator.department }} - {{ operator.role }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Selected Operators List -->
            <div *ngIf="selectedOperators.length > 0" class="space-y-2">
              <div
                *ngFor="let operator of selectedOperators; let i = index"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div class="flex items-center">
                  <div
                    class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3"
                  >
                    <span
                      class="text-xs font-medium text-blue-600 dark:text-blue-400"
                    >
                      {{ getOperatorInitials(operator.name) }}
                    </span>
                  </div>
                  <div>
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {{ operator.name }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ operator.department }} - {{ operator.role }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <input
                    type="number"
                    class="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    min="1"
                    max="100"
                    [(ngModel)]="operator.ratio"
                    [ngModelOptions]="{ standalone: true }"
                    (input)="onRatioChange()"
                  />
                  <span class="text-sm text-gray-500 dark:text-gray-400"
                    >%</span
                  >
                  <button
                    type="button"
                    class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    (click)="removeOperator(i)"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Operators Info (for edit mode) -->
            <div
              *ngIf="rule && rule.operators && rule.operators.length > 0"
              class="mt-4"
            >
              <div
                class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
              >
                <p class="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> This rule already has
                  {{ rule.operators.length }} assigned operator(s). Any
                  operators added here will be in addition to the existing ones.
                </p>
              </div>
            </div>

            <!-- Total Ratio Validation -->
            <div *ngIf="selectedOperators.length > 0" class="mt-3">
              <div class="flex items-center justify-ends gap-2 text-sm">
                <span class="text-gray-600 dark:text-gray-400"
                  >Total Ratio:</span
                >
                <span
                  class="font-medium"
                  [class.text-red-600]="getTotalRatio() !== 100"
                  [class.text-green-600]="getTotalRatio() === 100"
                  [class.dark:text-red-400]="getTotalRatio() !== 100"
                  [class.dark:text-green-400]="getTotalRatio() === 100"
                >
                  {{ getTotalRatio() }}%
                </span>
              </div>
              <p
                *ngIf="getTotalRatio() !== 100"
                class="text-xs text-red-600 dark:text-red-400 mt-1"
              >
                Total ratio must equal 100%
              </p>
            </div>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3"
      >
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          (click)="onCancel()"
        >
          Cancel
        </button>

        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          (click)="onSubmit()"
          [disabled]="!isFormValid()"
        >
          <span class="flex items-center">
            <svg
              *ngIf="isSubmitting"
              class="animate-spin -ml-1 mr-2 h-4 w-4"
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

  countries: any[] = [];
  languages: { key: string; value: string }[] = [];

  // Operator dropdown related properties
  availableOperators: any[] = [];
  selectedOperators: OperatorSelection[] = [];
  showOperatorDropdown = false;
  isLoadingOperators = false;

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
      country: [''],
      language: ['en'], // Set English as default
      sources: [''],
    });
  }

  private loadCountries(): void {
    this.countryService.getCountries().subscribe((countries) => {
      this.countries = countries;
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
      sources: this.rule.sources || '',
    });

    // Populate existing operators
    if (this.rule.operators && this.rule.operators.length > 0) {
      this.selectedOperators = this.rule.operators.map((op) => ({
        id: op.userId,
        name: op.operatorName,
        department: '', // Will be populated when loading operators
        role: '', // Will be populated when loading operators
        ratio: op.ratio,
      }));
    }
  }

  // Operator dropdown methods
  onTargetingChange(): void {
    // Reset operator selection when targeting changes
    this.selectedOperators = [];
    this.hideOperatorDropdown();
  }

  toggleOperatorDropdown(): void {
    if (this.showOperatorDropdown) {
      this.hideOperatorDropdown();
    } else {
      this.showOperatorDropdown = true;
      this.loadOperators();
    }
  }

  private loadOperators(): void {
    this.isLoadingOperators = true;
    const formValue = this.ruleForm.value;

    this.salesRulesService
      .getOperatorsDropdown({})
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load operators');
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 0,
            pageSize: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          } as OperatorDropdownResponse);
        }),
        finalize(() => (this.isLoadingOperators = false))
      )
      .subscribe((response) => {
        const selectedIds = this.selectedOperators.map((op) => op.id);
        this.availableOperators = response.items.filter(
          (op) => !selectedIds.includes(op.id)
        );
      });
  }

  selectOperator(operator: any): void {
    if (this.selectedOperators.length >= 4) {
      this.alertService.error('Maximum 4 operators allowed');
      return;
    }

    // Add the new operator
    this.selectedOperators.push({
      id: operator.id,
      name: operator.value,
      department: operator.department,
      role: operator.role,
      ratio: 0, // will be set below
    });

    // Distribute ratio equally among all selected operators
    const count = this.selectedOperators.length;
    const equalRatio = 100 / count;

    // Set all but last to floor, last to remainder for exact 100
    let total = 0;
    for (let i = 0; i < count - 1; i++) {
      this.selectedOperators[i].ratio =
        Math.floor(equalRatio * 1000000) / 1000000;
      total += this.selectedOperators[i].ratio;
    }
    this.selectedOperators[count - 1].ratio =
      Math.round((100 - total) * 1000000) / 1000000;

    this.hideOperatorDropdown();
  }

  hideOperatorDropdown(): void {
    this.showOperatorDropdown = false;
    this.availableOperators = [];
  }

  removeOperator(index: number): void {
    this.selectedOperators.splice(index, 1);
  }

  getTotalRatio(): number {
    return this.selectedOperators.reduce(
      (total, op) => total + (op.ratio || 0),
      0
    );
  }

  updateOperatorRatio(index: number, value: number): void {
    this.selectedOperators[index].ratio = value;
  }

  onRatioChange(): void {
    // Optional: Auto-adjust ratios or show warnings
  }

  getOperatorInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  isFormValid(): boolean {
    const formValid = this.ruleForm.valid;
    const operatorsValid =
      this.selectedOperators.length > 0 && this.getTotalRatio() === 100;
    return formValid && operatorsValid && !this.isSubmitting;
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    if (this.selectedOperators.length === 0) {
      this.alertService.error('At least one operator must be assigned');
      return;
    }

    if (this.getTotalRatio() !== 100) {
      this.alertService.error('Total operator ratio must equal 100%');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.ruleForm.value;

    const request: CreateSalesRuleRequest = {
      ruleName: formValue.ruleName,
      priority: Number(formValue.priority),
      type: Number(formValue.type),
      country: formValue.country || '',
      language: formValue.language || '',
      sources: formValue.sources || '',
      operators: this.selectedOperators.map((op) => ({
        userId: op.id,
        ratio: op.ratio,
      })),
      partners: '',
      affiliateReferrals: '',
    };

    if (this.rule) {
      // Update existing rule - use batch operator update for better consistency
      this.salesRulesService
        .updateSalesRule(this.rule.id, request)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to update sales rule');
            return of(null);
          }),
          finalize(() => (this.isSubmitting = false))
        )
        .subscribe((result) => {
          if (result !== null) {
            const operatorRequests = this.selectedOperators.map((op) => ({
              userId: op.id,
              ratio: op.ratio,
            }));

            this.salesRulesService
              .batchUpdateOperators(this.rule!.id, operatorRequests)
              .pipe(
                takeUntil(this.destroy$),
                catchError((error) => {
                  this.alertService.error(
                    'Rule updated but failed to update operators'
                  );
                  return of(null);
                })
              )
              .subscribe((operatorResult) => {
                if (operatorResult !== null) {
                  this.alertService.success(
                    'Sales rule and operators updated successfully!'
                  );
                }
                this.modalRef.close({
                  id: this.rule!.id,
                  ...request,
                  operators: operatorRequests,
                });
              });
          }
        });
    } else {
      // Create new rule
      this.salesRulesService
        .createSalesRule(request)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to create sales rule');
            return of(null);
          }),
          finalize(() => (this.isSubmitting = false))
        )
        .subscribe((result) => {
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
