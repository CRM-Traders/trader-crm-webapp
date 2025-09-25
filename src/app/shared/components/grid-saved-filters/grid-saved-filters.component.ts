// src/app/shared/components/grid-saved-filters/grid-saved-filters.component.ts
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SavedFilter } from '../../models/grid/saved-filter.model';
import { GridFilterState } from '../../models/grid/grid-filter-state.model';

@Component({
  selector: 'app-grid-saved-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative inline-block">
      <!-- Saved Filters Dropdown Button -->
      <button
        (click)="toggleDropdown()"
        class="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        [ngClass]="{
          'bg-blue-50': hasActiveFilter && !isDarkMode,
          'bg-blue-900/20': hasActiveFilter && isDarkMode
        }"
      >
        <div class="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <span>{{ activeFilterName || 'Saved Filters' }}</span>
          @if (savedFilters.length > 0) {
          <span
            class="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
          >
            {{ savedFilters.length }}
          </span>
          }
          <!-- Dropdown Arrow -->
          <svg
            class="ml-2 h-4 w-4 transition-transform duration-200"
            [ngClass]="{ 'rotate-180': isDropdownOpen }"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      <!-- Dropdown Menu -->
      <div
        *ngIf="isDropdownOpen"
        class="absolute top-full left-0 mt-1 w-72 z-50 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600"
        (click)="$event.stopPropagation()"
      >
        <!-- Save Current Filter Section -->
        <div class="p-3 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center space-x-2">
            <input
              type="text"
              [(ngModel)]="newFilterName"
              placeholder="Enter filter name..."
              (keyup.enter)="saveCurrentFilter()"
              class="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              (click)="saveCurrentFilter()"
              [disabled]="!newFilterName.trim() || !hasActiveFilters"
              class="px-3 py-1 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
          @if (!hasActiveFilters) {
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Apply filters first to save them
          </p>
          }
        </div>

        <!-- Saved Filters List -->
        <div class="max-h-64 overflow-y-auto">
          @if (savedFilters.length > 0) {
          <div class="py-1">
            @for (filter of savedFilters; track filter.id) {
            <div
              class="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between group"
              [ngClass]="{
                'bg-blue-50 dark:bg-blue-900/20': filter.id === activeFilterId
              }"
            >
              <button
                (click)="selectFilter(filter)"
                class="flex-1 text-left flex items-center"
              >
                <div>
                  <div
                    class="text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    {{ filter.name }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDate(filter.createdAt) }} ·
                    {{ getFilterCount(filter) }} filter{{
                      getFilterCount(filter) === 1 ? '' : 's'
                    }}
                  </div>
                </div>
              </button>
              <div
                class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                @if (filter.id === activeFilterId) {
                <button
                  (click)="updateFilter(filter)"
                  title="Update with current filters"
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-gray-600 dark:text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </button>
                }
                <button
                  (click)="deleteFilter(filter, $event)"
                  title="Delete filter"
                  class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
            }
          </div>
          } @else {
          <div class="px-3 py-4 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              No saved filters yet
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Apply filters and save them for quick access
            </p>
          </div>
          }
        </div>

        <!-- Clear All Filters Option -->
        @if (hasActiveFilters || activeFilterId) {
        <div class="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            (click)="clearAllFilters()"
            class="w-full px-3 py-1.5 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          >
            <div class="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear All Filters
            </div>
          </button>
        </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class GridSavedFiltersComponent {
  @Input() savedFilters: SavedFilter[] = [];
  @Input() currentFilterState?: GridFilterState;
  @Input() activeFilterId?: string;
  @Input() isDarkMode: boolean = false;

  @Output() filterSelected = new EventEmitter<SavedFilter>();
  @Output() filterSaved = new EventEmitter<{
    name: string;
    filterState: GridFilterState;
  }>();
  @Output() filterUpdated = new EventEmitter<SavedFilter>();
  @Output() filterDeleted = new EventEmitter<string>();
  @Output() filtersCleared = new EventEmitter<void>();

  isDropdownOpen = false;
  newFilterName = '';

  get hasActiveFilters(): boolean {
    if (!this.currentFilterState) return false;

    const hasFilters =
      this.currentFilterState.filters &&
      Object.keys(this.currentFilterState.filters).length > 0;
    const hasGlobalFilter = !!this.currentFilterState.globalFilter;

    return hasFilters || hasGlobalFilter;
  }

  get hasActiveFilter(): boolean {
    return !!this.activeFilterId;
  }

  get activeFilterName(): string | null {
    if (!this.activeFilterId) return null;
    const filter = this.savedFilters.find((f) => f.id === this.activeFilterId);
    return filter ? filter.name : null;
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectFilter(filter: SavedFilter): void {
    this.filterSelected.emit(filter);
    this.isDropdownOpen = false;
  }

  saveCurrentFilter(): void {
    if (
      !this.newFilterName.trim() ||
      !this.hasActiveFilters ||
      !this.currentFilterState
    ) {
      return;
    }

    this.filterSaved.emit({
      name: this.newFilterName.trim(),
      filterState: this.currentFilterState,
    });

    this.newFilterName = '';
  }

  updateFilter(filter: SavedFilter): void {
    if (!this.currentFilterState) return;

    const updatedFilter: SavedFilter = {
      ...filter,
      filterState: this.currentFilterState,
      updatedAt: new Date(),
    };

    this.filterUpdated.emit(updatedFilter);
  }

  deleteFilter(filter: SavedFilter, event: Event): void {
    event.stopPropagation();

    if (
      confirm(`Are you sure you want to delete the filter "${filter.name}"?`)
    ) {
      this.filterDeleted.emit(filter.id);
    }
  }

  clearAllFilters(): void {
    this.filtersCleared.emit();
    this.isDropdownOpen = false;
  }

  getFilterCount(filter: SavedFilter): number {
    let count = 0;

    if (filter.filterState.filters) {
      count += Object.keys(filter.filterState.filters).length;
    }

    if (filter.filterState.globalFilter) {
      count += 1;
    }

    return count;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
}
