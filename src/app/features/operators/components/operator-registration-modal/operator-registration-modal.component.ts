// src/app/features/operators/components/operator-registration-modal/operator-registration-modal.component.ts

import {
  Component,
  inject,
  Input,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  OperatorCreateRequest,
  BranchType,
  UserType,
  OperatorRole,
  DepartmentSearchParams,
  DepartmentSearchResponse,
  BranchDropdownItem,
  BranchDropdownResponse,
} from '../../models/operators.model';
import { OperatorsService } from '../../services/operators.service';
import { Observable, map, switchMap, of } from 'rxjs';

interface RoleDropdownItem {
  id: string;
  value: string;
}

@Component({
  selector: 'app-operator-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './operator-registration-modal.component.html',
  styles: [],
})
export class OperatorRegistrationModalComponent implements OnInit {
  @Input() modalRef!: ModalRef;
  @ViewChild('userTypeDropdownRoot')
  userTypeDropdownRoot!: ElementRef<HTMLElement>;
  @ViewChild('departmentDropdownRoot')
  departmentDropdownRoot!: ElementRef<HTMLElement>;
  @ViewChild('roleDropdownRoot') roleDropdownRoot!: ElementRef<HTMLElement>;
  @ViewChild('branchDropdownRoot') branchDropdownRoot!: ElementRef<HTMLElement>;

  private fb = inject(FormBuilder);
  private operatorsService = inject(OperatorsService);
  private alertService = inject(AlertService);

  isSubmitting = false;
  showPassword = false;
  loadingBranches = false;
  registrationForm: FormGroup;
  availableRoles: RoleDropdownItem[] = [];
  availableBranches: BranchDropdownItem[] = [];

  departmentDropdownOpen = false;
  departmentLoading = false;
  departmentSearchTerm = '';
  availableDepartments: any[] = [];
  selectedDepartment: any = null;
  currentDepartmentPage = 0;
  departmentPageSize = 20;
  hasMoreDepartments = false;

  roleDropdownOpen = false;
  roleLoading = false;
  roleSearchTerm = '';
  selectedRole: RoleDropdownItem | null = null;

  branchDropdownOpen = false;
  branchLoading = false;
  branchSearchTerm = '';
  selectedBranch: BranchDropdownItem | null = null;
  currentBranchPage = 0;
  branchPageSize = 20;
  hasMoreBranches = false;

  userTypeDropdownOpen = false;
  userTypeSearchTerm = '';
  selectedUserType: { id: number; value: string; group: string } | null = null;

  // Keyboard navigation properties
  focusedUserTypeIndex = -1;
  focusedDepartmentIndex = -1;
  focusedRoleIndex = -1;
  focusedBranchIndex = -1;

  BranchType = BranchType;
  UserType = UserType;

  private usernameManuallyEdited = false;
  private generatedUsernameBase = '';

  userTypeOptions = [
    {
      group: 'Heads of Department',
      options: [
        {
          id: UserType.SalesHOD,
          value: 'Sales HOD',
          group: 'Heads of Department',
        },
        {
          id: UserType.RetentionHOD,
          value: 'Retention HOD',
          group: 'Heads of Department',
        },
        {
          id: UserType.SupportHOD,
          value: 'Support HOD',
          group: 'Heads of Department',
        },
        { id: UserType.PspHOD, value: 'PSP HOD', group: 'Heads of Department' },
      ],
    },
    {
      group: 'Agents',
      options: [
        { id: UserType.SalesAgent, value: 'Sales Agent', group: 'Agents' },
        {
          id: UserType.RetentionAgent,
          value: 'Retention Agent',
          group: 'Agents',
        },
        { id: UserType.SupportAgent, value: 'Support Agent', group: 'Agents' },
      ],
    },
    {
      group: 'Administrators',
      options: [
        {
          id: UserType.CompanyAdmin,
          value: 'Company Admin',
          group: 'Administrators',
        },
        {
          id: UserType.BrandAdmin,
          value: 'Brand Admin',
          group: 'Administrators',
        },
      ],
    },

    {
      group: 'Managers',
      options: [
        {
          id: UserType.SalesManager,
          value: 'Sales Manager',
          group: 'Managers',
        },
        {
          id: UserType.RetentionManager,
          value: 'Retention Manager',
          group: 'Managers',
        },
        {
          id: UserType.SupportManager,
          value: 'Support Manager',
          group: 'Managers',
        },
        { id: UserType.PSPManager, value: 'PSP Manager', group: 'Managers' },
        { id: UserType.BOManager, value: 'BO Manager', group: 'Managers' },
        {
          id: UserType.ComplianceManager,
          value: 'Compliance Manager',
          group: 'Managers',
        },
        {
          id: UserType.OperationsManager,
          value: 'Operations Manager',
          group: 'Managers',
        },
        {
          id: UserType.DealingManager,
          value: 'Dealing Manager',
          group: 'Managers',
        },
      ],
    },
    {
      group: 'Team Leads',
      options: [
        { id: UserType.SalesLead, value: 'Sales Lead', group: 'Team Leads' },
        {
          id: UserType.RetentionLead,
          value: 'Retention Lead',
          group: 'Team Leads',
        },
        {
          id: UserType.SupportLead,
          value: 'Support Lead',
          group: 'Team Leads',
        },
      ],
    },

    {
      group: 'Other',
      options: [
        {
          id: UserType.AffiliateManager,
          value: 'Affiliate Manager',
          group: 'Other',
        },
      ],
    },
  ];

  constructor() {
    this.registrationForm = this.fb.group({
      username: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      phoneNumber: [''],
      departmentId: ['', Validators.required],
      roleId: ['', Validators.required],
      branchType: ['', Validators.required],
      branchId: ['', Validators.required],
      userType: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.setupFormChangeListeners();
    this.loadDepartments();

    this.setupUsernameAutoGeneration();
  }

  private setupUsernameAutoGeneration(): void {
    // Listen to firstName changes
    this.registrationForm
      .get('firstName')
      ?.valueChanges.subscribe((firstName) => {
        if (!this.usernameManuallyEdited && firstName) {
          this.generateUsername();
        }
      });

    // Listen to lastName changes
    this.registrationForm
      .get('lastName')
      ?.valueChanges.subscribe((lastName) => {
        if (!this.usernameManuallyEdited && lastName) {
          this.generateUsername();
        }
      });

    // Listen to username manual changes
    this.registrationForm
      .get('username')
      ?.valueChanges.subscribe((username) => {
        // Check if the username was manually edited by the user
        if (
          username &&
          this.generatedUsernameBase &&
          username !== this.generatedUsernameBase
        ) {
          // User has manually edited the username
          this.usernameManuallyEdited = true;
        }
      });
  }

  private generateUsername(): void {
    const firstName = this.registrationForm.get('firstName')?.value || '';
    const lastName = this.registrationForm.get('lastName')?.value || '';

    if (!firstName && !lastName) {
      return;
    }

    // Generate username variations
    const username = this.createUsernameVariation(firstName, lastName);

    this.generatedUsernameBase = username;
    // Update the form without triggering valueChanges to avoid infinite loop
    this.registrationForm.patchValue({ username }, { emitEvent: false });
  }

  private createUsernameVariation(
    firstName: string,
    lastName: string,
    suffix: string = ''
  ): string {
    // Clean and normalize names
    firstName = this.normalizeString(firstName);
    lastName = this.normalizeString(lastName);

    if (!firstName && !lastName) {
      return '';
    }

    // Generate a random 3-4 digit number for uniqueness
    const randomNum =
      suffix || Math.floor(Math.random() * (9999 - 100 + 1) + 100).toString();

    // Different username patterns - pick one randomly
    let selectedPattern: string;

    if (firstName && lastName) {
      const patterns = [
        `${firstName}.${lastName}${randomNum}`, // john.doe123
        `${firstName.charAt(0)}.${lastName}${randomNum}`, // j.doe123
        `${firstName}_${lastName.charAt(0)}${randomNum}`, // john_d123
        `${firstName.charAt(0)}${lastName}${randomNum}`, // jdoe123
        `${firstName}${lastName.charAt(0)}${randomNum}`, // johnd123
      ];
      const patternIndex = Math.floor(Math.random() * patterns.length);
      selectedPattern = patterns[patternIndex];
    } else if (firstName) {
      selectedPattern = `${firstName}${randomNum}`;
    } else {
      selectedPattern = `${lastName}${randomNum}`;
    }

    return selectedPattern.toLowerCase();
  }

  private normalizeString(str: string): string {
    if (!str) return '';

    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters and spaces
      .trim();
  }
  public regenerateUsername(): void {
    this.usernameManuallyEdited = false;
    this.generateUsername();
  }

  public resetUsernameGeneration(): void {
    this.usernameManuallyEdited = false;
    this.generatedUsernameBase = '';
  }

  private setupFormChangeListeners(): void {
    this.registrationForm
      .get('departmentId')
      ?.valueChanges.subscribe((value) => {
        this.handleDepartmentChange(value);
      });

    this.registrationForm.get('branchType')?.valueChanges.subscribe((value) => {
      this.onBranchTypeChange({ target: { value } } as any);
    });
  }

  private handleDepartmentChange(departmentId: any): void {
    this.availableRoles = [];
    this.selectedRole = null;
    this.registrationForm.patchValue({ roleId: '' }, { emitEvent: false });

    if (departmentId) {
      this.loadRolesForDepartment(departmentId);
    }
  }

  onBranchTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const branchType = target.value;
    this.registrationForm.patchValue({ branchId: '' }, { emitEvent: false });
    this.selectedBranch = null;
    this.availableBranches = [];
    this.currentBranchPage = 0;
    this.branchSearchTerm = '';

    if (branchType !== '' && branchType !== null && branchType !== undefined) {
      this.loadBranchesForType(parseInt(branchType), true);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  generatePassword(): void {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one character from each type
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');

    this.registrationForm.patchValue({ password });
    this.showPassword = true; // Show the generated password
  }

  private loadRolesForDepartment(departmentId: string): void {
    this.roleLoading = true;
    this.operatorsService.getOperatorRolesByDepartment(departmentId).subscribe({
      next: (roles: any) => {
        this.availableRoles = roles.items || [];
        this.roleLoading = false;
      },
      error: (error) => {
        this.availableRoles = [];
        this.roleLoading = false;
      },
    });
  }

  private loadBranchesForType(
    branchType: BranchType,
    reset: boolean = false
  ): void {
    if (this.branchLoading) return;

    if (reset) {
      this.currentBranchPage = 0;
      this.availableBranches = [];
    }

    this.branchLoading = true;
    let observable: Observable<BranchDropdownResponse>;

    const params = {
      pageIndex: this.currentBranchPage,
      pageSize: this.branchPageSize,
      globalFilter: this.branchSearchTerm || null,
    };

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
        this.branchLoading = false;
        return;
    }

    observable.subscribe({
      next: (response) => {
        if (reset) {
          this.availableBranches = response.items || [];
        } else {
          this.availableBranches = [
            ...this.availableBranches,
            ...(response.items || []),
          ];
        }
        this.hasMoreBranches = response.hasNextPage;
        this.branchLoading = false;
      },
      error: (error) => {
        this.availableBranches = [];
        this.branchLoading = false;
        this.alertService.error('Failed to load branches');
      },
    });
  }

  getBranchDisplayText(branch: BranchDropdownItem): string {
    const branchType = parseInt(this.registrationForm.get('branchType')?.value);

    switch (branchType) {
      case BranchType.Brand:
        return `${branch.value}${
          branch.brandName ? ` - ${branch.brandName}` : ''
        }${branch.country ? ` (${branch.country})` : ''}`;
      case BranchType.Office:
        return `${branch.value}${
          branch.officeName ? ` - ${branch.officeName}` : ''
        }${branch.language ? ` - ${branch.language}` : ''}`;
      case BranchType.Desk:
        return `${branch.value}${
          branch.deskName ? ` - ${branch.deskName}` : ''
        }`;
      case BranchType.Team:
        return `${branch.value}${
          branch.deskName ? ` - ${branch.deskName}` : ''
        }`;
      default:
        return branch.value;
    }
  }

  onSubmit() {
    if (this.registrationForm.invalid) {
      Object.keys(this.registrationForm.controls).forEach((key) => {
        this.registrationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.registrationForm.value;

    const operatorData: OperatorCreateRequest = {
      username: formValue.username,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password,
      phoneNumber: formValue.phoneNumber || null,
      departmentId: formValue.departmentId,
      roleId: formValue.roleId,
      branchType: parseInt(formValue.branchType),
      branchId: formValue.branchId,
      userType: parseInt(formValue.userType),
    };

    this.operatorsService.createOperator(operatorData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.alertService.success('Operator created successfully!');
        this.modalRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error(
            'An operator with this email already exists.'
          );
        } else {
          this.alertService.error(
            'Failed to create operator. Please try again.'
          );
        }
      },
    });
  }

  onCancel() {
    this.modalRef.dismiss();
  }

  // Department dropdown methods
  toggleDepartmentDropdown(): void {
    // Close other dropdowns
    this.roleDropdownOpen = false;
    this.branchDropdownOpen = false;

    // Toggle department dropdown
    this.departmentDropdownOpen = !this.departmentDropdownOpen;

    if (this.departmentDropdownOpen) {
      if (this.availableDepartments.length === 0) {
        this.loadDepartments();
      } else {
        // Reset search when opening dropdown
        this.departmentSearchTerm = '';
      }
      this.focusedDepartmentIndex = 0; // Start with first item focused
    }
  }

  loadDepartments(reset: boolean = false): void {
    if (this.departmentLoading) return;

    if (reset) {
      this.currentDepartmentPage = 0;
      this.availableDepartments = [];
    }

    this.departmentLoading = true;

    // Create request body with search parameters
    const requestBody = {
      pageIndex: this.currentDepartmentPage,
      pageSize: this.departmentPageSize,
      globalFilter: this.departmentSearchTerm || null,
    };

    this.operatorsService.getDepartmentsDropdown(requestBody).subscribe({
      next: (response) => {
        const sortedDepartments = response.items.sort((a: any, b: any) => {
          if (a.value.toLowerCase() === 'sales') return -1;
          if (b.value.toLowerCase() === 'sales') return 1;
          return a.value.localeCompare(b.value);
        });

        if (reset) {
          this.availableDepartments = sortedDepartments;
        } else {
          this.availableDepartments = [
            ...this.availableDepartments,
            ...sortedDepartments,
          ];
        }
        this.hasMoreDepartments = response.hasNextPage;
        this.departmentLoading = false;
      },
      error: (error) => {
        this.departmentLoading = false;
        this.alertService.error('Failed to load departments');
      },
    });
  }

  onDepartmentSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.departmentSearchTerm = target.value;
    this.currentDepartmentPage = 0;
    this.loadDepartments(true);
  }

  onDepartmentDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreDepartments &&
      !this.departmentLoading
    ) {
      this.currentDepartmentPage++;
      this.loadDepartments();
    }
  }

  selectDepartment(department: any): void {
    this.selectedDepartment = department;
    this.registrationForm.patchValue({ departmentId: department.id });
    this.departmentDropdownOpen = false;
    this.departmentSearchTerm = '';
    this.handleDepartmentChange(department.id);
  }

  getSelectedDepartmentName(): string {
    if (this.selectedDepartment) {
      return this.selectedDepartment.value;
    }
    return 'Select a department...';
  }

  getFilteredDepartments(): any[] {
    return this.availableDepartments;
  }

  // Role dropdown methods
  toggleRoleDropdown(): void {
    // Close other dropdowns
    this.departmentDropdownOpen = false;
    this.branchDropdownOpen = false;

    // Toggle role dropdown
    this.roleDropdownOpen = !this.roleDropdownOpen;

    if (this.roleDropdownOpen) {
      // Reset search when opening dropdown
      this.roleSearchTerm = '';
      this.focusedRoleIndex = 0; // Start with first item focused
    }
  }

  onRoleSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.roleSearchTerm = target.value.toLowerCase();
  }

  getFilteredRoles(): RoleDropdownItem[] {
    if (!this.roleSearchTerm) {
      return this.availableRoles;
    }
    return this.availableRoles.filter((role) =>
      role.value.toLowerCase().includes(this.roleSearchTerm)
    );
  }

  selectRole(role: RoleDropdownItem): void {
    this.selectedRole = role;
    this.registrationForm.patchValue({ roleId: role.id });
    this.roleDropdownOpen = false;
    this.roleSearchTerm = '';
  }

  getSelectedRoleName(): string {
    if (this.selectedRole) {
      return this.selectedRole.value;
    }
    if (!this.selectedDepartment) {
      return 'Select a department first';
    }
    if (this.availableRoles.length === 0) {
      return 'No roles available for this department';
    }
    return 'Select a role...';
  }

  // Branch dropdown methods
  toggleBranchDropdown(): void {
    // Close other dropdowns
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = false;

    // Toggle branch dropdown
    this.branchDropdownOpen = !this.branchDropdownOpen;

    if (this.branchDropdownOpen) {
      const branchType = this.registrationForm.get('branchType')?.value;
      if (branchType) {
        if (this.availableBranches.length === 0) {
          this.loadBranchesForType(parseInt(branchType), true);
        } else {
          // Reset search when opening dropdown
          this.branchSearchTerm = '';
        }
      }
      this.focusedBranchIndex = 0; // Start with first item focused
    }
  }

  onBranchSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.branchSearchTerm = target.value;
    this.currentBranchPage = 0;

    // Reload branches with search term
    this.availableBranches = [];
    this.loadBranchesForType(
      parseInt(this.registrationForm.get('branchType')?.value),
      true
    );
  }

  onBranchDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreBranches &&
      !this.branchLoading
    ) {
      this.currentBranchPage++;
      this.loadBranchesForType(
        parseInt(this.registrationForm.get('branchType')?.value)
      );
    }
  }

  selectBranch(branch: BranchDropdownItem): void {
    this.selectedBranch = branch;
    this.registrationForm.patchValue({ branchId: branch.id });
    this.branchDropdownOpen = false;
    this.branchSearchTerm = '';
  }

  getSelectedBranchName(): string {
    if (this.selectedBranch) {
      return this.getBranchDisplayText(this.selectedBranch);
    }
    const branchType = this.registrationForm.get('branchType')?.value;
    if (!branchType) {
      return 'Select branch type first';
    }
    if (this.branchLoading) {
      return 'Loading branches...';
    }
    if (this.availableBranches.length === 0) {
      return 'No branches available for this type';
    }
    return 'Select a branch...';
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  private closeAllDropdowns(): void {
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = false;
    this.branchDropdownOpen = false;
    this.userTypeDropdownOpen = false;

    // Reset focus indices
    this.focusedDepartmentIndex = -1;
    this.focusedRoleIndex = -1;
    this.focusedBranchIndex = -1;
    this.focusedUserTypeIndex = -1;
  }

  private handleGlobalPointerEvent(event: Event): void {
    const target = event.target as HTMLElement;
    const containers: Array<HTMLElement | undefined> = [
      this.userTypeDropdownRoot?.nativeElement,
      this.departmentDropdownRoot?.nativeElement,
      this.roleDropdownRoot?.nativeElement,
      this.branchDropdownRoot?.nativeElement,
    ];

    const isInsideAnyDropdown = containers.some(
      (el) => el && el.contains(target)
    );

    if (!isInsideAnyDropdown) {
      this.closeAllDropdowns();
    }
  }

  // User Type dropdown methods
  toggleUserTypeDropdown(): void {
    // Close other dropdowns
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = false;
    this.branchDropdownOpen = false;

    // Toggle user type dropdown
    this.userTypeDropdownOpen = !this.userTypeDropdownOpen;

    if (this.userTypeDropdownOpen) {
      // Reset search when opening dropdown
      this.userTypeSearchTerm = '';
      this.focusedUserTypeIndex = 0; // Start with first item focused
    }
  }

  selectUserType(userType: { id: number; value: string; group: string }): void {
    this.selectedUserType = userType;
    this.registrationForm.patchValue({ userType: userType.id });
    this.userTypeDropdownOpen = false;
    this.userTypeSearchTerm = '';
  }

  getSelectedUserTypeName(): string {
    if (this.selectedUserType) {
      return this.selectedUserType.value;
    }
    return 'Select a user type...';
  }

  onUserTypeSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.userTypeSearchTerm = target.value.toLowerCase();
  }

  getFilteredUserTypeGroups(): any[] {
    if (!this.userTypeSearchTerm) {
      return this.userTypeOptions;
    }

    return this.userTypeOptions
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (option) =>
            option.value.toLowerCase().includes(this.userTypeSearchTerm) ||
            option.group.toLowerCase().includes(this.userTypeSearchTerm)
        ),
      }))
      .filter((group) => group.options.length > 0);
  }

  // Keyboard navigation methods for User Type dropdown
  isUserTypeFocused(index: number): boolean {
    return this.focusedUserTypeIndex === index;
  }

  setFocusedUserTypeIndex(index: number): void {
    this.focusedUserTypeIndex = index;
  }

  onUserTypeKeydown(event: KeyboardEvent, option: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectUserType(option);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextUserType();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousUserType();
        break;
      case 'Escape':
        this.userTypeDropdownOpen = false;
        break;
    }
  }

  private focusNextUserType(): void {
    const allOptions = this.getAllUserTypeOptions();
    if (this.focusedUserTypeIndex < allOptions.length - 1) {
      this.focusedUserTypeIndex++;
      this.scrollToFocusedUserType();
    }
  }

  private focusPreviousUserType(): void {
    if (this.focusedUserTypeIndex > 0) {
      this.focusedUserTypeIndex--;
      this.scrollToFocusedUserType();
    }
  }

  private scrollToFocusedUserType(): void {
    // This will be implemented if needed for better UX
    // For now, the browser's default focus behavior should handle scrolling
  }

  private getAllUserTypeOptions(): any[] {
    return this.getFilteredUserTypeGroups().flatMap((group) => group.options);
  }

  getUserTypeGlobalIndex(group: any, localIndex: number): number {
    const groups = this.getFilteredUserTypeGroups();
    let globalIndex = 0;

    for (const g of groups) {
      if (g === group) {
        return globalIndex + localIndex;
      }
      globalIndex += g.options.length;
    }

    return globalIndex;
  }

  getUserTypeOptionByGlobalIndex(globalIndex: number): any {
    const allOptions = this.getAllUserTypeOptions();
    return allOptions[globalIndex];
  }

  // Keyboard navigation methods for Department dropdown
  isDepartmentFocused(index: number): boolean {
    return this.focusedDepartmentIndex === index;
  }

  setFocusedDepartmentIndex(index: number): void {
    this.focusedDepartmentIndex = index;
  }

  onDepartmentKeydown(
    event: KeyboardEvent,
    department: any,
    index: number
  ): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDepartment(department);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextDepartment();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousDepartment();
        break;
      case 'Escape':
        this.departmentDropdownOpen = false;
        break;
    }
  }

  private focusNextDepartment(): void {
    const departments = this.getFilteredDepartments();
    if (this.focusedDepartmentIndex < departments.length - 1) {
      this.focusedDepartmentIndex++;
    }
  }

  private focusPreviousDepartment(): void {
    if (this.focusedDepartmentIndex > 0) {
      this.focusedDepartmentIndex--;
    }
  }

  // Keyboard navigation methods for Role dropdown
  isRoleFocused(index: number): boolean {
    return this.focusedRoleIndex === index;
  }

  setFocusedRoleIndex(index: number): void {
    this.focusedRoleIndex = index;
  }

  onRoleKeydown(event: KeyboardEvent, role: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectRole(role);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextRole();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousRole();
        break;
      case 'Escape':
        this.roleDropdownOpen = false;
        break;
    }
  }

  private focusNextRole(): void {
    const roles = this.getFilteredRoles();
    if (this.focusedRoleIndex < roles.length - 1) {
      this.focusedRoleIndex++;
    }
  }

  private focusPreviousRole(): void {
    if (this.focusedRoleIndex > 0) {
      this.focusedRoleIndex--;
    }
  }

  // Keyboard navigation methods for Branch dropdown
  isBranchFocused(index: number): boolean {
    return this.focusedBranchIndex === index;
  }

  setFocusedBranchIndex(index: number): void {
    this.focusedBranchIndex = index;
  }

  onBranchKeydown(event: KeyboardEvent, branch: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectBranch(branch);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextBranch();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousBranch();
        break;
      case 'Escape':
        this.branchDropdownOpen = false;
        break;
    }
  }

  private focusNextBranch(): void {
    if (this.focusedBranchIndex < this.availableBranches.length - 1) {
      this.focusedBranchIndex++;
    }
  }

  private focusPreviousBranch(): void {
    if (this.focusedBranchIndex > 0) {
      this.focusedBranchIndex--;
    }
  }

  // Button keydown handlers for opening dropdowns
  onUserTypeButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.userTypeDropdownOpen) {
          this.toggleUserTypeDropdown();
        }
        break;
    }
  }

  onDepartmentButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.departmentDropdownOpen) {
          this.toggleDepartmentDropdown();
        }
        break;
    }
  }

  onRoleButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.roleDropdownOpen) {
          this.toggleRoleDropdown();
        }
        break;
    }
  }

  onBranchButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.branchDropdownOpen) {
          this.toggleBranchDropdown();
        }
        break;
    }
  }
}
