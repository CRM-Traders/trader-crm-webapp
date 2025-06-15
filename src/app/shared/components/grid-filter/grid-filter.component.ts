// src/app/shared/components/grid-filter/grid-filter.component.ts
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
  template: `
    <div
      class="grid-filter bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <!-- Filter Header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <!-- Filter Selector Dropdown -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleFilterSelector()"
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                class="w-5 h-5 mr-2"
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
              Add Filter
              <svg
                class="w-4 h-4 ml-2 transition-transform"
                [class.rotate-180]="isFilterSelectorOpen"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>

            <!-- Filter Selector Dropdown -->
            <div
              *ngIf="isFilterSelectorOpen"
              class="absolute z-50 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg"
            >
              <!-- Search in filters -->
              <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                <div class="relative">
                  <input
                    type="text"
                    [(ngModel)]="filterSearchTerm"
                    (input)="filterAvailableOptions()"
                    placeholder="Search filters..."
                    class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg
                    class="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                  </svg>
                </div>
              </div>

              <!-- Selected Options -->
              <div
                *ngIf="selectedFilterOptions.length > 0"
                class="p-3 border-b border-gray-200 dark:border-gray-700"
              >
                <div class="flex items-center justify-between mb-2">
                  <h4
                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  >
                    Selected Options
                  </h4>
                  <button
                    (click)="clearAllFilters()"
                    class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Clear All
                  </button>
                </div>
                <div class="space-y-1 max-h-32 overflow-y-auto">
                  <div
                    *ngFor="let option of selectedFilterOptions"
                    class="flex items-center"
                  >
                    <input
                      type="checkbox"
                      [id]="'selected-' + option.id"
                      checked="true"
                      (change)="toggleFilterOption(option)"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label
                      [for]="'selected-' + option.id"
                      class="ml-2 text-sm text-gray-700 dark:text-gray-200"
                    >
                      {{ option.label }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- Available Options -->
              <div class="p-3">
                <div class="flex items-center justify-between mb-2">
                  <h4
                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  >
                    Available Options
                  </h4>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      id="select-all-filters"
                      [checked]="areAllAvailableOptionsSelected()"
                      [indeterminate]="isPartialSelection()"
                      (change)="toggleSelectAll($event)"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label
                      for="select-all-filters"
                      class="ml-2 text-xs text-gray-600 dark:text-gray-300"
                    >
                      Select All
                    </label>
                  </div>
                </div>
                <div class="space-y-1 max-h-48 overflow-y-auto">
                  <div
                    *ngFor="let option of filteredAvailableOptions"
                    class="flex items-center"
                  >
                    <input
                      type="checkbox"
                      [id]="'available-' + option.id"
                      [checked]="option.selected"
                      (change)="toggleFilterOption(option)"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label
                      [for]="'available-' + option.id"
                      class="ml-2 text-sm text-gray-700 dark:text-gray-200"
                    >
                      {{ option.label }}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex items-center space-x-2">
            <button
              *ngIf="activeFilters.length > 0"
              (click)="resetAllFilters()"
              class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 focus:outline-none"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>

      <!-- Active Filter Tags -->
      <div
        *ngIf="activeFilters.length > 0"
        class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
      >
        <div class="flex flex-wrap gap-2">
          <div
            *ngFor="let filter of activeFilters"
            class="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
          >
            <span class="font-medium">{{ filter.column.header }}:</span>
            <span class="ml-1">{{ getFilterDisplayValue(filter) }}</span>
            <button
              (click)="removeActiveFilter(filter.id)"
              class="ml-2 flex-shrink-0 focus:outline-none"
              aria-label="Remove filter"
            >
              <svg
                class="h-3 w-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
        </div>
      </div>

      <!-- Filter Controls -->
      <div *ngIf="selectedFilterOptions.length > 0" class="p-4 space-y-4">
        <div
          *ngFor="let activeFilter of activeFilters; let i = index"
          class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div class="grid grid-cols-1 gap-4">
            <!-- Field Name -->
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <h4
                  class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {{ activeFilter.column.header }}
                </h4>
              </div>
              <button
                (click)="removeActiveFilter(activeFilter.id)"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
              >
                <svg
                  class="h-4 w-4"
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

            <!-- Value Input Based on Type -->
            <div>
              <!-- Text input -->
              <input
                *ngIf="isTextType(activeFilter.column)"
                type="text"
                [(ngModel)]="activeFilter.value"
                [placeholder]="
                  'Enter ' + activeFilter.column.header.toLowerCase()
                "
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                (input)="applyFilter(activeFilter)"
              />

              <!-- Number range inputs -->
              <div
                *ngIf="isNumberType(activeFilter.column)"
                class="flex items-center space-x-2"
              >
                <input
                  type="number"
                  [(ngModel)]="activeFilter.valueFrom"
                  placeholder="From"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  (input)="applyFilter(activeFilter)"
                />
                <span
                  class="text-gray-500 dark:text-gray-400 text-sm font-medium"
                  >to</span
                >
                <input
                  type="number"
                  [(ngModel)]="activeFilter.valueTo"
                  placeholder="To"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  (input)="applyFilter(activeFilter)"
                />
              </div>

              <!-- Date range inputs -->
              <div
                *ngIf="isDateType(activeFilter.column)"
                class="flex items-center space-x-2"
              >
                <input
                  type="date"
                  [(ngModel)]="activeFilter.valueFrom"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  (change)="applyFilter(activeFilter)"
                />
                <span
                  class="text-gray-500 dark:text-gray-400 text-sm font-medium"
                  >to</span
                >
                <input
                  type="date"
                  [(ngModel)]="activeFilter.valueTo"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  (change)="applyFilter(activeFilter)"
                />
              </div>

              <!-- Boolean select -->
              <select
                *ngIf="isBooleanType(activeFilter.column)"
                [(ngModel)]="activeFilter.value"
                (change)="applyFilter(activeFilter)"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option [ngValue]="true">Yes</option>
                <option [ngValue]="false">No</option>
              </select>

              <!-- Select options with multi-select -->
              <div
                *ngIf="isSelectType(activeFilter.column)"
                class="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 max-h-32 overflow-y-auto"
              >
                <div
                  *ngFor="let option of getFilterOptions(activeFilter.column)"
                  class="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <input
                    type="checkbox"
                    [id]="'multi-' + activeFilter.id + '-' + option.value"
                    [checked]="
                      (activeFilter.multiSelectValues || []).includes(
                        option.value
                      )
                    "
                    (change)="
                      toggleMultiSelectValue(activeFilter, option.value);
                      applyFilter(activeFilter)
                    "
                    class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    [for]="'multi-' + activeFilter.id + '-' + option.value"
                    class="ml-2 text-sm text-gray-700 dark:text-gray-200"
                  >
                    {{ option.label }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="selectedFilterOptions.length === 0" class="p-8 text-center">
        <svg
          class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          ></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No filters selected
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by selecting filter options from the dropdown above.
        </p>
      </div>
    </div>
  `,
  styleUrls: ['./grid-filter.component.scss'],
})
export class GridFilterComponent implements OnInit, OnDestroy {
  private gridService = inject(GridService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @Input() columns: GridColumn[] = [];
  @Input() gridId: string = 'default-grid';

  @Output() filterChange = new EventEmitter<GridFilterState>();

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
      text: [{ value: FilterOperator.CONTAINS, label: 'Contains' }],
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
    if (!this.isValidActiveFilter(activeFilter)) {
      return;
    }

    let value: any;
    let operator = activeFilter.operator;

    // Determine value based on filter type
    if (this.isTextType(activeFilter.column)) {
      value = activeFilter.value;
      operator = FilterOperator.CONTAINS; // Always use contains for text
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
        return; // No valid range values
      }
    } else if (this.isBooleanType(activeFilter.column)) {
      value = activeFilter.value;
      operator = FilterOperator.EQUALS;
    } else if (this.isSelectType(activeFilter.column)) {
      value = [...(activeFilter.multiSelectValues || [])];
      operator = FilterOperator.IN;
      if (value.length === 0) return; // No values selected
    } else {
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
