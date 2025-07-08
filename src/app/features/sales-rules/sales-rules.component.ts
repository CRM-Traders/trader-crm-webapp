// src/app/features/sales-rules/sales-rules.component.ts

import {
  Component,
  inject,
  TemplateRef,
  ViewChild,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { GridComponent } from '../../shared/components/grid/grid.component';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import { SalesRulesService } from './services/sales-rules.service';
import {
  SalesRule,
  SalesRuleDetails,
  RuleCategory,
  RulePriority,
  RuleType,
  RuleCategoryLabels,
  RulePriorityLabels,
  RuleTypeLabels,
  RulePriorityColors,
  SalesRuleOperator,
} from './models/sales-rules.model';
import { SalesRuleFormModalComponent } from './components/sales-rule-form-modal/sales-rule-form-modal.component';

@Component({
  selector: 'app-sales-rules',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './sales-rules.component.html',
  styleUrls: ['./sales-rules.component.scss'],
})
export class SalesRulesComponent implements OnInit, OnDestroy {
  private salesRulesService = inject(SalesRulesService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @ViewChild('priorityCell', { static: true })
  priorityCellTemplate!: TemplateRef<any>;
  @ViewChild('categoryCell', { static: true })
  categoryCellTemplate!: TemplateRef<any>;
  @ViewChild('typeCell', { static: true }) typeCellTemplate!: TemplateRef<any>;
  @ViewChild('operatorsCell', { static: true })
  operatorsCellTemplate!: TemplateRef<any>;

  selectedRule: SalesRuleDetails | null = null;
  isEditing = false;
  loading = false;
  showDeleteModal = false;
  ruleToDelete: SalesRule | null = null;

  // Operator management
  selectedOperator: SalesRuleOperator | null = null;
  showOperatorModal = false;
  operatorForm: FormGroup;
  availableOperators: any[] = [];
  loadingOperators = false;

  // Expose enums and labels to template
  RuleCategory = RuleCategory;
  RulePriority = RulePriority;
  RuleType = RuleType;
  RuleCategoryLabels = RuleCategoryLabels;
  RulePriorityLabels = RulePriorityLabels;
  RuleTypeLabels = RuleTypeLabels;
  RulePriorityColors = RulePriorityColors;

  gridColumns: GridColumn[] = [
    {
      field: 'name',
      header: 'Rule Name',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
      selector: (row: SalesRule) => row.name,
    },
    {
      field: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.keys(RuleCategory)
        .filter((k) => !isNaN(Number(k)))
        .map((k) => ({
          label: RuleCategoryLabels[Number(k) as RuleCategory],
          value: k,
        })),
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'priority',
      header: 'Priority',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.keys(RulePriority)
        .filter((k) => !isNaN(Number(k)))
        .map((k) => ({
          label: RulePriorityLabels[Number(k) as RulePriority],
          value: k,
        })),
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'type',
      header: 'Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.keys(RuleType)
        .filter((k) => !isNaN(Number(k)))
        .map((k) => ({
          label: RuleTypeLabels[Number(k) as RuleType],
          value: k,
        })),
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: SalesRule) => (row.country && row.country.trim() !== '') ? row.country : 'All Countries',
    },
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: SalesRule) => (row.language && row.language.trim() !== '') ? row.language : 'All Languages',
    },
    {
      field: 'operators',
      header: 'Operators',
      sortable: true,
      filterable: false,
      cellTemplate: null, // Will be set in ngOnInit
      cellClass: 'text-center',
      selector: (row: SalesRule) => row.operators?.length || 0,
    },
    {
      field: 'sources',
      header: 'Sources',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: SalesRule) => (row.sources && row.sources.trim() !== '') ? row.sources : 'All Sources',
    },
    {
      field: 'createdAt',
      header: 'Created',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View',
      icon: 'view',
      action: (item: SalesRule) => this.viewRule(item),
    },
    // {
    //   id: 'edit',
    //   label: 'Edit',
    //   icon: 'edit',
    //   action: (item: SalesRule) => this.editRule(item),
    // },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      action: (item: SalesRule) => this.confirmDelete(item),
    },
  ];

  constructor() {
    this.operatorForm = this.fb.group({
      userId: ['', Validators.required],
      ratio: [
        100,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
    });
  }

  ngOnInit(): void {
    this.setupCellTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupCellTemplates(): void {
    const categoryColumn = this.gridColumns.find(
      (col) => col.field === 'category'
    );
    if (categoryColumn) categoryColumn.cellTemplate = this.categoryCellTemplate;

    const priorityColumn = this.gridColumns.find(
      (col) => col.field === 'priority'
    );
    if (priorityColumn) priorityColumn.cellTemplate = this.priorityCellTemplate;

    const typeColumn = this.gridColumns.find((col) => col.field === 'type');
    if (typeColumn) typeColumn.cellTemplate = this.typeCellTemplate;

    const operatorsColumn = this.gridColumns.find(
      (col) => col.field === 'operatorsCount'
    );
    if (operatorsColumn)
      operatorsColumn.cellTemplate = this.operatorsCellTemplate;
  }

  onRowClick(rule: SalesRule): void {
    this.viewRule(rule);
  }

  viewRule(rule: SalesRule): void {
    this.loading = true;
    this.salesRulesService
      .getSalesRuleById(rule.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load rule details');
          console.error('Error loading rule:', error);
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((ruleDetails) => {
        if (ruleDetails) {
          this.selectedRule = ruleDetails;
          this.isEditing = false;
        }
      });
  }

  // editRule(rule: SalesRule): void {
  //   this.loading = true;
  //   this.salesRulesService
  //     .getSalesRuleById(rule.id)
  //     .pipe(
  //       takeUntil(this.destroy$),
  //       catchError((error) => {
  //         this.alertService.error('Failed to load rule details');
  //         console.error('Error loading rule:', error);
  //         return of(null);
  //       }),
  //       finalize(() => this.loading = false)
  //     )
  //     .subscribe((ruleDetails) => {
  //       if (ruleDetails) {
  //         this.openFormModal(ruleDetails);
  //       }
  //     });
  // }

  createRule(): void {
    this.openFormModal();
  }

  private openFormModal(rule?: SalesRuleDetails): void {
    const modalRef = this.modalService.open(
      SalesRuleFormModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        rule: rule,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshData();
          if (this.selectedRule && this.selectedRule.id === result.id) {
            this.viewRule(result);
          }
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  confirmDelete(rule: SalesRule): void {
    this.ruleToDelete = rule;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.ruleToDelete = null;
  }

  deleteRule(): void {
    if (!this.ruleToDelete) return;

    this.loading = true;
    this.salesRulesService
      .deleteSalesRule(this.ruleToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to delete rule');
          console.error('Error deleting rule:', error);
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.showDeleteModal = false;
          this.ruleToDelete = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Rule deleted successfully');
          if (this.selectedRule?.id === this.ruleToDelete?.id) {
            this.selectedRule = null;
          }
          this.refreshData();
        }
      });
  }

  // Operator Management Methods
  // openAddOperatorModal(): void {
  //   this.operatorForm.reset({ ratio: 100 });
  //   this.showOperatorModal = true;
  //   this.loadAvailableOperators();
  // }

  // editOperatorRatio(operator: SalesRuleOperator): void {
  //   this.selectedOperator = operator;
  //   this.operatorForm.patchValue({
  //     userId: operator.userId,
  //     ratio: operator.ratio,
  //   });
  //   this.showOperatorModal = true;
  //   // Don't load available operators when editing ratio
  // }

  // private loadAvailableOperators(): void {
  //   this.loadingOperators = true;
  //   this.salesRulesService
  //     .getOperatorsDropdown({ pageSize: 100 })
  //     .pipe(
  //       takeUntil(this.destroy$),
  //       catchError((error) => {
  //         this.alertService.error('Failed to load operators');
  //         console.error('Error loading operators:', error);
  //         return of({ items: [] });
  //       }),
  //       finalize(() => (this.loadingOperators = false))
  //     )
  //     .subscribe((response) => {
  //       this.availableOperators = response.items || [];
  //     });
  // }

  saveOperator(): void {
  //   if (this.operatorForm.invalid || !this.selectedRule) return;

  //   const formValue = this.operatorForm.value;

  //   if (this.selectedOperator) {
  //     // Update existing operator ratio
  //     this.salesRulesService
  //       .updateOperatorRatio(
  //         this.selectedRule.id,
  //         this.selectedOperator.userId,
  //         { ratio: formValue.ratio }
  //       )
  //       .pipe(
  //         takeUntil(this.destroy$),
  //         catchError((error) => {
  //           this.alertService.error('Failed to update operator ratio');
  //           console.error('Error updating operator:', error);
  //           return of(null);
  //         })
  //       )
  //       .subscribe((result) => {
  //         if (result !== null) {
  //           this.alertService.success('Operator ratio updated successfully');
  //           this.showOperatorModal = false;
  //           this.selectedOperator = null;
  //           this.viewRule(this.selectedRule!);
  //         }
  //       });
  //   } else {
  //     // Add new operator
  //     this.salesRulesService
  //       .addOperatorToRule(this.selectedRule.id, formValue)
  //       .pipe(
  //         takeUntil(this.destroy$),
  //         catchError((error) => {
  //           this.alertService.error('Failed to add operator');
  //           console.error('Error adding operator:', error);
  //           return of(null);
  //         })
  //       )
  //       .subscribe((result) => {
  //         if (result !== null) {
  //           this.alertService.success('Operator added successfully');
  //           this.showOperatorModal = false;
  //           this.viewRule(this.selectedRule!);
  //         }
  //       });
  //   }
  }

  // Enhanced method to update multiple operators at once
  // updateOperatorsBatch(operators: SalesRuleOperator[]): void {
  //   if (!this.selectedRule) return;

  //   const operatorRequests = operators.map(op => ({
  //     userId: op.userId,
  //     ratio: op.ratio
  //   }));

  //   this.salesRulesService
  //     .batchUpdateOperators(this.selectedRule.id, operatorRequests)
  //     .pipe(
  //       takeUntil(this.destroy$),
  //       catchError((error) => {
  //         this.alertService.error('Failed to update operators');
  //         console.error('Error updating operators:', error);
  //         return of(null);
  //       })
  //     )
  //     .subscribe((result) => {
  //       if (result !== null) {
  //         this.alertService.success('Operators updated successfully');
  //         this.viewRule(this.selectedRule!);
  //       }
  //     });
  // }

  // removeOperator(operator: SalesRuleOperator): void {
  //   if (!this.selectedRule) return;

  //   if (
  //     confirm(
  //       `Are you sure you want to remove ${operator.operatorName} from this rule?`
  //     )
  //   ) {
  //     this.salesRulesService
  //       .removeOperatorFromRule(this.selectedRule.id, operator.userId)
  //       .pipe(
  //         takeUntil(this.destroy$),
  //         catchError((error) => {
  //           this.alertService.error('Failed to remove operator');
  //           console.error('Error removing operator:', error);
  //           return of(null);
  //         })
  //       )
  //       .subscribe((result) => {
  //         if (result !== null) {
  //           this.alertService.success('Operator removed successfully');
  //           this.viewRule(this.selectedRule!);
  //         }
  //       });
  //   }
  // }

  loadSalesRules(): void {
    this.loading = true;
    this.salesRulesService
      .getSalesRules()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load sales rules');
          console.error('Error loading sales rules:', error);
          return of([]);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((rules) => {
        // Handle loaded rules if needed
        console.log('Loaded sales rules:', rules);
      });
  }

  closeOperatorModal(): void {
    this.showOperatorModal = false;
    this.selectedOperator = null;
    this.operatorForm.reset();
  }

  closeDetails(): void {
    this.selectedRule = null;
    this.isEditing = false;
  }

  refreshGrid(): void {
    const gridComponent = document.querySelector(
      `app-grid[gridId="sales-rules-grid"]`
    );
    if (gridComponent) {
      (gridComponent as any).refresh?.();
    }
  }

  // Enhanced refresh method that also refreshes the selected rule details
  refreshData(): void {
    this.refreshGrid();
    if (this.selectedRule) {
      this.viewRule(this.selectedRule);
    }
  }

  // Validate total operator ratio
  validateOperatorRatios(): boolean {
    if (!this.selectedRule || !this.selectedRule.operators) {
      return true;
    }
    
    const totalRatio = this.selectedRule.operators.reduce((sum, op) => sum + op.ratio, 0);
    return Math.abs(totalRatio - 100) < 0.01; // Allow for small floating point differences
  }

  // Get total operator ratio for display
  getTotalOperatorRatio(): number {
    if (!this.selectedRule || !this.selectedRule.operators) {
      return 0;
    }
    return this.selectedRule.operators.reduce((sum, op) => sum + op.ratio, 0);
  }

  // Auto-adjust operator ratios to equal 100%
  // autoAdjustRatios(): void {
  //   if (!this.selectedRule || !this.selectedRule.operators || this.selectedRule.operators.length === 0) {
  //     return;
  //   }

  //   const operators = [...this.selectedRule.operators];
  //   const count = operators.length;
  //   const equalRatio = 100 / count;

  //   // Set all but last to floor, last to remainder for exact 100
  //   let total = 0;
  //   for (let i = 0; i < count - 1; i++) {
  //     operators[i].ratio = Math.floor(equalRatio * 1000000) / 1000000;
  //     total += operators[i].ratio;
  //   }
  //   operators[count - 1].ratio = Math.round((100 - total) * 1000000) / 1000000;

  //   // Update the operators using batch operation
  //   this.updateOperatorsBatch(operators);
  // }

  // Save current operator ratios as they are
  // saveCurrentRatios(): void {
  //   if (!this.selectedRule || !this.selectedRule.operators) {
  //     return;
  //   }

  //   this.updateOperatorsBatch(this.selectedRule.operators);
  // }

  getRuleCategory(value: any) {
    return RuleCategoryLabels[value as RuleCategory];
  }

  getRulePriorityColors(value: any) {
    return RulePriorityColors[value as RulePriority];
  }

  getRulePriorityLabels(value: any) {
    return RulePriorityLabels[value as RulePriority];
  }

  getRuleTypeLabels(value: any) {
    return RuleTypeLabels[value as RuleType];
  }

  // Helper methods for displaying empty values
  getCountryDisplay(country: string): string {
    return country && country.trim() !== '' ? country : 'All Countries';
  }

  getLanguageDisplay(language: string): string {
    return language && language.trim() !== '' ? language : 'All Languages';
  }

  getPartnersDisplay(partners: string): string {
    return partners && partners.trim() !== '' ? partners : 'All Partners';
  }

  getAffiliateReferralsDisplay(affiliateReferrals: string | null): string {
    return affiliateReferrals && affiliateReferrals.trim() !== ''
      ? affiliateReferrals
      : 'All Affiliates';
  }

  getSourcesDisplay(sources: string): string {
    return sources && sources.trim() !== '' ? sources : 'All Sources';
  }
}
