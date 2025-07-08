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
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { GridComponent } from '../../../../shared/components/grid/grid.component';

import {
  OfficeRule,
  OfficeManager,
  RuleCategory,
  RuleCategoryOption,
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
  templateUrl: './office-rules.component.html',
  styleUrls: ['./office-rules.component.scss'],
})
export class OfficeRulesComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private officeRulesService = inject(OfficeRulesService);
  private officesService = inject(OfficesService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  @ViewChild('categoryCell', { static: true })
  categoryCellTemplate!: TemplateRef<any>;
  @ViewChild('priorityCell', { static: true })
  priorityCellTemplate!: TemplateRef<any>;
  @ViewChild('typeCell', { static: true })
  typeCellTemplate!: TemplateRef<any>;
  @ViewChild('operatorsCell', { static: true })
  operatorsCellTemplate!: TemplateRef<any>;
  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;

  officeId!: string;
  office: Office | null = null;
  managers: OfficeManager[] = []; // Changed to array
  loading = false;
  gridId = 'office-rules-grid';

  // Manager deletion state
  showDeleteManagerModal = false;
  managerToDelete: OfficeManager | null = null;
  deletingManager = false;

  // Rule deletion state
  showDeleteModal = false;
  ruleToDelete: OfficeRule | null = null;
  deletingRule = false;

  categories: RuleCategoryOption[] = [];
  priorities: RulePriority[] = [];
  types: RuleType[] = [];
  operators: OperatorDropdownItem[] = [];
  allOperators: OperatorDropdownItem[] = [];

  availableCountries: { label: string; value: string }[] = [];
  availableLanguages: { label: string; value: string }[] = [];
  availableCategories: { label: string; value: string }[] = [];
  availablePriorities: { label: string; value: string }[] = [];
  availableTypes: { label: string; value: string }[] = [];
  availableAffiliateReferrals: { label: string; value: string }[] = [];

  gridColumns: GridColumn[] = [
    {
      field: 'name',
      header: 'Rule Name',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
    },
    // {
    //   field: 'category',
    //   header: 'Category',
    //   sortable: true,
    //   filterable: true,
    //   filterType: 'select',
    //   filterOptions: [],
    //   cellTemplate: null,
    // },
    {
      field: 'priority',
      header: 'Priority',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      cellTemplate: null,
    },
    {
      field: 'type',
      header: 'Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      cellTemplate: null,
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: this.availableCountries,
    },
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
    },
    {
      field: 'affiliateReferrals',
      header: 'Affiliate Referral',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      hidden: true,
    },
    {
      field: 'operatorsCount',
      header: 'Operators',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cellTemplate: null,
    },
    {
      field: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'boolean',
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
        this.loadAllOperators();
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
      managers: this.officeRulesService
        .getOfficeManagers(this.officeId)
        .pipe(catchError(() => of([]))),
      operators: this.officeRulesService
        .getBranchOperators(this.officeId)
        .pipe(catchError(() => of([]))),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: ({ office, managers, operators }) => {
          this.office = office;
          this.managers = managers;
          this.operators = operators;

          console.log('Loaded office data:', {
            office: office?.name,
            managersCount: this.managers.length,
            operatorsCount: this.operators.length,
            managers: managers,
          });
        },
        error: (error) => {
          console.error('Failed to load office data:', error);
          this.alertService.error('Failed to load office data');
          this.navigateBack();
        },
      });
  }

  private loadAllOperators(): void {
    this.officeRulesService
      .getAvailableOperators(0, 100)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading all operators:', error);
          return of([]);
        })
      )
      .subscribe((operators) => {
        this.allOperators = operators;
        console.log('Loaded all operators:', operators.length);
      });
  }

  private loadLookupData(): void {
    forkJoin({
      categories: this.officeRulesService.getRuleCategories(),
      priorities: this.officeRulesService.getRulePriorities(),
      types: this.officeRulesService.getRuleTypes(),
      countries: this.countryService.getCountries(),
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading lookup data:', error);
          return of({
            categories: [],
            priorities: [],
            types: [],
            countries: [],
          });
        })
      )
      .subscribe((data) => {
        this.categories = data.categories;
        this.priorities = data.priorities;
        this.types = data.types;

        this.prepareFilterOptions(data);
        this.updateGridColumnFilterOptions();

        console.log('Loaded lookup data:', {
          categoriesCount: this.categories.length,
          prioritiesCount: this.priorities.length,
          typesCount: this.types.length,
        });
      });
  }

  private prepareFilterOptions(data: any): void {
    this.availableCategories = this.categories.map((cat: any) => ({
      label: cat.name,
      value: cat.value.toString(),
    }));

    this.availablePriorities = this.priorities.map((priority: any) => ({
      label: priority.name,
      value: priority.value.toString(),
    }));

    this.availableTypes = this.types.map((type: any) => ({
      label: type.name,
      value: type.value.toString(),
    }));

    this.availableCountries = data.countries.map((country: any) => ({
      label: country.name,
      value: country.code,
    }));

    const languages = this.languageService.getAllLanguages();
    this.availableLanguages = languages.map((lang) => ({
      label: lang.value,
      value: lang.key,
    }));
  }

  private updateGridColumnFilterOptions(): void {
    const categoryColumn = this.gridColumns.find(
      (col) => col.field === 'category'
    );
    if (categoryColumn) {
      categoryColumn.filterOptions = this.availableCategories;
    }

    const priorityColumn = this.gridColumns.find(
      (col) => col.field === 'priority'
    );
    if (priorityColumn) {
      priorityColumn.filterOptions = this.availablePriorities;
    }

    const typeColumn = this.gridColumns.find((col) => col.field === 'type');
    if (typeColumn) {
      typeColumn.filterOptions = this.availableTypes;
    }

    const countryColumn = this.gridColumns.find(
      (col) => col.field === 'country'
    );
    if (countryColumn) {
      countryColumn.filterOptions = this.availableCountries;
    }

    const languageColumn = this.gridColumns.find(
      (col) => col.field === 'language'
    );
    if (languageColumn) {
      languageColumn.filterOptions = this.availableLanguages;
    }

    const affiliateColumn = this.gridColumns.find(
      (col) => col.field === 'affiliateReferrals'
    );
    if (affiliateColumn) {
      affiliateColumn.filterOptions = this.availableAffiliateReferrals;
    }
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
          this.loadLookupData();
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
          this.loadLookupData();
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
          this.loadLookupData();
        },
        error: (error) => {
          this.alertService.error('Failed to delete rule');
        },
      });
  }

  openAddManagerModal(): void {
    // Filter out operators who are already managers
    const existingManagerIds = this.managers.map((m: any) => m.operatorId);
    const availableOperators = (
      this.operators.length > 0 ? this.operators : this.allOperators
    ).filter((op) => !existingManagerIds.includes(op.id));

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
        currentManager: null, // No current manager when adding to multiple
        operators: availableOperators,
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

  confirmRemoveManager(manager: OfficeManager): void {
    this.managerToDelete = manager;
    this.showDeleteManagerModal = true;
  }

  cancelRemoveManager(): void {
    this.showDeleteManagerModal = false;
    this.managerToDelete = null;
  }

  removeManager(): void {
    if (!this.managerToDelete) return;

    this.deletingManager = true;
    this.officeRulesService
      .removeOfficeManager(this.managerToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deletingManager = false;
          this.showDeleteManagerModal = false;
          this.managerToDelete = null;
        })
      )
      .subscribe({
        next: () => {
          this.alertService.success('Manager removed successfully');
          this.loadOfficeData();
        },
        error: (error) => {
          console.error('Failed to remove manager:', error);
          this.alertService.error(
            'Failed to remove manager. Please try again.'
          );
        },
      });
  }

  // Helper methods
  get hasManagers(): boolean {
    return this.managers.length > 0;
  }

  get managerNames(): string {
    return this.managers.map((m) => m.operatorName).join(', ');
  }
}
