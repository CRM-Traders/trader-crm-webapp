// src/app/features/brands/brands.component.ts

import {
  Component,
  OnInit,
  ViewChild,
  TemplateRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { BrandsService } from './services/brands.service';
import { Brand } from './models/brand.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { BrandCreationModalComponent } from './components/brand-creation-modal/brand-creation-modal.component';
import { BrandDetailsModalComponent } from './components/brand-details-modal/brand-details-modal.component';
import { GridService } from '../../shared/services/grid/grid.service';

@Component({
  selector: 'app-brands',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './brands.component.html',
  styleUrls: ['./brands.component.scss'],
})
export class BrandsComponent implements OnInit, OnDestroy {
  private brandsService = inject(BrandsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private grid = inject(GridService);

  private destroy$ = new Subject<void>();
  gridId = 'brands-grid';

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('departmentsCell', { static: true })
  departmentsCellTemplate!: TemplateRef<any>;

  importLoading = false;
  showDeleteModal = false;
  brandToDelete: Brand | null = null;
  totalCount = 0;
  activeCount = 0;

  gridColumns: GridColumn[] = [
    {
      field: 'name',
      header: 'Brand Name',
      sortable: true,
      filterable: true,
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
    },
    {
      field: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'departmentsCount',
      header: 'Departments',
      sortable: true,
      filterable: false,
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'createdAt',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
    },
    {
      field: 'createdBy',
      header: 'Created By',
      sortable: true,
      filterable: true,
      selector: (row: Brand) => row.createdBy || 'System',
    },
    {
      field: 'lastModifiedAt',
      header: 'Last Modified',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
      selector: (row: Brand) => row.lastModifiedAt || null,
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Brand) => this.openDetailsModal(item),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      action: (item: Brand) => this.openDetailsModal(item),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      disabled: (item: Brand) =>
        item.departmentsCount !== undefined && item.departmentsCount > 0,
      action: (item: Brand) => this.confirmDelete(item),
    },
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadBrandStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeGridTemplates(): void {
    const statusColumn = this.gridColumns.find(
      (col) => col.field === 'isActive'
    );
    if (statusColumn) {
      statusColumn.cellTemplate = this.statusCellTemplate;
    }

    const departmentsColumn = this.gridColumns.find(
      (col) => col.field === 'departmentsCount'
    );
    if (departmentsColumn) {
      departmentsColumn.cellTemplate = this.departmentsCellTemplate;
    }
  }

  private loadBrandStatistics(): void {
    this.brandsService
      .getBrandStats()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading brand statistics:', error);
          this.totalCount = 0;
          this.activeCount = 0;
          return of(null);
        })
      )
      .subscribe((stats: any) => {
        if (stats) {
          this.totalCount = stats.value.totalBrands;
          this.activeCount = stats.value.activeBrands;
        }
      });
  }

  onRowClick(brand: Brand): void {
    this.openDetailsModal(brand);
  }

  openCreateModal(): void {
    const modalRef = this.modalService.open(BrandCreationModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();

          this.loadBrandStatistics();
        }
      },
      () => {}
    );
  }

  refreshSpecificGrid(): void {
    const event = new CustomEvent('refreshGrid', {
      detail: { gridId: this.gridId },
    });
    window.dispatchEvent(event);
  }

  openDetailsModal(brand: Brand): void {
    const modalRef = this.modalService.open(
      BrandDetailsModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        brand: brand,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadBrandStatistics();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  confirmDelete(brand: Brand): void {
    if (brand.departmentsCount !== undefined && brand.departmentsCount > 0) {
      this.alertService.error(
        'Cannot delete brand that has associated departments'
      );
      return;
    }

    this.brandToDelete = brand;
    this.showDeleteModal = true;
    this.loadBrandStatistics();
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.brandToDelete = null;
  }

  deleteBrand(): void {
    if (!this.brandToDelete) return;

    this.brandsService
      .deleteBrand(this.brandToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          if (error.status === 409) {
            this.alertService.error(
              'Cannot delete brand with associated departments'
            );
          } else {
            this.alertService.error('Failed to delete brand');
          }
          console.error('Error deleting brand:', error);
          return of(null);
        }),
        finalize(() => {
          this.showDeleteModal = false;
          this.brandToDelete = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Brand deleted successfully');
          this.refreshSpecificGrid();
          this.loadBrandStatistics();
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

    this.brandsService
      .importBrands(file)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to import brands');
          console.error('Error importing brands:', error);
          return of(null);
        }),
        finalize(() => (this.importLoading = false))
      )
      .subscribe((response) => {
        if (response) {
          const message = `Import completed: ${response.successCount} successful, ${response.failureCount} failed`;
          this.alertService.success(message);
          this.refreshSpecificGrid();
          this.loadBrandStatistics();
        }
      });
  }

  onExport(options: any): void {
    const request = {
      sortField: options.sortField,
      sortDirection: options.sortDirection,
      globalFilter: options.globalFilter,
    };

    this.brandsService
      .exportBrands(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to export brands');
          console.error('Error exporting brands:', error);
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `brands_${
            new Date().toISOString().split('T')[0]
          }.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.alertService.success('Export completed successfully');
        }
      });
  }

  downloadTemplate(): void {
    this.brandsService
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
          a.download = 'brands-import-template.xlsx';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.alertService.success('Template downloaded successfully!');
        }
      });
  }
}
