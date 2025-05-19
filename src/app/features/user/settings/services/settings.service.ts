import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../../core/services/http.service';
import { Settings } from '../models/settings.model';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private _http = inject(HttpService);

  getUserSettings() {
    return this._http.get<Settings>('users/settings');
  }
}
