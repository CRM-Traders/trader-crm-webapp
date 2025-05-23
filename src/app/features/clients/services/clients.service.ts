import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class AffiliatesService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'clients';
}
