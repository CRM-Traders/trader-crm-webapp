// src/app/shared/components/grid/grid.component.ts
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
import { Subject, takeUntil, finalize } from 'rxjs';
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
  ],
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit, OnDestroy {
  private gridService = inject(GridService);
  private themeService = inject(ThemeService);
  private destroy$ = new Subject<void>();

  @ViewChild('gridContainer', { static: false }) gridContainer!: ElementRef;

  @Input() gridId: string = 'default-grid';
  @Input() data: any[] = [];
  @Input() columns: GridColumn[] = [];
  @Input() actions: GridAction[] = [];
  @Input() bulkActions: GridAction[] = []; // New input for bulk actions
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

  @Output() rowClick = new EventEmitter<any>();
  @Output() actionExecuted = new EventEmitter<{
    action: GridAction;
    item: any;
  }>();
  @Output() bulkActionExecuted = new EventEmitter<{
    action: GridAction;
    items: any[];
  }>(); // New output for bulk actions
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

  // Context menu properties
  contextMenuVisible: boolean = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuActions: GridAction[] = [];
  contextMenuItem: any = null;

  pagination: GridPagination = {
    pageIndex: 0,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  };

  currentSort?: GridSort;

  exportTypes = [
    { label: 'CSV', value: 'csv' },
    { label: 'Excel', value: 'excel' },
    { label: 'PDF', value: 'pdf' },
  ];

  pageOptions: number[] = [5, 10, 25, 50, 100];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.contextMenuVisible = false;
  }

  @HostListener('document:contextmenu', ['$event'])
  onDocumentRightClick(event: Event): void {
    // Only prevent default if not over our grid
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

  ngOnInit(): void {
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => {
        this.isDarkMode = isDark;
      });

    this.updateVisibleColumns();

    this.gridService.setVisibleColumns(
      this.gridId,
      this.visibleColumns.map((col) => col.field)
    );

    this.gridService
      .getState(this.gridId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.pagination = state.pagination;
        this.currentSort = state.sort;

        if (state.visibleColumns.length > 0) {
          this.visibleColumns = this.columns.filter((col) =>
            state.visibleColumns.includes(col.field)
          );
        }
      });

    this.pagination.pageSize = 10;

    if (this.endpoint) {
      this.fetchData();
    } else {
      this.processLocalData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filterableColumns(): GridColumn[] {
    return this.columns.filter((col) => col.filterable !== false);
  }

  get hasActionsColumn(): boolean {
    return this.showActions && this.actions.length > 0;
  }

  updateVisibleColumns(): void {
    this.visibleColumns = this.columns.filter((col) => !col.hidden);
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
          this.data = response.items || [];

          const newPagination = {
            pageIndex: response.pageIndex,
            pageSize: response.pageSize,
            totalItems: response.totalCount,
            totalPages: response.totalPages,
          };

          this.pagination = newPagination;
          this.gridService.setPagination(this.gridId, newPagination);

          this.dataLoaded.emit(this.data);
        },
        error: (err) => {
          console.error('Error fetching grid data:', err);
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

    // Execute the action
    if (action.action) {
      action.action(targetItem, action);
    }

    // Close context menu if open
    this.contextMenuVisible = false;
  }

  onBulkActionExecuted(action: GridAction): void {
    if (this.selectedItems.length === 0) {
      return;
    }

    this.bulkActionExecuted.emit({ 
      action, 
      items: [...this.selectedItems] 
    });

    // Execute the action
    if (action.action) {
      action.action(this.selectedItems, action);
    }

    // Optionally clear selection after bulk action
    // this.clearSelection();
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
    const selectedItemsOnCurrentPage = this.selectedItems.filter(item => 
      currentPageItems.includes(item)
    );
    
    this.selectAll = currentPageItems.length > 0 && 
                     selectedItemsOnCurrentPage.length === currentPageItems.length;
  }

  onGlobalFilterChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.gridService.setGlobalFilter(this.gridId, value);

    const filterState: GridFilterState = {
      filters: {},
      globalFilter: value,
    };

    this.filterChange.emit(filterState);

    this.pagination.pageIndex = 0;
    this.gridService.setPagination(this.gridId, { pageIndex: 0 });

    if (this.endpoint) {
      this.fetchData();
    }

    // Clear selection when filtering
    this.clearSelection();
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

    // Update select all state when page changes
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

    // Update select all state when page size changes
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

    // Update select all state when page size changes
    this.updateSelectAllState();
  }

  toggleFilters(): void {
    this.isFilterVisible = !this.isFilterVisible;
  }

  onFilterChange(filters: GridFilterState): void {
    this.gridService.updateState(this.gridId, { filters });

    this.filterChange.emit(filters);

    if (this.endpoint) {
      this.pagination.pageIndex = 0;
      this.gridService.setPagination(this.gridId, { pageIndex: 0 });

      this.fetchData();
    }

    // Clear selection when filtering
    this.clearSelection();
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

  exportData(type: string): void {
    this.isExportOpen = false;

    const options: GridExportOptions = {
      fileName: this.gridId,
      fileType: type as 'csv' | 'excel' | 'pdf',
      fields: this.visibleColumns
        .filter((col) => col.exportable !== false)
        .map((col) => col.field),
    };

    this.export.emit(options);
    this.gridService.exportData(this.data, options);
  }

  refreshGrid(): void {
    const currentPageSize = this.pagination.pageSize;

    this.fetchData();
    this.refresh.emit();

    if (this.pagination.pageSize !== currentPageSize) {
      this.pagination.pageSize = currentPageSize;
      this.gridService.setPagination(this.gridId, {
        pageSize: currentPageSize,
      });
    }

    // Clear selection when refreshing
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
}