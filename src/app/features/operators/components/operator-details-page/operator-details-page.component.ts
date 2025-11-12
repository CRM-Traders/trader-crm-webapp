import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, switchMap } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OperatorsService } from '../../services/operators.service';
import { UsersService } from '../../../client-details/services/user.service';
import {
  Operator,
  BranchType,
  BranchTypeLabels,
  BranchTypeColors,
  UserType,
  UserTypeLabels,
  UserTypeColors,
  OperatorRole,
  UserOrganizationAssignRequest,
  OperatorDepartmentRoleAssignRequest,
  OperatorPersonalInfoUpdateRequest,
  OperatorDepartmentRoleRemoveRequest,
} from '../../models/operators.model';
import {
  PasswordChangeComponent,
  PasswordChangeData,
} from '../../../../shared/components/password-change/password-change.component';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

export enum OperatorDetailSection {
  Clients = 'clients',

  Profile = 'profile',
  Departments = 'departments',
  Branches = 'branches',
  ActivityLog = 'activity-log',
  Settings = 'settings',
}

@Component({
  selector: 'app-operator-details-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective],
  templateUrl: './operator-details-page.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .sticky {
        position: -webkit-sticky;
        position: sticky;
      }
    `,
  ],
})
export class OperatorDetailsPageComponent implements OnInit, OnDestroy {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private operatorsService = inject(OperatorsService);
  private userService = inject(UsersService);
  private modalService = inject(ModalService);

  private destroy$ = new Subject<void>();

  activeSection: OperatorDetailSection = OperatorDetailSection.Clients;
  operator!: Operator;
  operatorId!: string;

  // Form properties
  profileForm: FormGroup;
  departmentForm: FormGroup;
  branchForm: FormGroup;
  isEditingProfile = false;
  isSavingProfile = false;
  isAddingDepartment = false;
  isAddingBranch = false;
  loadingBranches = false;

  // Data properties
  availableDepartments: any[] = [];
  availableRoles: OperatorRole[] = [];
  availableOffices: any[] = [];
  availableBranches: any[] = [];
  assignedClients: any[] = [];
  assignedClientsTotal = 0;
  assignedClientsLoading = false;
  clientsPageIndex = 0;
  clientsPageSize = 100;
  loadingOffices = false;

  // Office tabs for branches filtering
  officeNames: string[] = [];
  selectedOffice: string = 'All';
  filteredBranches: any[] = [];

  // Constants
  BranchType = BranchType;
  BranchTypeLabels = BranchTypeLabels;
  BranchTypeColors = BranchTypeColors;
  UserType = UserType;
  UserTypeLabels = UserTypeLabels;
  UserTypeColors = UserTypeColors;

  navigationSections = [
    { key: OperatorDetailSection.Clients, label: 'Clients', permission: 104 },

    { key: OperatorDetailSection.Profile, label: 'Profile', permission: 104 },
    {
      key: OperatorDetailSection.Departments,
      label: 'Departments',
      permission: 105,
    },
    { key: OperatorDetailSection.Branches, label: 'Branches', permission: 108 },
  ];

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      userType: [{ value: '', disabled: true }, Validators.required],
    });

    this.departmentForm = this.fb.group({
      departmentId: ['', Validators.required],
      roleId: [{ value: '', disabled: true }, Validators.required],
    });

    this.branchForm = this.fb.group({
      branchType: ['', Validators.required],
      officeId: [{ value: '', disabled: true }, Validators.required],
      branchId: [{ value: '', disabled: true }, Validators.required],
    });
  }

  ngOnInit(): void {
    const operatorId = this.activatedRoute.snapshot.paramMap.get('id');

    if (!operatorId) {
      this.router.navigate(['/operators']);
      return;
    }

    this.operatorId = operatorId;
    this.loadOperatorDetails();
    //this.loadDepartments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOperatorDetails(): void {
    this.operatorsService
      .getOperatorById(this.operatorId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load operator details');
          this.router.navigate(['/operators']);
          return of(null);
        })
      )
      .subscribe((operator) => {
        if (operator) {
          this.operator = operator;
          this.loadAssignedClients();

          this.initializeForms();
        }
      });
  }

  private initializeForms(): void {
    if (this.operator) {
      const names = this.operator.userFullName.split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      this.profileForm.patchValue({
        firstName: firstName,
        lastName: lastName,
        email: this.operator.userEmail,
        phoneNumber: '',
        userType: this.operator.userType,
      });

      // Ensure non-editable controls are actually disabled at the form control level
      this.updateProfileEditableControls();

      this.loadUserDetails();
      this.initializeOfficeTabs();
    }
  }

  private initializeOfficeTabs(): void {
    if (this.operator.branches && this.operator.branches.length > 0) {
      // Extract unique office names
      const uniqueOffices = new Set<string>();
      this.operator.branches.forEach((branch: any) => {
        if (branch.officeName) {
          uniqueOffices.add(branch.officeName);
        }
      });
      this.officeNames = Array.from(uniqueOffices).sort();
      
      // Filter branches based on default selection
      this.filterBranchesByOffice();
    } else {
      this.officeNames = [];
      this.filteredBranches = [];
    }
  }

  selectOffice(officeName: string): void {
    this.selectedOffice = officeName;
    this.filterBranchesByOffice();
  }

  private filterBranchesByOffice(): void {
    if (!this.operator.branches) {
      this.filteredBranches = [];
      return;
    }

    if (this.selectedOffice === 'All') {
      this.filteredBranches = [...this.operator.branches];
    } else {
      this.filteredBranches = this.operator.branches.filter(
        (branch: any) => branch.officeName === this.selectedOffice
      );
    }
  }

  getBranchCountByOffice(officeName: string): number {
    if (!this.operator.branches) return 0;
    return this.operator.branches.filter(
      (branch: any) => branch.officeName === officeName
    ).length;
  }

  private loadUserDetails(): void {
    this.userService.getEmail(this.operator.userId).subscribe(
      (email) => {
        this.profileForm.patchValue({ email: email.email });
      },
      (error) => {}
    );

    this.userService.getPhone(this.operator.userId).subscribe(
      (phone) => {
        this.profileForm.patchValue({ phoneNumber: phone.phoneNumber });
      },
      (error) => {}
    );
  }

  private loadDepartments(): void {
    this.operatorsService.getDepartmentsDropdown({ pageSize: 100 }).subscribe(
      (response) => {
        this.availableDepartments = response.items;
      },
      (error) => {}
    );
  }

  setActiveSection(section: OperatorDetailSection): void {
    this.activeSection = section;
    if (section === OperatorDetailSection.Clients) {
      if (!this.assignedClients.length) {
        this.loadAssignedClients(true);
      }
    }
  }

  getInitials(fullName: string): string {
    const names = fullName.split(' ');
    return names.length >= 2
      ? `${names[0].charAt(0)}${names[names.length - 1].charAt(
          0
        )}`.toUpperCase()
      : fullName.substring(0, 2).toUpperCase();
  }

  getDepartmentsSummary(): string {
    const count = this.operator.departments?.length || 0;
    if (count === 0) return 'No departments';
    if (count === 1) return '1 department';
    return `${count} departments`;
  }

  getBranchesSummary(): string {
    const count = this.operator.branches?.length || 0;
    if (count === 0) return 'No branches';
    if (count === 1) return '1 branch';
    return `${count} branches`;
  }

  getRoleName(operatorDepartmentRoleId: string): string {
    return 'Role';
  }

  goBack(): void {
    this.router.navigate(['/operators']);
  }

  changePassword(): void {
    this.openPasswordChangeModal(this.operator);
  }

  openPermissions(): void {
    window.open(`/operators/${this.operator.userId}/permissions`, '_blank');
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
        if (result) {
          this.alertService.success('Password changed successfully');
        }
      },
      () => {}
    );
  }

  refreshData(): void {
    this.loadOperatorDetails();
    this.alertService.success('Data refreshed successfully');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.alertService.success('Copied to clipboard');
    });
  }

  startEditProfile(): void {
    this.isEditingProfile = true;
    this.updateProfileEditableControls();
  }

  cancelEditProfile(): void {
    this.isEditingProfile = false;
    this.initializeForms();
  }

  saveProfileInfo(): void {
    if (this.profileForm.valid) {
      this.isSavingProfile = true;
      
      // Use getRawValue() to include disabled controls
      const formValues = this.profileForm.getRawValue();

      const personalInfoRequest: OperatorPersonalInfoUpdateRequest = {
        id: this.operator.id,
        firstname: formValues.firstName,
        lastname: formValues.lastName,
        email: formValues.email,
        phoneNumber: formValues.phoneNumber || null,
        userType: Number(formValues.userType),
      };

      this.operatorsService
        .updateOperatorPersonalInfo(personalInfoRequest)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to update profile');
            this.isSavingProfile = false;
            return of(null);
          })
        )
        .subscribe((result) => {
          this.alertService.success('Profile updated successfully');
          this.isEditingProfile = false;
          this.isSavingProfile = false;
          this.loadOperatorDetails();
        });
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }

  onDepartmentChange(departmentId: any): void {
    this.availableRoles = [];
    this.departmentForm.patchValue({ roleId: '' });
    
    // Disable roleId while loading or if no department selected
    const roleIdControl = this.departmentForm.get('roleId');
    if (roleIdControl) {
      roleIdControl.disable();
    }

    if (departmentId.value) {
      this.operatorsService
        .getOperatorRolesByDepartment(departmentId.value)
        .subscribe({
          next: (roles: any) => {
            this.availableRoles = roles.items;
            // Enable roleId if roles are available
            if (roleIdControl && this.availableRoles.length > 0) {
              roleIdControl.enable();
            }
          },
          error: (error) => {
            this.availableRoles = [];
            // Keep roleId disabled on error
          },
        });
    }
  }

  addDepartment(): void {
    if (this.departmentForm.valid) {
      this.isAddingDepartment = true;
      
      // Use getRawValue() to include disabled controls
      const formValues = this.departmentForm.getRawValue();

      const request: OperatorDepartmentRoleAssignRequest = {
        operatorId: this.operator.id,
        operatorRoleId: formValues.roleId,
      };

      this.operatorsService
        .assignOperatorDepartmentRole(request)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to add department');
            this.isAddingDepartment = false;
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result) {
            this.alertService.success('Department added successfully');
            this.isAddingDepartment = false;
            this.departmentForm.reset();
            // Re-disable roleId after reset
            const roleIdControl = this.departmentForm.get('roleId');
            if (roleIdControl) {
              roleIdControl.disable();
            }
            this.loadOperatorDetails();
          }
        });
    }
  }

  removeDepartment(operatorDepartmentRoleId: string): void {
    this.operatorsService
      .removeOperatorDepartmentRole(operatorDepartmentRoleId)
      .subscribe({
        next: () => {
          this.alertService.success('Department removed successfully');
          this.loadOperatorDetails();
        },
        error: (error) => {
          this.alertService.error('Failed to remove department');
        },
      });
  }

  onBranchTypeChange(): void {
    const branchType = this.branchForm.get('branchType')?.value;
    this.branchForm.patchValue({ officeId: '', branchId: '' });
    this.availableOffices = [];
    this.availableBranches = [];
    
    // Disable office and branch ID while no branch type selected
    const officeIdControl = this.branchForm.get('officeId');
    const branchIdControl = this.branchForm.get('branchId');
    
    if (officeIdControl) {
      officeIdControl.disable();
    }
    if (branchIdControl) {
      branchIdControl.disable();
    }

    if (branchType !== '' && branchType !== null && branchType !== undefined) {
      this.loadTargetOffices();
      if (officeIdControl) {
        officeIdControl.enable();
      }
    }
  }

  onOfficeChange(): void {
    const officeId = this.branchForm.get('officeId')?.value;
    const branchType = this.branchForm.get('branchType')?.value;
    this.branchForm.patchValue({ branchId: '' });
    this.availableBranches = [];
    
    // Disable branchId while no office selected
    const branchIdControl = this.branchForm.get('branchId');
    if (branchIdControl) {
      branchIdControl.disable();
    }

    if (officeId && branchType !== '' && branchType !== null && branchType !== undefined) {
      this.loadBranchesForOfficeAndType(officeId, parseInt(branchType));
    }
  }

  private loadTargetOffices(): void {
    this.loadingOffices = true;
    this.operatorsService.getTargetOffices(0, 100).subscribe({
      next: (response) => {
        this.availableOffices = response.items || [];
        this.loadingOffices = false;
      },
      error: (error) => {
        this.availableOffices = [];
        this.loadingOffices = false;
        this.alertService.error('Failed to load offices');
      },
    });
  }


  private loadBranchesForOfficeAndType(officeId: string, branchType: number): void {
    this.loadingBranches = true;
    const branchIdControl = this.branchForm.get('branchId');
    
    // Keep branchId disabled while loading
    if (branchIdControl) {
      branchIdControl.disable();
    }

    this.operatorsService.getBranchesForAssignment(officeId, branchType, 0, 100).subscribe({
      next: (response) => {
        this.availableBranches = response.items || [];
        this.loadingBranches = false;
        
        // Enable branchId after branches are loaded
        if (branchIdControl && this.availableBranches.length > 0) {
          branchIdControl.enable();
        }
      },
      error: (error) => {
        this.availableBranches = [];
        this.loadingBranches = false;
        this.alertService.error('Failed to load branches');
        // Keep branchId disabled on error
      },
    });
  }

  loadAssignedClients(reset: boolean = false): void {
    if (!this.operator) return;
    if (reset) {
      this.clientsPageIndex = 0;
    }

    this.assignedClientsLoading = true;
    const request = {
      operatorId: this.operator.id,
      pageIndex: this.clientsPageIndex,
      pageSize: this.clientsPageSize,
      sortField: null,
      sortDirection: null,
      visibleColumns: [''],
      globalFilter: null,
      filters: null,
    } as any;

    this.operatorsService
      .getOperatorClients(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load assigned clients');
          this.assignedClientsLoading = false;
          return of(null);
        })
      )
      .subscribe((response: any) => {
        if (response) {
          this.assignedClients = response.clients || [];
          this.assignedClientsTotal = response.totalClients || 0;
        }
        this.assignedClientsLoading = false;
      });
  }

  addBranch(): void {
    if (this.branchForm.valid) {
      this.isAddingBranch = true;
      
      // Use getRawValue() to include disabled controls
      const formValues = this.branchForm.getRawValue();

      const request: UserOrganizationAssignRequest = {
        userId: this.operator.userId,
        level: parseInt(formValues.branchType),
        entityId: formValues.branchId,
      };

      this.operatorsService
        .assignUserOrganization(request)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to add branch');
            this.isAddingBranch = false;
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result) {
            this.alertService.success('Branch added successfully');
            this.isAddingBranch = false;
            this.branchForm.reset();
            // Re-disable officeId and branchId after reset
            const officeIdControl = this.branchForm.get('officeId');
            const branchIdControl = this.branchForm.get('branchId');
            if (officeIdControl) {
              officeIdControl.disable();
            }
            if (branchIdControl) {
              branchIdControl.disable();
            }
            this.availableOffices = [];
            this.availableBranches = [];
            this.loadOperatorDetails(); // Refresh data
          }
        });
    }
  }

  removeBranch(branchId: string): void {
    this.operatorsService.removeUserOrganization(branchId).subscribe({
      next: () => {
        this.alertService.success('Branch removed successfully');
        this.loadOperatorDetails();
      },
      error: (error) => {
        this.alertService.error('Failed to remove branch');
      },
    });
  }

  private updateProfileEditableControls(): void {
    const userTypeControl = this.profileForm.get('userType');
    if (!userTypeControl) return;
    if (this.isEditingProfile) {
      userTypeControl.enable({ emitEvent: false });
    } else {
      userTypeControl.disable({ emitEvent: false });
    }
  }
}

