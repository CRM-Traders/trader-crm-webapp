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
  @ViewChild('activeCell', { static: true })
  activeCellTemplate!: TemplateRef<any>;
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
      selector: (row: SalesRule) => row.country || 'All',
    },
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: SalesRule) => row.language || 'All',
    },
    {
      field: 'operatorsCount',
      header: 'Operators',
      sortable: true,
      filterable: false,
      cellTemplate: null, // Will be set in ngOnInit
      cellClass: 'text-center',
    },
    {
      field: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'boolean',
      cellTemplate: null, // Will be set in ngOnInit
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
      label: 'View Details',
      icon: 'view',
      action: (item: SalesRule) => this.viewRule(item),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      action: (item: SalesRule) => this.editRule(item),
    },
    {
      id: 'toggle-status',
      label: 'Toggle Status',
      icon: 'toggle',
      action: (item: SalesRule) => this.toggleRuleStatus(item),
    },
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

    const activeColumn = this.gridColumns.find(
      (col) => col.field === 'isActive'
    );
    if (activeColumn) activeColumn.cellTemplate = this.activeCellTemplate;

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

  editRule(rule: SalesRule): void {
    this.salesRulesService
      .getSalesRuleById(rule.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load rule details');
          console.error('Error loading rule:', error);
          return of(null);
        })
      )
      .subscribe((ruleDetails) => {
        if (ruleDetails) {
          this.openFormModal(ruleDetails);
        }
      });
  }

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
          this.refreshGrid();
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

  toggleRuleStatus(rule: SalesRule): void {
    const newStatus = !rule.isActive;
    this.salesRulesService
      .toggleRuleStatus(rule.id, newStatus)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update rule status');
          console.error('Error toggling status:', error);
          return of(null);
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success(
            `Rule ${newStatus ? 'activated' : 'deactivated'} successfully`
          );
          this.refreshGrid();
          if (this.selectedRule && this.selectedRule.id === rule.id) {
            this.selectedRule.isActive = newStatus;
          }
        }
      });
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
          this.refreshGrid();
        }
      });
  }

  // Operator Management Methods
  openAddOperatorModal(): void {
    this.operatorForm.reset({ ratio: 100 });
    this.showOperatorModal = true;
    this.loadAvailableOperators();
  }

  editOperatorRatio(operator: SalesRuleOperator): void {
    this.selectedOperator = operator;
    this.operatorForm.patchValue({
      userId: operator.userId,
      ratio: operator.ratio,
    });
    this.showOperatorModal = true;
  }

  private loadAvailableOperators(): void {
    this.loadingOperators = true;
    this.salesRulesService
      .getOperatorsDropdown({ pageSize: 100 })
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load operators');
          console.error('Error loading operators:', error);
          return of({ items: [] });
        }),
        finalize(() => (this.loadingOperators = false))
      )
      .subscribe((response) => {
        this.availableOperators = response.items || [];
      });
  }

  saveOperator(): void {
    if (this.operatorForm.invalid || !this.selectedRule) return;

    const formValue = this.operatorForm.value;

    if (this.selectedOperator) {
      // Update existing operator ratio
      this.salesRulesService
        .updateOperatorRatio(
          this.selectedRule.id,
          this.selectedOperator.userId,
          { ratio: formValue.ratio }
        )
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to update operator ratio');
            console.error('Error updating operator:', error);
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result !== null) {
            this.alertService.success('Operator ratio updated successfully');
            this.showOperatorModal = false;
            this.selectedOperator = null;
            this.viewRule(this.selectedRule!);
          }
        });
    } else {
      // Add new operator
      this.salesRulesService
        .addOperatorToRule(this.selectedRule.id, formValue)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to add operator');
            console.error('Error adding operator:', error);
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result !== null) {
            this.alertService.success('Operator added successfully');
            this.showOperatorModal = false;
            this.viewRule(this.selectedRule!);
          }
        });
    }
  }

  removeOperator(operator: SalesRuleOperator): void {
    if (!this.selectedRule) return;

    if (
      confirm(
        `Are you sure you want to remove ${operator.operatorName} from this rule?`
      )
    ) {
      this.salesRulesService
        .removeOperatorFromRule(this.selectedRule.id, operator.userId)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to remove operator');
            console.error('Error removing operator:', error);
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result !== null) {
            this.alertService.success('Operator removed successfully');
            this.viewRule(this.selectedRule!);
          }
        });
    }
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
}
