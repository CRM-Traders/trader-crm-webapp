import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, of, tap } from 'rxjs';
import { OfferRequest, OfferResponse } from '../../../shared/models/offers/offer.model';
import { HttpService } from '../../../core/services/http.service';
import { AlertService } from '../../../core/services/alert.service';

@Injectable({ providedIn: 'root' })
export class OffersService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);
  private readonly apiPath = 'identity/api/offers';
  private readonly offersSubject = new BehaviorSubject<OfferResponse[]>([]);
  public readonly offers$ = this.offersSubject.asObservable();

  /** Load offers from API */
  loadFromApi(): void {
    this.http
      .get<OfferResponse[]>(`${this.apiPath}`)
      .pipe(
        tap((items) => {
          this.offersSubject.next(Array.isArray(items) ? items : []);
        }),
        catchError((err) => {
          this.alertService.error('Failed to load offers');
          this.offersSubject.next([]);
          return of([]);
        })
      )
      .subscribe();
  }

  getAll(): OfferResponse[] {
    return this.offersSubject.value;
  }

  getById(id: string) {
    return this.http.get<OfferResponse>(`${this.apiPath}/${id}`);
  }

  add(request: OfferRequest) {
    return this.http
      .post<OfferResponse>(`${this.apiPath}`, request)
      .pipe(
        tap((created) => {
          if (!created) return;
          this.offersSubject.next([created, ...this.offersSubject.value]);
        }),
        catchError((err) => {
          this.alertService.error('Failed to create offer');
          return of(null as unknown as OfferResponse);
        })
      );
  }

  update(id: string, request: OfferRequest) {
    return this.http
      .put<OfferResponse>(`${this.apiPath}/${id}`, request)
      .pipe(
        tap((serverUpdated) => {
          if (!serverUpdated) return;
          const curr = this.offersSubject.value;
          const idx = curr.findIndex((o) => o.id === id);
          if (idx !== -1) {
            const copy = [...curr];
            copy[idx] = { ...serverUpdated };
            this.offersSubject.next(copy);
          }
        }),
        catchError((err) => {
          this.alertService.error('Failed to update offer');
          return of(null as unknown as OfferResponse);
        })
      );
  }

  delete(id: string) {
    return this.http
      .delete<void>(`${this.apiPath}/${id}`)
      .pipe(
        tap(() => {
          const next = this.offersSubject.value.filter((o) => o.id !== id);
          this.offersSubject.next(next);
        }),
        catchError((err) => {
          this.alertService.error('Failed to delete offer');
          return of(void 0);
        })
      );
  }

}


