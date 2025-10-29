// src/app/shared/components/grid/grid.component.ts - Key changes for ngOnInit
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  inject,
  OnDestroy,
  ContentChild,
  TemplateRef,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  Subject,
  takeUntil,
  finalize,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import {
  GridAction,
  GridColumn,
  GridContextMenuEvent,
} from '../../models/grid/grid-column.model';
import { GridPagination } from '../../models/grid/grid-pagination.model';
import { GridSort } from '../../models/grid/grid-sort.model';
import { GridExportOptions } from '../../models/grid/grid-export.model';
import { ThemeService } from '../../../core/services/theme.service';
import { GridFilterState } from '../../models/grid/grid-filter-state.model';
import { GridService } from '../../services/grid/grid.service';
import { GridColumnSelectorComponent } from '../grid-column-selector/grid-column-selector.component';
import { GridFilterComponent } from '../grid-filter/grid-filter.component';
import { GridActionButtonsComponent } from '../grid-action-buttons/grid-action-buttons.component';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { GridDataResponse } from '../../models/grid/grid-state.model';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { AuthService } from '../../../core/services/auth.service';
import { GridSavedFiltersComponent } from '../grid-saved-filters/grid-saved-filters.component';
import { SavedFilter } from '../../models/grid/saved-filter.model';
import { GridFilter } from '../../models/grid/grid-filter.model';
import { FilterOperator } from '../../models/grid/filter-operator.model';

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GridFilterComponent,
    GridColumnSelectorComponent,
    GridActionButtonsComponent,
    ContextMenuComponent,
    HasPermissionDirective,
    GridSavedFiltersComponent,
  ],
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit, OnDestroy {
  private gridService = inject(GridService);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();
  private globalFilterSubject = new Subject<string>();
  draggedColumnIndex: number | null = null;
  dragOverColumnIndex: number | null = null;

  // Inline column filter state
  openColumnFilterId: string | null = null;
  columnFilterValues: Record<string, any> = {};
  columnFilterSearchTerms: Record<string, string> = {};
  columnFilterPositions: Record<string, { left: number; top: number }> = {};

  // Scroll handling for inline column filter dropdown
  private boundOnAnyScroll = (event?: Event) => this.onAnyScroll(event);
  private attachedScrollElements: HTMLElement[] = [];
  private isWindowScrollAttached = false;

  @ViewChild('gridContainer', { static: false }) gridContainer!: ElementRef;
  @ViewChild('columnSelectorDropdown', { static: false })
  columnSelectorDropdown!: ElementRef;
  @ViewChild(GridFilterComponent, { static: false })
  gridFilterComponent!: GridFilterComponent;

  @Input() permission: number = -1;
  @Input() selectionPermission: number = -1;
  @Input() exportPermission: number = -1;
  @Input() gridId: string = 'default-grid';
  @Input() data: any[] = [];
  @Input() columns: GridColumn[] = [];
  @Input() actions: GridAction[] = [];
  @Input() bulkActions: GridAction[] = [];
  @Input() endpoint: string = '';
  @Input() emptyMessage: string = 'No records found';
  @Input() showFilters: boolean = true;
  @Input() showColumnSelector: boolean = true;
  @Input() showPagination: boolean = true;
  @Input() showActions: boolean = true;
  @Input() exportable: boolean = true;
  @Input() selectable: boolean = false;
  @Input() sortable: boolean = true;
  @Input() resizable: boolean = true;
  @Input() height: string = 'auto';
  @Input() responsive: boolean = true;
  @Input() enableContextMenu: boolean = true;
  @Input() maxPrimaryActions: number = 2;
  @Input() globalFilterDebounceTime: number = 600;

  @Output() rowClick = new EventEmitter<any>();
  @Output() actionExecuted = new EventEmitter<{
    action: GridAction;
    item: any;
  }>();
  @Output() bulkActionExecuted = new EventEmitter<{
    action: GridAction;
    items: any[];
  }>();
  @Output() contextMenuOpened = new EventEmitter<GridContextMenuEvent>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() sortChange = new EventEmitter<GridSort>();
  @Output() pageChange = new EventEmitter<GridPagination>();
  @Output() filterChange = new EventEmitter<GridFilterState>();
  @Output() export = new EventEmitter<GridExportOptions>();
  @Output() refresh = new EventEmitter<void>();
  @Output() dataLoaded = new EventEmitter<any[]>();
  @Output() error = new EventEmitter<any>();

  @ContentChild('rowTemplate') rowTemplate?: TemplateRef<any>;
  @ContentChild('headerTemplate') headerTemplate?: TemplateRef<any>;
  @ContentChild('emptyTemplate') emptyTemplate?: TemplateRef<any>;
  @ContentChild('loadingTemplate') loadingTemplate?: TemplateRef<any>;
  @ContentChild('footerTemplate') footerTemplate?: TemplateRef<any>;
  @ContentChild('actionTemplate') actionTemplate?: TemplateRef<any>;

  Math = Math;

  visibleColumns: GridColumn[] = [];
  selectedItems: any[] = [];
  selectAll: boolean = false;
  isFilterVisible: boolean = false;
  isColumnSelectorVisible: boolean = false;
  isExportOpen: boolean = false;
  isDarkMode: boolean = false;
  loading: boolean = false;
  globalFilterLoading: boolean = false;

  contextMenuVisible: boolean = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuActions: GridAction[] = [];
  contextMenuItem: any = null;

  pagination: GridPagination = {
    pageIndex: 0,
    pageSize: 50,
    totalItems: 0,
    totalPages: 0,
  };

  currentSort?: GridSort;

  exportTypes = [{ label: 'Excel', value: 'excel' }];

  pageOptions: number[] = [5, 10, 25, 50, 100];

  savedFilters: SavedFilter[] = [];
  activeFilterId?: string;
  currentFilterState: GridFilterState = {
    filters: {},
    globalFilter: undefined,
  };
  Object = Object;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.contextMenuVisible = false;

    if (this.isColumnSelectorVisible) {
      const target = event.target as Node;
      const columnSelectorButton =
        this.gridContainer?.nativeElement.querySelector(
          '[data-column-selector-button]'
        );
      const columnSelectorDropdown = this.columnSelectorDropdown?.nativeElement;

      if (
        columnSelectorButton &&
        !columnSelectorButton.contains(target) &&
        columnSelectorDropdown &&
        !columnSelectorDropdown.contains(target)
      ) {
        this.isColumnSelectorVisible = false;
      }
    }

    // Close inline column filter if click is outside
    if (this.openColumnFilterId) {
      const target = event.target as HTMLElement;
      const filterDropdown = this.gridContainer?.nativeElement.querySelector(
        `[data-column-filter="${this.openColumnFilterId}"]`
      );
      const filterButton = this.gridContainer?.nativeElement.querySelector(
        `[data-column-filter-button="${this.openColumnFilterId}"]`
      );

      if (
        filterDropdown &&
        !filterDropdown.contains(target) &&
        filterButton &&
        !filterButton.contains(target)
      ) {
        const currentFilterId = this.openColumnFilterId;
        this.openColumnFilterId = null;
        if (currentFilterId) {
          delete this.columnFilterPositions[currentFilterId];
        }
      }
    }
  }

  @HostListener('document:contextmenu', ['$event'])
  onDocumentRightClick(event: Event): void {
    if (!this.gridContainer?.nativeElement.contains(event.target as Node)) {
      return;
    }
  }

  @HostListener('window:refreshGrid', ['$event'])
  onRefreshGridEvent(event: CustomEvent): void {
    if (event.detail?.gridId && event.detail.gridId !== this.gridId) {
      return;
    }

    this.refreshGrid();
  }

  // Close inline column filter on window scroll
  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event): void {
    if (this.openColumnFilterId) {
      this.closeOpenColumnFilter();
    }
  }

  ngOnInit(): void {
    this.gridService.clearAllFilters(this.gridId);

    this.currentFilterState = {
      filters: {},
      globalFilter: undefined,
    };
    this.activeFilterId = undefined;

    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => {
        this.isDarkMode = isDark;
      });

    // Setup debounced global filter
    this.globalFilterSubject
      .pipe(
        debounceTime(this.globalFilterDebounceTime),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((value) => {
        this.applyGlobalFilter(value);
      });

    this.updateVisibleColumns();

    const initialState = this.gridService.getCurrentState(this.gridId);
    if (!initialState.columnsInitialized) {
      this.gridService.setVisibleColumns(
        this.gridId,
        this.visibleColumns.map((col) => col.field)
      );
    }

    // Reset pagination to initial state when component initializes
    this.pagination.pageIndex = 0;
    this.gridService.setPagination(this.gridId, { pageIndex: 0 });

    // Get the current state for other properties (sort, visible columns, etc.)
    const currentState = this.gridService.getCurrentState(this.gridId);

    // Restore other state properties (but keep pageIndex at 0)
    this.currentSort = currentState.sort;

    if (currentState.columnsInitialized) {
      this.visibleColumns = this.columns.filter((col) =>
        currentState.visibleColumns.includes(col.field)
      );
    }

    this.loadSavedFilters();

    // Subscribe to state changes for future updates
    this.gridService
      .getState(this.gridId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        // Only update pagination if it's not the initial load
        if (this.pagination.totalItems > 0) {
          this.pagination = state.pagination;
        }
        this.currentSort = state.sort;

        if (state.columnsInitialized) {
          // FIXED: Respect the column order from saved state
          this.visibleColumns = state.visibleColumns
            .map((field) => this.columns.find((col) => col.field === field))
            .filter((col) => col !== undefined) as GridColumn[];
        }

        this.savedFilters = state.savedFilters || [];

        // Only update filter state if it's different from the cleared state
        if (
          state.filters &&
          (Object.keys(state.filters.filters).length > 0 ||
            state.filters.globalFilter)
        ) {
          if (
            Object.keys(this.currentFilterState.filters).length === 0 &&
            !this.currentFilterState.globalFilter
          ) {
            return;
          }
          this.currentFilterState = state.filters;

          // Initialize column filter values from current state
          Object.entries(state.filters.filters).forEach(([field, filter]) => {
            this.columnFilterValues[field] =
              this.extractColumnFilterValue(filter);
          });
        }

        this.activeFilterId = state.activeFilterId;
      });

    // Fetch data with reset pagination
    if (this.endpoint) {
      this.fetchData();
    } else {
      this.processLocalData();
    }
  }

  // Inline column filter methods
  toggleColumnFilter(column: GridColumn, event: Event): void {
    event.stopPropagation();

    if (this.openColumnFilterId === column.field) {
      this.closeOpenColumnFilter();
    } else {
      this.openColumnFilterId = column.field;

      // Calculate dropdown position
      this.calculateColumnFilterPosition(column.field, event);

      // Initialize filter value if not exists
      if (!this.columnFilterValues[column.field]) {
        const existingFilter = this.currentFilterState.filters[column.field];
        if (existingFilter) {
          this.columnFilterValues[column.field] =
            this.extractColumnFilterValue(existingFilter);
        } else {
          this.columnFilterValues[column.field] =
            this.getDefaultColumnFilterValue(column);
        }
      }

      // Initialize search term
      if (!this.columnFilterSearchTerms[column.field]) {
        this.columnFilterSearchTerms[column.field] = '';
      }

      // Attach scroll listeners to close dropdown on scroll (window and scrollable ancestors)
      const targetEl = event.target as HTMLElement | null;
      this.detachScrollListeners();
      this.attachScrollListeners(targetEl || undefined);
    }
  }

  isColumnFilterOpen(columnField: string): boolean {
    return this.openColumnFilterId === columnField;
  }

  getColumnFilterType(column: GridColumn): string {
    const filterType =
      column.filterType || this.getFilterTypeFromColumnType(column.type);
    return filterType;
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

  // Close the currently open inline column filter and cleanup listeners
  private closeOpenColumnFilter(): void {
    const currentFilterId = this.openColumnFilterId;
    if (!currentFilterId) return;

    this.openColumnFilterId = null;
    delete this.columnFilterPositions[currentFilterId];
    this.detachScrollListeners();
  }

  // Generic scroll handler for window and scrollable ancestors
  private onAnyScroll(event?: Event): void {
    if (!this.openColumnFilterId) return;

    // If the scroll originates inside the currently open dropdown, do not close it
    if (event) {
      const dropdownEl = this.gridContainer?.nativeElement.querySelector(
        `[data-column-filter="${this.openColumnFilterId}"]`
      ) as HTMLElement | null;

      if (dropdownEl) {
        let inside = false;
        const anyEvent = event as any;
        if (typeof anyEvent.composedPath === 'function') {
          const path = anyEvent.composedPath() as EventTarget[];
          inside = path.includes(dropdownEl);
        } else if (event.target) {
          inside = dropdownEl.contains(event.target as Node);
        }

        if (inside) {
          return;
        }
      }
    }

    this.closeOpenColumnFilter();
  }

  // Attach scroll listeners to window and scrollable ancestor containers
  private attachScrollListeners(startFrom?: HTMLElement): void {
    // Window scroll
    if (!this.isWindowScrollAttached) {
      window.addEventListener('scroll', this.boundOnAnyScroll, true);
      this.isWindowScrollAttached = true;
    }

    // Scrollable ancestors (e.g., .overflow-x-auto wrappers)
    const ancestors = this.findScrollableAncestors(startFrom);
    ancestors.forEach((el) => {
      el.addEventListener('scroll', this.boundOnAnyScroll, true);
      this.attachedScrollElements.push(el);
    });
  }

  // Detach all previously attached scroll listeners
  private detachScrollListeners(): void {
    if (this.isWindowScrollAttached) {
      window.removeEventListener('scroll', this.boundOnAnyScroll, true);
      this.isWindowScrollAttached = false;
    }

    this.attachedScrollElements.forEach((el) =>
      el.removeEventListener('scroll', this.boundOnAnyScroll, true)
    );
    this.attachedScrollElements = [];
  }

  // Walk up the DOM from the trigger element and collect scrollable ancestors
  private findScrollableAncestors(startEl?: HTMLElement): HTMLElement[] {
    const result: HTMLElement[] = [];
    let node: HTMLElement | null = startEl || null;

    // If we don't have a starting element, try using the grid container itself
    if (!node && this.gridContainer?.nativeElement) {
      node = this.gridContainer.nativeElement as HTMLElement;
    }

    const isScrollable = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;
      const canScrollY =
        (overflowY === 'auto' || overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight;
      const canScrollX =
        (overflowX === 'auto' || overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth;
      return canScrollX || canScrollY;
    };

    while (node && node !== document.body && node !== document.documentElement) {
      if (isScrollable(node)) {
        result.push(node);
      }
      node = node.parentElement;
    }

    // Also include any common scroll containers by selector, if present
    // (e.g., pages often wrap tables in .overflow-x-auto)
    document.querySelectorAll('.overflow-x-auto').forEach((el) => {
      const elem = el as HTMLElement;
      if (!result.includes(elem)) {
        result.push(elem);
      }
    });

    return result;
  }

  private getDefaultColumnFilterValue(column: GridColumn): any {
    const filterType = this.getColumnFilterType(column);

    switch (filterType) {
      case 'number':
      case 'date':
        return { from: null, to: null };
      case 'boolean':
        return null;
      case 'select':
        return [];
      default:
        return '';
    }
  }

  private extractColumnFilterValue(filter: GridFilter): any {
    if (
      filter.operator === FilterOperator.BETWEEN &&
      Array.isArray(filter.value)
    ) {
      return { from: filter.value[0], to: filter.value[1] };
    } else if (
      filter.operator === FilterOperator.IN &&
      Array.isArray(filter.value)
    ) {
      return filter.value;
    } else {
      // For date filters that are not BETWEEN, we need to determine if it's a date filter
      // and return the appropriate structure
      const column = this.columns.find(col => col.field === filter.field);
      if (column && this.getColumnFilterType(column) === 'date') {
        // For single date values, we'll put it in the 'from' field
        return { from: filter.value, to: null };
      }
      return filter.value;
    }
  }

  applyColumnFilter(column: GridColumn): void {
    const filterValue = this.columnFilterValues[column.field];
    const filterType = this.getColumnFilterType(column);

    // Determine operator and value based on type
    let operator: FilterOperator;
    let value: any;

    switch (filterType) {
      case 'text':
        if (!filterValue || filterValue.trim() === '') {
          this.removeColumnFilter(column);
          return;
        }
        operator = FilterOperator.CONTAINS;
        value = filterValue;
        break;

      case 'number':
      case 'date':
        if (
          filterValue.from !== null &&
          filterValue.from !== undefined &&
          filterValue.to !== null &&
          filterValue.to !== undefined
        ) {
          operator = FilterOperator.BETWEEN;
          value = [filterValue.from, filterValue.to];
        } else if (
          filterValue.from !== null &&
          filterValue.from !== undefined
        ) {
          operator = FilterOperator.GREATER_THAN_OR_EQUALS;
          value = filterValue.from;
        } else if (filterValue.to !== null && filterValue.to !== undefined) {
          operator = FilterOperator.LESS_THAN_OR_EQUALS;
          value = filterValue.to;
        } else {
          this.removeColumnFilter(column);
          return;
        }
        break;

      case 'boolean':
        if (
          filterValue === null ||
          filterValue === undefined ||
          filterValue === ''
        ) {
          this.removeColumnFilter(column);
          return;
        }
        operator = FilterOperator.EQUALS;
        value = filterValue;
        break;

      case 'select':
        if (!Array.isArray(filterValue) || filterValue.length === 0) {
          this.removeColumnFilter(column);
          return;
        }
        operator = FilterOperator.IN;
        value = filterValue;
        break;

      default:
        return;
    }

    const gridFilter: GridFilter = {
      field: column.field,
      operator,
      value,
    };

    this.gridService.setFilter(this.gridId, gridFilter);

    // Update current filter state
    this.currentFilterState.filters[column.field] = gridFilter;
    this.filterChange.emit(this.currentFilterState);

    // Reset pagination
    this.pagination.pageIndex = 0;
    this.gridService.setPagination(this.gridId, { pageIndex: 0 });

    if (this.endpoint) {
      this.fetchData();
    }

    this.clearSelection();
  }

  removeColumnFilter(column: GridColumn): void {
    delete this.columnFilterValues[column.field];
    delete this.columnFilterSearchTerms[column.field];

    this.gridService.removeFilter(this.gridId, column.field);
    delete this.currentFilterState.filters[column.field];

    this.filterChange.emit(this.currentFilterState);

    this.pagination.pageIndex = 0;
    this.gridService.setPagination(this.gridId, { pageIndex: 0 });

    if (this.endpoint) {
      this.fetchData();
    }

    this.clearSelection();
  }

  clearColumnFilter(column: GridColumn): void {
    this.columnFilterValues[column.field] =
      this.getDefaultColumnFilterValue(column);
    this.columnFilterSearchTerms[column.field] = '';
    this.removeColumnFilter(column);
  }

  hasColumnFilter(column: GridColumn): boolean {
    return !!this.currentFilterState.filters[column.field];
  }

  getColumnFilterOptions(column: GridColumn): any[] {
    return column.filterOptions || [];
  }

  getFilteredColumnOptions(column: GridColumn): any[] {
    const options = this.getColumnFilterOptions(column);
    const searchTerm = (
      this.columnFilterSearchTerms[column.field] || ''
    ).toLowerCase();

    if (!searchTerm) {
      return options;
    }

    return options.filter((opt: any) => {
      const label = String(opt?.label ?? '').toLowerCase();
      const value = String(opt?.value ?? '').toLowerCase();
      return label.includes(searchTerm) || value.includes(searchTerm);
    });
  }

  toggleColumnFilterOption(column: GridColumn, optionValue: any): void {
    if (!this.columnFilterValues[column.field]) {
      this.columnFilterValues[column.field] = [];
    }

    const values = this.columnFilterValues[column.field];
    const index = values.indexOf(optionValue);

    if (index === -1) {
      values.push(optionValue);
    } else {
      values.splice(index, 1);
    }

    this.applyColumnFilter(column);
  }

  selectAllColumnOptions(column: GridColumn): void {
    const allOptions = this.getColumnFilterOptions(column);
    this.columnFilterValues[column.field] = allOptions.map(
      (opt: any) => opt.value
    );
    this.applyColumnFilter(column);
  }

  clearAllColumnOptions(column: GridColumn): void {
    this.columnFilterValues[column.field] = [];
    this.removeColumnFilter(column);
  }

  calculateColumnFilterPosition(columnField: string, event: Event): void {
    const button = event.target as HTMLElement;
    const rect = button.getBoundingClientRect();
    
    // Position dropdown below the button with some margin
    const left = rect.right;
    const top = rect.bottom + 100;
    
    this.columnFilterPositions[columnField] = { left, top };
  }

  getColumnFilterPosition(columnField: string): { left: number; top: number } {
    return this.columnFilterPositions[columnField] || { left: 0, top: 0 };
  }

  loadSavedFilters(): void {
    this.savedFilters = this.gridService.getSavedFilters(this.gridId);
    // Don't restore active filter on component init
    this.activeFilterId = undefined;
  }

  onSavedFilterSelected(filter: SavedFilter): void {
    this.gridService.applySavedFilter(this.gridId, filter);

    // Apply the saved filter state to the grid-filter component UI
    if (this.gridFilterComponent) {
      this.gridFilterComponent.applySavedFilterState(filter.filterState);
    }

    this.filterChange.emit(filter.filterState);

    // Reset pagination when applying saved filter
    this.pagination.pageIndex = 0;
    this.gridService.setPagination(this.gridId, { pageIndex: 0 });

    if (this.endpoint) {
      this.fetchData();
    }

    // Clear selection when applying filter
    this.clearSelection();
  }

  onFilterSave(event: { name: string; filterState: GridFilterState }): void {
    // Check if name already exists
    if (this.gridService.isFilterNameExists(this.gridId, event.name)) {
      if (
        !confirm(
          `A filter named "${event.name}" already exists. Do you want to overwrite it?`
        )
      ) {
        return;
      }

      // Find and update existing filter
      const existingFilter = this.savedFilters.find(
        (f) => f.name.toLowerCase() === event.name.toLowerCase()
      );

      if (existingFilter) {
        this.gridService.updateSavedFilter(
          this.gridId,
          existingFilter.id,
          event.filterState
        );
      }
    } else {
      // Save new filter
      const savedFilter = this.gridService.saveFilter(
        this.gridId,
        event.name,
        event.filterState
      );

      // Update local state
      this.savedFilters = [...this.savedFilters, savedFilter];
      this.activeFilterId = savedFilter.id;
    }

    // Reload saved filters
    this.loadSavedFilters();
  }

  onFilterUpdate(filter: SavedFilter): void {
    this.gridService.updateSavedFilter(
      this.gridId,
      filter.id,
      this.currentFilterState
    );

    // Reload saved filters
    this.loadSavedFilters();
  }

  onFilterDelete(filterId: string): void {
    this.gridService.deleteSavedFilter(this.gridId, filterId);

    // If deleted filter was active, clear current filters
    if (this.activeFilterId === filterId) {
      this.clearAllFilters();
    } else {
      // Just reload saved filters
      this.loadSavedFilters();
    }
  }

  clearAllFilters(): void {
    this.gridService.clearAllFilters(this.gridId);

    // Reset filter state
    this.currentFilterState = {
      filters: {},
      globalFilter: undefined,
    };

    // Clear column filter values
    this.columnFilterValues = {};
    this.columnFilterSearchTerms = {};

    this.filterChange.emit(this.currentFilterState);

    // Reset pagination
    this.pagination.pageIndex = 0;
    this.gridService.setPagination(this.gridId, { pageIndex: 0 });

    if (this.endpoint) {
      this.fetchData();
    }

    // Clear selection
    this.clearSelection();

    // Clear active filter
    this.activeFilterId = undefined;

    // Reset grid-filter component UI state (keep filters visible but clear values)
    if (this.gridFilterComponent) {
      this.gridFilterComponent.resetAllFilters();
    }
  }

  onFilterChange(filters: GridFilterState): void {
    this.gridService.updateState(this.gridId, { filters });

    // Update current filter state
    this.currentFilterState = filters;

    // Check if current filters match any saved filter
    const matchingFilter = this.gridService.findMatchingSavedFilter(
      this.gridId,
      filters
    );

    if (matchingFilter) {
      this.activeFilterId = matchingFilter.id;
      this.gridService.updateState(this.gridId, {
        activeFilterId: matchingFilter.id,
      });
    } else {
      // Clear active filter if no match
      this.activeFilterId = undefined;
      this.gridService.clearActiveSavedFilter(this.gridId);
    }

    this.filterChange.emit(filters);

    if (this.endpoint) {
      this.pagination.pageIndex = 0;
      this.gridService.setPagination(this.gridId, { pageIndex: 0 });
      this.fetchData();
    }

    // Clear selection when filtering
    this.clearSelection();
  }

  ngOnDestroy(): void {
    // Clear filters when component is destroyed (navigating away)
    this.gridService.clearAllFilters(this.gridId);

    // Detach any scroll listeners
    this.detachScrollListeners();

    this.destroy$.next();
    this.destroy$.complete();
  }

  // ... rest of the component methods remain the same ...

  get filterableColumns(): GridColumn[] {
    return this.columns.filter((col) => col.filterable !== false);
  }

  get hasActionsColumn(): boolean {
    if (!this.showActions || this.actions.length === 0) {
      return false;
    }

    return this.actions.some((action) =>
      this.authService.hasPermission(action.permission)
    );
  }

  get isSelectionEnabled(): boolean {
    return (
      this.selectable &&
      this.authService.hasPermission(this.selectionPermission)
    );
  }

  updateVisibleColumns(): void {
    this.visibleColumns = this.columns.filter(
      (col) =>
        !col.hidden &&
        (col.permission == null ||
          this.authService.hasPermission(col.permission))
    );
  }

  fetchData(showLoading: boolean = true): void {
    if (!this.endpoint) {
      return;
    }

    if (showLoading) {
      this.loading = true;
    }

    this.gridService
      .fetchData<GridDataResponse<any>>(this.endpoint, this.gridId)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.data = response.items || response || [];

          const currentState = this.gridService.getCurrentState(this.gridId);
          const newPagination = {
            pageIndex:
              response.pageIndex !== undefined
                ? response.pageIndex
                : currentState.pagination.pageIndex,
            pageSize:
              response.pageSize !== undefined
                ? response.pageSize
                : currentState.pagination.pageSize,
            totalItems: response.totalCount || 0,
            totalPages: response.totalPages || 0,
          };

          this.pagination = newPagination;
          this.gridService.setPagination(this.gridId, newPagination);

          this.dataLoaded.emit(this.data);
        },
        error: (err) => {
          this.error.emit(err);
        },
      });
  }

  private processLocalData(): void {
    this.pagination.totalItems = this.data.length;
    this.pagination.totalPages = Math.ceil(
      this.data.length / this.pagination.pageSize
    );

    this.gridService.setPagination(this.gridId, {
      totalItems: this.pagination.totalItems,
      totalPages: this.pagination.totalPages,
    });
  }

  onRowClick(row: any, event: MouseEvent): void {
    this.rowClick.emit(row);
  }

  onRowRightClick(row: any, event: MouseEvent): void {
    if (!this.enableContextMenu || this.actions.length === 0) {
      return;
    }

    const hasAnyPermission = this.actions.some((action) =>
      this.authService.hasPermission(action.permission)
    );
    if (!hasAnyPermission) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.contextMenuItem = row;
    this.contextMenuActions = this.actions;
    this.contextMenuPosition = {
      x: event.clientX,
      y: event.clientY,
    };
    this.contextMenuVisible = true;

    const contextMenuEvent: GridContextMenuEvent = {
      event,
      item: row,
      actions: this.actions,
    };

    this.contextMenuOpened.emit(contextMenuEvent);
  }

  onActionExecuted(action: GridAction, item?: any): void {
    const targetItem = item || this.contextMenuItem;

    this.actionExecuted.emit({ action, item: targetItem });

    if (action.action) {
      action.action(targetItem, action);
    }

    this.contextMenuVisible = false;
  }

  onBulkActionExecuted(action: GridAction): void {
    if (this.selectedItems.length === 0) {
      return;
    }

    this.bulkActionExecuted.emit({
      action,
      items: [...this.selectedItems],
    });

    if (action.action) {
      action.action(this.selectedItems, action);
    }
  }

  onContextMenuActionExecuted(action: GridAction): void {
    this.onActionExecuted(action, this.contextMenuItem);
  }

  onSelectionChange(item: any, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter((i) => i !== item);
    }

    this.updateSelectAllState();
    this.selectionChange.emit(this.selectedItems);
  }

  onSelectAllChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    this.selectAll = checked;

    if (checked) {
      this.selectedItems = [...this.pagedData];
    } else {
      this.selectedItems = [];
    }

    this.selectionChange.emit(this.selectedItems);
  }

  clearSelection(): void {
    this.selectedItems = [];
    this.selectAll = false;
    this.selectionChange.emit(this.selectedItems);
  }

  private updateSelectAllState(): void {
    const currentPageItems = this.pagedData;
    const selectedItemsOnCurrentPage = this.selectedItems.filter((item) =>
      currentPageItems.includes(item)
    );

    this.selectAll =
      currentPageItems.length > 0 &&
      selectedItemsOnCurrentPage.length === currentPageItems.length;
  }

  onGlobalFilterChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.globalFilterLoading = true;
    this.globalFilterSubject.next(value);
  }

  private applyGlobalFilter(value: string): void {
    this.gridService.setGlobalFilter(this.gridId, value);

    this.currentFilterState = {
      ...this.currentFilterState,
      globalFilter: value,
    };

    const filterState: GridFilterState = this.currentFilterState;

    const matchingFilter = this.gridService.findMatchingSavedFilter(
      this.gridId,
      filterState
    );

    if (matchingFilter) {
      this.activeFilterId = matchingFilter.id;
      this.gridService.updateState(this.gridId, {
        activeFilterId: matchingFilter.id,
      });
    } else {
      this.activeFilterId = undefined;
      this.gridService.clearActiveSavedFilter(this.gridId);
    }

    this.filterChange.emit(filterState);

    this.pagination.pageIndex = 0;
    this.gridService.setPagination(this.gridId, { pageIndex: 0 });

    if (this.endpoint) {
      this.fetchData();
    }

    this.clearSelection();
    this.globalFilterLoading = false;
  }

  onSortChange(column: GridColumn): void {
    if (!column.sortable) {
      return;
    }

    const direction =
      this.currentSort?.field === column.field
        ? this.currentSort.direction === 'asc'
          ? 'desc'
          : 'asc'
        : 'asc';

    this.currentSort = {
      field: column.field,
      direction,
    };

    this.gridService.setSort(this.gridId, this.currentSort);
    this.sortChange.emit(this.currentSort);

    if (this.endpoint) {
      this.fetchData();
    }
  }

  onPageChange(pageIndex: number): void {
    if (pageIndex < 0 || pageIndex >= this.pagination.totalPages) {
      return;
    }

    this.pagination.pageIndex = pageIndex;
    this.gridService.setPagination(this.gridId, { pageIndex });
    this.pageChange.emit(this.pagination);

    if (this.endpoint) {
      this.fetchData();
    }

    this.updateSelectAllState();
  }

  onPageSizeChange(pageSize: number): void {
    this.pagination.pageSize = pageSize;
    this.pagination.totalPages = Math.ceil(
      this.pagination.totalItems / pageSize
    );
    this.pagination.pageIndex = 0;

    this.gridService.setPagination(this.gridId, {
      pageSize,
      pageIndex: 0,
      totalPages: this.pagination.totalPages,
    });

    this.pageChange.emit(this.pagination);

    if (this.endpoint) {
      this.fetchData();
    }

    this.updateSelectAllState();
  }

  handlePageSizeChange(event: Event): void {
    const pageSize = parseInt((event.target as HTMLSelectElement).value, 10);

    this.pagination.pageSize = pageSize;
    this.pagination.pageIndex = 0;

    this.gridService.setPagination(this.gridId, {
      pageSize,
      pageIndex: 0,
    });

    if (this.endpoint) {
      this.fetchData();
    } else {
      this.processLocalData();
      this.pageChange.emit(this.pagination);
    }

    this.updateSelectAllState();
  }

  toggleFilters(): void {
    this.isFilterVisible = !this.isFilterVisible;
  }

  toggleColumnSelector(): void {
    this.isColumnSelectorVisible = !this.isColumnSelectorVisible;
  }

  toggleExportMenu(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  onColumnVisibilityChange(columns: string[]): void {
    this.visibleColumns = this.columns.filter((col) =>
      columns.includes(col.field)
    );
    this.gridService.setVisibleColumns(this.gridId, columns);
  }

  exportData() {
    this.gridService.exportData(this.endpoint).subscribe((result: any) => {
      const blob = new Blob([result], {
        type: 'application/octet-stream',
      });

      const url = window.URL.createObjectURL(blob);

      // Extract the word before the last slash from the endpoint URL
      const urlParts = this.endpoint.split('/');
      const fileName = urlParts[urlParts.length - 2] || 'export';

      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.xlsx`;
      link.click();

      window.URL.revokeObjectURL(url);
    });
  }

  refreshGrid(): void {
    const currentPageSize = this.pagination.pageSize;
    const currentPageIndex = this.pagination.pageIndex;

    this.fetchData();
    this.refresh.emit();

    if (
      this.pagination.pageSize !== currentPageSize ||
      this.pagination.pageIndex !== currentPageIndex
    ) {
      this.pagination.pageSize = currentPageSize;
      this.pagination.pageIndex = currentPageIndex;
      this.gridService.setPagination(this.gridId, {
        pageSize: currentPageSize,
        pageIndex: currentPageIndex,
      });
    }

    this.clearSelection();
  }

  getSortHeaderClass(column: GridColumn): string {
    if (!column.sortable) {
      return '';
    }

    if (this.currentSort?.field !== column.field) {
      return 'cursor-pointer';
    }

    return `cursor-pointer sorted-${this.currentSort.direction}`;
  }

  getValue(item: any, column: GridColumn): any {
    if (column.selector) {
      return column.selector(item);
    }

    const keys = column.field.split('.');
    return keys.reduce((value, key) => value?.[key], item);
  }

  formatValue(value: any, column: GridColumn): any {
    if (value === null || value === undefined) {
      return '';
    }

    switch (column.type) {
      case 'date':
        return this.formatDate(value, column.format);
      case 'currency':
        return this.formatCurrency(value, column.format);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return value;
    }
  }

  private formatDate(value: any, format?: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString();
  }

  private formatCurrency(value: any, format?: string): string {
    if (isNaN(parseFloat(value))) {
      return value;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: format || 'USD',
    }).format(value);
  }

  get pagedData(): any[] {
    if (this.endpoint) {
      return this.data;
    }

    const start = this.pagination.pageIndex * this.pagination.pageSize;
    const end = start + this.pagination.pageSize;
    return this.data.slice(start, end);
  }

  get pageNumbers(): number[] {
    const totalPages = this.pagination.totalPages;
    const currentPage = this.pagination.pageIndex;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    if (currentPage < 3) {
      return [0, 1, 2, 3, 4];
    }

    if (currentPage > totalPages - 4) {
      return Array.from({ length: 5 }, (_, i) => totalPages - 5 + i);
    }

    return Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);
  }

  onColumnDragStart(event: DragEvent, columnIndex: number): void {
    this.draggedColumnIndex = columnIndex;

    // Set drag effect
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', ''); // Required for Firefox
    }

    // Add dragging class to the header
    const target = event.target as HTMLElement;
    target.classList.add('dragging');
  }

  onColumnDragOver(event: DragEvent, columnIndex: number): void {
    event.preventDefault();

    if (
      this.draggedColumnIndex === null ||
      this.draggedColumnIndex === columnIndex
    ) {
      return;
    }

    this.dragOverColumnIndex = columnIndex;

    // Set drop effect
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onColumnDragEnter(event: DragEvent, columnIndex: number): void {
    event.preventDefault();

    if (
      this.draggedColumnIndex === null ||
      this.draggedColumnIndex === columnIndex
    ) {
      return;
    }

    // Add visual feedback
    const target = event.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  onColumnDragLeave(event: DragEvent): void {
    // Remove visual feedback
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  onColumnDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    event.stopPropagation();

    // Remove visual feedback
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    if (
      this.draggedColumnIndex === null ||
      this.draggedColumnIndex === dropIndex
    ) {
      this.draggedColumnIndex = null;
      this.dragOverColumnIndex = null;
      return;
    }

    // Reorder the columns
    this.reorderColumns(this.draggedColumnIndex, dropIndex);

    // Reset drag state
    this.draggedColumnIndex = null;
    this.dragOverColumnIndex = null;
  }

  onColumnDragEnd(event: DragEvent): void {
    // Remove dragging class
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');

    // Remove any remaining drag-over classes
    document.querySelectorAll('.drag-over').forEach((el) => {
      el.classList.remove('drag-over');
    });

    // Reset drag state
    this.draggedColumnIndex = null;
    this.dragOverColumnIndex = null;
  }

  private reorderColumns(fromIndex: number, toIndex: number): void {
    // Create a copy of visible columns
    const reorderedColumns = [...this.visibleColumns];

    // Remove the dragged column
    const [movedColumn] = reorderedColumns.splice(fromIndex, 1);

    // Insert it at the new position
    reorderedColumns.splice(toIndex, 0, movedColumn);

    // Update visible columns
    this.visibleColumns = reorderedColumns;

    // Update the column order in the grid service
    const columnFields = reorderedColumns.map((col) => col.field);
    this.gridService.setVisibleColumns(this.gridId, columnFields);
  }

  getColumnDragClass(columnIndex: number): string {
    const classes: string[] = [];

    if (this.draggedColumnIndex === columnIndex) {
      classes.push('dragging');
    }

    if (
      this.dragOverColumnIndex === columnIndex &&
      this.draggedColumnIndex !== columnIndex
    ) {
      classes.push('drag-over');
    }

    return classes.join(' ');
  }
}
