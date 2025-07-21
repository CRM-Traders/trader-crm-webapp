import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionTableService } from '../../shared/services/permission-table/permission-table.service';
import {
  ActionType,
  Permission,
  PermissionSection,
  OperatorPermissionsResponse,
} from '../../shared/models/permissions/permission.model';
import { forkJoin, finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-permissions',
  imports: [CommonModule, FormsModule, HasPermissionDirective],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.scss',
})
export class PermissionsComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private _service = inject(PermissionTableService);

  operatorId!: string;
  operatorInfo: {
    operatorId: string;
    operatorUserId: string;
    username: string;
    firstname: string;
    lastname: string;
  } | null = null;

  permissionSections: PermissionSection[] = [];

  isDarkMode = false;
  loading = false;
  updatingPermissions = new Set<string>();

  actionTypes = [
    { value: ActionType.View, label: 'Read' },
    { value: ActionType.Edit, label: 'Edit' },
    { value: ActionType.Create, label: 'Create' },
    { value: ActionType.Delete, label: 'Delete' },
  ];

  selectedPermissions: string[] = [];
  expandedSections = new Set<string>();

  ngOnInit(): void {
    const operatorId = this.activatedRoute.snapshot.paramMap.get('id');

    if (!operatorId) {
      this.router.navigate(['/']);
      return;
    }

    this.operatorId = operatorId;
    this.loadPermissions();
  }

  private loadPermissions(): void {
    this.loading = true;

    this._service
      .allPermissionsWithOperatorInfo(this.operatorId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.permissionSections = result.permissions;
          this.operatorInfo = {
            operatorId: result.operatorId,
            operatorUserId: result.operatorUserId,
            username: result.username,
            firstname: result.firstname,
            lastname: result.lastname,
          };
        },
        error: (error) => {
          console.error('Error loading permissions:', error);
        },
      });
  }

  togglePermission(permissionId: string): void {
    if (this.updatingPermissions.has(permissionId)) {
      return;
    }

    const isCurrentlyGranted = this.isPermissionSelected(permissionId);
    this.updatingPermissions.add(permissionId);

    var json = {
      userId: this.operatorId,
      permissionId: permissionId,
    };

    const apiCall = isCurrentlyGranted
      ? this._service.removeUserPermission(json)
      : this._service.addUserPermission(json);

    apiCall
      .pipe(finalize(() => this.updatingPermissions.delete(permissionId)))
      .subscribe({
        next: () => {
          // Update local state based on the action performed
          for (const section of this.permissionSections) {
            const permission = section.permissions.find(
              (p) => p.id === permissionId
            );
            if (permission) {
              permission.isGranted = !isCurrentlyGranted;
              break;
            }
          }
        },
        error: (error) => {
          console.error('Error toggling permission:', error);
        },
      });
  }

  isPermissionSelected(permissionId: string): boolean {
    // Find the permission in the sections and check its isGranted property
    for (const section of this.permissionSections) {
      const permission = section.permissions.find((p) => p.id === permissionId);
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

  getPermissionCountBySection(section: string): number {
    const sectionData = this.permissionSections.find(
      (s) => s.section === section
    );
    return sectionData ? sectionData.permissions.length : 0;
  }

  resetPermissions(): void {
    this.loadPermissions();
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
    const sectionData = this.permissionSections.find(
      (s) => s.section === section
    );
    return sectionData ? sectionData.permissions.length : 0;
  }

  getGrantedPermissionsCount(): number {
    return this.permissionSections
      .flatMap((section) => section.permissions)
      .filter((permission) => permission.isGranted).length;
  }

  areAnyPermissionsGrantedInSection(section: string): boolean {
    const sectionData = this.permissionSections.find(
      (s) => s.section === section
    );
    if (!sectionData) return false;
    return sectionData.permissions.some((p) => p.isGranted);
  }

  toggleAllPermissionsInSection(section: string): void {
    const sectionData = this.permissionSections.find(
      (s) => s.section === section
    );
    if (!sectionData) return;

    // If any permissions are granted, disable all. Otherwise, enable all.
    const anyGranted = this.areAnyPermissionsGrantedInSection(section);
    const enable = !anyGranted;

    const permissionsToToggle = sectionData.permissions.filter(
      (p) => p.isGranted !== enable
    );
    if (permissionsToToggle.length === 0) return;

    // Add all permissions to updating set
    permissionsToToggle.forEach((p) => this.updatingPermissions.add(p.id));

    // Create array of API calls
    const apiCalls = permissionsToToggle.map((permission) => {
      const json = {
        userId: this.operatorId,
        permissionId: permission.id,
      };
      return enable
        ? this._service.addUserPermission(json)
        : this._service.removeUserPermission(json);
    });

    // Execute all API calls
    forkJoin(apiCalls)
      .pipe(
        finalize(() => {
          // Remove all permissions from updating set
          permissionsToToggle.forEach((p) =>
            this.updatingPermissions.delete(p.id)
          );
        })
      )
      .subscribe({
        next: () => {
          // Update local state for all permissions
          permissionsToToggle.forEach((permission) => {
            permission.isGranted = enable;
          });
        },
        error: (error) => {
          console.error('Error toggling all permissions:', error);
        },
      });
  }

  getSectionGrantedCount(section: string): number {
    const sectionData = this.permissionSections.find(
      (s) => s.section === section
    );
    return sectionData
      ? sectionData.permissions.filter((p) => p.isGranted).length
      : 0;
  }

  isSectionUpdating(section: string): boolean {
    const sectionData = this.permissionSections.find(
      (s) => s.section === section
    );
    if (!sectionData) return false;
    return sectionData.permissions.some((p) =>
      this.updatingPermissions.has(p.id)
    );
  }

  areAllPermissionsGrantedByActionType(
    section: string,
    actionType: ActionType
  ): boolean {
    const sectionData = this.permissionSections.find(
      (s) => s.section === section
    );
    if (!sectionData) return false;

    const permissionsOfType = sectionData.permissions.filter(
      (p) => p.actionType === actionType
    );
    if (permissionsOfType.length === 0) return false;

    return permissionsOfType.every((p) => p.isGranted);
  }

  toggleAllPermissionsByActionType(
    section: string,
    actionType: ActionType
  ): void {
    const sectionData = this.permissionSections.find(
      (s) => s.section === section
    );
    if (!sectionData) return;

    const permissionsOfType = sectionData.permissions.filter(
      (p) => p.actionType === actionType
    );
    if (permissionsOfType.length === 0) return;

    const allGranted = this.areAllPermissionsGrantedByActionType(
      section,
      actionType
    );
    const enable = !allGranted; // Toggle to opposite state

    const permissionsToToggle = permissionsOfType.filter(
      (p) => p.isGranted !== enable
    );
    if (permissionsToToggle.length === 0) return;

    // Add all permissions to updating set
    permissionsToToggle.forEach((p) => this.updatingPermissions.add(p.id));

    // Create array of API calls
    const apiCalls = permissionsToToggle.map((permission) => {
      const json = {
        userId: this.operatorId,
        permissionId: permission.id,
      };
      return enable
        ? this._service.addUserPermission(json)
        : this._service.removeUserPermission(json);
    });

    // Execute all API calls
    forkJoin(apiCalls)
      .pipe(
        finalize(() => {
          // Remove all permissions from updating set
          permissionsToToggle.forEach((p) =>
            this.updatingPermissions.delete(p.id)
          );
        })
      )
      .subscribe({
        next: () => {
          // Update local state for all permissions
          permissionsToToggle.forEach((permission) => {
            permission.isGranted = enable;
          });
        },
        error: (error) => {
          console.error('Error toggling permissions by action type:', error);
        },
      });
  }

  areAnyPermissionsGrantedByActionType(actionType: ActionType): boolean {
    return this.permissionSections.some((section) =>
      section.permissions.some(
        (p) => p.actionType === actionType && p.isGranted
      )
    );
  }

  getOperatorFullName(): string {
    if (!this.operatorInfo) return '';
    return `${this.operatorInfo.firstname} ${this.operatorInfo.lastname}`;
  }
}
