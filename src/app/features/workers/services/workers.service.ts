import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { WorkerRegistrationDto, ImportResult } from '../models/worker.model';

@Injectable({
  providedIn: 'root',
})
export class WorkersService {
  private httpService = inject(HttpService);

  registerWorker(worker: WorkerRegistrationDto): Observable<any> {
    return this.httpService.post('identity/api/users/register', worker);
  }

  downloadImportTemplate(): Observable<Blob> {
    const headers = new HttpHeaders({
      Accept:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return this.httpService['_http'].get<Blob>(
      `${this.httpService['_apiUrl']}/identity/api/users/import-template`,
      {
        responseType: 'blob' as 'json',
        headers,
      }
    );
  }

  importWorkers(file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpService.post<ImportResult>(
      'identity/api/users/import',
      formData
    );
  }
}
