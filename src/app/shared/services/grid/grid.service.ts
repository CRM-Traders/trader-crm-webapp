// src/app/shared/services/grid.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { HttpService } from '../../../core/services/http.service';
import { FilterOperator } from '../../models/grid/filter-operator.model';
import { GridExportOptions } from '../../models/grid/grid-export.model';
import { GridFilter } from '../../models/grid/grid-filter.model';
import { GridPagination } from '../../models/grid/grid-pagination.model';
import { GridSort } from '../../models/grid/grid-sort.model';
import { GridState } from '../../models/grid/grid-state.model';
import { SavedFilter } from '../../models/grid/saved-filter.model';
import { GridFilterState } from '../../models/grid/grid-filter-state.model';

// Interface for the backend response
interface GridStateResponse {
  [gridId: string]: GridState;
}

@Injectable({
  providedIn: 'root',
})
export class GridService {
  private httpService = inject(HttpService);

  // Endpoints for grid state persistence
  private readonly GRID_STATE_GET_ENDPOINT =
    'identity/api/users/get-user-settings';
  private readonly GRID_STATE_UPDATE_ENDPOINT = 'identity/api/users/upsert';

  // Default state for new grids
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
    columnsInitialized: false,
  };

  // Cache for grid states
  private gridStateMap: Map<string, BehaviorSubject<GridState>> = new Map();
  private loadedGridIds: Set<string> = new Set();
  private saveDebounceTimers: Map<string, any> = new Map();

  // Store the complete grid states from backend
  private allGridStates: GridStateResponse = {};

  /**
   * Initialize grid state from backend or create default
   */
  initializeGridState(gridId: string): Observable<GridState> {
    // If already loaded, return current state
    if (this.loadedGridIds.has(gridId)) {
      return this.getState(gridId);
    }

    // Load all states from backend
    return this.loadAllStatesFromBackend().pipe(
      map((allStates) => {
        // Check if this gridId exists in the response
        let state: GridState;

        if (allStates && allStates[gridId]) {
          // Use existing state from backend
          state = this.mergeWithDefault(allStates[gridId]);
        } else {
          // Create new default state for this grid
          state = { ...this.defaultState };
          // Save the new grid state to backend
          this.addNewGridState(gridId, state);
        }

        // Initialize the state subject
        if (!this.gridStateMap.has(gridId)) {
          this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(state));
        } else {
          this.gridStateMap.get(gridId)!.next(state);
        }

        // Mark as loaded
        this.loadedGridIds.add(gridId);

        return state;
      }),
      catchError((error) => {
        console.error(`Failed to load grid state for ${gridId}:`, error);
        // On error, use default state
        const defaultStateCopy = { ...this.defaultState };

        if (!this.gridStateMap.has(gridId)) {
          this.gridStateMap.set(
            gridId,
            new BehaviorSubject<GridState>(defaultStateCopy)
          );
        }

        this.loadedGridIds.add(gridId);
        return of(defaultStateCopy);
      })
    );
  }

  /**
   * Load all grid states from backend
   */
  private loadAllStatesFromBackend(): Observable<GridStateResponse> {
    return this.httpService.get<any>(this.GRID_STATE_GET_ENDPOINT).pipe(
      map((response) => {
        // Handle different response formats
        let gridStates: GridStateResponse = {};

        if (response && response.body) {
          // If response has body field with stringified JSON
          try {
            gridStates = JSON.parse(response.body);
          } catch (error) {
            console.error(
              'Failed to parse grid states from response.body:',
              error
            );
            gridStates = {};
          }
        } else if (response && response.gridStates) {
          // If response has gridStates field
          gridStates = response.gridStates;
        } else if (response && typeof response === 'string') {
          // If response is a string, try to parse it
          try {
            gridStates = JSON.parse(response);
          } catch (error) {
            console.error(
              'Failed to parse grid states from string response:',
              error
            );
            gridStates = {};
          }
        } else if (response && typeof response === 'object') {
          // If response is directly the grid states object
          gridStates = response;
        }

        this.allGridStates = gridStates;
        return gridStates;
      }),
      catchError((error) => {
        console.error('Failed to load grid states from backend:', error);
        this.allGridStates = {};
        return of({});
      })
    );
  }

  /**
   * Merge state with default to ensure all properties exist
   */
  private mergeWithDefault(state: GridState): GridState {
    return {
      ...this.defaultState,
      ...state,
      filters: {
        ...this.defaultState.filters,
        ...(state.filters || {}),
        filters: state.filters?.filters || {},
      },
      pagination: {
        ...this.defaultState.pagination,
        ...(state.pagination || {}),
      },
      visibleColumns: state.visibleColumns || [],
      columnsInitialized: state.columnsInitialized || false,
    };
  }

  /**
   * Add new grid state to the backend
   */
  private addNewGridState(gridId: string, state: GridState): void {
    // Update local cache
    this.allGridStates[gridId] = state;

    // Save to backend (debounced)
    this.saveStateDebounced(gridId, state);
  }

  /**
   * Save grid state to backend
   */
  private saveGridState(gridId: string, state: GridState): Observable<any> {
    // Update the specific grid state in our cache
    this.allGridStates[gridId] = state;

    // Prepare the request body with stringified grid states
    const requestBody = {
      body: JSON.stringify(this.allGridStates),
    };

    return this.httpService
      .post(this.GRID_STATE_UPDATE_ENDPOINT, requestBody)
      .pipe(
        tap(() => {
          console.log(`Grid state saved successfully for ${gridId}`);
        }),
        catchError((error) => {
          console.error(`Failed to save grid state for ${gridId}:`, error);
          return of(null);
        })
      );
  }

  /**
   * Debounced save to avoid too many API calls
   */
  private saveStateDebounced(gridId: string, state: GridState): void {
    // Clear existing timer
    if (this.saveDebounceTimers.has(gridId)) {
      clearTimeout(this.saveDebounceTimers.get(gridId));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.saveGridState(gridId, state).subscribe({
        next: () => console.log(`Grid state saved for ${gridId}`),
        error: (error) =>
          console.error(`Failed to save grid state for ${gridId}:`, error),
      });
      this.saveDebounceTimers.delete(gridId);
    }, 500); // 500ms debounce

    this.saveDebounceTimers.set(gridId, timer);
  }

  /**
   * Get observable of grid state
   */
  getState(gridId: string): Observable<GridState> {
    if (!this.gridStateMap.has(gridId)) {
      // Initialize and load from backend
      return this.initializeGridState(gridId);
    }
    return this.gridStateMap.get(gridId)!.asObservable();
  }

  /**
   * Get current grid state synchronously
   */
  getCurrentState(gridId: string): GridState {
    if (!this.gridStateMap.has(gridId)) {
      // Create default state if not exists
      const defaultStateCopy = { ...this.defaultState };
      this.gridStateMap.set(
        gridId,
        new BehaviorSubject<GridState>(defaultStateCopy)
      );
      // Trigger async load
      this.initializeGridState(gridId).subscribe();
      return defaultStateCopy;
    }
    return this.gridStateMap.get(gridId)!.value;
  }

  /**
   * Update grid state
   */
  updateState(gridId: string, state: Partial<GridState>): void {
    const currentState = this.getCurrentState(gridId);
    const newState = {
      ...currentState,
      ...state,
      // Deep merge for nested objects
      filters: state.filters
        ? {
            ...currentState.filters,
            ...state.filters,
            filters: state.filters.filters || currentState.filters.filters,
          }
        : currentState.filters,
      pagination: state.pagination
        ? {
            ...currentState.pagination,
            ...state.pagination,
          }
        : currentState.pagination,
    };

    // Update local state
    if (!this.gridStateMap.has(gridId)) {
      this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(newState));
    } else {
      this.gridStateMap.get(gridId)!.next(newState);
    }

    // Update cache
    this.allGridStates[gridId] = newState;

    // Save to backend (debounced)
    this.saveStateDebounced(gridId, newState);
  }

  /**
   * Reset grid state to default
   */
  resetState(gridId: string): void {
    const resetState = { ...this.defaultState };

    if (this.gridStateMap.has(gridId)) {
      this.gridStateMap.get(gridId)!.next(resetState);
    } else {
      this.gridStateMap.set(gridId, new BehaviorSubject<GridState>(resetState));
    }

    // Update cache
    this.allGridStates[gridId] = resetState;

    // Save reset state to backend
    this.saveStateDebounced(gridId, resetState);
  }

  /**
   * Set filter for a field
   */
  setFilter(gridId: string, filter: GridFilter): void {
    const currentState = this.getCurrentState(gridId);
    const newFilters = {
      ...currentState.filters.filters,
      [filter.field]: filter,
    };

    this.updateState(gridId, {
      filters: {
        ...currentState.filters,
        filters: newFilters,
      },
    });
  }

  /**
   * Remove filter for a field
   */
  removeFilter(gridId: string, field: string): void {
    const currentState = this.getCurrentState(gridId);
    const newFilters = { ...currentState.filters.filters };
    delete newFilters[field];

    this.updateState(gridId, {
      filters: {
        ...currentState.filters,
        filters: newFilters,
      },
    });
  }

  /**
   * Set global filter
   */
  setGlobalFilter(gridId: string, value: string): void {
    const currentState = this.getCurrentState(gridId);

    this.updateState(gridId, {
      filters: {
        ...currentState.filters,
        globalFilter: value,
      },
    });
  }

  /**
   * Set sort
   */
  setSort(gridId: string, sort: GridSort | undefined): void {
    this.updateState(gridId, { sort });
  }

  /**
   * Set pagination
   */
  setPagination(gridId: string, pagination: Partial<GridPagination>): void {
    const currentState = this.getCurrentState(gridId);

    this.updateState(gridId, {
      pagination: {
        ...currentState.pagination,
        ...pagination,
      },
    });
  }

  /**
   * Set visible columns
   */
  setVisibleColumns(gridId: string, columns: string[]): void {
    this.updateState(gridId, {
      visibleColumns: columns,
      columnsInitialized: true,
    });
  }

  /**
   * Force save current state immediately (useful before navigation)
   */
  forceSaveState(gridId: string): Observable<any> {
    // Clear any pending debounced saves
    if (this.saveDebounceTimers.has(gridId)) {
      clearTimeout(this.saveDebounceTimers.get(gridId));
      this.saveDebounceTimers.delete(gridId);
    }

    const currentState = this.getCurrentState(gridId);
    return this.saveGridState(gridId, currentState);
  }

  /**
   * Force save all states
   */
  forceSaveAllStates(): Observable<any> {
    // Clear all pending debounced saves
    this.saveDebounceTimers.forEach((timer) => clearTimeout(timer));
    this.saveDebounceTimers.clear();

    const requestBody = {
      body: JSON.stringify(this.allGridStates),
    };

    return this.httpService.post(this.GRID_STATE_UPDATE_ENDPOINT, requestBody);
  }

  /**
   * Load all grid states (useful for preloading)
   */
  loadAllGridStates(): Observable<GridStateResponse> {
    return this.loadAllStatesFromBackend().pipe(
      tap((states) => {
        // Initialize all loaded states
        if (states) {
          Object.entries(states).forEach(([gridId, state]) => {
            const mergedState = this.mergeWithDefault(state);

            if (!this.gridStateMap.has(gridId)) {
              this.gridStateMap.set(
                gridId,
                new BehaviorSubject<GridState>(mergedState)
              );
            } else {
              this.gridStateMap.get(gridId)!.next(mergedState);
            }
            this.loadedGridIds.add(gridId);
          });
        }
      })
    );
  }

  /**
   * Build query params for API requests
   */
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

  /**
   * Get operator suffix for query params
   */
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

  /**
   * Fetch data from API with current grid state
   */
  fetchData<T>(endpoint: string, gridId: string): Observable<T> {
    const state = this.getCurrentState(gridId);
    const requestBody = this.buildRequestBody(state);

    return this.httpService.post<T>(endpoint, requestBody).pipe(
      tap((response: any) => {
        // Update pagination totals if response contains them
        if (response && response.totalItems !== undefined) {
          this.setPagination(gridId, {
            totalItems: response.totalItems,
            totalPages: Math.ceil(
              response.totalItems / state.pagination.pageSize
            ),
          });
        }
      })
    );
  }

  /**
   * Build request body for API
   */
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
      visibleColumns: state.columnsInitialized ? state.visibleColumns : null,
      globalFilter: state.filters.globalFilter || null,
      filters:
        Object.keys(transformedFilters).length > 0 ? transformedFilters : null,
    };
  }

  /**
   * Export data with options
   */
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

  /**
   * Export to CSV
   */
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

  /**
   * Export to Excel (placeholder)
   */
  private exportToExcel(data: any[], options: GridExportOptions): void {
    // For now, export as CSV with .xls extension
    this.exportToCsv(data, {
      ...options,
      fileName: options.fileName,
    });

    console.warn(
      'Excel export: Using CSV format. For true Excel format, implement with a library like exceljs.'
    );
  }

  /**
   * Export to PDF (placeholder)
   */
  private exportToPdf(data: any[], options: GridExportOptions): void {
    console.warn(
      'PDF export not implemented. Use a library like pdfmake or jsPDF.'
    );
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    return keys.reduce((value, key) => value?.[key], obj);
  }

  /**
   * Download file helper
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Cleanup method - call on service destroy or app termination
   */
  ngOnDestroy(): void {
    // Save all pending states
    this.saveDebounceTimers.forEach((timer, gridId) => {
      clearTimeout(timer);
      // Force save the state
      const state = this.getCurrentState(gridId);
      this.saveGridState(gridId, state).subscribe();
    });
    this.saveDebounceTimers.clear();
  }

  getSavedFilters(gridId: string): SavedFilter[] {
    const state = this.getCurrentState(gridId);
    return state.savedFilters || [];
  }

  saveFilter(
    gridId: string,
    name: string,
    filterState: GridFilterState
  ): SavedFilter {
    const state = this.getCurrentState(gridId);
    const savedFilters = state.savedFilters || [];

    const newFilter: SavedFilter = {
      id: this.generateFilterId(),
      name,
      filterState: JSON.parse(JSON.stringify(filterState)), // Deep clone
      createdAt: new Date(),
    };

    const updatedFilters = [...savedFilters, newFilter];

    this.updateState(gridId, {
      savedFilters: updatedFilters,
      activeFilterId: newFilter.id,
    });

    return newFilter;
  }

  updateSavedFilter(
    gridId: string,
    filterId: string,
    filterState: GridFilterState
  ): void {
    const state = this.getCurrentState(gridId);
    const savedFilters = state.savedFilters || [];

    const updatedFilters = savedFilters.map((filter) => {
      if (filter.id === filterId) {
        return {
          ...filter,
          filterState: JSON.parse(JSON.stringify(filterState)),
          updatedAt: new Date(),
        };
      }
      return filter;
    });

    this.updateState(gridId, {
      savedFilters: updatedFilters,
    });
  }

  deleteSavedFilter(gridId: string, filterId: string): void {
    const state = this.getCurrentState(gridId);
    const savedFilters = state.savedFilters || [];

    const updatedFilters = savedFilters.filter(
      (filter) => filter.id !== filterId
    );

    const updates: any = {
      savedFilters: updatedFilters,
    };

    // If the deleted filter was active, clear the active filter
    if (state.activeFilterId === filterId) {
      updates.activeFilterId = undefined;
    }

    this.updateState(gridId, updates);
  }

  applySavedFilter(gridId: string, filter: SavedFilter): void {
    const filterStateCopy = JSON.parse(JSON.stringify(filter.filterState));

    this.updateState(gridId, {
      filters: filterStateCopy,
      activeFilterId: filter.id,
    });
  }

  clearActiveSavedFilter(gridId: string): void {
    this.updateState(gridId, {
      activeFilterId: undefined,
    });
  }

  isFilterNameExists(gridId: string, name: string): boolean {
    const savedFilters = this.getSavedFilters(gridId);
    return savedFilters.some(
      (filter) => filter.name.toLowerCase() === name.toLowerCase()
    );
  }
  private generateFilterId(): string {
    return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clearAllFilters(gridId: string): void {
    const currentState = this.getCurrentState(gridId);

    this.updateState(gridId, {
      filters: {
        filters: {},
        globalFilter: undefined,
      },
      activeFilterId: undefined,
    });
  }

  findMatchingSavedFilter(
    gridId: string,
    currentFilterState: GridFilterState
  ): SavedFilter | undefined {
    const savedFilters = this.getSavedFilters(gridId);

    return savedFilters.find((savedFilter) => {
      const savedState = savedFilter.filterState;

      // Compare global filters
      if (savedState.globalFilter !== currentFilterState.globalFilter) {
        return false;
      }

      // Compare filter objects
      const savedFilterKeys = Object.keys(savedState.filters || {});
      const currentFilterKeys = Object.keys(currentFilterState.filters || {});

      if (savedFilterKeys.length !== currentFilterKeys.length) {
        return false;
      }

      // Check if all filters match
      return savedFilterKeys.every((key) => {
        const savedFilter = savedState.filters[key];
        const currentFilter = currentFilterState.filters[key];

        if (!currentFilter) return false;

        return (
          savedFilter.field === currentFilter.field &&
          savedFilter.operator === currentFilter.operator &&
          JSON.stringify(savedFilter.value) ===
            JSON.stringify(currentFilter.value)
        );
      });
    });
  }

  getActiveSavedFilter(gridId: string): SavedFilter | undefined {
    const state = this.getCurrentState(gridId);
    if (!state.activeFilterId || !state.savedFilters) {
      return undefined;
    }

    return state.savedFilters.find(
      (filter) => filter.id === state.activeFilterId
    );
  }

  exportSavedFilters(gridId: string): string {
    const savedFilters = this.getSavedFilters(gridId);
    return JSON.stringify(savedFilters, null, 2);
  }

  importSavedFilters(gridId: string, filtersJson: string): void {
    try {
      const importedFilters = JSON.parse(filtersJson);

      if (!Array.isArray(importedFilters)) {
        throw new Error('Invalid filters format');
      }

      const state = this.getCurrentState(gridId);
      const existingFilters = state.savedFilters || [];

      // Merge imported filters with existing ones, avoiding duplicates by name
      const mergedFilters = [...existingFilters];

      importedFilters.forEach((importedFilter: SavedFilter) => {
        const existingIndex = mergedFilters.findIndex(
          (f) => f.name.toLowerCase() === importedFilter.name.toLowerCase()
        );

        if (existingIndex === -1) {
          // Add new filter with new ID
          mergedFilters.push({
            ...importedFilter,
            id: this.generateFilterId(),
            createdAt: new Date(importedFilter.createdAt),
            updatedAt: importedFilter.updatedAt
              ? new Date(importedFilter.updatedAt)
              : undefined,
          });
        }
      });

      this.updateState(gridId, {
        savedFilters: mergedFilters,
      });
    } catch (error) {
      console.error('Failed to import saved filters:', error);
      throw new Error('Invalid filter format');
    }
  }
}
