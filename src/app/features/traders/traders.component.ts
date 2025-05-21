import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { PermissionTableComponent } from '../../shared/components/permission-table/permission-table.component';

@Component({
  selector: 'app-traders',
  imports: [CommonModule, PermissionTableComponent],
  templateUrl: './traders.component.html',
  styleUrl: './traders.component.scss',
})
export class TradersComponent {}
