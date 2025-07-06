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
import { AffiliatesService } from './services/affiliates.service';
import { Affiliate, AffiliateUpdateRequest } from './models/affiliates.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import { AffiliateRegistrationModalComponent } from './components/affiliate-registration-modal/affiliate-registration-modal.component';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { PermissionTableComponent } from '../../shared/components/permission-table/permission-table.component';

@Component({
  selector: 'app-affiliates',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './affiliates.component.html',
  styleUrls: ['./affiliates.component.scss'],
})
export class AffiliatesComponent implements OnInit {
  private affiliatesService = inject(AffiliatesService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('websiteCell', { static: true })
  websiteCellTemplate!: TemplateRef<any>;

  selectedAffiliate: Affiliate | null = null;
  editForm: FormGroup;
  isEditing = false;
  loading = false;
  importLoading = false;
  showDeleteModal = false;
  affiliateToDelete: Affiliate | null = null;
  totalCount = 0;
  activeCount = 0;

  gridColumns: GridColumn[] = [
    {
      field: 'name',
      header: 'Name',
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
      action: (item: Affiliate) => this.viewAffiliate(item),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      action: (item: Affiliate) => this.startEdit(item),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      disabled: (item: Affiliate) => item.clientsCount > 0,
      action: (item: Affiliate) => this.confirmDelete(item),
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: 'permission',
      type: 'primary',
      action: (item) => this.openPermissionDialog(item),
    },
    {
      id: 'integration',
      label: 'Integration Document',
      icon: 'documents',
      type: 'primary',
      action: (item) => this.downloadIntegrationDoc(item.id),
    },
  ];

  constructor() {
    this.editForm = this.fb.group({
      phone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
    });
  }

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

    this.affiliatesService.getActiveAffiliates().subscribe((result: any) => {
      this.totalCount = result.totalUsers;
      this.activeCount = result.activeUsersTotalCount;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRowClick(affiliate: Affiliate): void {
    this.viewAffiliate(affiliate);
  }

  viewAffiliate(affiliate: Affiliate): void {
    this.selectedAffiliate = affiliate;
    this.isEditing = false;
    this.editForm.patchValue({
      phone: affiliate.phone || '',
      website: affiliate.website || '',
    });
  }

  startEdit(affiliate?: Affiliate): void {
    if (affiliate) {
      this.viewAffiliate(affiliate);
    }
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.selectedAffiliate) {
      this.editForm.patchValue({
        phone: this.selectedAffiliate.phone || '',
        website: this.selectedAffiliate.website || '',
      });
    }
  }

  saveAffiliate(): void {
    if (this.editForm.invalid || !this.selectedAffiliate) return;

    const updateRequest: AffiliateUpdateRequest = {
      id: this.selectedAffiliate.id,
      phone: this.editForm.value.phone || null,
      website: this.editForm.value.website || null,
    };

    this.loading = true;
    this.affiliatesService
      .updateAffiliate(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update affiliate');
          console.error('Error updating affiliate:', error);
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Affiliate updated successfully');
          this.isEditing = false;
          this.refreshSelectedAffiliate();
          this.refreshGrid();
        }
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

    this.loading = true;
    this.affiliatesService
      .deleteAffiliate(this.affiliateToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          if (error.status === 409) {
            this.alertService.error(
              'Cannot delete affiliate with associated clients'
            );
          } else {
            this.alertService.error('Failed to delete affiliate');
          }
          console.error('Error deleting affiliate:', error);
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.showDeleteModal = false;
          this.affiliateToDelete = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Affiliate deleted successfully');
          if (this.selectedAffiliate?.id === this.affiliateToDelete?.id) {
            this.selectedAffiliate = null;
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

    this.affiliatesService
      .importAffiliates(file)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to import affiliates');
          console.error('Error importing affiliates:', error);
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

    // this.affiliatesService
    //   .exportAffiliates(request)
    //   .pipe(
    //     takeUntil(this.destroy$),
    //     catchError((error) => {
    //       this.alertService.error('Failed to export affiliates');
    //       console.error('Error exporting affiliates:', error);
    //       return of(null);
    //     })
    //   )
    //   .subscribe((blob) => {
    //     if (blob) {
    //       const url = window.URL.createObjectURL(blob);
    //       const link = document.createElement('a');
    //       link.href = url;
    //       link.download = `affiliates_${
    //         new Date().toISOString().split('T')[0]
    //       }.csv`;
    //       link.click();
    //       window.URL.revokeObjectURL(url);
    //       this.alertService.success('Export completed successfully');
    //     }
    //   });
  }

  public refreshSelectedAffiliate(): void {
    if (this.selectedAffiliate) {
      this.affiliatesService
        .getAffiliateById(this.selectedAffiliate.id)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error('Error refreshing affiliate:', error);
            return of(null);
          })
        )
        .subscribe((affiliate) => {
          if (affiliate) {
            this.selectedAffiliate = affiliate;
          }
        });
    }
  }

  closeDetails(): void {
    this.selectedAffiliate = null;
    this.isEditing = false;
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
        if (result) {
          this.refreshGrid();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  downloadIntegrationDoc(affiliateId: string): void {
    this.affiliatesService.generateClientDocumentation(affiliateId).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.alertService.error('Failed to download integration document');
        console.error('Error downloading integration document:', error);
        return of(null);
      })
    ).subscribe((response) => {
      if (response) {
        const url = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = url;
        a.download = `integration_document_${affiliateId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.alertService.success('Integration document downloaded successfully!');
      }
    }
    )
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
          console.error('Error downloading template:', error);
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

  refreshGrid(): void {
    const gridComponent = document.querySelector(
      `app-grid[gridId="affiliates-grid"]`
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
