import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { BrandDropdownResponse, SetBrandResponse } from '../models/brand.model';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpService } from '../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private http = inject(HttpService);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);

  getBrands(
    pageIndex: number = 0,
    pageSize: number = 50
  ): Observable<BrandDropdownResponse> {
    const body = {
      pageIndex,
      pageSize,
      sortField: null,
      sortDirection: null,
      visibleColumns: ['array', null],
      globalFilter: null,
      filters: null,
    };

    return this.http
      .post<BrandDropdownResponse>('identity/api/offices/dropdown', body)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to load offices. Please try again.');
          return throwError(() => new Error('Failed to load offices'));
        })
      );
  }

  getBrandsSwitch(
    pageIndex: number = 0,
    pageSize: number = 50
  ): Observable<BrandDropdownResponse> {
    const body = {
      pageIndex,
      pageSize,
      sortField: null,
      sortDirection: null,
      visibleColumns: ['array', null],
      globalFilter: null,
      filters: null,
    };

    return this.http
      .post<BrandDropdownResponse>('identity/api/offices/switch-office', body)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to load offices. Please try again.');
          return throwError(() => new Error('Failed to load offices'));
        })
      );
  }

  setBrandId(
    selectedOfficeId: string,
    officeName: string
  ): Observable<SetBrandResponse> {
    const body = { selectedOfficeId };

    return this.http
      .post<SetBrandResponse>('identity/api/offices/set-office-id', body)
      .pipe(
        tap((response) => {
          // Update stored tokens if provided in response
          if (response.accessToken && response.refreshToken) {
            this.updateAuthData(response);
          }

          // Store the office name
          this.setCurrentOfficeName(officeName);

          // Mark office as selected
          this.authService.markBrandAsSelected();

          this.alertService.success('Office selected successfully');
        }),
        catchError((error) => {
          this.alertService.error('Failed to set office. Please try again.');
          return throwError(() => new Error('Failed to set office'));
        })
      );
  }

  private updateAuthData(response: SetBrandResponse): void {
    // Update localStorage with new tokens if provided
    if (response.accessToken) {
      localStorage.setItem(
        'iFC03fkUWhcdYGciaclPyeqySdQE6qCd',
        response.accessToken
      );
    }
    if (response.refreshToken) {
      localStorage.setItem(
        'LXP6usaZ340gDciGr69MQpPwpEdvPj9M',
        response.refreshToken
      );
    }
    if (response.role) {
      localStorage.setItem('9JeQyQTsI03hbuMtl9tR1TjbOFGWf54p', response.role);
    }
    if (response.exp) {
      localStorage.setItem(
        'z6ipay7ciaSpZQbb6cDLueVAAs0WtRjs',
        response.exp.toString()
      );
    }
    if (response.name) {
      localStorage.setItem(
        'amskskwmwi7ciaSpZQbb6cDLueVAAs0WtRjs',
        response.name
      );
    }
  }

  // Office name management
  setCurrentOfficeName(name: string): void {
    localStorage.setItem('currentOfficeName', name);
  }

  getCurrentOfficeName(): string | null {
    return localStorage.getItem('currentOfficeName');
  }

  clearCurrentOfficeName(): void {
    localStorage.removeItem('currentOfficeName');
  }
}
