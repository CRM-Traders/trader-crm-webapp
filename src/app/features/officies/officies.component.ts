// src/app/features/officies/officies.component.ts - Updated with double-click navigation

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
import { Router } from '@angular/router';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { OfficesService } from './services/offices.service';
import { Office } from './models/office.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import { CountryService } from '../../core/services/country.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { OfficeCreationModalComponent } from './components/office-creation-modal/office-creation-modal.component';
import { OfficeDetailsModalComponent } from './components/office-details-modal/office-details-modal.component';

@Component({
  selector: 'app-offices',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './officies.component.html',
  styleUrls: ['./officies.component.scss'],
})
export class OfficesComponent implements OnInit, OnDestroy {
  private officesService = inject(OfficesService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private countryService = inject(CountryService);
  private router = inject(Router);

  private destroy$ = new Subject<void>();
  gridId = 'offices-grid';

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('countryCell', { static: true })
  countryCellTemplate!: TemplateRef<any>;
  @ViewChild('desksCountCell', { static: true })
  desksCountCellTemplate!: TemplateRef<any>;

  importLoading = false;
  showDeleteModal = false;
  officeToDelete: Office | null = null;
  totalCount = 0;
  activeCount = 0;
  totalDesks = 0;

  gridColumns: GridColumn[] = [
    {
      field: 'name',
      header: 'Office Name',
      sortable: true,
      filterable: true,
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
      cellTemplate: null,
    },
    {
      field: 'brandName',
      header: 'Brand',
      sortable: true,
      filterable: true,
    },
    {
      field: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
    },
    {
      field: 'desksCount',
      header: 'Desks',
      sortable: true,
      filterable: true,
      cellTemplate: null,
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
      selector: (row: Office) => row.createdBy || 'System',
    },
    {
      field: 'lastModifiedAt',
      header: 'Last Modified',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
      selector: (row: Office) => row.lastModifiedAt || null,
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'rules',
      label: 'Office Rules',
      icon: 'rules',
      action: (item: Office) => this.navigateToOfficeRules(item),
    },
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Office) => this.openDetailsModal(item),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      action: (item: Office) => this.confirmDelete(item),
    },
  ];

  countries: { [key: string]: string } = {};

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadOfficeStatistics();
    this.loadCountries();
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

    const countryColumn = this.gridColumns.find(
      (col) => col.field === 'country'
    );
    if (countryColumn) {
      countryColumn.cellTemplate = this.countryCellTemplate;
    }

    const desksCountColumn = this.gridColumns.find(
      (col) => col.field === 'desksCount'
    );
    if (desksCountColumn) {
      desksCountColumn.cellTemplate = this.desksCountCellTemplate;
    }
  }

  private loadOfficeStatistics(): void {
    this.officesService
      .getOfficeStats()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.totalCount = 0;
          this.activeCount = 0;
          this.totalDesks = 0;
          return of(null);
        })
      )
      .subscribe((stats: any) => {
        if (stats) {
          this.totalCount = stats.value.totalOffices;
          this.activeCount = stats.value.activeOffices;
          this.totalDesks = stats.value.totalDesks;
        }
      });
  }

  private loadCountries(): void {
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.countries = countries.reduce((acc, country) => {
          acc[country.code] = country.name;
          return acc;
        }, {} as { [key: string]: string });
      });
  }

  getCountryName(countryCode: string): string {
    return this.countries[countryCode] || countryCode;
  }

  /**
   * Handles single-click events on office rows to display detailed information
   */
  onRowClick(office: Office): void {
    this.openDetailsModal(office);
  }

  /**
   * Handles double-click events on office rows to navigate to office rules management
   */
  onRowDoubleClick(office: any): void {
    this.navigateToOfficeRules(office);
  }

  /**
   * Opens a new browser tab to display the office rules management interface
   */
  private navigateToOfficeRules(office: Office): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/offices', office.id, 'rules'])
    );
    window.open(url, '_blank');
  }

  openCreateModal(): void {
    const modalRef = this.modalService.open(OfficeCreationModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadOfficeStatistics();
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

  openDetailsModal(office: Office): void {
    const modalRef = this.modalService.open(
      OfficeDetailsModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        office: office,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadOfficeStatistics();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  confirmDelete(office: Office): void {
    this.officeToDelete = office;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.officeToDelete = null;
  }

  deleteOffice(): void {
    if (!this.officeToDelete) return;

    this.officesService
      .deleteOffice(this.officeToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          if (error.status === 409) {
            this.alertService.error(
              'Cannot delete office with existing desks or dependencies'
            );
          } else {
            this.alertService.error('Failed to delete office');
          }
          console.error('Error deleting office:', error);
          return of(null);
        }),
        finalize(() => {
          this.showDeleteModal = false;
          this.officeToDelete = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Office deleted successfully');
          this.refreshSpecificGrid();
          this.loadOfficeStatistics();
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

    this.officesService
      .importOffices(file)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to import offices');
          console.error('Error importing offices:', error);
          return of(null);
        }),
        finalize(() => (this.importLoading = false))
      )
      .subscribe((response) => {
        if (response) {
          const message = `Import completed: ${response.successCount} successful, ${response.failureCount} failed`;
          this.alertService.success(message);
          this.refreshSpecificGrid();
          this.loadOfficeStatistics();
        }
      });
  }

  onExport(options: any): void {
    const request = {
      sortField: options.sortField,
      sortDirection: options.sortDirection,
      globalFilter: options.globalFilter,
    };

    this.officesService
      .exportOffices(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to export offices');
          console.error('Error exporting offices:', error);
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `offices_${
            new Date().toISOString().split('T')[0]
          }.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.alertService.success('Export completed successfully');
        }
      });
  }

  downloadTemplate(): void {
    this.officesService
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
          a.download = 'offices-import-template.xlsx';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.alertService.success('Template downloaded successfully!');
        }
      });
  }
}
