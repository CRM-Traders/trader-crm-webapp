// src/app/features/workers/workers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { GridService } from '../../../shared/services/grid/grid.service';
import { GridFilterState } from '../../../shared/models/grid/grid-filter-state.model';
import { GridPagination } from '../../../shared/models/grid/grid-pagination.model';
import { GridSort } from '../../../shared/models/grid/grid-sort.model';

@Injectable({
  providedIn: 'root',
})
export class WorkersService {
  private http = inject(HttpService);

  getWorkersGrid(
    filters?: GridFilterState,
    sort?: GridSort,
    pagination?: GridPagination
  ): Observable<any> {
    const gridState = {
      filters: filters || { filters: {} },
      sort: sort,
      pagination: pagination || {
        pageIndex: 0,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      },
      visibleColumns: [],
    };

    const request = {
      pageIndex: gridState.pagination.pageIndex,
      pageSize: gridState.pagination.pageSize,
      sortField: gridState.sort?.field,
      sortDirection: gridState.sort?.direction,
      globalFilter: gridState.filters.globalFilter,
      filters: this.mapFilters(gridState.filters.filters),
      visibleColumns: [],
    };

    return this.http.post<any>(`workers/grid`, request);
  }

  private mapFilters(filters: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    Object.entries(filters).forEach(([field, filter]) => {
      result[field] = {
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
      };
    });

    return result;
  }
}
