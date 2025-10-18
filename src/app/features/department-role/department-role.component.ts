import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { HttpService } from '../../core/services/http.service';

// Models
interface DepartmentRole {
  officeDepartmentRoleId: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
}

interface Department {
  officeDepartmentId: string;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
  roles: DepartmentRole[];
}

interface DepartmentResponse {
  departments: Department[];
}

@Component({
  selector: 'app-department-role',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective],
  templateUrl: './department-role.component.html',
  styleUrl: './department-role.component.scss',
})
export class DepartmentRoleComponent implements OnInit {
  private http = inject(HttpService);

  departments: Department[] = [];
  loading = false;
  syncing = false;
  updatingDepartments = new Set<string>();
  updatingRoles = new Set<string>();
  expandedDepartments = new Set<string>();

  private apiUrl = 'identity/api/officedepartments';

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.loading = true;

    this.http
      .get<DepartmentResponse>(this.apiUrl)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.departments = response.departments;
          // Auto-expand departments that have active roles
          this.departments.forEach((dept) => {
            if (dept.roles.some((role) => role.isActive)) {
              this.expandedDepartments.add(dept.officeDepartmentId);
            }
          });
        },
        error: (error) => {
          console.error('Error loading departments:', error);
        },
      });
  }

  syncDepartments(): void {
    this.syncing = true;

    this.http
      .post(`${this.apiUrl}/sync-departments`, {})
      .pipe(finalize(() => (this.syncing = false)))
      .subscribe({
        next: () => {
          this.loadDepartments();
        },
        error: (error) => {
          console.error('Error syncing departments:', error);
        },
      });
  }

  toggleDepartment(department: Department): void {
    if (this.updatingDepartments.has(department.officeDepartmentId)) {
      return;
    }

    const newState = !department.isActive;
    this.updatingDepartments.add(department.officeDepartmentId);

    const payload = {
      departmentId: department.departmentId,
      isActive: newState,
    };

    this.http
      .put(`${this.apiUrl}/department/toggle`, payload)
      .pipe(
        finalize(() =>
          this.updatingDepartments.delete(department.officeDepartmentId)
        )
      )
      .subscribe({
        next: () => {
          department.isActive = newState;
          // If deactivating department, also deactivate all its roles
          if (!newState) {
            department.roles.forEach((role) => {
              role.isActive = false;
            });
          }
        },
        error: (error) => {
          console.error('Error toggling department:', error);
        },
      });
  }

  toggleRole(role: DepartmentRole, department: Department): void {
    if (this.updatingRoles.has(role.officeDepartmentRoleId)) {
      return;
    }

    const newState = !role.isActive;
    this.updatingRoles.add(role.officeDepartmentRoleId);

    const payload = {
      officeDepartmentRoleId: role.officeDepartmentRoleId,
      isActive: newState,
    };

    this.http
      .put(`${this.apiUrl}/role/toggle`, payload)
      .pipe(
        finalize(() => this.updatingRoles.delete(role.officeDepartmentRoleId))
      )
      .subscribe({
        next: () => {
          role.isActive = newState;
          // If activating a role, ensure the department is also active
          if (newState && !department.isActive) {
            department.isActive = true;
          }
        },
        error: (error) => {
          console.error('Error toggling role:', error);
        },
      });
  }

  toggleAllRolesInDepartment(department: Department): void {
    // Check if any roles are active
    const anyActive = department.roles.some((role) => role.isActive);
    const newState = !anyActive;

    // Filter roles that need to be toggled
    const rolesToToggle = department.roles.filter(
      (role) => role.isActive !== newState
    );

    if (rolesToToggle.length === 0) return;

    // Add all roles to updating set
    rolesToToggle.forEach((role) =>
      this.updatingRoles.add(role.officeDepartmentRoleId)
    );

    // Create array of API calls
    const apiCalls = rolesToToggle.map((role) => {
      const payload = {
        officeDepartmentRoleId: role.officeDepartmentRoleId,
        isActive: newState,
      };
      return this.http.put(`${this.apiUrl}/role/toggle`, payload);
    });

    // Execute all API calls
    forkJoin(apiCalls)
      .pipe(
        finalize(() => {
          rolesToToggle.forEach((role) =>
            this.updatingRoles.delete(role.officeDepartmentRoleId)
          );
        })
      )
      .subscribe({
        next: () => {
          // Update local state
          rolesToToggle.forEach((role) => {
            role.isActive = newState;
          });
          // If activating roles, ensure department is active
          if (newState && !department.isActive) {
            department.isActive = true;
          }
        },
        error: (error) => {
          console.error('Error toggling all roles:', error);
        },
      });
  }

  toggleDepartmentExpansion(departmentId: string): void {
    if (this.expandedDepartments.has(departmentId)) {
      this.expandedDepartments.delete(departmentId);
    } else {
      this.expandedDepartments.add(departmentId);
    }
  }

  isDepartmentExpanded(departmentId: string): boolean {
    return this.expandedDepartments.has(departmentId);
  }

  isDepartmentUpdating(departmentId: string): boolean {
    return this.updatingDepartments.has(departmentId);
  }

  isRoleUpdating(roleId: string): boolean {
    return this.updatingRoles.has(roleId);
  }

  isAnyRoleUpdatingInDepartment(department: Department): boolean {
    return department.roles.some((role) =>
      this.updatingRoles.has(role.officeDepartmentRoleId)
    );
  }

  getActiveDepartmentsCount(): number {
    return this.departments.filter((dept) => dept.isActive).length;
  }

  getActiveRolesCount(): number {
    return this.departments
      .flatMap((dept) => dept.roles)
      .filter((role) => role.isActive).length;
  }

  getDepartmentActiveRolesCount(department: Department): number {
    return department.roles.filter((role) => role.isActive).length;
  }

  areAnyRolesActiveInDepartment(department: Department): boolean {
    return department.roles.some((role) => role.isActive);
  }

  resetDepartments(): void {
    this.loadDepartments();
  }
}
