import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class WorkersService {
  private _http = inject(HttpService);
}
