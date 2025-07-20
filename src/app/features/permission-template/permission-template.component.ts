import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PermissionTableService, CreateDefaultPermissionsRequest } from '../../shared/services/permission-table/permission-table.service';
import { DepartmentsService } from '../departments/services/departments.service';
import { OperatorsService } from '../operators/services/operators.service';
import { OfficesService } from '../officies/services/offices.service';
import { AlertService } from '../../core/services/alert.service';
import {
  ActionType,
  Permission,
  PermissionSection,
  DefaultPermissionSection,
} from '../../shared/models/permissions/permission.model';
import { Department, DepartmentDropdownItem } from '../departments/models/department.model';
import { OperatorRole } from '../operators/models/operators.model';
import { 
  OfficeDropdownItem, 
  OfficesListRequest 
} from '../officies/models/office.model';

@Component({
  selector: 'app-permission-template',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-template.component.html',
  styleUrl: './permission-template.component.scss',
})
export class PermissionTemplateComponent implements OnInit {
  private permissionService = inject(PermissionTableService);
  private departmentService = inject(DepartmentsService);
  private operatorsService = inject(OperatorsService);
  private officesService = inject(OfficesService);
  private alertService = inject(AlertService);

  // Data properties
  offices: OfficeDropdownItem[] = [];
  departments: DepartmentDropdownItem[] = [];
  roles: OperatorRole[] = [];
  permissionSections: PermissionSection[] = [];
  
  // Selection properties
  selectedOfficeId: string = '';
  selectedDepartmentId: string = '';
  selectedRoleId: string = '';
  
  // UI state properties
  loading = false;
  loadingOffices = false;
  loadingDepartments = false;
  loadingRoles = false;
  loadingPermissions = false;
  isDarkMode = false;
  updatingPermissions = new Set<string>();
  expandedSections = new Set<string>();
  
  // Office dropdown state properties
  officeDropdownOpen = false;
  officeSearchTerm = '';
  selectedOffice: OfficeDropdownItem | null = null;
  currentOfficePage = 0;
  officePageSize = 20;
  hasMoreOffices = false;
  focusedOfficeIndex = -1;
  
  // Department dropdown state properties
  departmentDropdownOpen = false;
  departmentSearchTerm = '';
  selectedDepartment: any = null;
  
  // Role dropdown state properties
  roleDropdownOpen = false;
  roleSearchTerm = '';
  selectedRole: any = null;
  
  // Permission management
  selectedPermissions: string[] = [];
  
  actionTypes = [
    { value: ActionType.View, label: 'Read' },
    { value: ActionType.Edit, label: 'Edit' },
    { value: ActionType.Create, label: 'Create' },
    { value: ActionType.Delete, label: 'Delete' },
  ];

  ngOnInit(): void {
    this.loadOffices();
  }

  // Office dropdown methods
  loadOffices(reset: boolean = false): void {
    if (this.loadingOffices) return;

    if (reset) {
      this.currentOfficePage = 0;
      this.offices = [];
    }

    this.loadingOffices = true;

    const request: OfficesListRequest = {
      pageIndex: this.currentOfficePage,
      pageSize: this.officePageSize,
      globalFilter: this.officeSearchTerm || null,
    };

    this.officesService.getOfficeDropdown(request).subscribe({
      next: (response) => {
        if (reset) {
          this.offices = response.items;
        } else {
          this.offices = [...this.offices, ...response.items];
        }
        this.hasMoreOffices = response.hasNextPage;
        this.loadingOffices = false;
      },
      error: (error) => {
        this.loadingOffices = false;
        console.error('Error loading offices:', error);
        this.offices = [];
      },
    });
  }

  toggleOfficeDropdown(): void {
    if (this.officeDropdownOpen) {
      this.officeDropdownOpen = false;
      return;
    }
    // Close other dropdowns and open office dropdown
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = false;
    this.officeDropdownOpen = true;
    this.focusedOfficeIndex = 0;
    if (this.offices.length === 0) {
      this.loadOffices();
    }
  }

  onOfficeSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.officeSearchTerm = target.value;
    this.currentOfficePage = 0;
    this.loadOffices(true);
  }

  onOfficeDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreOffices &&
      !this.loadingOffices
    ) {
      this.currentOfficePage++;
      this.loadOffices();
    }
  }

  selectOffice(office: OfficeDropdownItem): void {
    this.selectedOffice = office;
    this.selectedOfficeId = office.id;
    this.officeDropdownOpen = false;
    this.onOfficeChange();
  }

  getSelectedOfficeName(): string {
    if (this.selectedOffice) {
      return this.selectedOffice.value;
    }
    return 'Select Office';
  }

  isOfficeFocused(index: number): boolean {
    return this.focusedOfficeIndex === index;
  }

  setFocusedOfficeIndex(index: number): void {
    this.focusedOfficeIndex = index;
  }

  onOfficeKeydown(event: KeyboardEvent, office: OfficeDropdownItem, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectOffice(office);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextOffice();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousOffice();
        break;
      case 'Escape':
        this.officeDropdownOpen = false;
        break;
    }
  }

  private focusNextOffice(): void {
    if (this.focusedOfficeIndex < this.offices.length - 1) {
      this.focusedOfficeIndex++;
    }
  }

  private focusPreviousOffice(): void {
    if (this.focusedOfficeIndex > 0) {
      this.focusedOfficeIndex--;
    }
  }

  onOfficeButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.officeDropdownOpen) {
          this.toggleOfficeDropdown();
        }
        break;
    }
  }

  onOfficeChange(): void {
    // Clear department and role selection when office changes
    this.selectedDepartmentId = '';
    this.selectedRoleId = '';
    this.selectedDepartment = null;
    this.selectedRole = null;
    this.departments = [];
    this.roles = [];
    
    // Load departments for the selected office
    if (this.selectedOfficeId) {
      this.loadDepartments();
    }
  }

  private loadDepartments(): void {
    this.loadingDepartments = true;
    // Use the departments dropdown API to get all departments
    const requestBody = {
      pageIndex: 0,
      pageSize: 100,
      globalFilter: null,
      filters: null
    };
    
    this.departmentService.getDepartmentDropdown(requestBody).subscribe({
      next: (response) => {
        this.departments = response.items || [];
        this.loadingDepartments = false;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.departments = [];
        this.loadingDepartments = false;
      }
    });
  }

  private loadRoles(): void {
    // Roles will be loaded when a department is selected
    this.roles = [];
    this.loadingRoles = false;
  }

  onDepartmentChange(): void {
    // Clear role selection when department changes
    this.selectedRoleId = '';
    this.roles = [];
    
    // Load roles for the selected department
    if (this.selectedDepartmentId) {
      this.loadRolesForDepartment(this.selectedDepartmentId);
    }
  }

  onRoleChange(): void {
    if (this.selectedOfficeId && this.selectedDepartmentId && this.selectedRoleId) {
      this.loadPermissions();
    }
  }

  private loadRolesForDepartment(departmentId: string): void {
    this.loadingRoles = true;
    this.operatorsService.getOperatorRolesByDepartment(departmentId).subscribe({
      next: (roles: any) => {
        this.roles = roles.items || roles || [];
        this.loadingRoles = false;
      },
      error: (error) => {
        console.error('Error loading roles for department:', error);
        this.roles = [];
        this.loadingRoles = false;
      }
    });
  }

  private loadPermissions(): void {
    this.loadingPermissions = true;
    
    // Use the new API endpoint to get default permissions for the selected office/department/role
    this.permissionService.getDefaultPermissions(this.selectedOfficeId, this.selectedRoleId).subscribe({
      next: (response: DefaultPermissionSection[]) => {
        // Convert DefaultPermissionSection to PermissionSection
        this.permissionSections = response.map(section => ({
          section: section.section,
          permissions: section.permissions.map(permission => ({
            id: permission.id,
            name: permission.name,
            description: permission.description,
            actionType: permission.actionType,
            isGranted: permission.isDefault // Map isDefault to isGranted
          }))
        }));
        this.loadingPermissions = false;
      },
      error: (error) => {
        console.error('Error loading default permissions:', error);
        this.permissionSections = [];
        this.loadingPermissions = false;
        this.alertService.error('Failed to load default permissions');
      }
    });
  }

  togglePermission(permissionId: string): void {
    if (this.updatingPermissions.has(permissionId)) {
      return;
    }

    const isCurrentlyGranted = this.isPermissionSelected(permissionId);
    this.updatingPermissions.add(permissionId);

    // Update local state immediately for better UX
    for (const section of this.permissionSections) {
      const permission = section.permissions.find(p => p.id === permissionId);
      if (permission) {
        permission.isGranted = !isCurrentlyGranted;
        break;
      }
    }

    // Get all granted permission IDs
    const grantedPermissionIds = this.getAllGrantedPermissionIds();

    // Create the request payload
    const request: CreateDefaultPermissionsRequest = {
      officeId: this.selectedOfficeId || null,
      operatorRoleId: this.selectedRoleId,
      permissionIds: grantedPermissionIds
    };

    // Save to backend
    this.permissionService.createDefaultPermissions(request).subscribe({
      next: () => {
        this.updatingPermissions.delete(permissionId);
        this.alertService.success('Permission updated successfully');
      },
      error: (error) => {
        console.error('Error updating permission:', error);
        // Revert the local change on error
        for (const section of this.permissionSections) {
          const permission = section.permissions.find(p => p.id === permissionId);
          if (permission) {
            permission.isGranted = isCurrentlyGranted;
            break;
          }
        }
        this.updatingPermissions.delete(permissionId);
        this.alertService.error('Failed to update permission');
      }
    });
  }

  private getAllGrantedPermissionIds(): string[] {
    const grantedIds: string[] = [];
    for (const section of this.permissionSections) {
      for (const permission of section.permissions) {
        if (permission.isGranted) {
          grantedIds.push(permission.id);
        }
      }
    }
    return grantedIds;
  }

  isPermissionSelected(permissionId: string): boolean {
    for (const section of this.permissionSections) {
      const permission = section.permissions.find(p => p.id === permissionId);
      if (permission) {
        return permission.isGranted;
      }
    }
    return false;
  }

  isPermissionUpdating(permissionId: string): boolean {
    return this.updatingPermissions.has(permissionId);
  }

  getPermissionsBySection(
    section: string,
    actionType: ActionType
  ): Permission[] {
    const sectionData = this.permissionSections.find(
      (s) => s.section === section
    );
    if (!sectionData) return [];

    return sectionData.permissions.filter((p) => p.actionType === actionType);
  }

  getSections(): string[] {
    return this.permissionSections.map((section) => section.section);
  }

  toggleSection(section: string): void {
    if (this.expandedSections.has(section)) {
      this.expandedSections.delete(section);
    } else {
      this.expandedSections.add(section);
    }
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections.has(section);
  }

  getTotalPermissionsInSection(section: string): number {
    const sectionData = this.permissionSections.find(s => s.section === section);
    return sectionData ? sectionData.permissions.length : 0;
  }

  areAllPermissionsGrantedByActionType(section: string, actionType: ActionType): boolean {
    const sectionData = this.permissionSections.find(s => s.section === section);
    if (!sectionData) return false;
    
    const permissionsOfType = sectionData.permissions.filter(p => p.actionType === actionType);
    if (permissionsOfType.length === 0) return false;
    
    return permissionsOfType.every(p => p.isGranted);
  }

  toggleAllPermissionsByActionType(section: string, actionType: ActionType): void {
    const sectionData = this.permissionSections.find(s => s.section === section);
    if (!sectionData) return;

    const permissionsOfType = sectionData.permissions.filter(p => p.actionType === actionType);
    if (permissionsOfType.length === 0) return;

    const allGranted = this.areAllPermissionsGrantedByActionType(section, actionType);
    const enable = !allGranted;

    // Update local state immediately
    permissionsOfType.forEach(permission => {
      permission.isGranted = enable;
    });

    // Get all granted permission IDs
    const grantedPermissionIds = this.getAllGrantedPermissionIds();

    // Create the request payload
    const request: CreateDefaultPermissionsRequest = {
      officeId: this.selectedOfficeId || null,
      operatorRoleId: this.selectedRoleId,
      permissionIds: grantedPermissionIds
    };

    // Save to backend
    this.permissionService.createDefaultPermissions(request).subscribe({
      next: () => {
        this.alertService.success('Permissions updated successfully');
      },
      error: (error) => {
        console.error('Error updating permissions:', error);
        // Revert the local changes on error
        permissionsOfType.forEach(permission => {
          permission.isGranted = !enable;
        });
        this.alertService.error('Failed to update permissions');
      }
    });
  }

  areAnyPermissionsGrantedByActionType(actionType: ActionType): boolean {
    return this.permissionSections.some(section => 
      section.permissions.some(p => p.actionType === actionType && p.isGranted)
    );
  }

  isSectionUpdating(section: string): boolean {
    const sectionData = this.permissionSections.find(s => s.section === section);
    if (!sectionData) return false;
    return sectionData.permissions.some(p => this.updatingPermissions.has(p.id));
  }

  getSelectedDepartmentName(): string {
    const department = this.departments.find(d => d.id === this.selectedDepartmentId);
    return department?.value || 'Select Department';
  }

  getSelectedRoleName(): string {
    if (this.selectedRole) {
      return this.selectedRole.value;
    }
    if (!this.selectedOfficeId) {
      return 'Select Office First';
    }
    if (!this.selectedDepartmentId) {
      return 'Select Department First';
    }
    if (this.roles.length === 0) {
      return 'No roles available for this department';
    }
    return 'Select Role';
  }

  // Department dropdown methods
  toggleDepartmentDropdown(): void {
    if (this.departmentDropdownOpen) {
      this.departmentDropdownOpen = false;
      return;
    }
    // Close other dropdowns and open department dropdown
    this.officeDropdownOpen = false;
    this.roleDropdownOpen = false;
    this.departmentDropdownOpen = true;
    
    if (this.departmentDropdownOpen) {
      this.departmentSearchTerm = '';
    }
  }

  onDepartmentSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.departmentSearchTerm = target.value.toLowerCase();
  }

  getFilteredDepartments(): any[] {
    if (!this.departmentSearchTerm) {
      return this.departments;
    }
    return this.departments.filter((dept) =>
      dept.value.toLowerCase().includes(this.departmentSearchTerm)
    );
  }

  selectDepartment(department: any): void {
    this.selectedDepartment = department;
    this.selectedDepartmentId = department.id;
    this.departmentDropdownOpen = false;
    this.departmentSearchTerm = '';
    this.onDepartmentChange();
  }

  // Role dropdown methods
  toggleRoleDropdown(): void {
    if (this.roleDropdownOpen) {
      this.roleDropdownOpen = false;
      return;
    }
    // Close other dropdowns and open role dropdown
    this.officeDropdownOpen = false;
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = true;
    
    if (this.roleDropdownOpen) {
      this.roleSearchTerm = '';
    }
  }

  onRoleSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.roleSearchTerm = target.value.toLowerCase();
  }

  getFilteredRoles(): any[] {
    if (!this.roleSearchTerm) {
      return this.roles;
    }
    return this.roles.filter((role) =>
      role.value.toLowerCase().includes(this.roleSearchTerm)
    );
  }

  selectRole(role: any): void {
    this.selectedRole = role;
    this.selectedRoleId = role.id;
    this.roleDropdownOpen = false;
    this.roleSearchTerm = '';
    this.onRoleChange();
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!(event.target as Element).closest('.relative')) {
      this.closeAllDropdowns();
    }
  }

  private closeAllDropdowns(): void {
    this.officeDropdownOpen = false;
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = false;
    
    // Reset focus indices
    this.focusedOfficeIndex = -1;
  }
} 