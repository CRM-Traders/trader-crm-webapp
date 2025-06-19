// src/app/features/clients/services/notes.service.ts

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ClientNote,
  NoteCreateRequest,
  NoteCreateResponse,
} from '../models/note.model';
import { HttpService } from '../../../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/clientcomments';

  getClientCommentsById(clientId: string): Observable<ClientNote[]> {
    return this.httpService.get<ClientNote[]>(`${this.apiPath}/client/${clientId}`);
  }

  createClientNote(request: NoteCreateRequest): Observable<NoteCreateResponse> {
    return this.httpService.post<NoteCreateResponse>(this.apiPath, request);
  }
}
