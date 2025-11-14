import {
  Component,
  OnInit,
  ViewChild,
  TemplateRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AffiliatesService } from './services/affiliates.service';
import { Affiliate } from './models/affiliates.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import { AffiliateRegistrationModalComponent } from './components/affiliate-registration-modal/affiliate-registration-modal.component';
import { AffiliateDetailsModalComponent } from './components/affiliate-details-modal/affiliate-details-modal.component';
import { AffiliateIpWhitelistModalComponent } from './components/affiliate-ip-whitelist-modal/affiliate-ip-whitelist-modal.component';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-affiliates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GridComponent,
    HasPermissionDirective,
  ],
  templateUrl: './affiliates.component.html',
  styleUrls: ['./affiliates.component.scss'],
})
export class AffiliatesComponent implements OnInit {
  private affiliatesService = inject(AffiliatesService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  gridId = 'affiliates-grid';

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('websiteCell', { static: true })
  websiteCellTemplate!: TemplateRef<any>;

  importLoading = false;
  showDeleteModal = false;
  affiliateToDelete: Affiliate | null = null;
  totalCount = 0;
  activeCount = 0;

  gridColumns: GridColumn[] = [
    {
      field: 'userFullName',
      header: 'Full Name',
      sortable: true,
      filterable: true,
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
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
      field: 'phone',
      header: 'Phone',
      sortable: true,
      filterable: false,
      selector: (row: Affiliate) => row.phone || '-',
    },
    {
      field: 'website',
      header: 'Website',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cellTemplate: null, // Will be set in ngOnInit
      hidden: false,
    },
    {
      field: 'clientsCount',
      header: 'Clients',
      sortable: true,
      filterable: true,
      type: 'number',
      filterType: 'number',
      selector: (row: Affiliate) => row.clientsCount || 0,
    },
    {
      field: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      cellTemplate: null,
      filterType: 'boolean',
    },
    {
      field: 'createdAt',
      header: 'Created',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
      filterType: 'date',
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Affiliate) => this.openDetailsModal(item),
      permission: 117,
    },
    {
      id: 'whitelist',
      label: 'Manage IP Whitelist',
      icon: 'ip-whitelist',
      type: 'secondary',
      action: (item: Affiliate) => this.openWhitelistModal(item),
      permission: 117,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      disabled: (item: Affiliate) => item.clientsCount > 0,
      action: (item: Affiliate) => this.confirmDelete(item),
      permission: 118,
    },
    {
      id: 'integration',
      label: 'Integration Document',
      icon: 'documents',
      type: 'primary',
      action: (item) => this.downloadIntegrationDoc(item.id),
      permission: 119,
    },
  ];

  ngOnInit(): void {
    const websiteColumn = this.gridColumns.find(
      (col) => col.field === 'website'
    );
    if (websiteColumn) {
      websiteColumn.cellTemplate = this.websiteCellTemplate;
    }

    const statusColumn = this.gridColumns.find(
      (col) => col.field === 'isActive'
    );
    if (statusColumn) {
      statusColumn.cellTemplate = this.statusCellTemplate;
    }

    this.loadAffiliates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRowClick(affiliate: Affiliate): void {
    this.openDetailsModal(affiliate);
  }

  openDetailsModal(affiliate: Affiliate): void {
    const modalRef = this.modalService.open(
      AffiliateDetailsModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        affiliate: affiliate,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadAffiliates();
        }
      },
      () => {
        // Modal dismissed
        this.refreshSpecificGrid();
        this.loadAffiliates();
      }
    );
  }

  openWhitelistModal(affiliate: Affiliate): void {
    this.modalService.open(
      AffiliateIpWhitelistModalComponent,
      {
        size: 'xl',
        centered: true,
        closable: true,
      },
      {
        affiliate: affiliate,
      }
    );
  }

  loadAffiliates(): void {
    this.affiliatesService.getActiveAffiliates().subscribe((result: any) => {
      this.totalCount = result.totalUsers;
      this.activeCount = result.activeUsersTotalCount;
    });
  }

  confirmDelete(affiliate: Affiliate): void {
    this.affiliateToDelete = affiliate;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.affiliateToDelete = null;
  }

  deleteAffiliate(): void {
    if (!this.affiliateToDelete) return;

    this.affiliatesService
      .deleteAffiliate(this.affiliateToDelete.id)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.alertService.success('Affiliate deleted successfully');
          this.showDeleteModal = false;
          this.affiliateToDelete = null;
          this.loadAffiliates();
          this.refreshSpecificGrid();
        },
        error: (error) => {
          if (error.status === 409) {
            this.alertService.error('Cannot delete affiliate with associated clients');
          } else {
            this.alertService.error('Failed to delete affiliate');
          }
        },
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

    this.affiliatesService
      .importAffiliates(file)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to import affiliates');
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

  onExport(options: any): void {
    const request = {
      sortField: options.sortField,
      sortDirection: options.sortDirection,
      globalFilter: options.globalFilter,
    };
  }

  openRegistrationModal(): void {
    const modalRef = this.modalService.open(
      AffiliateRegistrationModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result && result.success) {
          this.refreshSpecificGrid();
          this.loadAffiliates();
        }
      },
      () => {
        // Modal dismissed
        this.loadAffiliates();
      }
    );
  }

  downloadIntegrationDoc(affiliateId: string): void {
    this.affiliatesService
      .generateClientDocumentation(affiliateId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to download integration document');
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          // Convert blob to text and download as HTML file
          response.text().then((htmlContent) => {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `integration_document_${affiliateId}.html`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            this.alertService.success(
              'Integration document downloaded successfully!'
            );
          }).catch((error) => {
            this.alertService.error('Failed to process integration document');
          });
        }
      });
  }

  downloadTemplate(): void {
    this.affiliatesService
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
          a.download = 'affiliates-import-template.xlsx';
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
}
