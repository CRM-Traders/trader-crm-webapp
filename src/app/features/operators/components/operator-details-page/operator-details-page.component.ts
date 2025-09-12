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

  activeSection: OperatorDetailSection = OperatorDetailSection.Profile;
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
  availableBranches: any[] = [];

  // Constants
  BranchType = BranchType;
  BranchTypeLabels = BranchTypeLabels;
  BranchTypeColors = BranchTypeColors;
  UserType = UserType;
  UserTypeLabels = UserTypeLabels;
  UserTypeColors = UserTypeColors;

  navigationSections = [
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
      userType: ['', Validators.required],
    });

    this.departmentForm = this.fb.group({
      departmentId: ['', Validators.required],
      roleId: ['', Validators.required],
    });

    this.branchForm = this.fb.group({
      branchType: ['', Validators.required],
      branchId: ['', Validators.required],
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
    this.loadDepartments();
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
    }
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

      const personalInfoRequest: OperatorPersonalInfoUpdateRequest = {
        id: this.operator.id,
        firstname: this.profileForm.value.firstName,
        lastname: this.profileForm.value.lastName,
        email: this.profileForm.value.email,
        phoneNumber: this.profileForm.value.phoneNumber || null,
        userType: this.profileForm.value.userType,
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

    if (departmentId.value) {
      this.operatorsService
        .getOperatorRolesByDepartment(departmentId.value)
        .subscribe({
          next: (roles: any) => {
            this.availableRoles = roles.items;
          },
          error: (error) => {
            this.availableRoles = [];
          },
        });
    }
  }

  addDepartment(): void {
    if (this.departmentForm.valid) {
      this.isAddingDepartment = true;

      const request: OperatorDepartmentRoleAssignRequest = {
        operatorId: this.operator.id,
        operatorRoleId: this.departmentForm.value.roleId,
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
            this.loadOperatorDetails();
          }
        });
    }
  }

  removeDepartment(operatorDepartmentRoleId: string): void {
    this.operatorsService.removeOperatorDepartmentRole(operatorDepartmentRoleId).subscribe({
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
    this.branchForm.patchValue({ branchId: '' });
    this.availableBranches = [];

    if (branchType !== '' && branchType !== null && branchType !== undefined) {
      this.loadBranchesForType(parseInt(branchType));
    }
  }

  private loadBranchesForType(branchType: BranchType): void {
    this.loadingBranches = true;
    let observable;

    switch (branchType) {
      case BranchType.Office:
        observable = this.operatorsService.getOfficesDropdown();
        break;
      case BranchType.Desk:
        observable = this.operatorsService.getDesksDropdown();
        break;
      case BranchType.Team:
        observable = this.operatorsService.getTeamsDropdown();
        break;
      case BranchType.Brand:
        observable = this.operatorsService.getBrandsDropdown();
        break;
      default:
        this.loadingBranches = false;
        return;
    }

    observable.subscribe({
      next: (response) => {
        this.availableBranches = response.items || [];
        this.loadingBranches = false;
      },
      error: (error) => {
        this.availableBranches = [];
        this.loadingBranches = false;
        this.alertService.error('Failed to load branches');
      },
    });
  }

  addBranch(): void {
    if (this.branchForm.valid) {
      this.isAddingBranch = true;

      const request: UserOrganizationAssignRequest = {
        userId: this.operator.userId,
        level: parseInt(this.branchForm.value.branchType),
        entityId: this.branchForm.value.branchId,
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
            this.loadOperatorDetails(); // Refresh data
          }
        });
    }
  }

  removeBranch(branchId: string): void {
    this.operatorsService.removeUserOrganization(branchId).subscribe();
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
