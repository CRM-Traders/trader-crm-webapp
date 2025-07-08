import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable } from 'rxjs';
import { 
  ClientComment, 
  ClientCommentCreateRequest, 
  ClientCommentUpdateRequest,
  ClientCommentsResponse 
} from '../models/client-comment.model';

@Injectable({
  providedIn: 'root',
})
export class ClientCommentsService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/clientcomments';

  getClientComments(clientId: string): Observable<ClientComment[]> {
    return this.httpService.get<ClientComment[]>(
      `${this.apiPath}/client/${clientId}`
    );
  }

  createClientComment(
    body: ClientCommentCreateRequest
  ): Observable<ClientComment> {
    return this.httpService.post<ClientComment>(
      this.apiPath,
      body
    );
  }

  deleteClientComment(commentId: string): Observable<void> {
    return this.httpService.delete<void>(
      `${this.apiPath}/${commentId}`
    );
  }

  updateClientComment(
    commentId: string,
    body: ClientCommentUpdateRequest
  ): Observable<ClientComment> {
    return this.httpService.put<ClientComment>(
      `${this.apiPath}/${commentId}`,
      body
    );
  }
} 