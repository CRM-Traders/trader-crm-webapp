import { FilterOperator } from './filter-operator.model';

export interface GridFilter {
  field: string;
  operator: FilterOperator;
  value: any;
  logic?: 'and' | 'or';
}
