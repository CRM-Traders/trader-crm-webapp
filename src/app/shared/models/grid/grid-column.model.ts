export interface GridColumn<T = any> {
  field: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  width?: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'custom';
  format?: string;
  filterType?: 'text' | 'number' | 'date' | 'select' | 'boolean';
  filterOptions?: any[];
  cellTemplate?: any;
  headerTemplate?: any;
  filterTemplate?: any;
  cellClass?: string;
  headerClass?: string;
  exportable?: boolean;
  selector?: (item: T) => any;
}
