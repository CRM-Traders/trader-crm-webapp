// src/app/shared/models/grid/saved-filter.model.ts
import { GridFilterState } from './grid-filter-state.model';
import { GridPagination } from './grid-pagination.model';
import { GridSort } from './grid-sort.model';

export interface SavedFilter {
  id: string;
  name: string;
  filterState: GridFilterState;
  createdAt: Date;
  updatedAt?: Date;
  isDefault?: boolean;
}

export interface GridSavedFilters {
  [gridId: string]: SavedFilter[];
}
