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
      pageSize: 50,
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

  getCurrentState(gridId: string): GridState {
    if (!this.gridStateMap.has(gridId)) {
      this.gridStateMap.set(
        gridId,
        new BehaviorSubject<GridState>({ ...this.defaultState })
      );
    }
    return this.gridStateMap.get(gridId)!.value;
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
    this.gridStateMap.get(gridId)!.next(newState);
  }

  resetState(gridId: string): void {
    if (this.gridStateMap.has(gridId)) {
      this.gridStateMap.get(gridId)!.next({ ...this.defaultState });
    } else {
      this.gridStateMap.set(
        gridId,
        new BehaviorSubject<GridState>({ ...this.defaultState })
      );
    }
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

    this.gridStateMap.get(gridId)!.next(newState);
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

    this.gridStateMap.get(gridId)!.next(newState);
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

    this.gridStateMap.get(gridId)!.next(newState);
  }

  setSort(gridId: string, sort: GridSort): void {
    const currentState = this.gridStateMap.get(gridId)?.value || {
      ...this.defaultState,
    };

    const newState = {
      ...currentState,
      sort,
    };

    this.gridStateMap.get(gridId)!.next(newState);
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

    this.gridStateMap.get(gridId)!.next(newState);
  }

  setVisibleColumns(gridId: string, columns: string[]): void {
    if (!this.gridStateMap.has(gridId)) {
      this.gridStateMap.set(
        gridId,
        new BehaviorSubject<GridState>({ ...this.defaultState })
      );
    }

    const currentState = this.gridStateMap.get(gridId)!.value;
    const newState = {
      ...currentState,
      visibleColumns: columns,
    };

    this.gridStateMap.get(gridId)!.next(newState);
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
      params = params.set('globalFilter', state.filters.globalFilter);
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
        case FilterOperator.IS_NULL:
          params = params.set(`${key}_isnull`, 'true');
          break;
        case FilterOperator.IS_NOT_NULL:
          params = params.set(`${key}_isnotnull`, 'true');
          break;
        default:
          params = params.set(
            `${key}${this.getOperatorSuffix(filter.operator)}`,
            filter.value !== null && filter.value !== undefined
              ? filter.value.toString()
              : ''
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
      default:
        return '';
    }
  }

  fetchData<T>(endpoint: string, gridId: string): Observable<T> {
    const state = this.getCurrentState(gridId);
    const requestBody = this.buildRequestBody(state);

    return this.httpService.post<T>(endpoint, requestBody);
  }

  private buildRequestBody(state: GridState): any {
    const transformedFilters: Record<string, any> = {};
    if (state.filters && state.filters.filters) {
      Object.entries(state.filters.filters).forEach(([field, filter]) => {
        transformedFilters[field] = {
          field: filter.field,
          operator: filter.operator,
          value: filter.value,
          values: Array.isArray(filter.value) ? filter.value : null,
        };
      });
    }

    return {
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      sortField: state.sort?.field || null,
      sortDirection: state.sort?.direction || null,
      visibleColumns:
        state.visibleColumns.length > 0 ? state.visibleColumns : null,
      globalFilter: state.filters.globalFilter || null,
      filters:
        Object.keys(transformedFilters).length > 0 ? transformedFilters : null,
    };
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
