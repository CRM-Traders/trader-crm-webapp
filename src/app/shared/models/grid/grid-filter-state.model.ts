import { GridFilter } from './grid-filter.model';

export interface GridFilterState {
  filters: Record<string, GridFilter>;
  globalFilter?: string;
}
