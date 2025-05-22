import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PermissionSection,
  ActionType,
  Permission,
} from '../../models/permissions/permission.model';
import { PermissionTableService } from '../../services/permission-table/permission-table.service';
import { forkJoin, finalize } from 'rxjs';
import { ModalRef } from '../../models/modals/modal.model';

@Component({
  selector: 'app-permission-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-table.component.html',
  styleUrls: ['./permission-table.component.scss'],
})
export class PermissionTableComponent implements OnInit {
  @Input() userId!: string;
  @Input() modalRef?: ModalRef;

  private _service = inject(PermissionTableService);

  permissionSections: PermissionSection[] = [];

  roles: string[] = ['All', 'Admin', 'User', 'Manager'];
  activeRole: string = 'All';

  isDarkMode = false;
  loading = false;
  updatingPermissions = new Set<string>(); // Track which permissions are being updated

  actionTypes = [
    { value: ActionType.View, label: 'View' },
    { value: ActionType.Edit, label: 'Edit' },
    { value: ActionType.Create, label: 'Create' },
    { value: ActionType.Delete, label: 'Delete' },
  ];

  selectedPermissions: string[] = [];

  ngOnInit(): void {
    this.loadPermissions();
  }

  private loadPermissions(): void {
    this.loading = true;
    const role = this.activeRole === 'All' ? '' : this.activeRole;

    forkJoin({
      allPermissions: this._service.allPermissions(role),
      userPermissions: this._service.userPermissions(this.userId),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ allPermissions, userPermissions }) => {
          this.permissionSections = allPermissions;
          this.selectedPermissions = userPermissions;
        },
        error: (error) => {
          console.error('Error loading permissions:', error);
          // You might want to show a toast notification here
        },
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
    // Prevent multiple simultaneous requests for the same permission
    if (this.updatingPermissions.has(permissionId)) {
      return;
    }

    const isCurrentlySelected = this.isPermissionSelected(permissionId);
    this.updatingPermissions.add(permissionId);

    var json = {
      userId: this.userId,
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
        error: (error) => {
          console.error('Error updating permission:', error);
          // You might want to show a toast notification here
          // The checkbox will revert to its previous state automatically
          // since we don't update selectedPermissions on error
        },
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

  savePermissions(): void {
    if (this.modalRef) {
      this.modalRef.close({
        userId: this.userId,
        permissions: this.selectedPermissions,
      });
    }
  }
}
