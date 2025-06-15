// src/app/features/clients/clients.component.ts

import {
  Component,
  OnInit,
  ViewChild,
  TemplateRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { ClientsService } from './services/clients.service';
import {
  Client,
  ClientUpdateRequest,
  ClientStatus,
  ClientStatusLabels,
  ClientStatusColors,
} from './models/clients.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { PermissionTableComponent } from '../../shared/components/permission-table/permission-table.component';
import { ClientRegistrationModalComponent } from './components/client-registration-modal/client-registration-modal.component';
import { ClientDetailsModalComponent } from './components/client-details-modal/client-details-modal.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss'],
})
export class ClientsComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('investmentCell', { static: true })
  investmentCellTemplate!: TemplateRef<any>;

  importLoading = false;
  showDeleteModal = false;
  clientToDelete: Client | null = null;
  totalCount = 0;
  activeCount = 0;

  ClientStatus = ClientStatus;
  ClientStatusLabels = ClientStatusLabels;
  ClientStatusColors = ClientStatusColors;

  gridColumns: GridColumn[] = [
    {
      field: 'firstName',
      header: 'First Name',
      sortable: true,
      filterable: true,
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
    },
    {
      field: 'lastName',
      header: 'Last Name',
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
      field: 'telephone',
      header: 'Phone',
      sortable: true,
      filterable: true,
      selector: (row: Client) => row.telephone || '-',
    },
    {
      field: 'affiliateName',
      header: 'Affiliate',
      sortable: true,
      filterable: true,
      selector: (row: Client) => row.affiliateName || '-',
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
      selector: (row: Client) => row.country || '-',
    },
    {
      field: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'hasInvestments',
      header: 'Investment',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'isProblematic',
      header: 'Flags',
      sortable: false,
      filterable: false,
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'registrationDate',
      header: 'Registered',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Client) => this.openClientDetailsModal(item),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      action: (item: Client) => this.openClientDetailsModal(item),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      disabled: (item: Client) => item.hasInvestments,
      action: (item: Client) => this.confirmDelete(item),
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: 'permission',
      type: 'primary',
      action: (item) => this.openPermissionDialog(item),
    },
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadClientStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeGridTemplates(): void {
    const statusColumn = this.gridColumns.find((col) => col.field === 'status');
    if (statusColumn) {
      statusColumn.cellTemplate = this.statusCellTemplate;
    }

    const investmentColumn = this.gridColumns.find(
      (col) => col.field === 'hasInvestments'
    );
    if (investmentColumn) {
      investmentColumn.cellTemplate = this.investmentCellTemplate;
    }
  }

  private loadClientStatistics(): void {
    this.clientsService.getActiveClients().subscribe((result: any) => {
      this.totalCount = result.totalUsers;
      this.activeCount = result.activeUsersTotalCount;
    });
  }

  onRowClick(client: Client): void {
    this.openClientDetailsModal(client);
  }

  openClientDetailsModal(client: Client): void {
    const modalRef = this.modalService.open(
      ClientDetailsModalComponent,
      {
        size: 'xl',
        centered: true,
        closable: true,
        customClass: 'max-w-7xl',
      },
      {
        client: client,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshGrid();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  confirmDelete(client: Client): void {
    this.clientToDelete = client;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.clientToDelete = null;
  }

  deleteClient(): void {
    if (!this.clientToDelete) return;

    this.clientsService
      .deleteClient(this.clientToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          if (error.status === 409) {
            this.alertService.error(
              'Cannot delete client with active investments'
            );
          } else {
            this.alertService.error('Failed to delete client');
          }
          console.error('Error deleting client:', error);
          return of(null);
        }),
        finalize(() => {
          this.showDeleteModal = false;
          this.clientToDelete = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Client deleted successfully');
          this.refreshGrid();
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.importFile(input.files[0]);
      input.value = '';
    }
  }

  private importFile(file: File): void {
    this.importLoading = true;

    this.clientsService
      .importClients(file)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to import clients');
          console.error('Error importing clients:', error);
          return of(null);
        }),
        finalize(() => (this.importLoading = false))
      )
      .subscribe((response) => {
        if (response) {
          const message = `Import completed: ${response.successCount} successful, ${response.failureCount} failed`;
          this.alertService.success(message);
          this.refreshGrid();
        }
      });
  }

  onExport(options: any): void {
    const request = {
      sortField: options.sortField,
      sortDirection: options.sortDirection,
      globalFilter: options.globalFilter,
    };

    this.clientsService
      .exportClients(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to export clients');
          console.error('Error exporting clients:', error);
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `clients_${
            new Date().toISOString().split('T')[0]
          }.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.alertService.success('Export completed successfully');
        }
      });
  }

  openRegistrationModal(): void {
    const modalRef = this.modalService.open(ClientRegistrationModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshGrid();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  downloadTemplate(): void {
    this.clientsService
      .downloadImportTemplate()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          if (error.status === 401) {
            this.alertService.error('Unauthorized. Please login again.');
          } else {
            this.alertService.error(
              'Failed to download template. Please try again.'
            );
          }
          console.error('Error downloading template:', error);
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'clients-import-template.xlsx';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.alertService.success('Template downloaded successfully!');
        }
      });
  }

  refreshGrid(): void {
    const gridComponent = document.querySelector(
      `app-grid[gridId="clients-grid"]`
    );
    if (gridComponent) {
      (gridComponent as any).refresh?.();
    }
  }

  openPermissionDialog(user: any): void {
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
