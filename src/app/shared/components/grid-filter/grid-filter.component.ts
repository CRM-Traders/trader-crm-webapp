// src/app/shared/components/grid-filter/grid-filter.component.ts
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
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

interface FilterOption {
  id: string;
  label: string;
  column: GridColumn;
  selected: boolean;
  category?: string;
}

interface ActiveFilter {
  id: string;
  column: GridColumn;
  operator: FilterOperator;
  value: any;
  valueFrom?: any;
  valueTo?: any;
  multiSelectValues?: string[];
}

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

  @ViewChild('filterSelectorDropdown', { static: false }) filterSelectorDropdown!: ElementRef;
  @ViewChildren('multiSelectDropdown') multiSelectDropdowns!: QueryList<ElementRef>;

  // Filter selector state
  isFilterSelectorOpen = false;
  filterSearchTerm = '';
  availableFilterOptions: FilterOption[] = [];
  filteredAvailableOptions: FilterOption[] = [];
  selectedFilterOptions: FilterOption[] = [];

  // Active filters
  activeFilters: ActiveFilter[] = [];
  appliedFilters: GridFilter[] = [];

  operatorsByType: Record<string, { value: FilterOperator; label: string }[]> =
    {
      number: [{ value: FilterOperator.BETWEEN, label: 'Between' }],
      date: [{ value: FilterOperator.BETWEEN, label: 'Between' }],
      boolean: [{ value: FilterOperator.EQUALS, label: 'Equals' }],
      select: [{ value: FilterOperator.IN, label: 'In' }],
    };

  ngOnInit(): void {
    this.initializeFilterOptions();
    this.filterAvailableOptions();

    // Subscribe to existing grid state
    this.gridService
      .getState(this.gridId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        if (state.filters && state.filters.filters) {
          this.syncWithExistingFilters(state.filters.filters);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilterOptions(): void {
    this.availableFilterOptions = this.columns
      .filter((col) => col.filterable !== false)
      .map((col) => ({
        id: col.field,
        label: col.header,
        column: col,
        selected: false,
        category: this.getColumnCategory(col),
      }));
  }

  private getColumnCategory(column: GridColumn): string {
    // You can categorize columns based on their properties or add a category field to GridColumn
    if (column.type === 'date') return 'Date Filters';
    if (column.type === 'number' || column.type === 'currency')
      return 'Numeric Filters';
    if (column.type === 'boolean') return 'Boolean Filters';
    if (column.filterType === 'select') return 'Selection Filters';
    return 'Text Filters';
  }

  private syncWithExistingFilters(filters: Record<string, GridFilter>): void {
    Object.values(filters).forEach((filter) => {
      const option = this.availableFilterOptions.find(
        (opt) => opt.id === filter.field
      );
      if (option && !option.selected) {
        this.addFilterOption(option);
        const activeFilter = this.activeFilters.find(
          (af) => af.id === filter.field
        );
        if (activeFilter) {
          this.syncActiveFilterWithGridFilter(activeFilter, filter);
        }
      }
    });
  }

  private syncActiveFilterWithGridFilter(
    activeFilter: ActiveFilter,
    gridFilter: GridFilter
  ): void {
    activeFilter.operator = gridFilter.operator;

    if (
      gridFilter.operator === FilterOperator.BETWEEN &&
      Array.isArray(gridFilter.value)
    ) {
      activeFilter.valueFrom = gridFilter.value[0];
      activeFilter.valueTo = gridFilter.value[1];
    } else if (
      gridFilter.operator === FilterOperator.IN &&
      Array.isArray(gridFilter.value)
    ) {
      activeFilter.multiSelectValues = [...gridFilter.value];
    } else {
      activeFilter.value = gridFilter.value;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Check if the click is on the filter selector button
    const isFilterSelectorButton = target.closest('button[type="button"]')?.textContent?.includes('Add Filter');
    
    // Check if the click is inside the filter selector dropdown
    const isInsideFilterSelector = this.filterSelectorDropdown?.nativeElement?.contains(target);
    
    // Check if the click is inside any multi-select dropdown
    const isInsideMultiSelectDropdown = this.multiSelectDropdowns?.some(
      dropdown => dropdown.nativeElement?.contains(target)
    );
    
    // Check if the click is on any multi-select dropdown button
    const isMultiSelectButton = target.closest('button[type="button"]')?.closest('.relative');
    
    // Close filter selector dropdown if click is outside
    if (this.isFilterSelectorOpen && !isFilterSelectorButton && !isInsideFilterSelector) {
      this.isFilterSelectorOpen = false;
    }
    
    // Close multi-select dropdowns if click is outside
    if (this.openDropdowns.size > 0 && !isInsideMultiSelectDropdown && !isMultiSelectButton) {
      this.openDropdowns.clear();
    }
  }

  toggleFilterSelector(): void {
    this.isFilterSelectorOpen = !this.isFilterSelectorOpen;
  }

  filterAvailableOptions(): void {
    const searchTerm = this.filterSearchTerm.toLowerCase();
    this.filteredAvailableOptions = this.availableFilterOptions
      .filter((option) => !option.selected)
      .filter(
        (option) =>
          option.label.toLowerCase().includes(searchTerm) ||
          (option.category &&
            option.category.toLowerCase().includes(searchTerm))
      );
  }

  private openDropdowns = new Set<string>();

  // Dropdown state management
  toggleFilterDropdown(filterId: string): void {
    if (this.openDropdowns.has(filterId)) {
      this.openDropdowns.delete(filterId);
    } else {
      this.openDropdowns.clear(); // Close other dropdowns
      this.openDropdowns.add(filterId);
    }
  }

  isFilterDropdownOpen(filterId: string): boolean {
    return this.openDropdowns.has(filterId);
  }

  toggleOptionSelection(filter: any, value: any): void {
    this.toggleMultiSelectValue(filter, value);
    this.applyFilter(filter);
  }

  toggleFilterOption(option: FilterOption): void {
    if (option.selected) {
      this.removeFilterOption(option);
    } else {
      this.addFilterOption(option);
    }
  }

  private addFilterOption(option: FilterOption): void {
    option.selected = true;
    this.selectedFilterOptions.push(option);

    const activeFilter: ActiveFilter = {
      id: option.id,
      column: option.column,
      operator: this.getDefaultOperator(option.column),
      value: null,
      valueFrom: null,
      valueTo: null,
      multiSelectValues: [],
    };

    this.activeFilters.push(activeFilter);
    this.filterAvailableOptions();
  }

  private removeFilterOption(option: FilterOption): void {
    option.selected = false;
    this.selectedFilterOptions = this.selectedFilterOptions.filter(
      (opt) => opt.id !== option.id
    );
    this.activeFilters = this.activeFilters.filter(
      (filter) => filter.id !== option.id
    );
    this.removeAppliedFilter(option.id);
    this.filterAvailableOptions();
  }

  private getDefaultOperator(column: GridColumn): FilterOperator {
    const filterType =
      column.filterType || this.getFilterTypeFromColumnType(column.type);

    switch (filterType) {
      case 'text':
        return FilterOperator.CONTAINS;
      case 'number':
      case 'date':
        return FilterOperator.BETWEEN;
      case 'boolean':
        return FilterOperator.EQUALS;
      case 'select':
        return FilterOperator.IN;
      default:
        return FilterOperator.CONTAINS;
    }
  }

  // Select All functionality
  areAllAvailableOptionsSelected(): boolean {
    return (
      this.filteredAvailableOptions.length > 0 &&
      this.filteredAvailableOptions.every((option) => option.selected)
    );
  }

  isPartialSelection(): boolean {
    const selectedCount = this.filteredAvailableOptions.filter(
      (option) => option.selected
    ).length;
    return (
      selectedCount > 0 && selectedCount < this.filteredAvailableOptions.length
    );
  }

  toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;

    this.filteredAvailableOptions.forEach((option) => {
      if (option.selected !== checked) {
        this.toggleFilterOption(option);
      }
    });
  }

  // Simplified type checking methods
  isTextType(column: GridColumn): boolean {
    const filterType =
      column.filterType || this.getFilterTypeFromColumnType(column.type);
    return filterType === 'text';
  }

  isNumberType(column: GridColumn): boolean {
    const filterType =
      column.filterType || this.getFilterTypeFromColumnType(column.type);
    return filterType === 'number';
  }

  isDateType(column: GridColumn): boolean {
    const filterType =
      column.filterType || this.getFilterTypeFromColumnType(column.type);
    return filterType === 'date';
  }

  isBooleanType(column: GridColumn): boolean {
    const filterType =
      column.filterType || this.getFilterTypeFromColumnType(column.type);
    return filterType === 'boolean';
  }

  isSelectType(column: GridColumn): boolean {
    const filterType =
      column.filterType || this.getFilterTypeFromColumnType(column.type);
    return filterType === 'select';
  }

  getOperatorsForColumn(
    column: GridColumn
  ): { value: FilterOperator; label: string }[] {
    const filterType =
      column.filterType || this.getFilterTypeFromColumnType(column.type);
    return this.operatorsByType[filterType] || this.operatorsByType['text'];
  }

  private getFilterTypeFromColumnType(columnType?: string): string {
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

  onOperatorChange(activeFilter: ActiveFilter): void {
    // Reset values when operator changes
    activeFilter.value = null;
    activeFilter.valueFrom = null;
    activeFilter.valueTo = null;
    activeFilter.multiSelectValues = [];
  }

  applyFilter(activeFilter: ActiveFilter): void {
    let value: any;
    let operator = activeFilter.operator;

    // Determine value based on filter type
    if (this.isTextType(activeFilter.column)) {
      value = activeFilter.value;
      operator = FilterOperator.CONTAINS; // Always use contains for text
      
      // If text value is empty, remove the filter instead of applying it
      if (!value || value.trim() === '') {
        this.removeAppliedFilter(activeFilter.column.field);
        return;
      }
    } else if (
      this.isNumberType(activeFilter.column) ||
      this.isDateType(activeFilter.column)
    ) {
      // For number/date ranges
      if (
        activeFilter.valueFrom !== null &&
        activeFilter.valueFrom !== undefined &&
        activeFilter.valueTo !== null &&
        activeFilter.valueTo !== undefined
      ) {
        value = [activeFilter.valueFrom, activeFilter.valueTo];
        operator = FilterOperator.BETWEEN;
      } else if (
        activeFilter.valueFrom !== null &&
        activeFilter.valueFrom !== undefined
      ) {
        value = activeFilter.valueFrom;
        operator = FilterOperator.GREATER_THAN_OR_EQUALS;
      } else if (
        activeFilter.valueTo !== null &&
        activeFilter.valueTo !== undefined
      ) {
        value = activeFilter.valueTo;
        operator = FilterOperator.LESS_THAN_OR_EQUALS;
      } else {
        // Remove filter if no valid range values
        this.removeAppliedFilter(activeFilter.column.field);
        return;
      }
    } else if (this.isBooleanType(activeFilter.column)) {
      value = activeFilter.value;
      operator = FilterOperator.EQUALS;
      
      // If boolean value is empty, remove the filter
      if (value === null || value === undefined || value === '') {
        this.removeAppliedFilter(activeFilter.column.field);
        return;
      }
    } else if (this.isSelectType(activeFilter.column)) {
      value = [...(activeFilter.multiSelectValues || [])];
      operator = FilterOperator.IN;
      if (value.length === 0) {
        // Remove filter if no values selected
        this.removeAppliedFilter(activeFilter.column.field);
        return;
      }
    } else {
      return;
    }

    // Validate the filter before applying
    if (!this.isValidActiveFilter(activeFilter)) {
      this.removeAppliedFilter(activeFilter.column.field);
      return;
    }

    const gridFilter: GridFilter = {
      field: activeFilter.column.field,
      operator: operator,
      value,
    };

    // Update applied filters
    this.appliedFilters = this.appliedFilters.filter(
      (f) => f.field !== gridFilter.field
    );
    this.appliedFilters.push(gridFilter);

    // Update grid service
    this.gridService.setFilter(this.gridId, gridFilter);
    this.emitFilterChange();
  }

  removeActiveFilter(filterId: string): void {
    const option = this.availableFilterOptions.find(
      (opt) => opt.id === filterId
    );
    if (option) {
      this.removeFilterOption(option);
    }
  }

  removeAppliedFilter(filterId: string): void {
    this.appliedFilters = this.appliedFilters.filter(
      (f) => f.field !== filterId
    );
    this.gridService.removeFilter(this.gridId, filterId);
    this.emitFilterChange();
  }

  clearAllFilters(): void {
    this.selectedFilterOptions.forEach((option) => {
      option.selected = false;
    });
    this.selectedFilterOptions = [];
    this.activeFilters = [];
    this.appliedFilters = [];
    this.filterAvailableOptions();

    this.gridService.updateState(this.gridId, {
      filters: { filters: {}, globalFilter: undefined },
    });
    this.emitFilterChange();
  }

  resetAllFilters(): void {
    this.activeFilters.forEach((filter) => {
      filter.value = null;
      filter.valueFrom = null;
      filter.valueTo = null;
      filter.multiSelectValues = [];
      filter.operator = this.getDefaultOperator(filter.column);
    });
    this.appliedFilters = [];
  }

  private emitFilterChange(): void {
    const filterState: GridFilterState = {
      filters: {},
    };

    this.appliedFilters.forEach((filter) => {
      filterState.filters[filter.field] = filter;
    });

    this.filterChange.emit(filterState);
  }

  // Input type helpers
  isTextInput(filter: ActiveFilter): boolean {
    const filterType =
      filter.column.filterType ||
      this.getFilterTypeFromColumnType(filter.column.type);
    return (
      filterType === 'text' &&
      filter.operator !== FilterOperator.IS_NULL &&
      filter.operator !== FilterOperator.IS_NOT_NULL
    );
  }

  isNumberInput(filter: ActiveFilter): boolean {
    const filterType =
      filter.column.filterType ||
      this.getFilterTypeFromColumnType(filter.column.type);
    return (
      filterType === 'number' &&
      filter.operator !== FilterOperator.BETWEEN &&
      filter.operator !== FilterOperator.IS_NULL &&
      filter.operator !== FilterOperator.IS_NOT_NULL
    );
  }

  isDateInput(filter: ActiveFilter): boolean {
    const filterType =
      filter.column.filterType ||
      this.getFilterTypeFromColumnType(filter.column.type);
    return (
      filterType === 'date' &&
      filter.operator !== FilterOperator.BETWEEN &&
      filter.operator !== FilterOperator.IS_NULL &&
      filter.operator !== FilterOperator.IS_NOT_NULL
    );
  }

  isBooleanInput(filter: ActiveFilter): boolean {
    const filterType =
      filter.column.filterType ||
      this.getFilterTypeFromColumnType(filter.column.type);
    return filterType === 'boolean';
  }

  isSelectInput(filter: ActiveFilter): boolean {
    const filterType =
      filter.column.filterType ||
      this.getFilterTypeFromColumnType(filter.column.type);
    return (
      filterType === 'select' &&
      filter.operator !== FilterOperator.IS_NULL &&
      filter.operator !== FilterOperator.IS_NOT_NULL
    );
  }

  getBetweenInputType(filter: ActiveFilter): string {
    const filterType =
      filter.column.filterType ||
      this.getFilterTypeFromColumnType(filter.column.type);
    switch (filterType) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  }

  isValidActiveFilter(filter: ActiveFilter): boolean {
    if (
      filter.operator === FilterOperator.IS_NULL ||
      filter.operator === FilterOperator.IS_NOT_NULL
    ) {
      return true;
    }

    if (filter.operator === FilterOperator.BETWEEN) {
      return (
        filter.valueFrom !== null &&
        filter.valueFrom !== undefined &&
        filter.valueTo !== null &&
        filter.valueTo !== undefined
      );
    }

    if (filter.operator === FilterOperator.IN) {
      return (
        (filter.multiSelectValues && filter.multiSelectValues.length > 0) ??
        false
      );
    }

    return (
      filter.value !== null && filter.value !== undefined && filter.value !== ''
    );
  }

  getFilterDisplayValue(filter: ActiveFilter): string {
    const appliedFilter = this.appliedFilters.find(
      (f) => f.field === filter.id
    );
    if (!appliedFilter) return '';

    const operatorLabel = this.getOperatorLabel(appliedFilter.operator);

    switch (appliedFilter.operator) {
      case FilterOperator.BETWEEN:
        return `${operatorLabel} ${appliedFilter.value[0]} - ${appliedFilter.value[1]}`;
      case FilterOperator.IN:
        return `${operatorLabel} (${appliedFilter.value.length} selected)`;
      case FilterOperator.IS_NULL:
      case FilterOperator.IS_NOT_NULL:
        return operatorLabel;
      default:
        return `${operatorLabel} ${appliedFilter.value}`;
    }
  }

  private getOperatorLabel(operator: FilterOperator): string {
    const found = Object.values(this.operatorsByType)
      .flat()
      .find((op) => op.value === operator);
    return found?.label || '';
  }

  getFilterOptions(column: GridColumn): any[] {
    return column.filterOptions || [];
  }

  toggleMultiSelectValue(filter: ActiveFilter, value: string): void {
    if (!filter.multiSelectValues) {
      filter.multiSelectValues = [];
    }

    const index = filter.multiSelectValues.indexOf(value);
    if (index === -1) {
      filter.multiSelectValues.push(value);
    } else {
      filter.multiSelectValues.splice(index, 1);
    }
  }
}
