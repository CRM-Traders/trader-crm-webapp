import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { GridColumn } from '../../shared/models/grid/grid-column.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, GridComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: true,
})
export class DashboardComponent {
  clients: Client[] = [];
  loading = false;

  columns: GridColumn<Client>[] = [
    {
      field: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '80px',
    },
    {
      field: 'name',
      header: 'Client Name',
      sortable: true,
      filterable: true,
    },
    {
      field: 'email',
      header: 'Email',
      sortable: true,
      filterable: true,
    },
    {
      field: 'company',
      header: 'Company',
      sortable: true,
      filterable: true,
    },
    {
      field: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
      cellClass: 'font-medium',
    },
    {
      field: 'revenue',
      header: 'Annual Revenue',
      sortable: true,
      filterable: true,
      type: 'currency',
      format: 'USD',
      filterType: 'number',
    },
    {
      field: 'lastContact',
      header: 'Last Contact',
      sortable: true,
      filterable: true,
      type: 'date',
      filterType: 'date',
    },
    {
      field: 'isVIP',
      header: 'VIP Client',
      sortable: true,
      filterable: true,
      type: 'boolean',
      filterType: 'boolean',
    },
  ];

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading = false;
  }
}

export interface Client {
  id: number;
  name: string;
  email: string;
  company: string;
  status: 'Active' | 'Inactive';
  revenue: number;
  lastContact: Date;
  isVIP: boolean;
}
