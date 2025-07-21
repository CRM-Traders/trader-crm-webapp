import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridService } from '../../services/grid/grid.service';
import { GridColumn } from '../../models/grid/grid-column.model';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-grid-column-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective],
  templateUrl: './grid-column-selector.component.html',
  styleUrls: ['./grid-column-selector.component.scss'],
})
export class GridColumnSelectorComponent implements OnInit, OnChanges {
  private gridService = inject(GridService);

  @Input() columns: GridColumn[] = [];
  @Input() gridId: string = 'default-grid';

  @Output() columnsChange = new EventEmitter<string[]>();

  selectedColumns: string[] = [];
  selectAll: boolean = true;

  ngOnInit(): void {
    this.initializeColumnSelection();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // If columns or gridId changes, reinitialize the selection
    if ((changes['columns'] || changes['gridId']) && this.columns.length > 0) {
      this.initializeColumnSelection();
    }
  }

  private initializeColumnSelection(): void {
    // Get the current state from the grid service
    const currentState = this.gridService.getCurrentState(this.gridId);

    if (currentState.visibleColumns.length > 0) {
      // Use the saved state if it exists
      this.selectedColumns = currentState.visibleColumns;
    } else {
      // Fall back to default values (non-hidden columns)
      this.selectedColumns = this.columns
        .filter((col) => !col.hidden)
        .map((col) => col.field);

      // Save the default state
      this.gridService.setVisibleColumns(this.gridId, this.selectedColumns);
    }

    this.selectAll = this.selectedColumns.length === this.columns.length;
  }

  toggleColumn(column: GridColumn, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedColumns.push(column.field);
    } else {
      this.selectedColumns = this.selectedColumns.filter(
        (field) => field !== column.field
      );
    }

    this.selectAll = this.selectedColumns.length === this.columns.length;

    this.gridService.setVisibleColumns(this.gridId, this.selectedColumns);

    this.columnsChange.emit(this.selectedColumns);
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedColumns = this.columns.map((col) => col.field);
    } else {
      this.selectedColumns = [];
    }

    this.selectAll = checked;

    this.gridService.setVisibleColumns(this.gridId, this.selectedColumns);

    this.columnsChange.emit(this.selectedColumns);
  }

  isColumnSelected(column: GridColumn): boolean {
    return this.selectedColumns.includes(column.field);
  }

  resetToDefault(): void {
    this.selectedColumns = this.columns
      .filter((col) => !col.hidden)
      .map((col) => col.field);

    this.selectAll = this.selectedColumns.length === this.columns.length;

    this.gridService.setVisibleColumns(this.gridId, this.selectedColumns);

    this.columnsChange.emit(this.selectedColumns);
  }
}
