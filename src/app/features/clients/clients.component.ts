// src/app/features/clients/clients.component.ts

import {
  Component,
  OnInit,
  ViewChild,
  TemplateRef,
  inject,
  ElementRef,
  ChangeDetectorRef,
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
import { PermissionTableComponent } from '../../shared/components/permission-table/permission-table.component';
import { ClientRegistrationModalComponent } from './components/client-registration-modal/client-registration-modal.component';
import { ClientCommentsModalComponent } from './components/client-comments-modal/client-comments-modal.component';
import { PasswordChangeComponent, PasswordChangeData } from '../../shared/components/password-change/password-change.component';
import { Router } from '@angular/router';
import { CountryService } from '../../core/services/country.service';
import { LanguageService } from '../../core/services/language.service';
import { OperatorsService } from '../operators/services/operators.service';
import { OfficesService } from '../officies/services/offices.service';
import { TeamsService } from '../teams/services/teams.service';
import { DesksService } from '../desks/services/desks.service';
import { OfficeRulesService } from '../officies/services/office-rules.service';
import { AssignOperatorModalComponent } from './components/assign-operator-modal/assign-operator-modal.component';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
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
  private teamsService = inject(TeamsService);
  private desksService = inject(DesksService);
  private officeRulesService = inject(OfficeRulesService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

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

  // Track which client is being updated
  updatingSalesStatus: string | null = null;

  // Inline comment functionality
  activeInlineCommentClientId: string | null = null;
  inlineCommentForm: FormGroup;
  isSubmittingInlineComment = false;
  inlineCommentState: InlineCommentState | null = null;

  // Client comments cache to store latest comments for each client
  clientCommentsCache: Map<string, ClientComment[]> = new Map();

  // Sales status options for dropdown
  salesStatusOptions: { value: number; label: string }[] = [];
  importLoading = false;
  showDeleteModal = false;
  clientToDelete: Client | null = null;
  totalCount = 0;
  activeCount = 0;

  ClientStatus = ClientStatus;
  ClientStatusLabels = ClientStatusLabels;
  ClientStatusColors = ClientStatusColors;
  KycStatus = KycStatus;
  KycStatusLabels = KycStatusLabels;

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
      selector: (row: Client) => row.telephone || '-',
    },
    {
      field: 'userId',
      header: 'ID',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hidden: true,
    },
    {
      field: 'mtId',
      header: 'MT ID',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hidden: true,
    },
    {
      field: 'affiliateId',
      header: 'Affiliate ID',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hidden: true,
    },
    {
      field: 'referrerId',
      header: 'Referrer ID',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hidden: true,
    },
    {
      field: 'source',
      header: 'Source',
      sortable: true,
      filterable: true,
      filterType: 'text',
      selector: (row: Client) => row.source || '-',
      hidden: true,
    },

    // Dropdown Filters
    {
      field: 'activityStatus',
      header: 'Activity',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'online', label: 'Online' },
        { value: 'offline', label: 'Offline' }
      ],
      hidden: true,
    },
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      selector: (row: Client) => row.language || '-',
      hidden: true,
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      selector: (row: Client) => row.country || '-',
      hidden: true,
    },
    {
      field: 'officeId',
      header: 'Office',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      hidden: true,
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
      field: 'operatorId',
      header: 'Operator',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      hidden: true,
    },
    {
      field: 'affiliateName',
      header: 'Affiliate',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      selector: (row: Client) => row.affiliateName || '-',
      hidden: true,
    },
    {
      field: 'affiliateReferral',
      header: 'Affiliate Referral',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
      hidden: true,
    },
    {
      field: 'affiliateFtd',
      header: 'Affiliate FTD',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' }
      ],
      hidden: true,
    },
    {
      field: 'isReferral',
      header: 'Referral',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' }
      ],
      hidden: true,
    },
    {
      field: 'status',
      header: 'Profile Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.entries(ClientStatusLabels).map(([value, label]) => ({
        value: Number(value),
        label: label
      })),
      cellTemplate: null, // Will be set in ngOnInit
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
        label: label
      })),
      hidden: true,
    },
    {
      field: 'assignStatus',
      header: 'Assign Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'assigned', label: 'Assigned' },
        { value: 'unassigned', label: 'Unassigned' }
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
        { value: 'sales', label: 'Sales' }
      ],
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
        label: label
      })),
      cellTemplate: this.salesStatusCellTemplate, // Will be set in ngOnInit
      selector: (row: Client) => row // Return the entire row object
    },
        {
      field: 'latestComment',
      header: 'Latest Comment',
      sortable: false,
      filterable: false,
      width: '200px',
      cellTemplate: null, // Will be set in ngOnInit
      selector: (row: Client) => this.getLatestComment(row.id),
    },
    {
      field: 'retentionStatus',
      header: 'Retention Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.entries(KycStatusLabels).map(([value, label]) => ({
        value: Number(value),
        label: label
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
        { value: false, label: 'Not Accepted' }
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
        { value: false, label: 'No' }
      ],
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'neverCalled',
      header: 'Never Called',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' }
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
    {
      field: 'passportCountry',
      header: 'Passport/ID Country',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
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
        { value: false, label: 'No' }
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
      id: 'password',
      label: 'Change Password',
      icon: 'password',
      action: (item: Client) => this.openPasswordChangeModal(item),
    },
    {
      id: 'comments',
      label: 'Comments',
      icon: 'documents',
      type: 'secondary',
      action: (item: Client) => this.openClientCommentsModal(item),
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

  constructor() {
    this.inlineCommentForm = this.fb.group({
      subject: ['', [Validators.required, Validators.minLength(3)]],
      note: ['', [Validators.required, Validators.minLength(5)]],
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

  private onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const inlineCommentBox = document.querySelector('.inline-comment-box');

    if (this.inlineCommentState &&
      inlineCommentBox &&
      !inlineCommentBox.contains(target) &&
      !target.closest('.comment-icon-btn')) {
      this.closeInlineComment();
    }
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
  }

  private loadClientStatistics(): void {
    this.clientsService.getActiveClients().subscribe((result: any) => {
      this.totalCount = result.totalUsers;
      this.activeCount = result.activeUsersTotalCount;
    });
  }

  private assignClientsToOperators(clients: Client[]): void {
    if (!clients || clients.length === 0) {
      this.alertService.warning('No clients selected for assignment');
      return;
    }

    // Check if any clients have investments (if that should prevent assignment)
    const clientsWithInvestments = clients.filter(client => client.hasInvestments);
    if (clientsWithInvestments.length > 0) {
      // Optional: You can either warn or proceed - adjust based on business rules
      console.log(`${clientsWithInvestments.length} clients have investments`);
    }

    // Open the assignment modal
    const modalRef = this.modalService.open(AssignOperatorModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    }, {
      selectedClients: clients,
      userType: 1
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          // Assignment was successful, refresh the grid and statistics
          this.refreshGrid();
          this.loadClientStatistics();

          // Clear the selection after successful assignment
          this.clearGridSelection();
        }
      },
      () => {
        // Modal was dismissed/cancelled - no action needed
        console.log('Assignment modal was cancelled');
      }
    );
  }


  private bulkAssignAffiliate(clients: Client[]): void { }

  onBulkActionExecuted(event: { action: GridAction; items: any[] }): void {
    // Handle bulk action execution
  }

  onDataLoaded(clients: Client[]): void {
    // Load comments for all displayed clients
    this.loadCommentsForClients(clients);
  }

  onSelectionChange(selectedItems: any[]): void {
    // Update selection state and action availability
  }

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
    const modalRef = this.modalService.open(ClientCommentsModalComponent, {
      size: 'xl',
      centered: true,
      closable: true,
    }, {
      client: client,
    });

    modalRef.result.then(
      (result) => {
        // Handle modal result if needed
      },
      () => {
        // Modal dismissed
      }
    );
  }

  openPasswordChangeModal(client: Client): void {
    const passwordChangeData: PasswordChangeData = {
      entityId: client.id,
      entityType: 'client',
      entityName: `${client.firstName} ${client.lastName}`
    };

    const modalRef = this.modalService.open(PasswordChangeComponent, {
      size: 'md',
      centered: true,
      closable: true,
    }, passwordChangeData);

    modalRef.result.then(
      (result) => {
        // Handle successful password change
        if (result) {
          this.alertService.success('Password changed successfully');
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  // Inline Comment Methods
  openInlineComment(clientId: string, mode: 'view' | 'create', event: MouseEvent): void {
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.inlineCommentState = {
      clientId,
      mode,
      position: {
        top: rect.top + window.scrollY - 350, // Position above the icon
        left: rect.left + window.scrollX - 150 // Adjust to center the box
      },
      comments: [],
      isLoading: false
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

    this.clientsService.getClientComments(clientId)
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
            this.inlineCommentState.comments = Array.isArray(response) ? response : [response];
          }
        },
        error: (error) => {
          this.alertService.error('Failed to load comments');
          console.error('Error loading comments:', error);
          this.closeInlineComment();
        }
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

    this.clientsService.createClientComment(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSubmittingInlineComment = false;
        })
      )
      .subscribe({
        next: (newComment) => {
          this.alertService.success('Comment added successfully');
          
          // Refresh the comments cache for this client
          this.refreshClientComments(this.inlineCommentState!.clientId);
          
          this.closeInlineComment();
        },
        error: (error) => {
          this.alertService.error('Failed to add comment');
          console.error('Error adding comment:', error);
        }
      });
  }

  private resetInlineCommentForm(): void {
    this.inlineCommentForm.reset();
    this.inlineCommentForm.patchValue({ isPinnedComment: false });
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
    // Emit event to clear grid selection
    window.dispatchEvent(new CustomEvent('clearGridSelection', {
      detail: { gridId: 'clients-grid' }
    }));
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
          link.download = `clients_${new Date().toISOString().split('T')[0]
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
    // Clear comments cache when refreshing grid
    this.clearCommentsCache();
    
    const gridComponent = document.querySelector(
      `app-grid[gridId="clients-grid"]`
    );
    if (gridComponent) {
      (gridComponent as any).refresh?.();
    }
  }

  onSaleStatusChanged(clientId: string, newStatus: KycStatus): void {
    // Update the client's sales status in the grid data if needed
    // The grid should automatically refresh or update the display
    this.loadClientStatistics(); // Refresh statistics if needed
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

  onAutoLogin(client: Client): void {
    // TODO: Implement auto login functionality
    console.log('Auto login for client:', client);
    this.alertService.info('Auto login functionality will be implemented');
  }

  onSalesStatusChange(event: Event, clientData: Client | any): void {
    const selectElement = event.target as HTMLSelectElement;
    const newSalesStatus = Number(selectElement.value);

    // Handle both full client object and value structure from selector
    const clientId = clientData?.id || clientData?.row?.id;
    const currentSalesStatus = this.normalizeSalesStatus(
      clientData?.salesStatus || clientData?.row?.salesStatus
    );

    if (!clientId) {
      this.alertService.error('Unable to update sales status: Client data not found');
      return;
    }

    if (newSalesStatus === currentSalesStatus) {
      return;
    }

    // Set loading state
    this.updatingSalesStatus = clientId;

    this.clientsService
      .updateClientStatus(clientId, newSalesStatus)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          // Revert the dropdown to the original value on error
          selectElement.value = currentSalesStatus.toString();
          this.alertService.error('Failed to update sales status');
          console.error('Error updating sales status:', error);
          return of(null);
        }),
        finalize(() => {
          this.updatingSalesStatus = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          // Update the client object with the new status if it's accessible
          if (clientData?.row && typeof clientData.row === 'object' && 'salesStatus' in clientData.row) {
            clientData.row.salesStatus = newSalesStatus;
          }
          if (clientData && typeof clientData === 'object' && 'salesStatus' in clientData && !clientData.row) {
            clientData.salesStatus = newSalesStatus;
          }

          this.alertService.success(
            `Sales status updated to ${KycStatusLabels[newSalesStatus as KycStatus]}`
          );

          // Refresh the grid to ensure data consistency
          this.refreshGrid();
          this.loadClientStatistics();
          this.refreshClientComments(clientId); // Refresh comments after status change
        }
      });
  }

  /**
   * Initialize filter options for dropdown columns
   */
  private initializeFilterOptions(): void {
    // Load all filter options concurrently
    forkJoin({
      countries: this.countryService.getCountries(),
      languages: of(this.languageService.getAllLanguages()),
      offices: this.loadOfficesDropdown(),
      desks: this.loadDesksDropdown(),
      teams: this.loadTeamsDropdown(),
      operators: this.loadOperatorsDropdown(),
      timezones: this.loadTimezones(),
    }).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        console.error('Error loading filter options:', error);
        return of({
          countries: [],
          languages: [],
          offices: [],
          desks: [],
          teams: [],
          operators: [],
          timezones: [],
        });
      })
    ).subscribe(({
      countries,
      languages,
      offices,
      desks,
      teams,
      operators,
      timezones,
    }) => {
      // Update country filter options
      this.updateColumnFilterOptions('country', countries.map(c => ({ value: c.code, label: c.name })));
      this.updateColumnFilterOptions('passportCountry', countries.map(c => ({ value: c.code, label: c.name })));

      // Update language filter options
      this.updateColumnFilterOptions('language', languages.map(l => ({ value: l.key, label: l.value })));

      // Update office filter options
      this.updateColumnFilterOptions('officeId', offices);

      // Update desk filter options
      this.updateColumnFilterOptions('deskId', desks);

      // Update team filter options
      this.updateColumnFilterOptions('teamId', teams);

      // Update operator filter options
      this.updateColumnFilterOptions('operatorId', operators);
      this.updateColumnFilterOptions('retentionOperatorId', operators);
      this.updateColumnFilterOptions('salesOperatorId', operators);

      // Update timezone filter options
      this.updateColumnFilterOptions('timezone', timezones);

      // Load affiliates separately as it might be a different endpoint
      this.loadAffiliatesDropdown();
    });
  }

  /**
   * Update filter options for a specific column
   */
  private updateColumnFilterOptions(field: string, options: any[]): void {
    const column = this.gridColumns.find(col => col.field === field);
    if (column) {
      column.filterOptions = options;
    }
  }

  /**
   * Load offices dropdown options
   */
  private loadOfficesDropdown() {
    return this.officesService.getOfficeDropdown({
      pageIndex: 0,
      pageSize: 1000,
      sortField: 'name',
      sortDirection: 'asc'
    }).pipe(
      catchError(() => of({ items: [] })),
      takeUntil(this.destroy$)
    ).toPromise().then((response: any) =>
      response?.items?.map((office: any) => ({ value: office.id, label: office.value })) || []
    );
  }

  /**
   * Load desks dropdown options
   */
  private loadDesksDropdown() {
    return this.operatorsService.getDesksDropdown({
      pageIndex: 0,
      pageSize: 1000,
      sortField: 'name',
      sortDirection: 'asc'
    }).pipe(
      catchError(() => of({ items: [] })),
      takeUntil(this.destroy$)
    ).toPromise().then((response: any) =>
      response?.items?.map((desk: any) => ({ value: desk.id, label: desk.value })) || []
    );
  }

  /**
   * Load teams dropdown options
   */
  private loadTeamsDropdown() {
    return this.operatorsService.getTeamsDropdown({
      pageIndex: 0,
      pageSize: 1000,
      sortField: 'name',
      sortDirection: 'asc'
    }).pipe(
      catchError(() => of({ items: [] })),
      takeUntil(this.destroy$)
    ).toPromise().then((response: any) =>
      response?.items?.map((team: any) => ({ value: team.id, label: team.value })) || []
    );
  }

  /**
   * Load operators dropdown options
   */
  private loadOperatorsDropdown() {
    return this.officeRulesService.getAvailableOperators(0, 1000, '').pipe(
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).toPromise().then((response: any) =>
      response?.map((operator: any) => ({ value: operator.id, label: operator.value })) || []
    );
  }

  /**
   * Load affiliates dropdown options
   */
  private loadAffiliatesDropdown(): void {
    // This would typically be a separate service call
    // For now, we'll create a placeholder
    const affiliateOptions = [
      { value: 'affiliate1', label: 'Affiliate 1' },
      { value: 'affiliate2', label: 'Affiliate 2' },
      // Add more as needed
    ];

    this.updateColumnFilterOptions('affiliateName', affiliateOptions);
    this.updateColumnFilterOptions('affiliateReferral', affiliateOptions);
  }

  /**
   * Load timezone options
   */
  private loadTimezones() {
    // Common timezones - this could be from a service
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

  /**
   * Get the latest comment for a client
   */
  getLatestComment(clientId: string): ClientComment | null {
    const comments = this.clientCommentsCache.get(clientId);
    if (!comments || comments.length === 0) {
      return null;
    }
    
    // Sort by creation date and return the latest
    return comments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }

  /**
   * Load comments for a specific client
   */
  loadClientComments(clientId: string): void {
    if (this.clientCommentsCache.has(clientId)) {
      return; // Already loaded
    }

    this.clientsService.getClientComments(clientId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading comments for client:', clientId, error);
          return of([]);
        })
      )
      .subscribe((comments) => {
        const commentArray = Array.isArray(comments) ? comments : [comments];
        this.clientCommentsCache.set(clientId, commentArray);
        
        // Trigger change detection to update the grid
        this.cdr.detectChanges();
      });
  }

  /**
   * Load comments for multiple clients
   */
  loadCommentsForClients(clients: Client[]): void {
    const clientsToLoad = clients.filter(client => !this.clientCommentsCache.has(client.id));
    
    if (clientsToLoad.length === 0) {
      return;
    }

    const commentRequests = clientsToLoad.map(client => 
      this.clientsService.getClientComments(client.id).pipe(
        catchError((error) => {
          console.error('Error loading comments for client:', client.id, error);
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
        
        // Trigger change detection once after all comments are loaded
        this.cdr.detectChanges();
      });
  }

  /**
   * Clear comments cache
   */
  clearCommentsCache(): void {
    this.clientCommentsCache.clear();
  }

  /**
   * Refresh comments for a specific client
   */
  refreshClientComments(clientId: string): void {
    this.clientCommentsCache.delete(clientId);
    this.loadClientComments(clientId);
  }
}