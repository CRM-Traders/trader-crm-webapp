import { CommonModule } from '@angular/common';
import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { GridComponent } from '../../../../shared/components/grid/grid.component';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import {
  GridColumn,
  GridAction,
} from '../../../../shared/models/grid/grid-column.model';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import { ClientRegistrationModalComponent } from '../../../clients/components/client-registration-modal/client-registration-modal.component';
import {
  Client,
  ClientStatus,
  ClientStatusLabels,
  ClientStatusColors,
  ClientUpdateRequest,
} from '../../../clients/models/clients.model';
import { ClientsService } from '../../../clients/services/clients.service';
import { AffiliateClientRegistrationModalComponent } from './modals/affiliate-client-registration-modal/affiliate-client-registration-modal.component';

@Component({
  selector: 'app-affiliate-clients',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './affiliate-clients.component.html',
  styleUrl: './affiliate-clients.component.scss',
})
export class AffiliateClientsComponent {
  private clientsService = inject(ClientsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('investmentCell', { static: true })
  investmentCellTemplate!: TemplateRef<any>;

  selectedClient: Client | null = null;
  editForm: FormGroup;
  isEditing = false;
  loading = false;
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

  gridActions: GridAction[] = [];

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
    const statusColumn = this.gridColumns.find((col) => col.field === 'status');
    if (statusColumn) {
      statusColumn.cellTemplate = this.statusCellTemplate;
    }

    const flagsColumn = this.gridColumns.find(
      (col) => col.field === 'isProblematic'
    );

    const investmentColumn = this.gridColumns.find(
      (col) => col.field === 'hasInvestments'
    );
    if (investmentColumn) {
      investmentColumn.cellTemplate = this.investmentCellTemplate;
    }

    this.clientsService.getActiveClients().subscribe((result: any) => {
      this.totalCount = result.totalUsers;
      this.activeCount = result.activeUsersTotalCount;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRowClick(client: Client): void {
    this.viewClient(client);
  }

  viewClient(client: Client): void {
    this.selectedClient = client;
    this.isEditing = false;
    this.editForm.patchValue({
      firstName: client.firstName,
      lastName: client.lastName,
      telephone: client.telephone || '',
      secondTelephone: client.secondTelephone || '',
      skype: client.skype || '',
      country: client.country || '',
      language: client.language || '',
      dateOfBirth: client.dateOfBirth || '',
    });
  }

  saveClient(): void {
    if (this.editForm.invalid || !this.selectedClient) return;

    const updateRequest: ClientUpdateRequest = {
      id: this.selectedClient.id,
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
    this.clientsService
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

  private refreshSelectedClient(): void {
    if (this.selectedClient) {
      this.clientsService
        .getClientById(this.selectedClient.id)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            return of(null);
          })
        )
        .subscribe((client) => {
          if (client) {
            this.selectedClient = client;
          }
        });
    }
  }

  closeDetails(): void {
    this.selectedClient = null;
    this.isEditing = false;
  }

  openRegistrationModal(): void {
    const modalRef = this.modalService.open(
      AffiliateClientRegistrationModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
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
}
