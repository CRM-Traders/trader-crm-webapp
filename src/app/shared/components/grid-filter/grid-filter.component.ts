// src/app/shared/components/grid/grid-filter/grid-filter.component.ts
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { FilterOperator } from '../../models/grid/filter-operator.model';
import { GridColumn } from '../../models/grid/grid-column.model';
import { GridFilterState } from '../../models/grid/grid-filter-state.model';
import { GridFilter } from '../../models/grid/grid-filter.model';
import { GridService } from '../../services/grid/grid.service';

@Component({
  selector: 'app-grid-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './grid-filter.component.html',
  styleUrls: ['./grid-filter.component.scss'],
})
export class GridFilterComponent implements OnInit, OnDestroy {
  private gridService = inject(GridService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @Input() columns: GridColumn[] = [];
  @Input() gridId: string = 'default-grid';

  @Output() filterChange = new EventEmitter<GridFilterState>();

  filterForm: FormGroup;
  activeFilters: { field: string; operator: FilterOperator; value: any }[] = [];

  operatorsByType: Record<string, { value: FilterOperator; label: string }[]> =
    {
      text: [
        { value: FilterOperator.EQUALS, label: 'Equals' },
        { value: FilterOperator.NOT_EQUALS, label: 'Not Equals' },
        { value: FilterOperator.CONTAINS, label: 'Contains' },
        { value: FilterOperator.STARTS_WITH, label: 'Starts With' },
        { value: FilterOperator.ENDS_WITH, label: 'Ends With' },
        { value: FilterOperator.IS_NULL, label: 'Is Empty' },
        { value: FilterOperator.IS_NOT_NULL, label: 'Is Not Empty' },
      ],
      number: [
        { value: FilterOperator.EQUALS, label: 'Equals' },
        { value: FilterOperator.NOT_EQUALS, label: 'Not Equals' },
        { value: FilterOperator.GREATER_THAN, label: 'Greater Than' },
        {
          value: FilterOperator.GREATER_THAN_OR_EQUALS,
          label: 'Greater Than or Equal',
        },
        { value: FilterOperator.LESS_THAN, label: 'Less Than' },
        {
          value: FilterOperator.LESS_THAN_OR_EQUALS,
          label: 'Less Than or Equal',
        },
        { value: FilterOperator.BETWEEN, label: 'Between' },
        { value: FilterOperator.IS_NULL, label: 'Is Empty' },
        { value: FilterOperator.IS_NOT_NULL, label: 'Is Not Empty' },
      ],
      date: [
        { value: FilterOperator.EQUALS, label: 'Equals' },
        { value: FilterOperator.NOT_EQUALS, label: 'Not Equals' },
        { value: FilterOperator.GREATER_THAN, label: 'After' },
        { value: FilterOperator.LESS_THAN, label: 'Before' },
        { value: FilterOperator.BETWEEN, label: 'Between' },
        { value: FilterOperator.IS_NULL, label: 'Is Empty' },
        { value: FilterOperator.IS_NOT_NULL, label: 'Is Not Empty' },
      ],
      boolean: [{ value: FilterOperator.EQUALS, label: 'Equals' }],
      select: [
        { value: FilterOperator.EQUALS, label: 'Equals' },
        { value: FilterOperator.NOT_EQUALS, label: 'Not Equals' },
        { value: FilterOperator.IN, label: 'In' },
      ],
    };

  selectedColumn: GridColumn | null = null;
  selectedOperator: FilterOperator = FilterOperator.EQUALS;
  filterValue: any = null;
  filterValueFrom: any = null;
  filterValueTo: any = null;
  multiSelectValues: string[] = [];

  constructor() {
    this.filterForm = this.fb.group({
      filters: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    if (this.columns.length > 0) {
      this.selectedColumn = this.columns[0];
      this.selectColumn(this.columns[0]);
    }

    this.gridService
      .getState(this.gridId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        const filterState = state.filters;
        if (filterState && filterState.filters) {
          this.activeFilters = Object.values(filterState.filters);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filtersArray(): FormArray {
    return this.filterForm.get('filters') as FormArray;
  }

  get operators(): { value: FilterOperator; label: string }[] {
    if (!this.selectedColumn) {
      return [];
    }

    const filterType =
      this.selectedColumn.filterType ||
      this.getFilterTypeFromColumnType(this.selectedColumn.type);
    return this.operatorsByType[filterType] || '';
  }

  getFilterTypeFromColumnType(columnType?: string): string {
    switch (columnType) {
      case 'number':
      case 'currency':
        return 'number';
      case 'date':
        return 'date';
      case 'boolean':
        return 'boolean';
      default:
        return 'text';
    }
  }

  selectColumn(column: GridColumn): void {
    this.selectedColumn = column;
    this.selectedOperator = this.operators[0].value;
    this.resetFilterValue();
  }

  selectOperator(operator: FilterOperator): void {
    this.selectedOperator = operator;
    this.resetFilterValue();
  }

  resetFilterValue(): void {
    this.filterValue = null;
    this.filterValueFrom = null;
    this.filterValueTo = null;
    this.multiSelectValues = [];
  }

  addFilter(): void {
    if (!this.selectedColumn || !this.isValidFilter()) {
      return;
    }

    let value: any;

    switch (this.selectedOperator) {
      case FilterOperator.BETWEEN:
        value = [this.filterValueFrom, this.filterValueTo];
        break;
      case FilterOperator.IN:
        value = [...this.multiSelectValues];
        break;
      case FilterOperator.IS_NULL:
      case FilterOperator.IS_NOT_NULL:
        value = null;
        break;
      default:
        value = this.filterValue;
        break;
    }

    const filter: GridFilter = {
      field: this.selectedColumn.field,
      operator: this.selectedOperator,
      value,
    };

    this.activeFilters = [
      ...this.activeFilters.filter((f) => f.field !== filter.field),
      filter,
    ];

    this.gridService.setFilter(this.gridId, filter);

    this.emitFilterChange();

    this.resetFilterValue();
  }

  removeFilter(field: string): void {
    this.activeFilters = this.activeFilters.filter((f) => f.field !== field);

    this.gridService.removeFilter(this.gridId, field);

    this.emitFilterChange();
  }

  clearFilters(): void {
    this.activeFilters = [];

    this.filtersArray.clear();

    this.gridService.updateState(this.gridId, {
      filters: { filters: {}, globalFilter: undefined },
    });

    this.emitFilterChange();
  }

  isValidFilter(): boolean {
    if (!this.selectedColumn) {
      return false;
    }

    if (
      this.selectedOperator === FilterOperator.IS_NULL ||
      this.selectedOperator === FilterOperator.IS_NOT_NULL
    ) {
      return true;
    }

    if (this.selectedOperator === FilterOperator.BETWEEN) {
      return this.filterValueFrom !== null && this.filterValueTo !== null;
    }

    if (this.selectedOperator === FilterOperator.IN) {
      return this.multiSelectValues.length > 0;
    }

    return (
      this.filterValue !== null &&
      this.filterValue !== undefined &&
      this.filterValue !== ''
    );
  }

  getFilterLabel(filter: GridFilter): string {
    const column = this.columns.find((c) => c.field === filter.field);
    if (!column) {
      return '';
    }

    const operator = this.getOperatorLabel(filter.operator);

    let valueLabel: string;
    switch (filter.operator) {
      case FilterOperator.BETWEEN:
        valueLabel = `${filter.value[0]} - ${filter.value[1]}`;
        break;
      case FilterOperator.IN:
        valueLabel = filter.value.join(', ');
        break;
      case FilterOperator.IS_NULL:
      case FilterOperator.IS_NOT_NULL:
        valueLabel = '';
        break;
      default:
        valueLabel = filter.value?.toString() || '';
        break;
    }

    return `${column.header} ${operator} ${valueLabel}`.trim();
  }

  getOperatorLabel(operator: FilterOperator): string {
    const found = Object.values(this.operatorsByType)
      .flat()
      .find((op) => op.value === operator);

    return found?.label || '';
  }

  private emitFilterChange(): void {
    const filterState: GridFilterState = {
      filters: {},
    };

    this.activeFilters.forEach((filter) => {
      filterState.filters[filter.field] = filter;
    });

    this.filterChange.emit(filterState);
  }

  getFilterOptions(column: GridColumn): any[] {
    return column.filterOptions || [];
  }

  toggleMultiSelectValue(value: string): void {
    const index = this.multiSelectValues.indexOf(value);
    if (index === -1) {
      this.multiSelectValues.push(value);
    } else {
      this.multiSelectValues.splice(index, 1);
    }
  }
}
