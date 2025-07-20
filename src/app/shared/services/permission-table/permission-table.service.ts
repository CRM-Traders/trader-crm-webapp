import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { PermissionSection, OperatorPermissionsResponse } from '../../models/permissions/permission.model';
import { map } from 'rxjs';

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

  addUserPermission(data: any) {
    return this._http.post(`identity/api/permissions/grant`, data);
  }

  removeUserPermission(data: any) {
    return this._http.post(`identity/api/permissions/revoke`, data);
  }
}
