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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GridColumn } from '../../models/grid/grid-column.model';
import { GridPagination } from '../../models/grid/grid-pagination.model';
import { GridSort } from '../../models/grid/grid-sort.model';
import { GridExportOptions } from '../../models/grid/grid-export.model';
import { ThemeService } from '../../../core/services/theme.service';
import { GridFilterState } from '../../models/grid/grid-filter-state.model';
import { GridService } from '../../services/grid/grid.service';
import { GridColumnSelectorComponent } from '../grid-column-selector/grid-column-selector.component';
import { GridFilterComponent } from '../grid-filter/grid-filter.component';

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GridFilterComponent,
    GridColumnSelectorComponent,
  ],
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit, OnDestroy {
  private gridService = inject(GridService);
  private themeService = inject(ThemeService);
  private destroy$ = new Subject<void>();

  @Input() gridId: string = 'default-grid';
  @Input() data: any[] = [];
  @Input() columns: GridColumn[] = [];
  @Input() loading: boolean = false;
  @Input() emptyMessage: string = 'No records found';
  @Input() showFilters: boolean = true;
  @Input() showColumnSelector: boolean = true;
  @Input() showPagination: boolean = true;
  @Input() exportable: boolean = true;
  @Input() selectable: boolean = false;
  @Input() sortable: boolean = true;
  @Input() resizable: boolean = true;
  @Input() height: string = 'auto';
  @Input() responsive: boolean = true;

  @Output() rowClick = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() sortChange = new EventEmitter<GridSort>();
  @Output() pageChange = new EventEmitter<GridPagination>();
  @Output() filterChange = new EventEmitter<GridFilterState>();
  @Output() export = new EventEmitter<GridExportOptions>();
  @Output() refresh = new EventEmitter<void>();

  @ContentChild('rowTemplate') rowTemplate?: TemplateRef<any>;
  @ContentChild('headerTemplate') headerTemplate?: TemplateRef<any>;
  @ContentChild('emptyTemplate') emptyTemplate?: TemplateRef<any>;
  @ContentChild('loadingTemplate') loadingTemplate?: TemplateRef<any>;
  @ContentChild('footerTemplate') footerTemplate?: TemplateRef<any>;

  Math = Math;

  visibleColumns: GridColumn[] = [];
  selectedItems: any[] = [];
  selectAll: boolean = false;
  isFilterVisible: boolean = false;
  isColumnSelectorVisible: boolean = false;
  isExportOpen: boolean = false;
  isDarkMode: boolean = false;

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

  ngOnInit(): void {
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => {
        this.isDarkMode = isDark;
      });

    this.updateVisibleColumns();

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

    this.pagination.totalItems = this.data.length;
    this.pagination.totalPages = Math.ceil(
      this.data.length / this.pagination.pageSize
    );

    this.gridService.setVisibleColumns(
      this.gridId,
      this.visibleColumns.map((col) => col.field)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filterableColumns(): GridColumn[] {
    return this.columns.filter((col) => col.filterable !== false);
  }

  updateVisibleColumns(): void {
    this.visibleColumns = this.columns.filter((col) => !col.hidden);
  }

  onRowClick(row: any, event: MouseEvent): void {
    this.rowClick.emit(row);
  }

  onSelectionChange(item: any, event: Event): void {
    const checked = event.target as HTMLInputElement;

    if (checked) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter((i) => i !== item);
    }

    this.selectAll = this.selectedItems.length === this.data.length;
    this.selectionChange.emit(this.selectedItems);
  }

  onSelectAllChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    this.selectAll = checked;

    if (checked) {
      this.selectedItems = [...this.data];
    } else {
      this.selectedItems = [];
    }

    this.selectionChange.emit(this.selectedItems);
  }

  onGlobalFilterChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.gridService.setGlobalFilter(this.gridId, value);

    const filterState: GridFilterState = {
      filters: {},
      globalFilter: value,
    };

    this.filterChange.emit(filterState);
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
  }

  onPageChange(pageIndex: number): void {
    if (pageIndex < 0 || pageIndex >= this.pagination.totalPages) {
      return;
    }

    this.pagination.pageIndex = pageIndex;
    this.gridService.setPagination(this.gridId, { pageIndex });
    this.pageChange.emit(this.pagination);
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
  }

  handlePageSizeChange(event: Event): void {
    const pageSize = parseInt((event.target as HTMLSelectElement).value, 10);
    this.onPageSizeChange(pageSize);
  }

  toggleFilters(): void {
    this.isFilterVisible = !this.isFilterVisible;
  }

  onFilterChange(filters: GridFilterState): void {
    this.gridService.updateState(this.gridId, { filters });
    this.filterChange.emit(filters);
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
    this.refresh.emit();
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
