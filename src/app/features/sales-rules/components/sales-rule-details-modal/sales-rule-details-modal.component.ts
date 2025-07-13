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
  SalesRuleDetails,
  SalesRuleOperator,
  RuleCategory,
  RulePriority,
  RuleType,
  RuleCategoryLabels,
  RulePriorityLabels,
  RuleTypeLabels,
  RulePriorityColors,
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
  selector: 'app-sales-rule-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="w-full max-w-4xl mx-auto">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Sales Rule Details
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ rule?.name }}
            </p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 max-h-[80vh] overflow-y-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Left Column - Rule Information -->
          <div class="space-y-6">
            <!-- Basic Information -->
            <div>
              <h4 class="text-md font-medium text-gray-900 dark:text-white mb-4">
                Basic Information
              </h4>
              <dl class="space-y-4">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Rule Name</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                    {{ rule?.name }}
                  </dd>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Category</dt>
                    <dd class="mt-1">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {{ getRuleCategory(rule?.category) }}
                      </span>
                    </dd>
                  </div>

                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
                    <dd class="mt-1">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        {{ getRuleType(rule?.type) }}
                      </span>
                    </dd>
                  </div>
                </div>

                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Priority</dt>
                  <dd class="mt-1">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                          [ngClass]="getRulePriorityColors(rule?.priority)">
                      {{ getRulePriority(rule?.priority) }}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Targeting Information -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 class="text-md font-medium text-gray-900 dark:text-white mb-4">
                Targeting
              </h4>
              <dl class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Country</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                      {{ getCountryDisplay(rule?.country) }}
                    </dd>
                  </div>

                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Language</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                      {{ getLanguageDisplay(rule?.language) }}
                    </dd>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Partners</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                      {{ getPartnersDisplay(rule?.partners) }}
                    </dd>
                  </div>

                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Affiliate Referrals</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                      {{ getAffiliateReferralsDisplay(rule?.affiliateReferrals) }}
                    </dd>
                  </div>
                </div>

                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Sources</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {{ getSourcesDisplay(rule?.sources) }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Timestamps -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</dt>
                  <dd class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {{ rule?.createdAt | date : "MMMM d, y 'at' h:mm a" }}
                  </dd>
                </div>
                <div *ngIf="rule?.updatedAt">
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                  <dd class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {{ rule?.updatedAt | date : "MMMM d, y 'at' h:mm a" }}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column - Operators Management -->
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h4 class="text-md font-medium text-gray-900 dark:text-white">
                Operators ({{ currentOperators.length }})
              </h4>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  (click)="toggleOperatorDropdown()"
                  [disabled]="currentOperators.length >= 4 || isLoadingOperators"
                >
                  <span class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Add Operator
                  </span>
                </button>

                <!-- Dropdown Menu -->
                <div *ngIf="showOperatorDropdown" class="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50">
                  <div class="p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h5 class="text-sm font-medium text-gray-900 dark:text-white">
                        Select Operator
                      </h5>
                      <button
                        type="button"
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        (click)="hideOperatorDropdown()"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>

                    <div *ngIf="isLoadingOperators" class="flex items-center justify-center py-4">
                      <svg class="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading operators...</span>
                    </div>

                    <div *ngIf="!isLoadingOperators && availableOperators.length === 0" class="text-center py-4">
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        No operators available
                      </p>
                    </div>

                    <div *ngIf="!isLoadingOperators && availableOperators.length > 0" class="space-y-2 max-h-60 overflow-y-auto">
                      <div
                        *ngFor="let operator of availableOperators"
                        class="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/20 cursor-pointer"
                        (click)="selectOperator(operator)"
                      >
                        <div class="flex items-center">
                          <div class="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-2">
                            <span class="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {{ getOperatorInitials(operator.value) }}
                            </span>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">
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

            <!-- Total Ratio Display -->
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Total Ratio:</span>
              <span class="font-medium"
                    [class.text-red-600]="getTotalRatio() !== 100"
                    [class.text-green-600]="getTotalRatio() === 100"
                    [class.dark:text-red-400]="getTotalRatio() !== 100"
                    [class.dark:text-green-400]="getTotalRatio() === 100">
                {{ getTotalRatio() | number:'1.2-2' }}%
              </span>
              <span *ngIf="getTotalRatio() !== 100" class="text-xs text-red-600 dark:text-red-400">
                (Should equal 100%)
              </span>
            </div>

            <!-- Operators List -->
            <div class="space-y-3">
              <div
                *ngFor="let operator of currentOperators; let i = index"
                class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div class="flex-1">
                                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ operator.operatorName }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ operator.operatorEmail }}
                    </p>
                </div>
                <div class="flex items-center space-x-3">
                  <input
                    type="number"
                    class="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    min="0"
                    max="100"
                    step="0.01"
                    [(ngModel)]="operator.ratio"
                    [ngModelOptions]="{standalone: true}"
                    (input)="onRatioChange()"
                  />
                  <span class="text-sm text-gray-500 dark:text-gray-400">%</span>
                  <button
                    type="button"
                    class="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    (click)="removeOperator(operator)"
                    title="Remove operator"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div
                *ngIf="currentOperators.length === 0"
                class="text-center py-8 text-gray-500 dark:text-gray-400"
              >
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  ></path>
                </svg>
                <p class="mt-2 text-sm">No operators assigned</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between">
        <div class="flex gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500"
            (click)="confirmDelete()"
            [disabled]="isDeleting"
          >
            <span class="flex items-center">
              <svg *ngIf="isDeleting" class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isDeleting ? 'Deleting...' : 'Delete Rule' }}
            </span>
          </button>
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            (click)="onCancel()"
          >
            Close
          </button>

          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            (click)="saveChanges()"
            [disabled]="!hasChanges() || isSaving"
          >
            <span class="flex items-center">
              <svg *ngIf="isSaving" class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      *ngIf="showDeleteModal"
      class="fixed bg-black/30 inset-0 overflow-y-auto z-60"
    >
      <div class="flex items-end mt-[30vh] justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Delete Sales Rule
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete the rule "<strong>{{ rule?.name }}</strong>"? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              (click)="deleteRule()"
              [disabled]="isDeleting"
            >
              Delete
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              (click)="cancelDelete()"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SalesRuleDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() ruleId!: string;

  private fb = inject(FormBuilder);
  private salesRulesService = inject(SalesRulesService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private destroy$ = new Subject<void>();

  rule: SalesRuleDetails | null = null;
  currentOperators: SalesRuleOperator[] = [];
  originalOperators: SalesRuleOperator[] = [];
  
  isSaving = false;
  isDeleting = false;
  showDeleteModal = false;

  // Operator dropdown related properties
  availableOperators: any[] = [];
  showOperatorDropdown = false;
  isLoadingOperators = false;

  countries: any[] = [];
  languages: { key: string; value: string }[] = [];

  // Expose enums and labels to template
  RuleCategory = RuleCategory;
  RulePriority = RulePriority;
  RuleType = RuleType;
  RuleCategoryLabels = RuleCategoryLabels;
  RulePriorityLabels = RulePriorityLabels;
  RuleTypeLabels = RuleTypeLabels;
  RulePriorityColors = RulePriorityColors;

  ngOnInit(): void {
    this.loadRuleDetails();
    this.loadCountries();
    this.loadLanguages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRuleDetails(): void {
    this.salesRulesService.getSalesRuleById(this.ruleId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.alertService.error('Failed to load rule details');
          console.error('Error loading rule:', error);
          return of(null);
        })
      )
      .subscribe(ruleDetails => {
        if (ruleDetails) {
          this.rule = ruleDetails;
          this.currentOperators = [...(ruleDetails.operators || [])];
          this.originalOperators = [...(ruleDetails.operators || [])];
        }
      });
  }

  private loadCountries(): void {
    this.countryService.getCountries().subscribe(countries => {
      this.countries = countries;
    });
  }

  private loadLanguages(): void {
    this.languages = this.languageService.getAllLanguages();
  }

  // Operator management methods
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
    
    this.salesRulesService.getOperatorsDropdown({})
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.alertService.error('Failed to load operators');
          console.error('Error loading operators:', error);
          return of({ items: [], totalCount: 0, pageIndex: 0, pageSize: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false } as OperatorDropdownResponse);
        }),
        finalize(() => this.isLoadingOperators = false)
      )
      .subscribe(response => {
        // Filter out operators that are already assigned to this sales rule
        const assignedOperatorIds = this.currentOperators.map(op => op.userId);
        console.log('Assigned operator IDs:', assignedOperatorIds);
        console.log('Available operators before filtering:', response.items);
        
        this.availableOperators = response.items.filter(op => {
          const isAssigned = assignedOperatorIds.includes(op.id);
          console.log(`Operator ${op.value} (ID: ${op.id}) - Assigned: ${isAssigned}`);
          return !isAssigned;
        });
        
        console.log('Available operators after filtering:', this.availableOperators);
      });
  }

  selectOperator(operator: any): void {
    if (this.currentOperators.length >= 4) {
      this.alertService.error('Maximum 4 operators allowed');
      return;
    }

    // Add the new operator
    const newOperator: SalesRuleOperator = {
      id: operator.id,
      userId: operator.id,
      operatorName: operator.value,
      operatorEmail: operator.email || '',
      ratio: 0,
      isValidOperator: true
    };

    this.currentOperators.push(newOperator);

    // Distribute ratio equally among all selected operators
    const count = this.currentOperators.length;
    const equalRatio = 100 / count;

    // Set all but last to floor, last to remainder for exact 100
    let total = 0;
    for (let i = 0; i < count - 1; i++) {
      this.currentOperators[i].ratio = Math.floor(equalRatio * 1000000) / 1000000;
      total += this.currentOperators[i].ratio;
    }
    this.currentOperators[count - 1].ratio = Math.round((100 - total) * 1000000) / 1000000;

    this.hideOperatorDropdown();
  }

  hideOperatorDropdown(): void {
    this.showOperatorDropdown = false;
    this.availableOperators = [];
  }

  removeOperator(operator: SalesRuleOperator): void {
    const index = this.currentOperators.findIndex(op => op.userId === operator.userId);
    if (index > -1) {
      this.currentOperators.splice(index, 1);
      
      // Redistribute ratios if there are remaining operators
      if (this.currentOperators.length > 0) {
        const count = this.currentOperators.length;
        const equalRatio = 100 / count;

        let total = 0;
        for (let i = 0; i < count - 1; i++) {
          this.currentOperators[i].ratio = Math.floor(equalRatio * 1000000) / 1000000;
          total += this.currentOperators[i].ratio;
        }
        this.currentOperators[count - 1].ratio = Math.round((100 - total) * 1000000) / 1000000;
      }
    }
  }

  onRatioChange(): void {
    // Optional: Auto-adjust ratios or show warnings
  }

  getTotalRatio(): number {
    return this.currentOperators.reduce((total, op) => total + (op.ratio || 0), 0);
  }

  hasChanges(): boolean {
    if (!this.rule) return false;
    
    // Check if operators have changed
    if (this.currentOperators.length !== this.originalOperators.length) {
      return true;
    }

    // Check if any operator ratios have changed
    for (let i = 0; i < this.currentOperators.length; i++) {
      const current = this.currentOperators[i];
      const original = this.originalOperators[i];
      
      if (!original || current.userId !== original.userId || Math.abs(current.ratio - original.ratio) > 0.01) {
        return true;
      }
    }

    return false;
  }

  saveChanges(): void {
    if (!this.rule || !this.hasChanges()) return;

    if (this.currentOperators.length === 0) {
      this.alertService.error('At least one operator must be assigned');
      return;
    }

    if (Math.abs(this.getTotalRatio() - 100) > 0.01) {
      this.alertService.error('Total operator ratio must equal 100%');
      return;
    }

    this.isSaving = true;

    // Update operators using batch operation
    const operatorRequests = this.currentOperators.map(op => ({
      userId: op.userId,
      ratio: op.ratio
    }));

    this.salesRulesService.batchUpdateOperators(this.rule.id, operatorRequests)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.alertService.error('Failed to update operators');
          console.error('Error updating operators:', error);
          return of(null);
        }),
        finalize(() => this.isSaving = false)
      )
      .subscribe(result => {
        if (result !== null) {
          this.alertService.success('Operators updated successfully');
          this.originalOperators = [...this.currentOperators];
          this.modalRef.close({ updated: true, rule: this.rule });
        }
      });
  }

  confirmDelete(): void {
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
  }

  deleteRule(): void {
    if (!this.rule) return;

    this.isDeleting = true;
    this.salesRulesService.deleteSalesRule(this.rule.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.alertService.error('Failed to delete rule');
          console.error('Error deleting rule:', error);
          return of(null);
        }),
        finalize(() => {
          this.isDeleting = false;
          this.showDeleteModal = false;
        })
      )
      .subscribe(result => {
        if (result !== null) {
          this.alertService.success('Rule deleted successfully');
          this.modalRef.close({ deleted: true, ruleId: this.rule!.id });
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }

  // Helper methods for displaying values
  getRuleCategory(value: any): string {
    return RuleCategoryLabels[value as RuleCategory] || 'Unknown';
  }

  getRulePriority(value: any): string {
    return RulePriorityLabels[value as RulePriority] || 'Unknown';
  }

  getRulePriorityColors(value: any): string {
    return RulePriorityColors[value as RulePriority] || 'bg-gray-100 text-gray-800';
  }

  getRuleType(value: any): string {
    return RuleTypeLabels[value as RuleType] || 'Unknown';
  }

  getCountryDisplay(country: string | undefined): string {
    return country && country.trim() !== '' ? country : 'All Countries';
  }

  getLanguageDisplay(language: string | undefined): string {
    return language && language.trim() !== '' ? language : 'All Languages';
  }

  getPartnersDisplay(partners: string | undefined): string {
    return partners && partners.trim() !== '' ? partners : 'All Partners';
  }

  getAffiliateReferralsDisplay(affiliateReferrals: string | null | undefined): string {
    return affiliateReferrals && affiliateReferrals.trim() !== ''
      ? affiliateReferrals
      : 'All Affiliates';
  }

  getSourcesDisplay(sources: string | undefined): string {
    return sources && sources.trim() !== '' ? sources : 'All Sources';
  }

  getOperatorInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
} 