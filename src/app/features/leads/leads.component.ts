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
import { LeadRegistrationModalComponent } from './components/lead-registration-modal/lead-registration-modal.component';
import { LeadsService } from './services/leads.service';
import {
  Lead,
  LeadStatus,
  LeadStatusColors,
  LeadStatusLabels,
  LeadUpdateRequest,
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
      filterType: 'text',
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
    },
    {
      field: 'lastName',
      header: 'Last Name',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      field: 'email',
      header: 'Email',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    // {
    //   field: 'username',
    //   header: 'Username',
    //   sortable: true,
    //   filterable: true,
    //   filterType:'text'
    // },
    {
      field: 'telephone',
      header: 'Phone',
      sortable: true,
      filterable: true,
      selector: (row: Lead) => row.telephone || '-',
      filterType: 'text',
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
      selector: (row: Lead) => row.country || '-',
      filterType: 'text',
    },
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
      selector: (row: Lead) => row.language || '-',
      filterType: 'text',
    },
    {
      field: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
      filterType: 'select',
      filterOptions: [
        { label: '0', value: 'Active' },
        { label: '1', value: 'Passive' },
        { label: '2', value: 'Neutral' },
        { label: '3', value: 'Inactive' },
        { label: '4', value: 'Blocked' },
        { label: '5', value: 'Disabled' },
      ],
    },
    {
      field: 'salesStatus',
      header: 'Sales Status',
      sortable: true,
      filterable: true,
      cellTemplate: null,
      filterType: 'text',
    },
    {
      field: 'isProblematic',
      header: 'Is Problematic',
      sortable: false,
      filterable: false,
      cellTemplate: null,
      filterType: 'boolean',
    },
    {
      field: 'isBonusAbuser',
      header: 'Is Bonus Abuser',
      sortable: false,
      filterable: false,
      cellTemplate: null,
      filterType: 'boolean',
    },
    {
      field: 'registrationDate',
      header: 'Registered At',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
    },
    {
      field: 'registrationIP',
      header: 'Registration IP',
      sortable: true,
      filterable: true,
      type: 'text',
      filterType: 'text',
    },
    {
      field: 'source',
      header: 'Source',
      sortable: true,
      filterable: true,
      type: 'text',
      filterType: 'text',
    },
    {
      field: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
    },
    {
      field: 'lastCommunication',
      header: 'Last Communication',
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
      username: ['', [Validators.required, Validators.minLength(3)]],
      telephone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      secondTelephone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      skype: [''],
      country: [''],
      language: [''],
      dateOfBirth: [''],
    });
  }

  ngOnInit(): void {
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

    this.leadsService.getActiveLeads().subscribe((result: any) => {
      this.totalCount = result.totalUsers;
      this.activeCount = result.activeUsersTotalCount;
    });
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
      username: lead.username,
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
        username: this.selectedLead.username,
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

    const updateRequest: LeadUpdateRequest = {
      id: this.selectedLead.id,
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      username: this.editForm.value.username,
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
          this.alertService.error('Failed to update lead');
          console.error('Error updating lead:', error);
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Lead updated successfully');
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
              'Cannot delete lead with active investments'
            );
          } else {
            this.alertService.error('Failed to delete lead');
          }
          console.error('Error deleting lead:', error);
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
          this.alertService.success('Lead deleted successfully');
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
          this.alertService.error('Failed to import leads');
          console.error('Error importing leads:', error);
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
          this.alertService.error('Failed to export leads');
          console.error('Error exporting leads:', error);
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
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
            console.error('Error refreshing lead:', error);
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
    const modalRef = this.modalService.open(LeadRegistrationModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshGrid();
          this.loadStatistics();
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

  private loadStatistics(): void {
    this.leadsService.getActiveLeads().subscribe((result: any) => {
      this.totalCount = result.totalUsers;
      this.activeCount = result.activeUsersTotalCount;
    });
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
