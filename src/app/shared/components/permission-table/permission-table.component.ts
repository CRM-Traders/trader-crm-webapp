import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PermissionSection,
  ActionType,
  Permission,
} from '../../models/permissions/permission.model';
import { PermissionTableService } from '../../services/permission-table/permission-table.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-permission-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-table.component.html',
  styleUrls: ['./permission-table.component.scss'],
})
export class PermissionTableComponent implements OnInit {
  @Input() userId!: string;

  private _service = inject(PermissionTableService);

  permissionSections: PermissionSection[] = [];

  roles: string[] = ['All', 'Admin', 'User', 'Manager'];
  activeRole: string = 'All';

  isDarkMode = false;
  loading = false;

  actionTypes = [
    { value: ActionType.View, label: 'View' },
    { value: ActionType.Edit, label: 'Edit' },
    { value: ActionType.Create, label: 'Create' },
    { value: ActionType.Delete, label: 'Delete' },
  ];

  selectedPermissions: string[] = [];

  ngOnInit(): void {
    const role = this.activeRole === 'All' ? '' : this.activeRole;

    forkJoin({
      allPermissions: this._service.allPermissions(role),
      userPermissions: this._service.userPermissions(this.userId),
    }).subscribe({
      next: ({ allPermissions, userPermissions }) => {
        this.permissionSections = allPermissions;
        this.selectedPermissions = userPermissions;

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.loading = false;
      },
    });
  }

  fetchPermissions(role: string) {
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
    // this.selectedPermissions[this.activeRole][permissionId] =
    //   !this.selectedPermissions[this.activeRole][permissionId];
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions.includes(permissionId);
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
}
