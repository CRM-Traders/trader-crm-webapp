// src/app/shared/components/grid-saved-filters/grid-saved-filters.component.ts
import { Component, Input, Output, EventEmitter, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SavedFilter } from '../../models/grid/saved-filter.model';
import { GridFilterState } from '../../models/grid/grid-filter-state.model';
import { ModalService } from '../../services/modals/modal.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-grid-saved-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'grid-saved-filters.component.html',
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

  private modalService = inject(ModalService);
  private alertService = inject(AlertService);

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isDropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

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

    const modalRef = this.modalService.open(
      ConfirmationDialogComponent,
      {
        size: 'md',
        centered: true,
      },
      {
        title: 'Update Filter',
        message: `Are you sure you want to update the filter "${filter.name}" with the current filter settings?`,
        type: 'info',
        confirmText: 'Update',
        cancelText: 'Cancel',
        details: 'This will replace the existing filter configuration with your current filter settings.',
      }
    );

    modalRef.result.then(
      (confirmed) => {
        if (confirmed) {
          const updatedFilter: SavedFilter = {
            ...filter,
            filterState: this.currentFilterState!,
            updatedAt: new Date(),
          };

          this.filterUpdated.emit(updatedFilter);
          this.alertService.success(`Filter "${filter.name}" has been updated successfully.`);
        }
      },
      () => {
        // Dismissed - do nothing
      }
    );
  }

  deleteFilter(filter: SavedFilter, event: Event): void {
    event.stopPropagation();

    const modalRef = this.modalService.open(
      ConfirmationDialogComponent,
      {
        size: 'md',
        centered: true,
      },
      {
        title: 'Delete Filter',
        message: `Are you sure you want to delete the filter "${filter.name}"?`,
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        details: 'This action cannot be undone.',
      }
    );

    modalRef.result.then(
      (confirmed) => {
        if (confirmed) {
          this.filterDeleted.emit(filter.id);
          this.alertService.success(`Filter "${filter.name}" has been deleted successfully.`);
        }
      },
      () => {
        // Dismissed - do nothing
      }
    );
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
