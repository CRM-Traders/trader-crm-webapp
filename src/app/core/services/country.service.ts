// src/app/core/services/country.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { HttpService } from './http.service';
import { Country, CountryWithDialCode } from '../models/country.model';

@Injectable({
  providedIn: 'root',
})
export class CountryService {
  private httpService = inject(HttpService);

  private countriesSubject = new BehaviorSubject<Country[]>([]);
  private countriesWithDialCodesSubject = new BehaviorSubject<
    CountryWithDialCode[]
  >([]);

  public countries$ = this.countriesSubject.asObservable();
  public countriesWithDialCodes$ =
    this.countriesWithDialCodesSubject.asObservable();

  constructor() {
    this.loadCountries();
    this.loadCountriesWithDialCodes();
  }

  getCountries(): Observable<Country[]> {
    if (this.countriesSubject.value.length > 0) {
      return this.countries$;
    }

    return this.httpService.get<Country[]>('api/countries').pipe(
      tap((countries) => this.countriesSubject.next(countries)),
      catchError((error) => {
        const fallbackCountries: Country[] = [
          { name: 'United States', code: 'US' },
          { name: 'United Kingdom', code: 'GB' },
          { name: 'Canada', code: 'CA' },
          { name: 'Australia', code: 'AU' },
          { name: 'Germany', code: 'DE' },
          { name: 'France', code: 'FR' },
          { name: 'Georgia', code: 'GE' },
          { name: 'Japan', code: 'JP' },
          { name: 'Singapore', code: 'SG' },
        ];
        this.countriesSubject.next(fallbackCountries);
        return of(fallbackCountries);
      })
    );
  }

  getCountriesWithDialCodes(): Observable<CountryWithDialCode[]> {
    if (this.countriesWithDialCodesSubject.value.length > 0) {
      return this.countriesWithDialCodes$;
    }

    return this.httpService
      .get<CountryWithDialCode[]>('api/countries/dial-codes')
      .pipe(
        tap((countries) => this.countriesWithDialCodesSubject.next(countries)),
        catchError((error) => {
          const fallbackCountries: CountryWithDialCode[] = [
            { name: 'United States', dial_code: '+1', code: 'US' },
            { name: 'United Kingdom', dial_code: '+44', code: 'GB' },
            { name: 'Canada', dial_code: '+1', code: 'CA' },
            { name: 'Australia', dial_code: '+61', code: 'AU' },
            { name: 'Germany', dial_code: '+49', code: 'DE' },
            { name: 'France', dial_code: '+33', code: 'FR' },
            { name: 'Georgia', dial_code: '+995', code: 'GE' },
            { name: 'Japan', dial_code: '+81', code: 'JP' },
            { name: 'Singapore', dial_code: '+65', code: 'SG' },
          ];
          this.countriesWithDialCodesSubject.next(fallbackCountries);
          return of(fallbackCountries);
        })
      );
  }

  getCountryByCode(code: string): Observable<Country | undefined> {
    return this.countries$.pipe(
      map((countries) => countries.find((country) => country.code === code))
    );
  }

  getCountryWithDialCodeByCode(
    code: string
  ): Observable<CountryWithDialCode | undefined> {
    return this.countriesWithDialCodes$.pipe(
      map((countries) => countries.find((country) => country.code === code))
    );
  }

  private loadCountries(): void {
    this.getCountries().subscribe();
  }

  private loadCountriesWithDialCodes(): void {
    this.getCountriesWithDialCodes().subscribe();
  }

  refreshCountries(): void {
    this.countriesSubject.next([]);
    this.loadCountries();
  }

  refreshCountriesWithDialCodes(): void {
    this.countriesWithDialCodesSubject.next([]);
    this.loadCountriesWithDialCodes();
  }
}
