import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GridComponent } from '../../shared/components/grid/grid.component';

@Component({
  selector: 'app-traders',
  imports: [CommonModule, GridComponent],
  templateUrl: './traders.component.html',
  styleUrl: './traders.component.scss',
})
export class TradersComponent {}
