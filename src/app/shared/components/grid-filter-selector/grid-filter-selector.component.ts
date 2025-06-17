import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridColumn } from '../../models/grid/grid-column.model';
import { GridService } from '../../services/grid/grid.service';

interface FilterOption {
  id: string;
  label: string;
  column: GridColumn;
  selected: boolean;
  category?: string;
}

@Component({
  selector: 'app-grid-filter-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grid-filter-selector.component.html',
  styleUrls: ['./grid-filter-selector.component.scss']
})
export class GridFilterSelectorComponent implements OnInit {
  private gridService = inject(GridService);

  @Input() columns: GridColumn[] = [];
  @Input() gridId: string = 'default-grid';

  filterSearchTerm = '';
  availableFilterOptions: FilterOption[] = [];
  filteredAvailableOptions: FilterOption[] = [];
  selectedFilterOptions: FilterOption[] = [];

  ngOnInit(): void {
    this.initializeFilterOptions();
    this.filterAvailableOptions();
  }
@Output() filtersSelected = new EventEmitter<string[]>();

private notifyFiltersSelected(): void {
  const selectedFields = this.selectedFilterOptions.map(option => option.id);
  this.filtersSelected.emit(selectedFields);
}
  private initializeFilterOptions(): void {
    this.availableFilterOptions = this.columns
      .filter((col) => col.filterable !== false)
      .map((col) => ({
        id: col.field,
        label: col.header,
        column: col,
        selected: false,
        category: this.getColumnCategory(col),
      }));
  }

  private getColumnCategory(column: GridColumn): string {
    if (column.type === 'date') return 'Date Filters';
    if (column.type === 'number' || column.type === 'currency')
      return 'Numeric Filters';
    if (column.type === 'boolean') return 'Boolean Filters';
    if (column.filterType === 'select') return 'Selection Filters';
    return 'Text Filters';
  }

  filterAvailableOptions(): void {
    const searchTerm = this.filterSearchTerm.toLowerCase();
    this.filteredAvailableOptions = this.availableFilterOptions
      .filter((option) => !option.selected)
      .filter(
        (option) =>
          option.label.toLowerCase().includes(searchTerm) ||
          (option.category &&
            option.category.toLowerCase().includes(searchTerm))
      );
  }

  toggleFilterOption(option: FilterOption): void {
    if (option.selected) {
      this.removeFilterOption(option);
    } else {
      this.addFilterOption(option);
    }
  }

  private addFilterOption(option: FilterOption): void {
    option.selected = true;
    this.selectedFilterOptions.push(option);
    this.filterAvailableOptions();
    this.notifyFiltersSelected();
  }

  private removeFilterOption(option: FilterOption): void {
    option.selected = false;
    this.selectedFilterOptions = this.selectedFilterOptions.filter(
      (opt) => opt.id !== option.id
    );
    this.filterAvailableOptions();
    this.notifyFiltersSelected();
  }

  areAllAvailableOptionsSelected(): boolean {
    return (
      this.filteredAvailableOptions.length > 0 &&
      this.filteredAvailableOptions.every((option) => option.selected)
    );
  }

  isPartialSelection(): boolean {
    const selectedCount = this.filteredAvailableOptions.filter(
      (option) => option.selected
    ).length;
    return (
      selectedCount > 0 && selectedCount < this.filteredAvailableOptions.length
    );
  }

  toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;

    this.filteredAvailableOptions.forEach((option) => {
      if (option.selected !== checked) {
        this.toggleFilterOption(option);
      }
    });
  }

  clearAllFilters(): void {
    this.selectedFilterOptions.forEach((option) => {
      option.selected = false;
    });
    this.selectedFilterOptions = [];
    this.filterAvailableOptions();
    this.notifyFiltersSelected();
  }

}
