import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../../core/services/http.service';
import { Settings } from '../models/settings.model';
import { ProfileUpdateRequest } from '../models/profile-update.model';

export interface PasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private _http = inject(HttpService);

  getUserSettings() {
    return this._http.get<Settings>('identity/api/users/settings');
  }

  updateProfile(profileData: ProfileUpdateRequest) {
    return this._http.post<void>('identity/api/users/update', profileData);
  }

  changePassword(passwordData: PasswordChangeRequest) {
    return this._http.post<void>('identity/api/auth/client/change-password', passwordData);
  }
}
