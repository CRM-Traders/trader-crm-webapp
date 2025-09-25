import { GridFilterState } from './grid-filter-state.model';
import { GridPagination } from './grid-pagination.model';
import { GridSort } from './grid-sort.model';
import { SavedFilter } from './saved-filter.model';

export interface GridState {
  filters: GridFilterState;
  sort?: GridSort;
  pagination: GridPagination;
  visibleColumns: string[];
  columnsInitialized?: boolean;
  savedFilters?: SavedFilter[]; // Add this line
  activeFilterId?: string; // Add this to track which saved filter is active
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
