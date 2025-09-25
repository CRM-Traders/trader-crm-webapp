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
  BranchDropdownItem,
  BranchDropdownResponse,
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
import { Router } from '@angular/router';
import { OperatorRegistrationModalComponent } from './components/operator-registration-modal/operator-registration-modal.component';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

interface RoleDropdownItem {
  id: string;
  value: string;
}

interface DepartmentDropdownItem {
  id: string;
  value: string;
}

@Component({
  selector: 'app-operators',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GridComponent,
    HasPermissionDirective,
  ],
  templateUrl: './operators.component.html',
  styleUrls: ['./operators.component.scss'],
})
export class OperatorsComponent implements OnInit, OnDestroy {
  private operatorsService = inject(OperatorsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  gridId = 'operators-grid';

  @ViewChild('branchTypeCell', { static: true })
  branchTypeCellTemplate!: TemplateRef<any>;
  @ViewChild('userTypeCell', { static: true })
  userTypeCellTemplate!: TemplateRef<any>;
  @ViewChild('onlineStatusCell', { static: true })
  onlineStatusCellTemplate!: TemplateRef<any>;

  showDeleteModal = false;
  operatorToDelete: Operator | null = null;
  statistics: OperatorStatistics | null = null;

  // Filter options properties
  departmentOptions: { id: string; value: string; label: string }[] = [];
  roleOptions: { value: string; label: string }[] = [];
  branchOptions: { value: string; label: string }[] = [];
  userTypeOptions: { value: number; label: string }[] = [];

  BranchType = BranchType;
  BranchTypeLabels = BranchTypeLabels;
  BranchTypeColors = BranchTypeColors;
  UserType = UserType;
  UserTypeLabels = UserTypeLabels;
  UserTypeColors = UserTypeColors;

  gridColumns: GridColumn[] = [
    {
      field: 'isOnline',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Online' },
        { value: false, label: 'Offline' },
      ],
      cellTemplate: null, // Will be set in ngOnInit
      width: '20px',
    },
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
      filterType: 'select',
      filterOptions: [], // Will be populated after loading departments
      selector: (row: Operator) => row.departmentName || '-',
    },
    {
      field: 'roleName',
      header: 'Role',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated after loading roles
      selector: (row: Operator) => row.roleName || '-',
    },
    {
      field: 'branchType',
      header: 'Branch Type',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
      filterType: 'select',
      filterOptions: [
        { value: 0, label: 'Brand' },
        { value: 1, label: 'Desk' },
        { value: 2, label: 'Team' },
        { value: 3, label: 'Office' },
      ],
      selector: (row: Operator) => row.branchTypeName || '-',
    },
    {
      field: 'branchName',
      header: 'Branch',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated after loading branches
      selector: (row: Operator) => row.branchName || '-',
    },
    {
      field: 'userType',
      header: 'User Type',
      sortable: true,
      filterable: true,
      cellTemplate: null, // Will be set in ngOnInit
      filterType: 'select',
      filterOptions: [], // Will be populated after loading user types
      selector: (row: Operator) => row.userTypeName || '-',
    },
    {
      field: 'createdAt',
      header: 'Created',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
      hidden: true,
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
      permission: 104,
    },
    {
      id: 'password',
      label: 'Change Password',
      icon: 'password',
      action: (item: Operator) => this.openPasswordChangeModal(item),
      permission: 99,
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: 'permission',
      action: (item: Operator) => this.navigateToPermissions(item),
      permission: 100,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      action: (item: Operator) => this.confirmDelete(item),
      permission: -1,
    },
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadOperatorStatistics();
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeGridTemplates(): void {
    const onlineStatusColumn = this.gridColumns.find(
      (col) => col.field === 'isOnline'
    );
    if (onlineStatusColumn) {
      onlineStatusColumn.cellTemplate = this.onlineStatusCellTemplate;
    }

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

  private loadFilterOptions(): void {
    this.loadDepartments();
    this.loadBranches();
    this.loadUserTypes();
  }

  private loadDepartments(): void {
    const requestBody = {
      pageIndex: 0,
      pageSize: 1000,
      globalFilter: null,
    };

    this.operatorsService.getDepartmentsDropdown(requestBody)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load departments');
          return of({ items: [] });
        })
      )
      .subscribe((response: any) => {
        this.departmentOptions = response.items.map((dept: any) => ({
          id: dept.id,
          value: dept.value,
          label: dept.value,
        }));
        this.updateGridFilterOptions();
      });
  }

  private loadRolesByDepartment(departmentId: string): void {
    this.operatorsService.getOperatorRolesByDepartment(departmentId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load roles for department');
          return of([]);
        })
      )
      .subscribe((roles: any) => {
        this.roleOptions = roles.items.map((role: any) => ({
          value: role.value,
          label: role.value,
        }));
        this.updateGridFilterOptions();
      });
  }

  onFilterChange(filters: any): void {
    // Check if department filter has changed
    if (filters.filters && filters.filters.departmentName) {
      const departmentFilter = filters.filters.departmentName;
      
      if (departmentFilter.value && departmentFilter.value.length > 0) {
        // Get the first selected department (assuming single selection for now)
        const selectedDepartmentValue = departmentFilter.value[0];
        // Find the department by its value (display name) to get the ID
        const department = this.departmentOptions.find(dept => dept.value === selectedDepartmentValue);
        if (department) {
          // Load roles for the selected department using its ID
          this.loadRolesByDepartment(department.id);
        }
      } else {
        // If no department is selected, clear roles
        this.roleOptions = [];
        this.updateGridFilterOptions();
      }
    }
  }

  private loadBranches(): void {
    // Load branches for all types
    const branchTypes = [BranchType.Brand, BranchType.Desk, BranchType.Team, BranchType.Office];
    const allBranches: { value: string; label: string }[] = [];
    let completedRequests = 0;

    branchTypes.forEach(branchType => {
      const params = {
        pageIndex: 0,
        pageSize: 1000,
        globalFilter: null,
      };

      let observable;
      switch (branchType) {
        case BranchType.Office:
          observable = this.operatorsService.getOfficesDropdown(params);
          break;
        case BranchType.Desk:
          observable = this.operatorsService.getDesksDropdown(params);
          break;
        case BranchType.Team:
          observable = this.operatorsService.getTeamsDropdown(params);
          break;
        case BranchType.Brand:
          observable = this.operatorsService.getBrandsDropdown(params);
          break;
        default:
          completedRequests++;
          return;
      }

      observable.pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          completedRequests++;
          return of({ items: [] });
        })
      ).subscribe((response: any) => {
        const branches = response.items.map((branch: any) => ({
          value: branch.value,
          label: branch.value,
        }));
        allBranches.push(...branches);
        completedRequests++;
        
        // Update when all requests are completed
        if (completedRequests === branchTypes.length) {
          this.branchOptions = allBranches;
          this.updateGridFilterOptions();
        }
      });
    });
  }

  private loadUserTypes(): void {
    this.userTypeOptions = Object.entries(UserTypeLabels).map(([value, label]) => ({
      value: Number(value),
      label,
    }));
    this.updateGridFilterOptions();
  }

  private updateGridFilterOptions(): void {
    // Update department filter options
    const departmentCol = this.gridColumns.find(col => col.field === 'departmentName');
    if (departmentCol) {
      departmentCol.filterOptions = this.departmentOptions;
    }

    // Update role filter options
    const roleCol = this.gridColumns.find(col => col.field === 'roleName');
    if (roleCol) {
      roleCol.filterOptions = this.roleOptions;
    }

    // Update branch filter options
    const branchCol = this.gridColumns.find(col => col.field === 'branchName');
    if (branchCol) {
      branchCol.filterOptions = this.branchOptions;
    }

    // Update user type filter options
    const userTypeCol = this.gridColumns.find(col => col.field === 'userType');
    if (userTypeCol) {
      userTypeCol.filterOptions = this.userTypeOptions;
    }
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
          return of(null);
        }),
        finalize(() => {
          this.showDeleteModal = false;
          this.operatorToDelete = null;
          this.refreshSpecificGrid();
          this.loadOperatorStatistics();
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Operator deleted successfully');
          this.refreshSpecificGrid();
          this.loadOperatorStatistics();
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

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadOperatorStatistics();
        }
      },
      () => {}
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

  refreshSpecificGrid(): void {
    const event = new CustomEvent('refreshGrid', {
      detail: { gridId: this.gridId },
    });
    window.dispatchEvent(event);
  }

  refreshGrid(): void {
    const gridComponent = document.querySelector(
      `app-grid[gridId="operators-grid"]`
    );
    if (gridComponent) {
      (gridComponent as any).refresh?.();
    }
  }

  navigateToPermissions(operator: Operator): void {
    window.open(`/operators/${operator.userId}/permissions`, '_blank');
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
