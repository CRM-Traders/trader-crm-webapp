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

export interface GridAction<T = any> {
  id: string;
  label: string;
  icon?: string;
  type?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  disabled?: boolean | ((item: T) => boolean);
  visible?: boolean | ((item: T) => boolean);
  permission?: string;
  separator?: boolean; // For context menu separators
  action: (item: T, action: GridAction<T>) => void;
}

export interface GridActionGroup<T = any> {
  label: string;
  actions: GridAction<T>[];
}

export interface GridContextMenuEvent {
  event: MouseEvent;
  item: any;
  actions: GridAction[];
}
