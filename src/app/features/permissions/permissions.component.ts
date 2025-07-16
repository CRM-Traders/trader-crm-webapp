import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionTableService } from '../../shared/services/permission-table/permission-table.service';
import {
  ActionType,
  Permission,
  PermissionSection,
} from '../../shared/models/permissions/permission.model';
import { forkJoin, finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-permissions',
  imports: [CommonModule, FormsModule],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.scss',
})
export class PermissionsComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private _service = inject(PermissionTableService);

  operatorId!: string;

  permissionSections: PermissionSection[] = [];

  roles: string[] = ['All', 'Admin', 'User', 'Manager'];
  activeRole: string = 'All';

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

  ngOnInit(): void {
    const operatorId = this.activatedRoute.snapshot.paramMap.get('id');

    if (!operatorId) {
      this.router.navigate(['/']);
      return;
    }

    this.operatorId = operatorId;
  }

  private loadPermissions(): void {
    this.loading = true;
    const role = this.activeRole === 'All' ? '' : this.activeRole;

    this._service.allPermissions(role).subscribe((result) => {
      this.permissionSections = result;
    });
  }

  fetchPermissions(role: string): void {
    if (role === 'All') {
      role = '';
    }

    this._service.allPermissions(role).subscribe((result) => {
      this.permissionSections = result;
    });
  }

  selectRole(role: string): void {
    this.activeRole = role;
    this.fetchPermissions(this.activeRole);
  }

  togglePermission(permissionId: string): void {
    if (this.updatingPermissions.has(permissionId)) {
      return;
    }

    const isCurrentlySelected = this.isPermissionSelected(permissionId);
    this.updatingPermissions.add(permissionId);

    var json = {
      userId: this.operatorId,
      permissionId: permissionId,
    };

    const apiCall = isCurrentlySelected
      ? this._service.removeUserPermission(json)
      : this._service.addUserPermission(json);

    apiCall
      .pipe(finalize(() => this.updatingPermissions.delete(permissionId)))
      .subscribe({
        next: () => {
          // Update local state based on the action performed
          if (isCurrentlySelected) {
            this.selectedPermissions = this.selectedPermissions.filter(
              (id) => id !== permissionId
            );
          } else {
            this.selectedPermissions = [
              ...this.selectedPermissions,
              permissionId,
            ];
          }
        },
        error: (error) => {},
      });
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions.includes(permissionId);
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
}
