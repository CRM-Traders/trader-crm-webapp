// src/app/shared/services/grid.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { FilterOperator } from '../../models/grid/filter-operator.model';
import { GridExportOptions } from '../../models/grid/grid-export.model';
import { GridFilter } from '../../models/grid/grid-filter.model';
import { GridPagination } from '../../models/grid/grid-pagination.model';
import { GridSort } from '../../models/grid/grid-sort.model';
import { GridState } from '../../models/grid/grid-state.model';

@Injectable({
  providedIn: 'root',
})
export class GridService {
  private httpService = inject(HttpService);

  private defaultState: GridState = {
    filters: {
      filters: {},
      globalFilter: undefined,
    },
    sort: undefined,
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    },
    visibleColumns: [],
  };

  private gridStateMap: Map<string, BehaviorSubject<GridState>> = new Map();

  getState(gridId: string): Observable<GridState> {
    if (!this.gridStateMap.has(gridId)) {
      this.gridStateMap.set(
        gridId,
        new BehaviorSubject<GridState>({ ...this.defaultState })
      );
    }
    return this.gridStateMap.get(gridId)!.asObservable();
  }

  updateState(gridId: string, state: Partial<GridState>): void {
    if (!this.gridStateMap.has(gridId)) {
      this.gridStateMap.set(
        gridId,
        new BehaviorSubject<GridState>({ ...this.defaultState })
      );
    }

    const currentState = this.gridStateMap.get(gridId)!.value;
    const newState = { ...currentState, ...state };
    this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(newState));
  }

  resetState(gridId: string): void {
    this.gridStateMap.set(
      gridId,
      new BehaviorSubject<GridState>({ ...this.defaultState })
    );
  }

  setFilter(gridId: string, filter: GridFilter): void {
    const currentState = this.gridStateMap.get(gridId)?.value || {
      ...this.defaultState,
    };
    const newFilters = {
      ...currentState.filters.filters,
      [filter.field]: filter,
    };

    const newState = {
      ...currentState,
      filters: {
        ...currentState.filters,
        filters: newFilters,
      },
    };

    this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(newState));
  }

  removeFilter(gridId: string, field: string): void {
    const currentState = this.gridStateMap.get(gridId)?.value || {
      ...this.defaultState,
    };
    const newFilters = { ...currentState.filters.filters };
    delete newFilters[field];

    const newState = {
      ...currentState,
      filters: {
        ...currentState.filters,
        filters: newFilters,
      },
    };

    this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(newState));
  }

  setGlobalFilter(gridId: string, value: string): void {
    const currentState = this.gridStateMap.get(gridId)?.value || {
      ...this.defaultState,
    };

    const newState = {
      ...currentState,
      filters: {
        ...currentState.filters,
        globalFilter: value,
      },
    };

    this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(newState));
  }

  setSort(gridId: string, sort: GridSort): void {
    const currentState = this.gridStateMap.get(gridId)?.value || {
      ...this.defaultState,
    };

    const newState = {
      ...currentState,
      sort,
    };

    this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(newState));
  }

  setPagination(gridId: string, pagination: Partial<GridPagination>): void {
    const currentState = this.gridStateMap.get(gridId)?.value || {
      ...this.defaultState,
    };

    const newState = {
      ...currentState,
      pagination: {
        ...currentState.pagination,
        ...pagination,
      },
    };

    this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(newState));
  }

  setVisibleColumns(gridId: string, columns: string[]): void {
    const currentState = this.gridStateMap.get(gridId)?.value || {
      ...this.defaultState,
    };

    const newState = {
      ...currentState,
      visibleColumns: columns,
    };

    this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(newState));
  }

  buildQueryParams(state: GridState): HttpParams {
    let params = new HttpParams();

    params = params.set('pageIndex', state.pagination.pageIndex.toString());
    params = params.set('pageSize', state.pagination.pageSize.toString());

    if (state.sort) {
      params = params.set('sortField', state.sort.field);
      params = params.set('sortDirection', state.sort.direction);
    }

    if (state.filters.globalFilter) {
      params = params.set('filter', state.filters.globalFilter);
    }

    const filters = state.filters.filters;
    Object.keys(filters).forEach((key) => {
      const filter = filters[key];

      switch (filter.operator) {
        case FilterOperator.BETWEEN:
          if (Array.isArray(filter.value) && filter.value.length === 2) {
            params = params.set(`${key}From`, filter.value[0]);
            params = params.set(`${key}To`, filter.value[1]);
          }
          break;
        case FilterOperator.IN:
          if (Array.isArray(filter.value)) {
            filter.value.forEach((value, index) => {
              params = params.set(`${key}[${index}]`, value);
            });
          }
          break;
        default:
          params = params.set(
            `${key}${this.getOperatorSuffix(filter.operator)}`,
            filter.value
          );
          break;
      }
    });

    return params;
  }

  private getOperatorSuffix(operator: FilterOperator): string {
    switch (operator) {
      case FilterOperator.EQUALS:
        return '';
      case FilterOperator.NOT_EQUALS:
        return '_ne';
      case FilterOperator.GREATER_THAN:
        return '_gt';
      case FilterOperator.GREATER_THAN_OR_EQUALS:
        return '_gte';
      case FilterOperator.LESS_THAN:
        return '_lt';
      case FilterOperator.LESS_THAN_OR_EQUALS:
        return '_lte';
      case FilterOperator.CONTAINS:
        return '_contains';
      case FilterOperator.STARTS_WITH:
        return '_startswith';
      case FilterOperator.ENDS_WITH:
        return '_endswith';
      case FilterOperator.IS_NULL:
        return '_isnull';
      case FilterOperator.IS_NOT_NULL:
        return '_isnotnull';
      default:
        return '';
    }
  }

  fetchData<T>(endpoint: string, gridId: string): Observable<any> {
    const state = this.gridStateMap.get(gridId)?.value || {
      ...this.defaultState,
    };
    const params = this.buildQueryParams(state);

    return this.httpService.get<any>(endpoint, params);
  }

  exportData(data: any[], options: GridExportOptions): void {
    switch (options.fileType) {
      case 'csv':
        this.exportToCsv(data, options);
        break;
      case 'excel':
        this.exportToExcel(data, options);
        break;
      case 'pdf':
        this.exportToPdf(data, options);
        break;
    }
  }

  private exportToCsv(data: any[], options: GridExportOptions): void {
    const fields = options.fields || Object.keys(data[0] || {});

    const header = fields.join(',');

    const rows = data.map((item) =>
      fields
        .map((field) => {
          const value = this.getNestedValue(item, field);
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        })
        .join(',')
    );

    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, `${options.fileName}.csv`);
  }

  private exportToExcel(data: any[], options: GridExportOptions): void {
    this.exportToCsv(data, {
      ...options,
      fileName: options.fileName,
    });

    alert(
      'Excel export is a placeholder. For a real implementation, use a library like exceljs.'
    );
  }

  private exportToPdf(data: any[], options: GridExportOptions): void {
    // For a real implementation, you would use a library like pdfmake
    // This is a placeholder
    alert(
      'PDF export is a placeholder. For a real implementation, use a library like pdfmake.'
    );
  }

  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    return keys.reduce((value, key) => value?.[key], obj);
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
