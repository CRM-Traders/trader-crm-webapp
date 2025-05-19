import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { GridColumn } from '../../shared/models/grid/grid-column.model';
import { GridSort } from '../../shared/models/grid/grid-sort.model';
import { GridFilterState } from '../../shared/models/grid/grid-filter-state.model';
import { GridPagination } from '../../shared/models/grid/grid-pagination.model';
import { WorkersService } from './services/workers.service';

@Component({
  selector: 'app-workers',
  standalone: true,
  imports: [CommonModule, GridComponent],
  templateUrl: './workers.component.html',
  styleUrls: ['./workers.component.scss'],
})
export class WorkersComponent implements OnInit {
  private workersService = inject(WorkersService);

  loading = false;
  workers: any[] = [];
  totalCount = 0;

  columns: GridColumn[] = [
    { field: 'id', header: 'ID', hidden: true, filterable: false },
    {
      field: 'firstName',
      header: 'First Name',
      sortable: true,
      filterable: true,
      type: 'text',
      filterType: 'text',
    },
    {
      field: 'lastName',
      header: 'Last Name',
      sortable: true,
      filterable: true,
      type: 'text',
      filterType: 'text',
    },
    {
      field: 'email',
      header: 'Email',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      field: 'phoneNumber',
      header: 'Phone Number',
      sortable: true,
      filterable: true,
      type: 'text',
      filterType: 'text',
    },
    {
      field: 'role',
      header: 'Role',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Admin', value: 'Admin' },
        { label: 'Manager', value: 'Manager' },
        { label: 'User', value: 'User' },
      ],
    },
    {
      field: 'isEmailConfirmed',
      header: 'Email Confirmed',
      sortable: true,
      filterable: true,
      type: 'boolean',
      filterType: 'boolean',
    },
    {
      field: 'isTwoFactorEnabled',
      header: 'Two-Factor Enabled',
      sortable: true,
      filterable: true,
      type: 'boolean',
      filterType: 'boolean',
    },
    {
      field: 'isTwoFactorVerified',
      header: 'Two-Factor Verified',
      sortable: true,
      filterable: true,
      type: 'boolean',
      filterType: 'boolean',
    },
  ];

  gridId = 'workers-grid';

  ngOnInit(): void {
    this.loadWorkers();
  }

  loadWorkers(
    filters?: GridFilterState,
    sort?: GridSort,
    pagination?: GridPagination
  ): void {
    this.loading = true;

    this.workersService.getWorkersGrid(filters, sort, pagination).subscribe({
      next: (response) => {
        this.workers = response.items;
        this.totalCount = response.totalCount;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading workers', error);
        this.loading = false;
      },
    });
  }

  onRefresh(): void {
    this.loadWorkers();
  }

  onSortChange(sort: GridSort): void {
    this.loadWorkers(undefined, sort);
  }

  onFilterChange(filters: GridFilterState): void {
    this.loadWorkers(filters);
  }

  onPageChange(pagination: GridPagination): void {
    this.loadWorkers(undefined, undefined, pagination);
  }

  onRowClick(worker: any): void {
    console.log('Worker clicked:', worker);
    // Add your row click handling logic here
  }
}
