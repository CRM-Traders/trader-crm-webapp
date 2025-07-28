import {
  Component,
  inject,
  TemplateRef,
  ViewChild,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize, forkJoin } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { ModalService } from '../../shared/services/modals/modal.service';
import {
  PasswordChangeComponent,
  PasswordChangeData,
} from '../../shared/components/password-change/password-change.component';
import { LeadRegistrationModalComponent } from './components/lead-registration-modal/lead-registration-modal.component';
import { LeadDetailsModalComponent } from './components/lead-details-modal/lead-details-modal.component';
import {
  BulkLeadConversionResponse,
  LeadConversionResponse,
  LeadsService,
} from './services/leads.service';
import {
  KycStatus,
  KycStatusLabels,
  Lead,
  LeadStatus,
  LeadStatusColors,
  LeadStatusLabels,
} from './models/leads.model';
import { CommonModule } from '@angular/common';
import { GridComponent } from '../../shared/components/grid/grid.component';
import {
  Client,
  ClientStatus,
  ClientStatusLabels,
} from '../clients/models/clients.model';
import { CountryService } from '../../core/services/country.service';
import { LanguageService } from '../../core/services/language.service';
import { OperatorsService } from '../operators/services/operators.service';
import { OfficeRulesService } from '../officies/services/office-rules.service';
import { AssignOperatorModalComponent } from '../clients/components/assign-operator-modal/assign-operator-modal.component';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-leads',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GridComponent,
    HasPermissionDirective,
  ],
  templateUrl: './leads.component.html',
  styleUrl: './leads.component.scss',
})
export class LeadsComponent implements OnInit, OnDestroy {
  private leadsService = inject(LeadsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private operatorsService = inject(OperatorsService);
  private officeRulesService = inject(OfficeRulesService);
  private destroy$ = new Subject<void>();

  gridId = 'leads-grid';

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('investmentCell', { static: true })
  investmentCellTemplate!: TemplateRef<any>;

  @Output() selectionChange = new EventEmitter<any[]>();

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
    // Text Input Filters
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
    {
      field: 'telephone',
      header: 'Phone',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: Lead) => row.telephone || '-',
    },
    {
      field: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hidden: true,
    },
    {
      field: 'source',
      header: 'Source',
      sortable: true,
      filterable: false,
      selector: (row: Lead) => row.source || '-',
      hidden: true,
    },
    {
      field: 'affiliateName',
      header: 'Affiliate Name',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: Lead) => row.affiliateName || '-',
      hidden: true,
    },

    // Dropdown Filters
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      selector: (row: Lead) => row.language || '-',
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      selector: (row: Lead) => row.country || '-',
    },
    {
      field: 'deskId',
      header: 'Desk',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      hidden: true,
    },
    {
      field: 'teamId',
      header: 'Team',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      hidden: true,
    },
    {
      field: 'salesAgentId',
      header: 'Sales Agent',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      hidden: true,
    },
    {
      field: 'salesStatus',
      header: 'Sales Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.entries(KycStatusLabels).map(([value, label]) => ({
        value: Number(value),
        label: label,
      })),
      cellTemplate: null,
      selector: (row: KycStatus) => {
        switch (row) {
          case KycStatus.Active:
            return 'Active';
          case KycStatus.Appointment24Hr:
            return 'Appointment 24Hr';
          case KycStatus.BlackListCountry:
            return 'Black List Country';
          case KycStatus.Callback:
            return 'Callback';
          case KycStatus.CallbackNA:
            return 'Callback NA';
          case KycStatus.CallAgain:
            return 'Call Again';
          default:
            return 'Unknown';
        }
      },
    },
    {
      field: 'status',
      header: 'Account Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.entries(LeadStatusLabels).map(([value, label]) => ({
        value: Number(value),
        label: label,
      })),
      cellTemplate: null, // Will be set in ngOnInit
      selector: (row: Client) =>
        ClientStatusLabels[row.status as ClientStatus] || 'N/A',
    },
    {
      field: 'neverCalled',
      header: 'Never Called',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
      hidden: true,
    },
    {
      field: 'timezone',
      header: 'Time Zone',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      hidden: true,
    },

    // Date Range Filters
    {
      field: 'registrationDate',
      header: 'Registration Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
    },
    {
      field: 'lastNoteDate',
      header: 'Last Note Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      hidden: true,
    },
    {
      field: 'lastCommunication',
      header: 'Last Call Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      selector: (row: Lead) => row.lastCommunication || 'No Info',
    },

    // Additional existing fields
    {
      field: 'isProblematic',
      header: 'Problematic',
      sortable: false,
      filterable: false,
      cellTemplate: null,
      filterType: 'boolean',
      selector: (row: Lead) => (row.isProblematic ? 'Yes' : 'No'),
      hidden: true,
    },
    {
      field: 'isBonusAbuser',
      header: 'Bonus Abuser',
      sortable: false,
      filterable: false,
      cellTemplate: null,
      filterType: 'boolean',
      selector: (row: Lead) => (row.isBonusAbuser ? 'Yes' : 'No'),
      hidden: true,
    },
    {
      field: 'registrationIP',
      header: 'Registration IP',
      sortable: true,
      filterable: true,
      type: 'text',
      filterType: 'text',
      hidden: true,
    },
    {
      field: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
      selector: (row: Lead) => row.lastLogin || 'No Info',
      hidden: true,
    },
  ];

  gridBulkActions: GridAction[] = [
    {
      id: 'bulk-activate',
      label: 'Assign lead(s) to Operator',
      icon: 'fas fa-check-circle',
      type: 'primary',
      action: (leads: Lead[]) => this.assignClientsToOperators(leads),
      visible: false,
      disabled: false,
      permission: 94,
    },
    {
      id: 'bulk-activate',
      label: 'Convert to Client(s)',
      icon: 'fas fa-check-circle',
      type: 'primary',
      action: (items: Lead[]) => this.convertLeadsToClients(items),
      visible: false,
      disabled: false,
      permission: 95,
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Lead) => this.openDetailsModal(item),
      permission: 93,
    },
    // {
    //   id: 'password',
    //   label: 'Change Password',
    //   icon: 'password',
    //   action: (item: Lead) => this.openPasswordChangeModal(item),
    // },
    // {
    //   id: 'delete',
    //   label: 'Delete',
    //   icon: 'delete',
    //   disabled: (item: Lead) => item.hasInvestments,
    //   action: (item: Lead) => this.confirmDelete(item),
    // },
    // {
    //   id: 'permissions',
    //   label: 'Permissions',
    //   icon: 'permission',
    //   type: 'primary',
    //   action: (item) => this.openPermissionDialog(item),
    // },
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.initializeFilterOptions();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRowClick(lead: Lead): void {
    this.openDetailsModal(lead);
  }

  openDetailsModal(lead: Lead): void {
    const modalRef = this.modalService.open(
      LeadDetailsModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        leadId: lead.id,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadStatistics();
        }
      },
      () => {
        // Modal dismissed - still refresh to ensure data is up to date
        this.refreshSpecificGrid();
        this.loadStatistics();
      }
    );
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
          this.refreshSpecificGrid();
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
  private assignClientsToOperators(leads: Lead[]): void {
    if (!leads || leads.length === 0) {
      this.alertService.warning('No leads selected for assignment');
      return;
    }

    const clientsWithInvestments = leads.filter(
      (client) => client.hasInvestments
    );
    if (clientsWithInvestments.length > 0) {
    }

    const modalRef = this.modalService.open(
      AssignOperatorModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        selectedClients: leads,
        userType: 0,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadStatistics();
          this.clearGridSelection();
          this.selectionChange.emit([]);
        }
      },
      () => {}
    );
    this.refreshSpecificGrid();
  }
  private importFile(file: File): void {
    this.importLoading = true;

    this.leadsService
      .importClients(file)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to import leads');
          return of(null);
        }),
        finalize(() => (this.importLoading = false))
      )
      .subscribe((response) => {
        if (response) {
          const message = `Import completed: ${response.successCount} successful, ${response.failureCount} failed`;
          this.alertService.success(message);
          this.refreshSpecificGrid();
        }
      });
  }
  private clearGridSelection(): void {
    window.dispatchEvent(
      new CustomEvent('clearGridSelection', {
        detail: { gridId: this.gridId },
      })
    );
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

  openRegistrationModal(): void {
    const modalRef = this.modalService.open(LeadRegistrationModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadStatistics();
        }
      },
      () => {
        this.refreshSpecificGrid();
        this.loadStatistics();
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

  refreshSpecificGrid(): void {
    const event = new CustomEvent('refreshGrid', {
      detail: { gridId: this.gridId },
    });
    window.dispatchEvent(event);
  }

  private loadStatistics(): void {
    this.leadsService.getActiveLeads().subscribe((result: any) => {
      this.totalCount = result.totalUsers;
      this.activeCount = result.activeUsersTotalCount;
    });
  }

  openPasswordChangeModal(lead: Lead): void {
    const passwordChangeData: PasswordChangeData = {
      entityId: lead.id,
      entityType: 'lead',
      entityName: `${lead.firstName} ${lead.lastName}`,
    };

    const modalRef = this.modalService.open(
      PasswordChangeComponent,
      {
        size: 'md',
        centered: true,
        closable: true,
      },
      passwordChangeData
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.alertService.success('Password changed successfully');
        }
      },
      () => {}
    );
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

  private initializeFilterOptions(): void {
    forkJoin({
      countries: this.countryService.getCountries(),
      languages: of(this.languageService.getAllLanguages()),
      desks: this.loadDesksDropdown(),
      teams: this.loadTeamsDropdown(),
      salesAgents: this.loadSalesAgentsDropdown(),
      timezones: this.loadTimezones(),
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          return of({
            countries: [],
            languages: [],
            desks: [],
            teams: [],
            salesAgents: [],
            timezones: [],
          });
        })
      )
      .subscribe(
        ({ countries, languages, desks, teams, salesAgents, timezones }) => {
          this.updateColumnFilterOptions(
            'country',
            countries.map((c) => ({ value: c.code, label: c.name }))
          );

          this.updateColumnFilterOptions(
            'language',
            languages.map((l) => ({ value: l.key, label: l.value }))
          );

          this.updateColumnFilterOptions('deskId', desks);
          this.updateColumnFilterOptions('teamId', teams);
          this.updateColumnFilterOptions('salesAgentId', salesAgents);
          this.updateColumnFilterOptions('timezone', timezones);
        }
      );
  }

  private updateColumnFilterOptions(field: string, options: any[]): void {
    const column = this.gridColumns.find((col) => col.field === field);
    if (column) {
      column.filterOptions = options;
    }
  }

  private loadDesksDropdown() {
    return this.operatorsService
      .getDesksDropdown({
        pageIndex: 0,
        pageSize: 1000,
        sortField: 'name',
        sortDirection: 'asc',
      })
      .pipe(
        catchError(() => of({ items: [] })),
        takeUntil(this.destroy$)
      )
      .toPromise()
      .then(
        (response: any) =>
          response?.items?.map((desk: any) => ({
            value: desk.id,
            label: desk.value,
          })) || []
      );
  }

  private loadTeamsDropdown() {
    return this.operatorsService
      .getTeamsDropdown({
        pageIndex: 0,
        pageSize: 1000,
        sortField: 'name',
        sortDirection: 'asc',
      })
      .pipe(
        catchError(() => of({ items: [] })),
        takeUntil(this.destroy$)
      )
      .toPromise()
      .then(
        (response: any) =>
          response?.items?.map((team: any) => ({
            value: team.id,
            label: team.value,
          })) || []
      );
  }

  private loadSalesAgentsDropdown() {
    return this.officeRulesService
      .getAvailableOperators(0, 1000, '')
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$)
      )
      .toPromise()
      .then(
        (response: any) =>
          response?.map((operator: any) => ({
            value: operator.id,
            label: operator.value,
          })) || []
      );
  }

  private loadTimezones() {
    const timezones = [
      { value: 'UTC', label: 'UTC' },
      { value: 'GMT', label: 'GMT' },
      { value: 'EST', label: 'EST' },
      { value: 'PST', label: 'PST' },
      { value: 'CET', label: 'CET' },
      { value: 'JST', label: 'JST' },
      { value: 'IST', label: 'IST' },
      { value: 'CST', label: 'CST' },
      { value: 'MST', label: 'MST' },
      { value: 'AST', label: 'AST' },
    ];

    return Promise.resolve(timezones);
  }

  convertSingleLead(lead: Lead): void {
    if (!lead || !lead.id) {
      this.alertService.error('Invalid lead selected');
      return;
    }

    this.loading = true;
    this.leadsService
      .convertLeadToClient(lead.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          let errorMessage = 'Failed to convert lead to client';

          if (error.status === 400) {
            errorMessage =
              'Lead cannot be converted. Please check the lead details.';
          } else if (error.status === 409) {
            errorMessage = 'Lead is already a client or has conflicts.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          this.alertService.error(errorMessage);
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.refreshSpecificGrid();
          this.loadStatistics();
        })
      )
      .subscribe((result: string) => {
        if (result) {
          this.alertService.success(
            `Lead "${lead.firstName} ${lead.lastName}" successfully converted to client`
          );
          this.refreshSpecificGrid();
          this.loadStatistics();
        }
        this.refreshSpecificGrid();
        this.loadStatistics();
      });
  }

  convertLeadsToClients(leads: Lead[]): void {
    if (!leads || leads.length === 0) {
      this.alertService.error('No leads selected for conversion');
      return;
    }

    const leadIds = leads.map((lead) => lead.id).filter((id) => id);

    if (leadIds.length === 0) {
      this.alertService.error('Invalid leads selected');
      return;
    }

    if (leadIds.length === 1) {
      const lead = leads.find((l) => l.id === leadIds[0]);
      if (lead) {
        this.convertSingleLead(lead);
      }
      return;
    }

    const confirmMessage = `Are you sure you want to convert ${leads.length} leads to clients?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    this.loading = true;
    this.leadsService
      .convertLeadsToClients(leadIds)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          let errorMessage = 'Failed to convert leads to clients';

          if (error.status === 400) {
            errorMessage =
              'Some leads cannot be converted. Please check the lead details.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          this.alertService.error(errorMessage);
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result: BulkLeadConversionResponse | null) => {
        if (result) {
          this.handleBulkConversionResult(result);
          this.refreshSpecificGrid();
          this.loadStatistics();
        }
      });
  }

  private handleBulkConversionResult(result: BulkLeadConversionResponse): void {
    const { successCount, failureCount, errors } = result;

    if (successCount > 0 && failureCount === 0) {
      this.alertService.success(
        `Successfully converted ${successCount} lead${
          successCount > 1 ? 's' : ''
        } to client${successCount > 1 ? 's' : ''}`
      );
    } else if (successCount > 0 && failureCount > 0) {
      this.alertService.warning(
        `Converted ${successCount} lead${
          successCount > 1 ? 's' : ''
        } successfully. ${failureCount} failed.`
      );

      if (errors && errors.length > 0) {
        const errorDetails = errors
          .slice(0, 3)
          .map((err) => `${err.email}: ${err.reason}`)
          .join('\n');

        if (errors.length <= 3) {
          this.alertService.error(`Conversion errors:\n${errorDetails}`);
        } else {
          this.alertService.error(
            `Conversion errors:\n${errorDetails}\n... and ${
              errors.length - 3
            } more. Check console for details.`
          );
        }
      }
    } else {
      this.alertService.error(
        `Failed to convert ${failureCount} lead${failureCount > 1 ? 's' : ''}`
      );
    }
  }
}
