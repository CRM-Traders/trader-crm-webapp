import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { PermissionSection } from '../../models/permissions/permission.model';

@Injectable({
  providedIn: 'root',
})
export class PermissionTableService {
  private _http = inject(HttpService);

  allPermissions(role: string | undefined) {
    return this._http.get<PermissionSection[]>(`permissions/all?role=${role}`);
  }

  userPermissions(userId: string) {
    return this._http.get<string[]>(`permissions/user/${userId}/ids`);
  }

  addUserPermission(data: any) {
    return this._http.post(`permissions/grant`, data);
  }

  removeUserPermission(data: any) {
    return this._http.post(`permissions/revoke`, data);
  }
}
