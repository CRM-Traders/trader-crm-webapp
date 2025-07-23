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
import { DesksService } from './services/desks.service';
import { Desk } from './models/desk.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import { LanguageService } from '../../core/services/language.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { DeskCreationModalComponent } from './components/desk-creation-modal/desk-creation-modal.component';
import { DeskDetailsModalComponent } from './components/desk-details-modal/desk-details-modal.component';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-desks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GridComponent,
    HasPermissionDirective,
  ],
  templateUrl: './desks.component.html',
  styleUrls: ['./desks.component.scss'],
})
export class DesksComponent implements OnInit, OnDestroy {
  private desksService = inject(DesksService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private languageService = inject(LanguageService);

  private destroy$ = new Subject<void>();
  gridId = 'desks-grid';

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('typeCell', { static: true })
  typeCellTemplate!: TemplateRef<any>;
  @ViewChild('languageCell', { static: true })
  languageCellTemplate!: TemplateRef<any>;

  importLoading = false;
  showDeleteModal = false;
  deskToDelete: Desk | null = null;
  totalCount = 0;
  activeCount = 0;

  private readonly deskTypes = [
    { value: 0, label: 'Sales' },
    { value: 1, label: 'Retention' },
  ];

  gridColumns: GridColumn[] = [
    {
      field: 'name',
      header: 'Desk Name',
      sortable: true,
      filterable: true,
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
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
      field: 'type',
      header: 'Type',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'language',
      header: 'Language',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
    },
    {
      field: 'teamsCount',
      header: 'Teams',
      sortable: true,
      filterable: true,
      selector: (row: Desk) => row.teamsCount || 0,
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
      selector: (row: Desk) => row.createdBy || 'System',
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Desk) => this.openDetailsModal(item),
      permission: 74,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      action: (item: Desk) => this.confirmDelete(item),
      permission: 75,
    },
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadDeskStatistics();
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

    const typeColumn = this.gridColumns.find((col) => col.field === 'type');
    if (typeColumn) {
      typeColumn.cellTemplate = this.typeCellTemplate;
    }

    const languageColumn = this.gridColumns.find(
      (col) => col.field === 'language'
    );
    if (languageColumn) {
      languageColumn.cellTemplate = this.languageCellTemplate;
    }
  }

  private loadDeskStatistics(): void {
    this.desksService
      .getDeskStats()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.totalCount = 0;
          this.activeCount = 0;
          return of(null);
        })
      )
      .subscribe((stats: any) => {
        if (stats) {
          this.totalCount = stats.value.totalDesks;
          this.activeCount = stats.value.activeDesks;
        }
      });
  }

  getTypeLabel(type: number): string {
    const typeInfo = this.deskTypes.find((t) => t.value === type);
    return typeInfo ? typeInfo.label : `Type ${type}`;
  }

  getLanguageLabel(languageCode: string): string {
    const language = this.languageService.getLanguageByKey(languageCode);
    return language || languageCode.toUpperCase();
  }

  onRowClick(desk: Desk): void {
    this.openDetailsModal(desk);
  }

  openCreateModal(): void {
    const modalRef = this.modalService.open(DeskCreationModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadDeskStatistics();
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

  openDetailsModal(desk: Desk): void {
    const modalRef = this.modalService.open(
      DeskDetailsModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        deskId: desk.id,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result && result.updated) {
          this.refreshSpecificGrid();
          this.loadDeskStatistics();
        }
      },
      () => {
        // Modal dismissed without changes
      }
    );
  }

  confirmDelete(desk: Desk): void {
    this.deskToDelete = desk;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deskToDelete = null;
  }

  deleteDesk(): void {
    if (!this.deskToDelete) return;

    this.desksService
      .deleteDesk(this.deskToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          if (error.status === 409) {
            this.alertService.error(
              'Cannot delete desk with associated dependencies'
            );
          } else {
            this.alertService.error('Failed to delete desk');
          }
          return of(null);
        }),
        finalize(() => {
          this.showDeleteModal = false;
          this.deskToDelete = null;
          this.refreshSpecificGrid();
          this.loadDeskStatistics();
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Desk deleted successfully');
          this.refreshSpecificGrid();
          this.loadDeskStatistics();
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

    this.desksService
      .importDesks(file)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to import desks');
          return of(null);
        }),
        finalize(() => (this.importLoading = false))
      )
      .subscribe((response) => {
        if (response) {
          const message = `Import completed: ${response.successCount} successful, ${response.failureCount} failed`;
          this.alertService.success(message);
          this.refreshSpecificGrid();
          this.loadDeskStatistics();
        }
      });
  }

  onExport(options: any): void {
    const request = {
      sortField: options.sortField,
      sortDirection: options.sortDirection,
      globalFilter: options.globalFilter,
    };

    this.desksService
      .exportDesks(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to export desks');
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `desks_${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.alertService.success('Export completed successfully');
        }
      });
  }

  downloadTemplate(): void {
    this.desksService
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
          a.download = 'desks-import-template.xlsx';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.alertService.success('Template downloaded successfully!');
        }
      });
  }
}
