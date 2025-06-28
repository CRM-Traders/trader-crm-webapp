// src/app/features/officies/components/office-rules/office-rules.component.ts

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, catchError, of, finalize, forkJoin } from 'rxjs';

import { OfficeRulesService } from '../../services/office-rules.service';
import { OfficesService } from '../../services/offices.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import { GridComponent } from '../../../../shared/components/grid/grid.component';

import {
  OfficeRule,
  OfficeManager,
  RuleCategory,
  RulePriority,
  RuleType,
  OperatorDropdownItem,
} from '../../models/office-rules.model';
import { Office } from '../../models/office.model';
import {
  GridColumn,
  GridAction,
} from '../../../../shared/models/grid/grid-column.model';
import { AddManagerModalComponent } from '../add-manager-modal/add-manager-modal.component';
import { CreateRuleModalComponent } from '../create-rule-modal/create-rule-modal.component';

@Component({
  selector: 'app-office-rules',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Page Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <nav class="flex mb-4" aria-label="Breadcrumb">
                <ol class="inline-flex items-center space-x-1 md:space-x-3">
                  <li class="inline-flex items-center">
                    <button
                      (click)="navigateBack()"
                      class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
                    >
                      <svg
                        class="w-3 h-3 mr-2.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
                        ></path>
                      </svg>
                      Offices
                    </button>
                  </li>
                  <li>
                    <div class="flex items-center">
                      <svg
                        class="w-3 h-3 text-gray-400 mx-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                      <span
                        class="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400"
                        >{{ office?.name || 'Office Rules' }}</span
                      >
                    </div>
                  </li>
                </ol>
              </nav>

              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ office?.name || 'Office Rules' }}
              </h1>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {{ office?.country || '' }} - {{ office?.brandName || '' }}
              </p>
              <p
                class="text-sm text-gray-500 dark:text-gray-400"
                *ngIf="!hasManager"
              >
                Current branch does not have a manager
              </p>
            </div>

            <div class="flex gap-3">
              <button
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                (click)="openAddManagerModal()"
              >
                <svg
                  class="mr-2 -ml-1 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                {{ hasManager ? 'Change Manager' : 'Add Manager' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Manager Section -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8"
          *ngIf="hasManager && manager"
        >
          <div class="p-6">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              Office Manager
            </h3>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div
                  class="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"
                >
                  <svg
                    class="h-6 w-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h4
                    class="text-base font-medium text-gray-900 dark:text-white"
                  >
                    {{ manager.operatorName }}
                  </h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ manager.operatorEmail }}
                  </p>
                </div>
              </div>
              <button
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                (click)="removeManager()"
              >
                Remove Manager
              </button>
            </div>
          </div>
        </div>

        <!-- Office Rules Section -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Office Rules
              </h3>
              <button
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                (click)="openCreateRuleModal()"
              >
                <svg
                  class="mr-2 -ml-1 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Rule
              </button>
            </div>

            <!-- Search Filters -->
            <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >Country</label
                >
                <select
                  [(ngModel)]="countryFilter"
                  (ngModelChange)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Any</option>
                  <option
                    *ngFor="let country of availableCountries"
                    [value]="country"
                  >
                    {{ country }}
                  </option>
                </select>
              </div>

              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >Language</label
                >
                <select
                  [(ngModel)]="languageFilter"
                  (ngModelChange)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Any</option>
                  <option
                    *ngFor="let language of availableLanguages"
                    [value]="language"
                  >
                    {{ language }}
                  </option>
                </select>
              </div>

              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >Affiliate referral</label
                >
                <select
                  [(ngModel)]="affiliateReferralFilter"
                  (ngModelChange)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Any</option>
                  <option
                    *ngFor="let referral of availableAffiliateReferrals"
                    [value]="referral"
                  >
                    {{ referral }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Rules Grid -->
          <div class="overflow-x-auto">
            <app-grid
              [gridId]="gridId"
              [endpoint]="'identity/api/rules'"
              [columns]="gridColumns"
              [actions]="gridActions"
              [sortable]="true"
              [enableContextMenu]="true"
              [exportable]="false"
              [selectable]="false"
              [showColumnSelector]="false"
              [showFilters]="false"
              emptyMessage="No rules found"
              (rowClick)="onRuleClick($event)"
            >
              <ng-template #categoryCell let-value="value" let-row="row">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {{ row.categoryName }}
                </span>
              </ng-template>

              <ng-template #priorityCell let-value="value" let-row="row">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  {{ row.priorityName }}
                </span>
              </ng-template>

              <ng-template #typeCell let-value="value" let-row="row">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  {{ row.typeName }}
                </span>
              </ng-template>

              <ng-template #operatorsCell let-value="value">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                >
                  {{ value }} operator{{ value !== 1 ? 's' : '' }}
                </span>
              </ng-template>

              <ng-template #statusCell let-value="value">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="{
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                      value,
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                      !value
                  }"
                >
                  {{ value ? 'Active' : 'Inactive' }}
                </span>
              </ng-template>
            </app-grid>
          </div>
        </div>

        <!-- Reset Filters -->
        <div class="mt-4 flex justify-end" *ngIf="hasActiveFilters()">
          <button
            (click)="resetFilters()"
            class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div *ngIf="showDeleteModal" class="fixed z-50 inset-0 overflow-y-auto">
      <div
        class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <div class="fixed inset-0 transition-opacity -z-1" aria-hidden="true">
          <div class="absolute inset-0 bg-black/30 -z-1"></div>
        </div>

        <span
          class="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
          >&#8203;</span
        >

        <div
          class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        >
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10"
              >
                <svg
                  class="h-6 w-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3
                  class="text-lg leading-6 font-medium text-gray-900 dark:text-white"
                >
                  Delete Rule
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete the rule
                    <strong>{{ ruleToDelete?.name }}</strong
                    >? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div
            class="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
          >
            <button
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              (click)="deleteRule()"
              [disabled]="deletingRule"
            >
              {{ deletingRule ? 'Deleting...' : 'Delete' }}
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              (click)="cancelDelete()"
              [disabled]="deletingRule"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .side-panel-overlay {
        z-index: 50;
        animation: slide-in 0.3s ease-out;
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      }

      @keyframes slide-in {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }

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
export class OfficeRulesComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private officeRulesService = inject(OfficeRulesService);
  private officesService = inject(OfficesService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  @ViewChild('categoryCell', { static: true })
  categoryCellTemplate!: TemplateRef<any>;
  @ViewChild('priorityCell', { static: true })
  priorityCellTemplate!: TemplateRef<any>;
  @ViewChild('typeCell', { static: true }) typeCellTemplate!: TemplateRef<any>;
  @ViewChild('operatorsCell', { static: true })
  operatorsCellTemplate!: TemplateRef<any>;
  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;

  officeId!: string;
  office: Office | null = null;
  manager: OfficeManager | null = null;
  hasManager = false;
  loading = false;
  gridId = 'office-rules-grid';

  // Filter properties
  countryFilter = '';
  languageFilter = '';
  affiliateReferralFilter = '';
  availableCountries: string[] = [];
  availableLanguages: string[] = [];
  availableAffiliateReferrals: string[] = [];

  // Delete modal
  showDeleteModal = false;
  ruleToDelete: OfficeRule | null = null;
  deletingRule = false;

  // Lookup data
  categories: RuleCategory[] = [];
  priorities: RulePriority[] = [];
  types: RuleType[] = [];
  operators: OperatorDropdownItem[] = [];

  gridColumns: GridColumn[] = [
    {
      field: 'name',
      header: 'Rule Name',
      sortable: true,
      filterable: true,
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
    },
    {
      field: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      cellTemplate: null,
    },
    {
      field: 'priority',
      header: 'Priority',
      sortable: true,
      filterable: true,
      cellTemplate: null,
    },
    {
      field: 'type',
      header: 'Type',
      sortable: true,
      filterable: true,
      cellTemplate: null,
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
    },
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
    },
    {
      field: 'operatorsCount',
      header: 'Operators',
      sortable: true,
      filterable: true,
      cellTemplate: null,
    },
    {
      field: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      cellTemplate: null,
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      action: (item: OfficeRule) => this.editRule(item),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      action: (item: OfficeRule) => this.confirmDeleteRule(item),
    },
  ];

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.officeId = params.get('id') || '';
      if (this.officeId) {
        this.loadOfficeData();
        this.loadLookupData();
      } else {
        this.alertService.error('Office ID is required');
        this.navigateBack();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeGridTemplates(): void {
    setTimeout(() => {
      const categoryColumn = this.gridColumns.find(
        (col) => col.field === 'category'
      );
      if (categoryColumn)
        categoryColumn.cellTemplate = this.categoryCellTemplate;

      const priorityColumn = this.gridColumns.find(
        (col) => col.field === 'priority'
      );
      if (priorityColumn)
        priorityColumn.cellTemplate = this.priorityCellTemplate;

      const typeColumn = this.gridColumns.find((col) => col.field === 'type');
      if (typeColumn) typeColumn.cellTemplate = this.typeCellTemplate;

      const operatorsColumn = this.gridColumns.find(
        (col) => col.field === 'operatorsCount'
      );
      if (operatorsColumn)
        operatorsColumn.cellTemplate = this.operatorsCellTemplate;

      const statusColumn = this.gridColumns.find(
        (col) => col.field === 'isActive'
      );
      if (statusColumn) statusColumn.cellTemplate = this.statusCellTemplate;
    });
  }

  private loadOfficeData(): void {
    this.loading = true;
    forkJoin({
      office: this.officesService.getOfficeById(this.officeId),
      manager: this.officeRulesService
        .getOfficeManager(this.officeId)
        .pipe(catchError(() => of(null))),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: ({ office, manager }) => {
          this.office = office;
          this.manager = manager;
          this.hasManager = !!manager;
        },
        error: (error) => {
          this.alertService.error('Failed to load office data');
          this.navigateBack();
        },
      });
  }

  private loadLookupData(): void {
    forkJoin({
      categories: this.officeRulesService.getRuleCategories(),
      priorities: this.officeRulesService.getRulePriorities(),
      types: this.officeRulesService.getRuleTypes(),
      operators: this.officeRulesService.getAvailableOperators(),
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading lookup data:', error);
          return of({
            categories: [],
            priorities: [],
            types: [],
            operators: [],
          });
        })
      )
      .subscribe((data) => {
        this.categories = data.categories;
        this.priorities = data.priorities;
        this.types = data.types;
        this.operators = data.operators;
      });
  }

  getGridRequestBody(): any {
    const filters: any = {
      objectId: this.officeId,
    };

    if (this.countryFilter) {
      filters.country = this.countryFilter;
    }
    if (this.languageFilter) {
      filters.language = this.languageFilter;
    }
    if (this.affiliateReferralFilter) {
      filters.affiliateReferrals = this.affiliateReferralFilter;
    }

    return {
      pageIndex: 1,
      pageSize: 100,
      filters: {
        additional_properties: Object.keys(filters).map((key) => ({
          field: key,
          operator: 'equals',
          value: filters[key],
        })),
      },
    };
  }

  applyFilters(): void {
    this.refreshGrid();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.countryFilter ||
      this.languageFilter ||
      this.affiliateReferralFilter
    );
  }

  resetFilters(): void {
    this.countryFilter = '';
    this.languageFilter = '';
    this.affiliateReferralFilter = '';
    this.refreshGrid();
  }

  private refreshGrid(): void {
    const event = new CustomEvent('refreshGrid', {
      detail: { gridId: this.gridId },
    });
    window.dispatchEvent(event);
  }

  navigateBack(): void {
    this.router.navigate(['/offices']);
  }

  onRuleClick(rule: OfficeRule): void {
    this.editRule(rule);
  }

  openCreateRuleModal(): void {
    const modalRef = this.modalService.open(
      CreateRuleModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        officeId: this.officeId,
        categories: this.categories,
        priorities: this.priorities,
        types: this.types,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshGrid();
        }
      },
      () => {}
    );
  }

  editRule(rule: OfficeRule): void {
    const modalRef = this.modalService.open(
      CreateRuleModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        officeId: this.officeId,
        rule: rule,
        categories: this.categories,
        priorities: this.priorities,
        types: this.types,
        isEditing: true,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshGrid();
        }
      },
      () => {}
    );
  }

  confirmDeleteRule(rule: OfficeRule): void {
    this.ruleToDelete = rule;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.ruleToDelete = null;
  }

  deleteRule(): void {
    if (!this.ruleToDelete) return;

    this.deletingRule = true;
    this.officeRulesService
      .deleteRule(this.ruleToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deletingRule = false;
          this.showDeleteModal = false;
          this.ruleToDelete = null;
        })
      )
      .subscribe({
        next: () => {
          this.alertService.success('Rule deleted successfully');
          this.refreshGrid();
        },
        error: (error) => {
          this.alertService.error('Failed to delete rule');
        },
      });
  }

  openAddManagerModal(): void {
    const modalRef = this.modalService.open(
      AddManagerModalComponent,
      {
        size: 'md',
        centered: true,
        closable: true,
      },
      {
        officeId: this.officeId,
        officeName: this.office?.name || '',
        currentManager: this.manager,
        operators: this.operators,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadOfficeData();
        }
      },
      () => {}
    );
  }

  removeManager(): void {
    if (!this.manager) return;

    this.officeRulesService
      .removeOfficeManager(this.officeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.success('Manager removed successfully');
          this.loadOfficeData();
        },
        error: (error) => {
          this.alertService.error('Failed to remove manager');
        },
      });
  }
}
