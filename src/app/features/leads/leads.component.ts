import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { PermissionTableComponent } from '../../shared/components/permission-table/permission-table.component';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { ModalService } from '../../shared/services/modals/modal.service';
import { ClientRegistrationModalComponent } from '../clients/components/client-registration-modal/client-registration-modal.component';
import {
  Client,
  ClientStatus,
  ClientStatusLabels,
  ClientStatusColors,
  ClientUpdateRequest,
} from '../clients/models/clients.model';
import { ClientsService } from '../clients/services/clients.service';
import { LeadsService } from './services/leads.service';
import {
  Lead,
  LeadStatus,
  LeadStatusColors,
  LeadStatusLabels,
} from './models/leads.model';
import { CommonModule } from '@angular/common';
import { GridComponent } from '../../shared/components/grid/grid.component';

@Component({
  selector: 'app-leads',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './leads.component.html',
  styleUrl: './leads.component.scss',
})
export class LeadsComponent {
  private leadsService = inject(LeadsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('flagsCell', { static: true })
  flagsCellTemplate!: TemplateRef<any>;
  @ViewChild('investmentCell', { static: true })
  investmentCellTemplate!: TemplateRef<any>;

  selectedLead: Lead | null = null;
  editForm: FormGroup;
  isEditing = false;
  loading = false;
  importLoading = false;
  showDeleteModal = false;
  clientToDelete: Lead | null = null;
  totalCount = 0;
  activeCount = 0;

  LeadStatus = LeadStatus;
  LeadStatusLabels = LeadStatusLabels;
  LeadStatusColors = LeadStatusColors;

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
      action: (item: Lead) => this.viewLead(item),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      action: (item: Lead) => this.startEdit(item),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      disabled: (item: Lead) => item.hasInvestments,
      action: (item: Lead) => this.confirmDelete(item),
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: 'permission',
      type: 'primary',
      action: (item) => this.openPermissionDialog(item),
    },
  ];

  constructor() {
    this.editForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      telephone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      secondTelephone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      skype: [''],
      country: [''],
      language: [''],
      dateOfBirth: [''],
    });
  }

  ngOnInit(): void {
    // Set cell templates after view initialization
    const statusColumn = this.gridColumns.find((col) => col.field === 'status');
    if (statusColumn) {
      statusColumn.cellTemplate = this.statusCellTemplate;
    }

    const flagsColumn = this.gridColumns.find(
      (col) => col.field === 'isProblematic'
    );
    if (flagsColumn) {
      flagsColumn.cellTemplate = this.flagsCellTemplate;
    }

    const investmentColumn = this.gridColumns.find(
      (col) => col.field === 'hasInvestments'
    );
    if (investmentColumn) {
      investmentColumn.cellTemplate = this.investmentCellTemplate;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRowClick(lead: Lead): void {
    this.viewLead(lead);
  }

  viewLead(lead: Lead): void {
    this.selectedLead = lead;
    this.isEditing = false;
    this.editForm.patchValue({
      firstName: lead.firstName,
      lastName: lead.lastName,
      telephone: lead.telephone || '',
      skype: lead.skype || '',
      country: lead.country || '',
      language: lead.language || '',
      dateOfBirth: lead.dateOfBirth || '',
    });
  }

  startEdit(lead?: Lead): void {
    if (lead) {
      this.viewLead(lead);
    }
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.selectedLead) {
      this.editForm.patchValue({
        firstName: this.selectedLead.firstName,
        lastName: this.selectedLead.lastName,
        telephone: this.selectedLead.telephone || '',
        skype: this.selectedLead.skype || '',
        country: this.selectedLead.country || '',
        language: this.selectedLead.language || '',
        dateOfBirth: this.selectedLead.dateOfBirth || '',
      });
    }
  }

  saveClient(): void {
    if (this.editForm.invalid || !this.selectedLead) return;

    const updateRequest: ClientUpdateRequest = {
      id: this.selectedLead.id,
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      telephone: this.editForm.value.telephone || null,
      secondTelephone: this.editForm.value.secondTelephone || null,
      skype: this.editForm.value.skype || null,
      country: this.editForm.value.country || null,
      language: this.editForm.value.language || null,
      dateOfBirth: this.editForm.value.dateOfBirth || null,
    };

    this.loading = true;
    this.leadsService
      .updateClient(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update client');
          console.error('Error updating client:', error);
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Client updated successfully');
          this.isEditing = false;
          this.refreshSelectedClient();
          this.refreshGrid();
        }
      });
  }

  confirmDelete(client: Lead): void {
    this.clientToDelete = client;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.clientToDelete = null;
  }

  deleteClient(): void {
    if (!this.clientToDelete) return;

    this.loading = true;
    this.leadsService
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
          this.loading = false;
          this.showDeleteModal = false;
          this.clientToDelete = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Client deleted successfully');
          if (this.selectedLead?.id === this.clientToDelete?.id) {
            this.selectedLead = null;
          }
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

    this.leadsService
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

    this.leadsService
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

  private refreshSelectedClient(): void {
    if (this.selectedLead) {
      this.leadsService
        .getClientById(this.selectedLead.id)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error('Error refreshing client:', error);
            return of(null);
          })
        )
        .subscribe((client) => {
          if (client) {
            this.selectedLead = client;
          }
        });
    }
  }

  closeDetails(): void {
    this.selectedLead = null;
    this.isEditing = false;
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
    this.leadsService
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
          a.download = 'leads-import-template.xlsx';
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
      `app-grid[gridId="leads-grid"]`
    );
    if (gridComponent) {
      (gridComponent as any).refresh?.();
    }
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
}
