import { GridFilterState } from './grid-filter-state.model';
import { GridPagination } from './grid-pagination.model';
import { GridSort } from './grid-sort.model';

export interface GridState {
  filters: GridFilterState;
  sort?: GridSort;
  pagination: GridPagination;
  visibleColumns: string[];
}
