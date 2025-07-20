import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PermissionTableService } from '../../shared/services/permission-table/permission-table.service';
import { DepartmentsService } from '../departments/services/departments.service';
import { OperatorsService } from '../operators/services/operators.service';
import {
  ActionType,
  Permission,
  PermissionSection,
} from '../../shared/models/permissions/permission.model';
import { Department, DepartmentDropdownItem } from '../departments/models/department.model';
import { OperatorRole } from '../operators/models/operators.model';

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

  // Data properties
  departments: DepartmentDropdownItem[] = [];
  roles: OperatorRole[] = [];
  permissionSections: PermissionSection[] = [];
  
  // Selection properties
  selectedDepartmentId: string = '';
  selectedRoleId: string = '';
  
  // UI state properties
  loading = false;
  loadingDepartments = false;
  loadingRoles = false;
  loadingPermissions = false;
  isDarkMode = false;
  updatingPermissions = new Set<string>();
  expandedSections = new Set<string>();
  
  // Dropdown state properties
  departmentDropdownOpen = false;
  departmentSearchTerm = '';
  selectedDepartment: any = null;
  
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
    this.loadDepartments();
    this.loadRoles();
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
    if (this.selectedDepartmentId && this.selectedRoleId) {
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
    
    // For now, we'll use mock data since we don't have a getAllPermissions method
    // In the future, this would load existing template permissions for the selected department/role
    this.permissionSections = [
      {
        section: 'Dashboard',
        permissions: [
          { id: '1', name: 'View Dashboard', description: 'Can view dashboard', actionType: ActionType.View, isGranted: false },
          { id: '2', name: 'Edit Dashboard', description: 'Can edit dashboard', actionType: ActionType.Edit, isGranted: false }
        ]
      },
      {
        section: 'Clients',
        permissions: [
          { id: '3', name: 'View Clients', description: 'Can view clients', actionType: ActionType.View, isGranted: false },
          { id: '4', name: 'Create Clients', description: 'Can create clients', actionType: ActionType.Create, isGranted: false },
          { id: '5', name: 'Edit Clients', description: 'Can edit clients', actionType: ActionType.Edit, isGranted: false },
          { id: '6', name: 'Delete Clients', description: 'Can delete clients', actionType: ActionType.Delete, isGranted: false }
        ]
      }
    ];
    this.loadingPermissions = false;
  }

  togglePermission(permissionId: string): void {
    if (this.updatingPermissions.has(permissionId)) {
      return;
    }

    const isCurrentlyGranted = this.isPermissionSelected(permissionId);
    this.updatingPermissions.add(permissionId);

    // For now, just update local state
    // In the future, this would save to the template
    for (const section of this.permissionSections) {
      const permission = section.permissions.find(p => p.id === permissionId);
      if (permission) {
        permission.isGranted = !isCurrentlyGranted;
        break;
      }
    }

    this.updatingPermissions.delete(permissionId);
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

    permissionsOfType.forEach(permission => {
      permission.isGranted = enable;
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
    this.roleDropdownOpen = false;
    this.departmentDropdownOpen = !this.departmentDropdownOpen;
    
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
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = !this.roleDropdownOpen;
    
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
    this.departmentDropdownOpen = false;
    this.roleDropdownOpen = false;
  }
} 