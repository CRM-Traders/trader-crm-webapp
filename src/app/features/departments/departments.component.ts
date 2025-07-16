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
import { DepartmentsService } from './services/departments.service';
import { Department } from './models/department.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { DepartmentCreationModalComponent } from './components/department-creation-modal/department-creation-modal.component';
import { DepartmentDetailsModalComponent } from './components/department-details-modal/department-details-modal.component';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './departments.component.html',
  styleUrls: ['./departments.component.scss'],
})
export class DepartmentsComponent implements OnInit, OnDestroy {
  private departmentsService = inject(DepartmentsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);

  private destroy$ = new Subject<void>();
  gridId = 'departments-grid';

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;

  importLoading = false;
  showDeleteModal = false;
  departmentToDelete: Department | null = null;
  totalCount = 0;
  activeCount = 0;

  gridColumns: GridColumn[] = [
    {
      field: 'name',
      header: 'Department Name',
      sortable: true,
      filterable: true,
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
    },
    {
      field: 'deskName',
      header: 'Desk',
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
      selector: (row: Department) => row.createdBy || 'System',
    },
    {
      field: 'lastModifiedAt',
      header: 'Last Modified',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
      selector: (row: Department) => row.lastModifiedAt || null,
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Department) => this.openDetailsModal(item),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      action: (item: Department) => this.openDetailsModal(item),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      action: (item: Department) => this.confirmDelete(item),
    },
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadDepartmentStatistics();
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
  }

  private loadDepartmentStatistics(): void {
    this.departmentsService
      .getDepartmentStats()
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
          this.totalCount = stats.value.totalDepartments;
          this.activeCount = stats.value.activeDepartments;
        }
      });
  }

  onRowClick(department: Department): void {
    this.openDetailsModal(department);
  }

  openCreateModal(): void {
    const modalRef = this.modalService.open(DepartmentCreationModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadDepartmentStatistics();
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

  openDetailsModal(department: Department): void {
    const modalRef = this.modalService.open(
      DepartmentDetailsModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        department: department,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadDepartmentStatistics();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  confirmDelete(department: Department): void {
    this.departmentToDelete = department;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.departmentToDelete = null;
  }

  deleteDepartment(): void {
    if (!this.departmentToDelete) return;

    this.departmentsService
      .deleteDepartment(this.departmentToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          if (error.status === 409) {
            this.alertService.error(
              'Cannot delete department with associated dependencies'
            );
          } else {
            this.alertService.error('Failed to delete department');
          }
          return of(null);
        }),
        finalize(() => {
          this.showDeleteModal = false;
          this.departmentToDelete = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Department deleted successfully');
          this.refreshSpecificGrid();
          this.loadDepartmentStatistics();
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

    this.departmentsService
      .importDepartments(file)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to import departments');
          return of(null);
        }),
        finalize(() => (this.importLoading = false))
      )
      .subscribe((response) => {
        if (response) {
          const message = `Import completed: ${response.successCount} successful, ${response.failureCount} failed`;
          this.alertService.success(message);
          this.refreshSpecificGrid();
          this.loadDepartmentStatistics();
        }
      });
  }

  onExport(options: any): void {
    const request = {
      sortField: options.sortField,
      sortDirection: options.sortDirection,
      globalFilter: options.globalFilter,
    };

    this.departmentsService
      .exportDepartments(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to export departments');
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `departments_${
            new Date().toISOString().split('T')[0]
          }.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.alertService.success('Export completed successfully');
        }
      });
  }

  downloadTemplate(): void {
    this.departmentsService
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
          a.download = 'departments-import-template.xlsx';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.alertService.success('Template downloaded successfully!');
        }
      });
  }
}
