import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridComponent } from '../../shared/components/grid/grid.component';
import {
  GridAction,
  GridColumn,
} from '../../shared/models/grid/grid-column.model';
import { WorkersService } from './services/workers.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import { PermissionTableComponent } from '../../shared/components/permission-table/permission-table.component';

@Component({
  selector: 'app-workers',
  standalone: true,
  imports: [CommonModule, GridComponent],
  templateUrl: './workers.component.html',
  styleUrls: ['./workers.component.scss'],
})
export class WorkersComponent implements OnInit {
  private workersService = inject(WorkersService);
  private modalService = inject(ModalService);

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

  actions: GridAction[] = [
    {
      id: 'permissions',
      label: 'Permissions',
      icon: 'permission',
      type: 'primary',
      action: (item) => this.openPermissionDialog(item),
    },
  ];

  ngOnInit(): void {}

  openPermissionDialog(user: any) {
    console.log('test');
    this.modalService.open(
      PermissionTableComponent,
      {
        size: 'xl',
        centered: true,
        closable: true,
        customClass: 'max-h-screen',
      },
      {
        userId: user.id,
      }
    );
  }
}
