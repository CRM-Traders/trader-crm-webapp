import {
  Component,
  inject,
  TemplateRef,
  ViewChild,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
} from './models/sales-rules.model';
import { SalesRuleFormModalComponent } from './components/sales-rule-form-modal/sales-rule-form-modal.component';
import { SalesRuleDetailsModalComponent } from './components/sales-rule-details-modal/sales-rule-details-modal.component';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-sales-rules',
  standalone: true,
  imports: [CommonModule, GridComponent, HasPermissionDirective],
  templateUrl: './sales-rules.component.html',
  styleUrls: ['./sales-rules.component.scss'],
})
export class SalesRulesComponent implements OnInit, OnDestroy {
  private salesRulesService = inject(SalesRulesService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();
  gridId = 'sales-rules-grid';

  @ViewChild('priorityCell', { static: true })
  priorityCellTemplate!: TemplateRef<any>;
  @ViewChild('categoryCell', { static: true })
  categoryCellTemplate!: TemplateRef<any>;
  @ViewChild('typeCell', { static: true }) typeCellTemplate!: TemplateRef<any>;
  @ViewChild('operatorsCell', { static: true })
  operatorsCellTemplate!: TemplateRef<any>;

  loading = false;

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
      selector: (row: SalesRule) =>
        row.country && row.country.trim() !== ''
          ? row.country
          : 'All Countries',
    },
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: SalesRule) =>
        row.language && row.language.trim() !== ''
          ? row.language
          : 'All Languages',
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
      selector: (row: SalesRule) =>
        row.sources && row.sources.trim() !== '' ? row.sources : 'All Sources',
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
      permission: 86,
    },
  ];

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
    this.openDetailsModal(rule.id);
  }

  private openDetailsModal(ruleId: string): void {
    const modalRef = this.modalService.open(
      SalesRuleDetailsModalComponent,
      {
        size: 'xl',
        centered: true,
        closable: true,
      },
      {
        ruleId: ruleId,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
        }
      },
      () => {
        // Modal dismissed
      }
    );
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
          this.refreshSpecificGrid();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  loadSalesRules(): void {
    this.loading = true;
    this.salesRulesService
      .getSalesRules()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load sales rules');
          return of([]);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((rules) => {});
  }

  refreshSpecificGrid(): void {
    const event = new CustomEvent('refreshGrid', {
      detail: { gridId: this.gridId },
    });
    window.dispatchEvent(event);
  }

  refreshGrid(): void {
    const gridComponent = document.querySelector(
      `app-grid[gridId="sales-rules-grid"]`
    );
    if (gridComponent) {
      (gridComponent as any).refresh?.();
    }
  }

  refreshData(): void {
    this.refreshSpecificGrid();
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
