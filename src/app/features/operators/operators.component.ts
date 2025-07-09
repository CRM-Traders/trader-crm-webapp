// src/app/features/operators/operators.component.ts

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
import { OperatorsService } from './services/operators.service';
import {
  Operator,
  OperatorUpdateRequest,
  OperatorStatistics,
  BranchType,
  BranchTypeLabels,
  BranchTypeColors,
  UserType,
  UserTypeLabels,
  UserTypeColors,
} from './models/operators.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import {
  PasswordChangeComponent,
  PasswordChangeData,
} from '../../shared/components/password-change/password-change.component';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { PermissionTableComponent } from '../../shared/components/permission-table/permission-table.component';
import { Router } from '@angular/router';
import { OperatorRegistrationModalComponent } from './components/operator-registration-modal/operator-registration-modal.component';

@Component({
  selector: 'app-operators',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './operators.component.html',
  styleUrls: ['./operators.component.scss'],
})
export class OperatorsComponent implements OnInit, OnDestroy {
  private operatorsService = inject(OperatorsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();
  private router = inject(Router);

  @ViewChild('branchTypeCell', { static: true })
  branchTypeCellTemplate!: TemplateRef<any>;
  @ViewChild('userTypeCell', { static: true })
  userTypeCellTemplate!: TemplateRef<any>;

  showDeleteModal = false;
  operatorToDelete: Operator | null = null;
  statistics: OperatorStatistics | null = null;

  BranchType = BranchType;
  BranchTypeLabels = BranchTypeLabels;
  BranchTypeColors = BranchTypeColors;
  UserType = UserType;
  UserTypeLabels = UserTypeLabels;
  UserTypeColors = UserTypeColors;

  gridColumns: GridColumn[] = [
    {
      field: 'userFullName',
      header: 'Full Name',
      sortable: true,
      filterable: true,
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
    },
    {
      field: 'userEmail',
      header: 'Email',
      sortable: true,
      filterable: true,
    },
    {
      field: 'departmentName',
      header: 'Department',
      sortable: true,
      filterable: true,
      selector: (row: Operator) => row.departmentName || '-',
    },
    {
      field: 'roleName',
      header: 'Role',
      sortable: true,
      filterable: true,
      selector: (row: Operator) => row.roleName || '-',
    },
    {
      field: 'branchType',
      header: 'Branch Type',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
      selector: (row: Operator) => row.branchTypeName || '-',
    },
    {
      field: 'branchName',
      header: 'Branch',
      sortable: true,
      filterable: true,
      selector: (row: Operator) => row.branchName || '-',
    },
    {
      field: 'userType',
      header: 'User Type',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
      selector: (row: Operator) => row.userTypeName || '-',
    },
    {
      field: 'createdAt',
      header: 'Created',
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
      selector: (row: Operator) => row.createdBy || '-',
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Operator) => this.openOperatorDetailsModal(item),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      action: (item: Operator) => this.openOperatorDetailsModal(item),
    },
    {
      id: 'password',
      label: 'Change Password',
      icon: 'password',
      action: (item: Operator) => this.openPasswordChangeModal(item),
    },
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadOperatorStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeGridTemplates(): void {
    const branchTypeColumn = this.gridColumns.find(
      (col) => col.field === 'branchType'
    );
    if (branchTypeColumn) {
      branchTypeColumn.cellTemplate = this.branchTypeCellTemplate;
    }

    const userTypeColumn = this.gridColumns.find(
      (col) => col.field === 'userType'
    );
    if (userTypeColumn) {
      userTypeColumn.cellTemplate = this.userTypeCellTemplate;
    }
  }

  private loadOperatorStatistics(): void {
    this.operatorsService
      .getOperatorStatistics()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          return of(null);
        })
      )
      .subscribe((statistics: any) => {
        if (statistics) {
          this.statistics = statistics.value;
        }
      });
  }

  onRowClick(operator: Operator): void {
    this.openOperatorDetailsModal(operator);
  }

  openOperatorDetailsModal(operator: Operator): void {
    this.router.navigate(['/operators', operator.id, 'profile']);
  }

  confirmDelete(operator: Operator): void {
    this.operatorToDelete = operator;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.operatorToDelete = null;
  }

  deleteOperator(): void {
    if (!this.operatorToDelete) return;

    this.operatorsService
      .deleteOperator(this.operatorToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to delete operator');
          console.error('Error deleting operator:', error);
          return of(null);
        }),
        finalize(() => {
          this.showDeleteModal = false;
          this.operatorToDelete = null;
          this.refreshGrid();
          this.loadOperatorStatistics(); // Refresh statistics
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Operator deleted successfully');
          this.refreshGrid();
          this.loadOperatorStatistics(); // Refresh statistics
        }
      });
  }

  onExport(options: any): void {
    const request = {
      sortField: options.sortField,
      sortDirection: options.sortDirection,
      globalFilter: options.globalFilter,
    };

    this.operatorsService
      .exportOperators(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to export operators');
          console.error('Error exporting operators:', error);
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `operators_${
            new Date().toISOString().split('T')[0]
          }.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.alertService.success('Export completed successfully');
        }
      });
  }

  openRegistrationModal(): void {
    const modalRef = this.modalService.open(
      OperatorRegistrationModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      }
    );
    console.log(modalRef.result);

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshGrid();
          this.loadOperatorStatistics(); // Refresh statistics
        }
      },
      () => {
        this.refreshGrid();
        this.loadOperatorStatistics(); // Refresh statistics
        // Modal dismissed
      }
    );
  }

  downloadTemplate(): void {
    this.operatorsService
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
          a.download = 'operators-import-template.xlsx';
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
      `app-grid[gridId="operators-grid"]`
    );
    if (gridComponent) {
      (gridComponent as any).refresh?.();
    }
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
        userId: user.userId,
      }
    );
  }

  openPasswordChangeModal(operator: Operator): void {
    const passwordChangeData: PasswordChangeData = {
      entityId: operator.id,
      entityType: 'operator',
      entityName: operator.userFullName,
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

  returnBranchType(value: any) {
    return BranchTypeColors[value as BranchType];
  }

  returnBranchTypeLables(value: any) {
    return BranchTypeLabels[value as BranchType];
  }

  returnUserTypeColors(value: any) {
    return UserTypeColors[value as UserType];
  }

  returnUserTypeLabels(value: any) {
    return UserTypeLabels[value as UserType];
  }
}
