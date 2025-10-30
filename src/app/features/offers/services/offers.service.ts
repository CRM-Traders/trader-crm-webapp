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
  private readonly offersSubject = new BehaviorSubject<OfferResponse[]>(this.generateSeedData());
  public readonly offers$ = this.offersSubject.asObservable();

  /** Try load from API, fallback to existing in-memory data on error */
  loadFromApi(): void {
    this.http
      .get<OfferResponse[]>(`${this.apiPath}`)
      .pipe(
        tap((items) => {
          if (Array.isArray(items) && items.length) {
            this.offersSubject.next(items);
          }
        }),
        catchError(() => {
          // keep seed data; notify softly
          this.alertService.info('Using local offers until API is available');
          return of(null);
        })
      )
      .subscribe();
  }

  getAll(): OfferResponse[] {
    return this.offersSubject.value;
  }

  getById(id: string, forceApi = true) {
    if (!forceApi) {
      const local = this.offersSubject.value.find((o) => o.id === id) || null;
      return of(local);
    }

    return this.http.get<OfferResponse>(`${this.apiPath}/${id}`).pipe(
      catchError(() => {
        const local = this.offersSubject.value.find((o) => o.id === id) || null;
        return of(local);
      })
    );
  }

  add(request: OfferRequest): OfferResponse {
    // Try API first
    let createdLocally: OfferResponse | null = null;
    const localCreate = () => {
      const newOffer: OfferResponse = {
        id: this.generateId(),
        title: request.title,
        listingPrice: request.listingPrice,
        listingOn: request.listingOn,
        preSalePrice: request.preSalePrice ?? null,
        logoUrl: request.logoUrl,
      };
      this.offersSubject.next([newOffer, ...this.offersSubject.value]);
      return newOffer;
    };

    this.http
      .post<OfferResponse>(`${this.apiPath}`, request)
      .pipe(
        tap((created) => {
          if (created) {
            this.offersSubject.next([created, ...this.offersSubject.value]);
          }
        }),
        catchError(() => {
          this.alertService.warning('API unavailable, saved locally');
          createdLocally = localCreate();
          return of(null);
        })
      )
      .subscribe();

    if (!createdLocally) {
      // optimistic return; actual value may come from API subscribe later
      createdLocally = localCreate();
    }
    return createdLocally;
  }

  update(id: string, request: OfferRequest): OfferResponse | null {
    const current = this.offersSubject.value;
    const index = current.findIndex((o) => o.id === id);
    if (index === -1) return null;

    const updated: OfferResponse = {
      ...current[index],
      title: request.title,
      listingPrice: request.listingPrice,
      listingOn: request.listingOn,
      preSalePrice: request.preSalePrice ?? null,
      logoUrl: request.logoUrl,
    };

    // Optimistic update
    const next = [...current];
    next[index] = updated;
    this.offersSubject.next(next);

    this.http
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
        catchError(() => {
          this.alertService.warning('API unavailable, kept local changes');
          return of(null);
        })
      )
      .subscribe();

    return updated;
  }

  delete(id: string): void {
    const current = this.offersSubject.value;
    const index = current.findIndex((o) => o.id === id);
    if (index === -1) return;

    const removed = current[index];
    const next = current.filter((o) => o.id !== id);
    this.offersSubject.next(next);

    this.http
      .delete<void>(`${this.apiPath}/${id}`)
      .pipe(
        catchError(() => {
          this.alertService.warning('API unavailable, removed locally');
          // If you want to rollback on failure, uncomment below:
          // this.offersSubject.next([...this.offersSubject.value, removed]);
          return of(void 0);
        })
      )
      .subscribe();
  }

  private generateSeedData(): OfferResponse[] {
    const todayIso = new Date().toISOString();
    return [
      {
        id: this.generateId(),
        title: 'Alpha Token',
        listingPrice: 2.5,
        listingOn: todayIso,
        preSalePrice: 2.1,
        logoUrl: '/icons/assets.svg',
      },
      {
        id: this.generateId(),
        title: 'Beta Coin',
        listingPrice: 1.2,
        listingOn: todayIso,
        preSalePrice: null,
        logoUrl: '/icons/brands.svg',
      },
      {
        id: this.generateId(),
        title: 'Gamma Asset',
        listingPrice: 5.75,
        listingOn: todayIso,
        preSalePrice: 5.2,
        logoUrl: '/icons/traders.svg',
      },
    ];
  }

  private generateId(): string {
    return 'offer-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}


