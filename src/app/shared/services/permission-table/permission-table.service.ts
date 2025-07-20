import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { PermissionSection, OperatorPermissionsResponse, DefaultPermissionSection } from '../../models/permissions/permission.model';
import { map } from 'rxjs';

export interface CreateDefaultPermissionsRequest {
  officeId: string | null;
  operatorRoleId: string;
  permissionIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class PermissionTableService {
  private _http = inject(HttpService);

  allPermissions(userId: string) {
    return this._http.get<OperatorPermissionsResponse>(
      `identity/api/permissions/all?userId=${userId}`
    ).pipe(
      map(response => response.permissions)
    );
  }

  allPermissionsWithOperatorInfo(userId: string) {
    return this._http.get<OperatorPermissionsResponse>(
      `identity/api/permissions/all?userId=${userId}`
    );
  }

  getDefaultPermissions(officeId: string, operatorRoleId: string) {
    return this._http.get<DefaultPermissionSection[]>(
      `identity/api/permissions/get-default-permissions?officeId=${officeId}&operatorRoleId=${operatorRoleId}`
    );
  }

  createDefaultPermissions(request: CreateDefaultPermissionsRequest) {
    return this._http.post(`identity/api/permissions/create-default-permissions`, request);
  }

  addUserPermission(data: any) {
    return this._http.post(`identity/api/permissions/grant`, data);
  }

  removeUserPermission(data: any) {
    return this._http.post(`identity/api/permissions/revoke`, data);
  }
}
