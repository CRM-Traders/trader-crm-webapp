import { GridFilterState } from './grid-filter-state.model';
import { GridPagination } from './grid-pagination.model';
import { GridSort } from './grid-sort.model';

export interface GridState {
  filters: GridFilterState;
  sort?: GridSort;
  pagination: GridPagination;
  visibleColumns: string[];
}

export interface GridDataResponse<T = any> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
