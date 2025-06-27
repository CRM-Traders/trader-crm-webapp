// src/app/features/teams/services/teams.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Team,
  TeamCreateRequest,
  TeamUpdateRequest,
  TeamCreateResponse,
  TeamImportResponse,
  TeamStats,
  TeamStatsMetaData,
  TeamDropdownResponse,
  TeamsListRequest,
  DeskDropdownResponse,
} from '../models/team.model';

@Injectable({
  providedIn: 'root',
})
export class TeamsService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/teams';

  getTeamById(id: string): Observable<Team> {
    return this.httpService.get<Team>(`${this.apiPath}/${id}`);
  }

  createTeam(request: TeamCreateRequest): Observable<TeamCreateResponse> {
    return this.httpService.post<TeamCreateResponse>(this.apiPath, request);
  }

  updateTeam(request: TeamUpdateRequest): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/${request.id}`, request);
  }

  deleteTeam(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  getTeamStats(): Observable<TeamStatsMetaData> {
    return this.httpService.get<TeamStatsMetaData>(
      `${this.apiPath}/teams-stat`
    );
  }

  getTeamDropdown(request: TeamsListRequest): Observable<TeamDropdownResponse> {
    return this.httpService.post<TeamDropdownResponse>(
      `${this.apiPath}/dropdown`,
      request
    );
  }

  // Method to get desks dropdown for team creation/editing
  getDesksDropdown(request: any): Observable<DeskDropdownResponse> {
    return this.httpService.post<DeskDropdownResponse>(
      'identity/api/desks/dropdown',
      request
    );
  }

  importTeams(file: File): Observable<TeamImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpService.post<TeamImportResponse>(
      `${this.apiPath}/import`,
      formData
    );
  }

  downloadImportTemplate(): Observable<Blob> {
    const headers = new HttpHeaders({
      Accept:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return this.httpService['_http'].get<Blob>(
      `${this.httpService['_apiUrl']}/${this.apiPath}/import-template`,
      {
        responseType: 'blob' as 'json',
        headers,
      }
    );
  }

  exportTeams(request: any): Observable<Blob> {
    const headers = new HttpHeaders({
      Accept: 'text/csv',
    });

    return this.httpService['_http'].post<Blob>(
      `${this.httpService['_apiUrl']}/${this.apiPath}/export`,
      request,
      {
        responseType: 'blob' as 'json',
        headers,
      }
    );
  }
}
