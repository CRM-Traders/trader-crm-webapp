import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridService } from '../../services/grid/grid.service';
import { GridColumn } from '../../models/grid/grid-column.model';

@Component({
  selector: 'app-grid-column-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grid-column-selector.component.html',
  styleUrls: ['./grid-column-selector.component.scss'],
})
export class GridColumnSelectorComponent implements OnInit {
  private gridService = inject(GridService);

  @Input() columns: GridColumn[] = [];
  @Input() gridId: string = 'default-grid';

  @Output() columnsChange = new EventEmitter<string[]>();

  selectedColumns: string[] = [];
  selectAll: boolean = true;

  ngOnInit(): void {
    this.selectedColumns = this.columns
      .filter((col) => !col.hidden)
      .map((col) => col.field);

    this.selectAll = this.selectedColumns.length === this.columns.length;

    this.gridService.setVisibleColumns(this.gridId, this.selectedColumns);
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
