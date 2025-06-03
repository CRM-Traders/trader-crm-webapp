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
import { AlertService } from '../../core/services/alert.service';
import { WorkerRegistrationModalComponent } from './components/worker-registration-modal/worker-registration-modal.component';

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
  private alertService = inject(AlertService);

  loading = false;
  workers: any[] = [];
  totalCount = 0;
  isUploading = false;

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

  onlineCount = 0;

  ngOnInit(): void {
    this.workersService.getActiveWorkers().subscribe((result: any) => {
      this.totalCount = result.totalUsers;
      this.onlineCount = result.activeUsersTotalCount;
    });
  }

  openPermissionDialog(user: any) {
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

  openRegistrationModal() {
    const modalRef = this.modalService.open(WorkerRegistrationModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          // Refresh the grid after successful registration
          this.refreshGrid();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  downloadTemplate() {
    this.workersService.downloadImportTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workers-import-template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.alertService.success('Template downloaded successfully!');
      },
      error: (error) => {
        if (error.status === 401) {
          this.alertService.error('Unauthorized. Please login again.');
        } else {
          this.alertService.error(
            'Failed to download template. Please try again.'
          );
        }
      },
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(file.type)) {
        this.alertService.error(
          'Please select a valid Excel file (.xlsx or .xls)'
        );
        input.value = '';
        return;
      }

      // Validate file size (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.alertService.error('File size exceeds 5MB limit');
        input.value = '';
        return;
      }

      this.uploadFile(file);
      input.value = ''; // Reset input
    }
  }

  uploadFile(file: File) {
    this.isUploading = true;
    this.workersService.importWorkers(file).subscribe({
      next: (result) => {
        this.isUploading = false;

        let message = `Import completed successfully!\n`;
        message += `Success: ${result.successCount} workers\n`;
        message += `Failed: ${result.failureCount} workers`;

        if (result.successCount > 0) {
          this.alertService.success(message);
          this.refreshGrid();
        } else {
          this.alertService.warning(message);
        }

        // Show detailed results if needed
        if (result.failureCount > 0 && result.userResults) {
          console.log('Import results:', result.userResults);
        }
      },
      error: (error) => {
        this.isUploading = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid file format or data. Please check your file.'
          );
        } else if (error.status === 401) {
          this.alertService.error('Unauthorized. Please login again.');
        } else {
          this.alertService.error(
            'Failed to import workers. Please try again.'
          );
        }
      },
    });
  }

  triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  private refreshGrid() {
    // Emit an event or call a method to refresh the grid
    // This depends on how your grid component handles refresh
    // For example:
    const gridComponent = document.querySelector(
      `app-grid[gridId="${this.gridId}"]`
    );
    if (gridComponent) {
      (gridComponent as any).refresh?.();
    }
  }
}
