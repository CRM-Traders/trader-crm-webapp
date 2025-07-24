// src/app/features/clients/clients.component.ts

import {
  Component,
  OnInit,
  ViewChild,
  TemplateRef,
  inject,
  ElementRef,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize, forkJoin } from 'rxjs';
import { ClientsService } from './services/clients.service';
import {
  Client,
  ClientUpdateRequest,
  ClientStatus,
  ClientStatusLabels,
  ClientStatusColors,
  KycStatusLabels,
  KycStatus,
} from './models/clients.model';
import {
  ClientComment,
  ClientCommentCreateRequest,
} from './models/client-comments.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { ClientRegistrationModalComponent } from './components/client-registration-modal/client-registration-modal.component';
import { ClientCommentsModalComponent } from './components/client-comments-modal/client-comments-modal.component';
import {
  PasswordChangeComponent,
  PasswordChangeData,
} from '../../shared/components/password-change/password-change.component';
import { Router } from '@angular/router';
import { CountryService } from '../../core/services/country.service';
import { LanguageService } from '../../core/services/language.service';
import { OperatorsService } from '../operators/services/operators.service';
import { OfficesService } from '../officies/services/offices.service';
import { OfficeRulesService } from '../officies/services/office-rules.service';
import { AssignOperatorModalComponent } from './components/assign-operator-modal/assign-operator-modal.component';
import { OperatorDetailsModalComponent } from '../operators/components/operator-details-modal/operator-details-modal.component';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { OperatorDropdownItem } from '../officies/models/office-rules.model';
import { AuthService } from '../../core/services/auth.service';

interface InlineCommentState {
  clientId: string;
  mode: 'view' | 'create';
  position: { top: number; left: number };
  comments: ClientComment[];
  isLoading: boolean;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GridComponent,
    HasPermissionDirective,
  ],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss'],
})
export class ClientsComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private operatorsService = inject(OperatorsService);
  private officesService = inject(OfficesService);
  private officeRulesService = inject(OfficeRulesService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('onlineStatusCell', { static: true })
  onlineStatusCellTemplate!: TemplateRef<any>;
  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('investmentCell', { static: true })
  investmentCellTemplate!: TemplateRef<any>;
  @ViewChild('salesStatusCell', { static: true })
  salesStatusCellTemplate!: TemplateRef<any>;
  @ViewChild('commentsCell', { static: true })
  commentsCellTemplate!: TemplateRef<any>;
  @ViewChild('autoLoginCell', { static: true })
  autoLoginCellTemplate!: TemplateRef<any>;
  @ViewChild('latestCommentCell', { static: true })
  latestCommentCellTemplate!: TemplateRef<any>;
  @ViewChild('clientOperatorCell', { static: true })
  clientOperatorCellTemplate!: TemplateRef<any>;
  @ViewChild('assignOperatorCell', { static: true })
  assignOperatorCellTemplate!: TemplateRef<any>;

  updatingSalesStatus: string | null = null;
  updatingOperatorAssignment: string | null = null;

  activeInlineCommentClientId: string | null = null;
  inlineCommentForm: FormGroup;
  isSubmittingInlineComment = false;
  inlineCommentState: InlineCommentState | null = null;

  // Tooltip state
  tooltipState: {
    visible: boolean;
    text: string;
    position: { x: number; y: number };
  } | null = null;

  clientCommentsCache: Map<string, ClientComment[]> = new Map();

  salesStatusOptions: { value: number; label: string }[] = [];
  operators: OperatorDropdownItem[] = [];
  importLoading = false;
  showDeleteModal = false;
  clientToDelete: Client | null = null;
  totalCount = 0;
  activeCount = 0;

  // Searchable dropdown states
  operatorDropdownStates: Map<string, boolean> = new Map();
  salesStatusDropdownStates: Map<string, boolean> = new Map();
  operatorSearchTerms: Map<string, string> = new Map();
  salesStatusSearchTerms: Map<string, string> = new Map();
  filteredOperators: Map<string, OperatorDropdownItem[]> = new Map();
  filteredSalesStatuses: Map<string, { value: number; label: string }[]> =
    new Map();

  // Keyboard navigation properties
  focusedOperatorIndices: Map<string, number> = new Map();
  focusedSalesStatusIndices: Map<string, number> = new Map();

  ClientStatus = ClientStatus;
  ClientStatusLabels = ClientStatusLabels;
  ClientStatusColors = ClientStatusColors;
  KycStatus = KycStatus;
  KycStatusLabels = KycStatusLabels;

  gridColumns: GridColumn[] = [
    {
      field: 'isOnline',
      header: '',
      sortable: true,
      filterable: true,
      filterType: 'select',
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'firstName',
      header: 'First Name',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
      permission: 17, //
    },
    {
      field: 'lastName',
      header: 'Last Name',
      sortable: true,
      filterable: true,
      filterType: 'text',
      permission: 17, //
    },
    {
      field: 'email',
      header: 'Email',
      sortable: true,
      filterable: true,
      filterType: 'text',
      permission: 9,
    },
    {
      field: 'telephone',
      header: 'Phone',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: Client) => row.telephone || '-',
      permission: 8,
    },
    {
      field: 'userId',
      header: 'ID',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hidden: true,
      permission: 5,
    },
    {
      field: 'affiliateId',
      header: 'Affiliate ID',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hidden: true,
      permission: 12,
    },
    {
      field: 'source',
      header: 'Source',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: Client) => row.source || '-',
      hidden: true,
      permission: 14,
    },
    {
      field: 'activityStatus',
      header: 'Activity',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'online', label: 'Online' },
        { value: 'offline', label: 'Offline' },
      ],
      hidden: true,
    },
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      selector: (row: Client) => row.language || '-',
      hidden: true,
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      selector: (row: Client) => row.country || '-',
      hidden: true,
      permission: 10,
    },
    {
      field: 'officeId',
      header: 'Office',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      hidden: true,
    },
    {
      field: 'deskId',
      header: 'Desk',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      hidden: true,
    },
    {
      field: 'teamId',
      header: 'Team',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      hidden: true,
    },
    {
      field: 'operatorId',
      header: 'Operator',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      hidden: true,
    },
    {
      field: 'assignOperator',
      header: 'Assign Operator',
      sortable: false,
      filterable: false,
      cellTemplate: null,
      selector: (row: Client) => row,
    },
    {
      field: 'affiliateName',
      header: 'Affiliate',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      selector: (row: Client) => row.affiliateName || '-',
      hidden: true,
      permission: 11,
    },
    {
      field: 'status',
      header: 'Profile Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.entries(ClientStatusLabels).map(
        ([value, label]) => ({
          value: Number(value),
          label: label,
        })
      ),
      cellTemplate: null,
      selector: (row: Client) =>
        ClientStatusLabels[row.status as ClientStatus] || '-',
    },
    {
      field: 'kycStatus',
      header: 'KYC Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.entries(KycStatusLabels).map(([value, label]) => ({
        value: Number(value),
        label: label,
      })),
      hidden: true,
      permission: 13,
    },
    {
      field: 'assignStatus',
      header: 'Assign Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'assigned', label: 'Assigned' },
        { value: 'unassigned', label: 'Unassigned' },
      ],
      hidden: true,
    },
    {
      field: 'acquisitionStatus',
      header: 'Acquisition Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'retention', label: 'Retention' },
        { value: 'sales', label: 'Sales' },
      ],
      hidden: true,
      permission: 13,
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
      cellTemplate: this.salesStatusCellTemplate,
      selector: (row: Client) => row,
      permission: 53,
    },
    {
      field: 'latestComment',
      header: 'Latest Comment',
      sortable: false,
      filterable: false,
      width: '200px',
      cellTemplate: null,
      selector: (row: Client) => this.getLatestComment(row),
    },
    {
      field: 'retentionStatus',
      header: 'Retention Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.entries(KycStatusLabels).map(([value, label]) => ({
        value: Number(value),
        label: label,
      })),
      hidden: true,
    },
    {
      field: 'retentionOperatorId',
      header: 'Retention Operator',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      hidden: true,
    },
    {
      field: 'salesOperatorId',
      header: 'Sales Operator',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      hidden: true,
    },
    {
      field: 'termsAndConditions',
      header: 'Terms & Conditions',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Accepted' },
        { value: false, label: 'Not Accepted' },
      ],
      hidden: true,
    },
    {
      field: 'hasInvestments',
      header: 'Investments',
      sortable: true,
      hidden: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
      cellTemplate: null,
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
      filterOptions: [],
      hidden: true,
    },
    {
      field: 'passportCountry',
      header: 'Passport/ID Country',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      hidden: true,
    },
    {
      field: 'hasNotes',
      header: 'Notes',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
      hidden: true,
    },

    // Number Range Filters
    {
      field: 'balance',
      header: 'Balance',
      sortable: true,
      filterable: true,
      filterType: 'number',
      type: 'currency',
      selector: (row: Client) => row.balance || '0',
      permission: 6,
    },
    {
      field: 'depositsCount',
      header: 'Number of Deposits',
      sortable: true,
      filterable: true,
      filterType: 'number',
      type: 'number',
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
      hidden: true,
      permission: 14,
    },
    {
      field: 'affiliateFtdDate',
      header: 'Affiliate FTD Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      hidden: true,
    },
    {
      field: 'ftdDate',
      header: 'FTD Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      selector: (row: Client) => row.ftdTime || '-',
      hidden: true,
    },
    {
      field: 'firstNoteDate',
      header: 'First Note Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      hidden: true,
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
      field: 'lastTradeDate',
      header: 'Last Trade Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      selector: (row: Client) => row.ltdTime || '-',
      hidden: true,
    },
    {
      field: 'lastLogin',
      header: 'Last Login Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      selector: (row: Client) => row.lastLogin || '-',
      hidden: true,
    },
    {
      field: 'lastModificationDate',
      header: 'Last Modification Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      hidden: true,
    },
    {
      field: 'dateOfBirth',
      header: 'Birth Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      selector: (row: Client) => row.dateOfBirth || '-',
      hidden: true,
      permission: 7,
    },
    {
      field: 'lastCallDate',
      header: 'Last Call Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      type: 'date',
      format: 'short',
      selector: (row: Client) => row.lastCommunication || '-',
      hidden: true,
    },
    // Problematic field (keeping original)
    {
      field: 'isProblematic',
      header: 'Problematic',
      sortable: false,
      filterable: false,
      cellTemplate: null, // Will be set in ngOnInit
      hidden: true,
    },
    // Auto Login Column (hidden by default, shown on selection)
    {
      field: 'autoLogin',
      header: 'Login',
      sortable: false,
      filterable: false,
      width: '20px',
      cellTemplate: null, // Will be set in ngOnInit
      selector: (row: Client) => row,
      permission: 1,
    },
  ];

  gridBulkActions: GridAction[] = [
    {
      id: 'bulk-activate',
      label: 'Assign to operator',
      icon: 'fas fa-check-circle',
      type: 'primary',
      action: (clients: Client[]) => this.assignClientsToOperators(clients),
      visible: false,
      disabled: false,
      permission: 2,
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Client) => this.openClientDetailsModal(item),
      permission: 7,
    },
    {
      id: 'password',
      label: 'Change Password',
      icon: 'password',
      action: (item: Client) => this.openPasswordChangeModal(item),
      permission: 26,
    },
    {
      id: 'comments',
      label: 'Comments',
      icon: 'documents',
      type: 'secondary',
      action: (item: Client) => this.openClientCommentsModal(item),
      permission: 16,
    },
  ];

  constructor() {
    this.inlineCommentForm = this.fb.group({
      subject: [''],
      note: ['', [Validators.required]],
      isPinnedComment: [false],
    });
  }

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadClientStatistics();
    this.initializeFilterOptions();
    this.salesStatusOptions = Object.entries(KycStatusLabels).map(
      ([value, label]) => ({
        value: Number(value),
        label: label,
      })
    );

    // Close inline comment on outside click
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }

  /**
   * Normalizes the sales status value to ensure it's a number
   * Handles both string and numeric values from the API
   */
  private normalizeSalesStatus(salesStatus: string | number | null): number {
    if (salesStatus === null || salesStatus === undefined) {
      return 0; // Default to first status
    }

    if (typeof salesStatus === 'string') {
      const parsed = parseInt(salesStatus, 10);
      return isNaN(parsed) ? 0 : parsed;
    }

    return typeof salesStatus === 'number' ? salesStatus : 0;
  }

  private initializeGridTemplates(): void {
    const onlineStatusColumn = this.gridColumns.find(
      (col) => col.field === 'isOnline'
    );
    if (onlineStatusColumn) {
      onlineStatusColumn.cellTemplate = this.onlineStatusCellTemplate;
    }

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

    const salesStatusColumn = this.gridColumns.find(
      (col) => col.field === 'salesStatus'
    );
    if (salesStatusColumn) {
      salesStatusColumn.cellTemplate = this.salesStatusCellTemplate;
    }

    const autoLoginColumn = this.gridColumns.find(
      (col) => col.field === 'autoLogin'
    );
    if (autoLoginColumn) {
      autoLoginColumn.cellTemplate = this.autoLoginCellTemplate;
    }

    const latestCommentColumn = this.gridColumns.find(
      (col) => col.field === 'latestComment'
    );
    if (latestCommentColumn) {
      latestCommentColumn.cellTemplate = this.latestCommentCellTemplate;
    }

    // const clientOperatorColumn = this.gridColumns.find(
    //   (col) => col.field === 'clientOperator'
    // );
    // if (clientOperatorColumn) {
    //   clientOperatorColumn.cellTemplate = this.clientOperatorCellTemplate;
    // }

    const assignOperatorColumn = this.gridColumns.find(
      (col) => col.field === 'assignOperator'
    );
    if (assignOperatorColumn) {
      assignOperatorColumn.cellTemplate = this.assignOperatorCellTemplate;
    }
  }

  private loadClientStatistics() {
    // return this.clientsService.getActiveClients().pipe((result: any) => {
    //   this.totalCount = result.totalUsers;
    //   this.activeCount = result.activeUsersTotalCount;
    // });

    return this.clientsService
      .getActiveClients()
      .pipe(
        catchError(() => of({ items: [] })),
        takeUntil(this.destroy$)
      )
      .toPromise()
      .then((response: any) => {
        this.totalCount = response.totalUsers;
        this.activeCount = response.activeUsersTotalCount;
      });
  }

  private assignClientsToOperators(clients: Client[]): void {
    if (!clients || clients.length === 0) {
      this.alertService.warning('No clients selected for assignment');
      return;
    }

    const modalRef = this.modalService.open(
      AssignOperatorModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        selectedClients: clients,
        userType: 1,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshGrid();
          this.loadClientStatistics();

          this.clearGridSelection();
        }
      },
      () => {}
    );
  }

  onBulkActionExecuted(event: { action: GridAction; items: any[] }): void {}

  onDataLoaded(clients: Client[]): void {}

  onSelectionChange(selectedItems: any[]): void {}

  onRowClick(client: Client): void {
    this.openClientDetailsModal(client);
  }

  openClientDetailsModal(client: Client): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/clients', client.id])
    );
    window.open(url, '_blank');
  }

  openClientCommentsModal(client: Client): void {
    const modalRef = this.modalService.open(
      ClientCommentsModalComponent,
      {
        size: 'xl',
        centered: true,
        closable: true,
      },
      {
        client: client,
      }
    );

    // Handle both result and dismissed promises
    modalRef.result.then(
      (result) => {
        this.refreshGrid();
        this.loadClientStatistics();
      },
      () => {
        this.refreshGrid();
        this.loadClientStatistics();
      }
    );

    modalRef.dismissed.then(
      (reason) => {
        this.refreshGrid();
        this.loadClientStatistics();
      },
      () => {
        this.refreshGrid();
        this.loadClientStatistics();
      }
    );
  }

  openPasswordChangeModal(client: Client): void {
    const passwordChangeData: PasswordChangeData = {
      entityId: client.id,
      entityType: 'client',
      entityName: `${client.firstName} ${client.lastName}`,
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

  openOperatorDetailsModal(clientOperator: any): void {
    const modalRef = this.modalService.open(
      OperatorDetailsModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        operatorId: clientOperator.operatorId,
        firstName: clientOperator.firstName,
        lastName: clientOperator.lastName,
      }
    );

    modalRef.result.then(
      (result) => {},
      () => {}
    );
  }

  openInlineComment(
    clientId: string,
    mode: 'view' | 'create',
    event: MouseEvent
  ): void {
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.inlineCommentState = {
      clientId,
      mode,
      position: {
        top: rect.top + window.scrollY - 240,
        left: rect.left + window.scrollX - 50,
      },
      comments: [],
      isLoading: false,
    };

    if (mode === 'view') {
      this.loadInlineComments(clientId);
    } else {
      this.resetInlineCommentForm();
    }
  }

  closeInlineComment(): void {
    this.inlineCommentState = null;
    this.resetInlineCommentForm();
  }

  private loadInlineComments(clientId: string): void {
    if (!this.inlineCommentState) return;

    this.inlineCommentState.isLoading = true;

    this.clientsService
      .getClientComments(clientId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (this.inlineCommentState) {
            this.inlineCommentState.isLoading = false;
          }
        })
      )
      .subscribe({
        next: (response) => {
          if (this.inlineCommentState) {
            this.inlineCommentState.comments = Array.isArray(response)
              ? response
              : [response];
          }
        },
        error: (error) => {
          this.alertService.error('Failed to load comments');
          this.closeInlineComment();
        },
      });
  }

  submitInlineComment(): void {
    if (this.inlineCommentForm.invalid || !this.inlineCommentState) {
      this.inlineCommentForm.markAllAsTouched();
      return;
    }

    this.isSubmittingInlineComment = true;

    const request: ClientCommentCreateRequest = {
      clientId: this.inlineCommentState.clientId,
      subject: this.inlineCommentForm.value.subject,
      note: this.inlineCommentForm.value.note,
      isPinnedComment: this.inlineCommentForm.value.isPinnedComment,
    };

    this.clientsService
      .createClientComment(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSubmittingInlineComment = false;
        })
      )
      .subscribe({
        next: (newComment) => {
          this.alertService.success('Comment added successfully');

          this.refreshClientComments(this.inlineCommentState!.clientId);

          this.refreshGrid();

          this.closeInlineComment();
        },
        error: (error) => {
          this.alertService.error('Failed to add comment');
        },
      });
  }

  private resetInlineCommentForm(): void {
    this.inlineCommentForm.reset();
    this.inlineCommentForm.patchValue({
      subject: '',
      isPinnedComment: false,
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  private clearGridSelection(): void {
    window.dispatchEvent(
      new CustomEvent('clearGridSelection', {
        detail: { gridId: 'clients-grid' },
      })
    );

    const gridComponent = document.querySelector(
      `app-grid[gridId="clients-grid"]`
    ) as any;
    if (gridComponent && gridComponent.clearSelection) {
      gridComponent.clearSelection();
    }
  }
  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          this.alertService.success(
            'Client registration completed successfully'
          );
        }
      },
      () => {}
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
    this.clearCommentsCache();

    this.loadClientStatistics();

    const gridComponent = document.querySelector(
      `app-grid[gridId="clients-grid"]`
    );
    if (gridComponent) {
      (gridComponent as any).refresh?.();
    }

    window.dispatchEvent(
      new CustomEvent('refreshGrid', {
        detail: { gridId: 'clients-grid' },
      })
    );
  }

  onSaleStatusChanged(clientId: string, newStatus: KycStatus): void {
    this.loadClientStatistics();
  }

  onAutoLogin(client: Client): void {
    this.clientsService.autoLogin(client.id).subscribe((result: any) => {
      window.open(`https://${result}`, '_blank');
    });
  }

  onSalesStatusChange(event: Event, clientData: Client | any): void {
    const selectElement = event.target as HTMLSelectElement;
    const newSalesStatus = Number(selectElement.value);

    const clientId = clientData?.id || clientData?.row?.id;
    const currentSalesStatus = this.normalizeSalesStatus(
      clientData?.salesStatus || clientData?.row?.salesStatus
    );

    if (!clientId) {
      this.alertService.error(
        'Unable to update sales status: Client data not found'
      );
      return;
    }

    if (newSalesStatus === currentSalesStatus) {
      return;
    }

    this.updatingSalesStatus = clientId;

    this.clientsService
      .updateClientStatus(clientId, newSalesStatus)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          selectElement.value = currentSalesStatus.toString();
          this.alertService.error('Failed to update sales status');

          // Revert the client data changes on error
          if (clientData) {
            if (clientData.saleStatusEnum !== undefined) {
              clientData.saleStatusEnum = currentSalesStatus;
            }
            if (clientData.salesStatus !== undefined) {
              clientData.salesStatus = currentSalesStatus;
            }
          }

          // Trigger change detection to update the UI
          this.cdr.detectChanges();

          return of(null);
        }),
        finalize(() => {
          this.updatingSalesStatus = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          if (
            clientData?.row &&
            typeof clientData.row === 'object' &&
            'salesStatus' in clientData.row
          ) {
            clientData.row.salesStatus = newSalesStatus;
          }
          if (
            clientData &&
            typeof clientData === 'object' &&
            'salesStatus' in clientData &&
            !clientData.row
          ) {
            clientData.salesStatus = newSalesStatus;
          }

          this.alertService.success(
            `Sales status updated to ${
              KycStatusLabels[newSalesStatus as KycStatus]
            }`
          );

          // Don't refresh the grid since we've already updated the data
          // this.refreshGrid();
          this.loadClientStatistics();
          this.refreshClientComments(clientId);
        }
      });
  }

  onOperatorAssignmentChange(event: Event, clientData: Client | any): void {
    const selectElement = event.target as HTMLSelectElement;
    const newOperatorId = selectElement.value;

    const clientId = clientData?.id || clientData?.row?.id;
    const currentOperatorId =
      clientData?.clientOperator?.operatorId ||
      clientData?.row?.clientOperator?.operatorId;

    if (!clientId) {
      this.alertService.error(
        'Unable to update operator assignment: Client data not found'
      );
      return;
    }

    if (newOperatorId === currentOperatorId || newOperatorId === '') {
      return;
    }

    this.updatingOperatorAssignment = clientId;

    const request = {
      operatorId: newOperatorId,
      clientType: 1, // Client type
      entityIds: [clientId],
      isActive: true,
    };

    this.clientsService
      .assignClientsToOperator(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          selectElement.value = currentOperatorId || '';
          this.alertService.error('Failed to update operator assignment');

          // Revert the client data changes on error
          if (clientData) {
            if (currentOperatorId) {
              if (!clientData.clientOperator) {
                clientData.clientOperator = {};
              }
              clientData.clientOperator.operatorId = currentOperatorId;
            } else {
              clientData.clientOperator = null;
            }
          }

          return of(null);
        }),
        finalize(() => {
          this.updatingOperatorAssignment = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          if (result.successCount > 0) {
            this.alertService.success('Operator assigned successfully');
            // Don't refresh the grid since we've already updated the data
            // this.refreshGrid();
            this.loadClientStatistics();
          } else if (result.failureCount > 0) {
            this.alertService.error(
              `Failed to assign operator: ${result.errors.join(', ')}`
            );
          }
        }
      });
  }

  private initializeFilterOptions(): void {
    forkJoin({
      countries: this.countryService.getCountries(),
      languages: of(this.languageService.getAllLanguages()),
      offices: this.loadOfficesDropdown(),
      desks: this.loadDesksDropdown(),
      teams: this.loadTeamsDropdown(),
      operators: this.loadOperatorsDropdown(),
      timezones: this.loadTimezones(),
      statistics: this.loadClientStatistics(),
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          return of({
            countries: [],
            languages: [],
            offices: [],
            desks: [],
            teams: [],
            operators: [],
            timezones: [],
            statistics: [],
          });
        })
      )
      .subscribe(
        ({
          countries,
          languages,
          offices,
          desks,
          teams,
          operators,
          timezones,
          statistics,
        }) => {
          this.updateColumnFilterOptions(
            'country',
            countries.map((c) => ({ value: c.code, label: c.name }))
          );
          this.updateColumnFilterOptions(
            'passportCountry',
            countries.map((c) => ({ value: c.code, label: c.name }))
          );

          this.updateColumnFilterOptions(
            'language',
            languages.map((l) => ({ value: l.key, label: l.value }))
          );

          this.updateColumnFilterOptions('officeId', offices);
          this.updateColumnFilterOptions('deskId', desks);
          this.updateColumnFilterOptions('teamId', teams);
          this.updateColumnFilterOptions('operatorId', operators);
          this.updateColumnFilterOptions('retentionOperatorId', operators);
          this.updateColumnFilterOptions('salesOperatorId', operators);
          this.updateColumnFilterOptions('timezone', timezones);

          // Store operators for the assign operator dropdown
          this.operators = operators;

          this.loadAffiliatesDropdown();
        }
      );
  }

  private updateColumnFilterOptions(field: string, options: any[]): void {
    const column = this.gridColumns.find((col) => col.field === field);
    if (column) {
      column.filterOptions = options;
    }
  }

  private loadOfficesDropdown() {
    return this.officesService
      .getOfficeDropdown({
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
          response?.items?.map((office: any) => ({
            value: office.id,
            label: office.value,
          })) || []
      );
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

  private loadOperatorsDropdown() {
    return this.clientsService
      .getAvailableOperators(0, 1000, '')
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$)
      )
      .toPromise()
      .then((response: any) => {
        const operators = response || [];
        // Sort operators alphabetically by their display value
        return operators.sort(
          (a: OperatorDropdownItem, b: OperatorDropdownItem) =>
            a.value.localeCompare(b.value)
        );
      });
  }

  private loadAffiliatesDropdown(): void {
    const affiliateOptions = [
      { value: 'affiliate1', label: 'Affiliate 1' },
      { value: 'affiliate2', label: 'Affiliate 2' },
    ];

    this.updateColumnFilterOptions('affiliateName', affiliateOptions);
    this.updateColumnFilterOptions('affiliateReferral', affiliateOptions);
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

  getLatestComment(client: Client): ClientComment | null {
    if (client.lastComment) {
      return {
        id: client.lastComment.id,
        commentId: client.lastComment.commentId,
        note: client.lastComment.note,
        isPinnedComment: client.lastComment.isPinnedComment,
        clientId: client.id,
        comment: client.lastComment.note,
        createdBy: client.lastComment.createdBy,
        createdById: client.lastComment.createdById,
        createdAt: client.lastComment.createdAt,
        pinnedData: client.lastComment.pinnedDate,
      } as ClientComment;
    }

    return null;
  }

  loadClientComments(clientId: string): void {
    if (this.clientCommentsCache.has(clientId)) {
      return;
    }

    this.clientsService
      .getClientComments(clientId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          return of([]);
        })
      )
      .subscribe((comments) => {
        const commentArray = Array.isArray(comments) ? comments : [comments];
        this.clientCommentsCache.set(clientId, commentArray);

        this.cdr.detectChanges();
      });
  }

  loadCommentsForClients(clients: Client[]): void {
    const clientsToLoad = clients.filter(
      (client) => !this.clientCommentsCache.has(client.id)
    );

    if (clientsToLoad.length === 0) {
      return;
    }

    const commentRequests = clientsToLoad.map((client) =>
      this.clientsService.getClientComments(client.id).pipe(
        catchError((error) => {
          return of([]);
        })
      )
    );

    forkJoin(commentRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        results.forEach((comments, index) => {
          const clientId = clientsToLoad[index].id;
          const commentArray = Array.isArray(comments) ? comments : [comments];
          this.clientCommentsCache.set(clientId, commentArray);
        });

        this.cdr.detectChanges();
      });
  }

  clearCommentsCache(): void {
    this.clientCommentsCache.clear();
  }

  refreshClientComments(clientId: string): void {
    this.clientCommentsCache.delete(clientId);
    this.loadClientComments(clientId);
  }

  showTooltip(event: MouseEvent, text: string): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.tooltipState = {
      visible: true,
      text: text,
      position: {
        x: rect.left + window.scrollX + 300,
        y: rect.top + window.scrollY + 90,
      },
    };
  }

  hideTooltip(): void {
    this.tooltipState = null;
  }

  // Searchable dropdown methods for operators
  toggleOperatorDropdown(clientId: string, event: Event): void {
    event.stopPropagation();
    const currentState = this.operatorDropdownStates.get(clientId) || false;
    this.operatorDropdownStates.set(clientId, !currentState);

    // Close other operator dropdowns
    this.operatorDropdownStates.forEach((state, id) => {
      if (id !== clientId) {
        this.operatorDropdownStates.set(id, false);
      }
    });

    // Close all sales status dropdowns
    this.salesStatusDropdownStates.clear();

    if (!currentState) {
      // Initialize search term and filtered results for this client
      this.operatorSearchTerms.set(clientId, '');
      this.filteredOperators.set(clientId, [...this.operators]);
      this.focusedOperatorIndices.set(clientId, 0); // Start with first item focused
    }
  }

  onOperatorSearch(clientId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value.toLowerCase();
    this.operatorSearchTerms.set(clientId, searchTerm);

    const filtered = this.operators.filter((operator) =>
      operator.value.toLowerCase().includes(searchTerm)
    );
    this.filteredOperators.set(clientId, filtered);
  }

  selectOperator(
    clientId: string,
    operator: OperatorDropdownItem,
    clientData: any
  ): void {
    const newOperatorId = operator.id || '';
    const currentOperatorId = clientData?.clientOperator?.operatorId;

    if (!clientId) {
      this.alertService.error(
        'Unable to update operator assignment: Client data not found'
      );
      return;
    }

    if (newOperatorId === currentOperatorId) {
      return;
    }

    // Update the client data immediately for instant UI feedback
    if (clientData) {
      if (operator.id) {
        // Assign operator
        if (!clientData.clientOperator) {
          clientData.clientOperator = {};
        }
        clientData.clientOperator.operatorId = operator.id;

        // Find the operator details to set name
        const selectedOperator = this.operators.find(
          (op) => op.id === operator.id
        );
        if (selectedOperator) {
          const nameParts = selectedOperator.value.split(' ');
          clientData.clientOperator.firstName = nameParts[0] || '';
          clientData.clientOperator.lastName =
            nameParts.slice(1).join(' ') || '';
        }
      } else {
        // Remove operator assignment
        clientData.clientOperator = null;
      }
    }

    this.updatingOperatorAssignment = clientId;

    const request = {
      operatorId: newOperatorId,
      clientType: 1, // Client type
      entityIds: [clientId],
      isActive: true,
    };

    this.clientsService
      .assignClientsToOperator(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update operator assignment');

          // Revert the client data changes on error
          if (clientData) {
            if (currentOperatorId) {
              if (!clientData.clientOperator) {
                clientData.clientOperator = {};
              }
              clientData.clientOperator.operatorId = currentOperatorId;
            } else {
              clientData.clientOperator = null;
            }
          }

          return of(null);
        }),
        finalize(() => {
          this.updatingOperatorAssignment = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          if (result.successCount > 0) {
            this.alertService.success('Operator assigned successfully');
            this.loadClientStatistics();
          } else if (result.failureCount > 0) {
            this.alertService.error(
              `Failed to assign operator: ${result.errors.join(', ')}`
            );
          }
        }
      });

    // Close dropdown and clear search
    this.operatorDropdownStates.set(clientId, false);
    this.operatorSearchTerms.set(clientId, '');

    // Trigger change detection to update the UI immediately
    this.cdr.detectChanges();
  }

  getSelectedOperatorName(clientId: string, clientData: any): string {
    if (!clientData) return 'Select operator...';

    // The grid passes the entire client object as 'value'
    const operatorId = clientData.clientOperator?.operatorId;
    if (!operatorId) return 'Select operator...';

    const operator = this.operators.find((op) => op.id === operatorId);
    return operator ? operator.value : 'Select operator...';
  }

  // Searchable dropdown methods for sales status
  toggleSalesStatusDropdown(clientId: string, event: Event): void {
    event.stopPropagation();
    const currentState = this.salesStatusDropdownStates.get(clientId) || false;
    this.salesStatusDropdownStates.set(clientId, !currentState);

    // Close other sales status dropdowns
    this.salesStatusDropdownStates.forEach((state, id) => {
      if (id !== clientId) {
        this.salesStatusDropdownStates.set(id, false);
      }
    });

    // Close all operator dropdowns
    this.operatorDropdownStates.clear();

    if (!currentState) {
      // Initialize search term and filtered results for this client
      this.salesStatusSearchTerms.set(clientId, '');
      this.filteredSalesStatuses.set(clientId, [...this.salesStatusOptions]);
      this.focusedSalesStatusIndices.set(clientId, 0); // Start with first item focused
    }
  }

  onSalesStatusSearch(clientId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value.toLowerCase();
    this.salesStatusSearchTerms.set(clientId, searchTerm);

    const filtered = this.salesStatusOptions.filter((option) =>
      option.label.toLowerCase().includes(searchTerm)
    );
    this.filteredSalesStatuses.set(clientId, filtered);
  }

  selectSalesStatus(
    clientId: string,
    status: { value: number; label: string },
    clientData: any
  ): void {
    const newSalesStatus = status.value;
    const currentSalesStatus = this.normalizeSalesStatus(
      clientData?.saleStatusEnum || clientData?.salesStatus
    );

    if (!clientId) {
      this.alertService.error(
        'Unable to update sales status: Client data not found'
      );
      return;
    }

    if (newSalesStatus === currentSalesStatus) {
      return;
    }

    // Update the client data immediately for instant UI feedback
    if (clientData) {
      // Update both possible field names
      if (clientData.saleStatusEnum !== undefined) {
        clientData.saleStatusEnum = status.value;
      }
      if (clientData.salesStatus !== undefined) {
        clientData.salesStatus = status.value;
      }
    }

    this.updatingSalesStatus = clientId;

    this.clientsService
      .updateClientStatus(clientId, newSalesStatus)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update sales status');

          // Revert the client data changes on error
          if (clientData) {
            if (clientData.saleStatusEnum !== undefined) {
              clientData.saleStatusEnum = currentSalesStatus;
            }
            if (clientData.salesStatus !== undefined) {
              clientData.salesStatus = currentSalesStatus;
            }
          }

          return of(null);
        }),
        finalize(() => {
          this.updatingSalesStatus = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success(
            `Sales status updated to ${
              KycStatusLabels[newSalesStatus as KycStatus]
            }`
          );

          this.loadClientStatistics();
          this.refreshClientComments(clientId);
        }
      });

    // Close dropdown and clear search
    this.salesStatusDropdownStates.set(clientId, false);
    this.salesStatusSearchTerms.set(clientId, '');

    // Trigger change detection to update the UI immediately
    this.cdr.detectChanges();
  }

  getSelectedSalesStatusName(clientId: string, clientData: any): string {
    if (!clientData) return 'Select status...';

    // The grid passes the entire client object as 'value'
    // Check both possible field names for sales status
    let salesStatus = null;

    // First check if clientData is the actual client object
    if (clientData.saleStatusEnum !== undefined) {
      salesStatus = clientData.saleStatusEnum;
    } else if (clientData.salesStatus !== undefined) {
      salesStatus = clientData.salesStatus;
    }

    // If no sales status is set, return "Select status..."
    if (salesStatus === null || salesStatus === undefined) {
      return 'Select status...';
    }

    const currentStatus = this.normalizeSalesStatus(salesStatus);
    const statusOption = this.salesStatusOptions.find(
      (option) => option.value === currentStatus
    );
    return statusOption ? statusOption.label : 'Select status...';
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Check if click is inside dropdown containers
    const operatorDropdowns = target.closest('[data-dropdown="operator"]');
    const salesStatusDropdowns = target.closest(
      '[data-dropdown="salesStatus"]'
    );

    // Close dropdowns if click is outside
    if (!operatorDropdowns) {
      this.operatorDropdownStates.clear();
    }
    if (!salesStatusDropdowns) {
      this.salesStatusDropdownStates.clear();
    }

    // Existing inline comment logic
    const inlineCommentBox = document.querySelector('.inline-comment-box');
    if (
      this.inlineCommentState &&
      inlineCommentBox &&
      !inlineCommentBox.contains(target) &&
      !target.closest('.comment-icon-btn')
    ) {
      this.closeInlineComment();
    }

    // Reset focus indices when closing dropdowns
    if (!operatorDropdowns) {
      this.focusedOperatorIndices.clear();
    }
    if (!salesStatusDropdowns) {
      this.focusedSalesStatusIndices.clear();
    }
  }

  // Keyboard navigation methods for Sales Status dropdown
  isSalesStatusFocused(clientId: string, index: number): boolean {
    return this.focusedSalesStatusIndices.get(clientId) === index;
  }

  setFocusedSalesStatusIndex(clientId: string, index: number): void {
    this.focusedSalesStatusIndices.set(clientId, index);
  }

  onSalesStatusKeydown(
    clientId: string,
    event: KeyboardEvent,
    status: { value: number; label: string },
    index: number,
    clientData: any
  ): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectSalesStatus(clientId, status, clientData);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextSalesStatus(clientId);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousSalesStatus(clientId);
        break;
      case 'Escape':
        this.salesStatusDropdownStates.set(clientId, false);
        break;
    }
  }

  private focusNextSalesStatus(clientId: string): void {
    const currentIndex = this.focusedSalesStatusIndices.get(clientId) || -1;
    const statuses = this.filteredSalesStatuses.get(clientId) || [];
    if (currentIndex < statuses.length - 1) {
      this.focusedSalesStatusIndices.set(clientId, currentIndex + 1);
    }
  }

  private focusPreviousSalesStatus(clientId: string): void {
    const currentIndex = this.focusedSalesStatusIndices.get(clientId) || -1;
    if (currentIndex > 0) {
      this.focusedSalesStatusIndices.set(clientId, currentIndex - 1);
    }
  }

  // Keyboard navigation methods for Operator dropdown
  isOperatorFocused(clientId: string, index: number): boolean {
    return this.focusedOperatorIndices.get(clientId) === index;
  }

  setFocusedOperatorIndex(clientId: string, index: number): void {
    this.focusedOperatorIndices.set(clientId, index);
  }

  onOperatorKeydown(
    clientId: string,
    event: KeyboardEvent,
    operator: OperatorDropdownItem,
    index: number,
    clientData: any
  ): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectOperator(clientId, operator, clientData);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextOperator(clientId);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousOperator(clientId);
        break;
      case 'Escape':
        this.operatorDropdownStates.set(clientId, false);
        break;
    }
  }

  private focusNextOperator(clientId: string): void {
    const currentIndex = this.focusedOperatorIndices.get(clientId) || -1;
    const operators = this.filteredOperators.get(clientId) || [];
    if (currentIndex < operators.length - 1) {
      this.focusedOperatorIndices.set(clientId, currentIndex + 1);
    }
  }

  private focusPreviousOperator(clientId: string): void {
    const currentIndex = this.focusedOperatorIndices.get(clientId) || -1;
    if (currentIndex > 0) {
      this.focusedOperatorIndices.set(clientId, currentIndex - 1);
    }
  }

  // Button keydown handlers for opening dropdowns
  onSalesStatusButtonKeydown(clientId: string, event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.salesStatusDropdownStates.get(clientId)) {
          this.toggleSalesStatusDropdown(clientId, event as any);
        }
        break;
    }
  }

  onOperatorButtonKeydown(clientId: string, event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.operatorDropdownStates.get(clientId)) {
          this.toggleOperatorDropdown(clientId, event as any);
        }
        break;
    }
  }

  hasPermission(permissionIndex: number): boolean {
    return this.authService.hasPermission(permissionIndex);
  }
}
