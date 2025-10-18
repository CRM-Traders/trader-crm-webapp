import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface TradingSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

export interface TradingSymbolsResponse {
  items: TradingSymbol[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root',
})
export class TradingSymbolsService {
  private http = inject(HttpService);

  // Cache for symbols to avoid repeated API calls
  private symbolsCache$ = new BehaviorSubject<TradingSymbol[]>([]);
  private currenciesCache$ = new BehaviorSubject<string[]>([]);
  private isLoadingSymbols$ = new BehaviorSubject<boolean>(false);
  private isLoadingCurrencies$ = new BehaviorSubject<boolean>(false);

  /**
   * Get all available trading symbols/pairs
   * @param search Optional search term to filter symbols
   * @param useCache Whether to use cached data (default: true)
   * @returns Observable of trading symbols array
   */
  getTradingSymbols(search: string | null = null, useCache: boolean = true): Observable<TradingSymbol[]> {
    // Return cached data if available and no search term
    if (useCache && !search && this.symbolsCache$.value.length > 0) {
      return of(this.symbolsCache$.value);
    }

    this.isLoadingSymbols$.next(true);

    return this.http.get(
      `binance/api/Binance/trading-pairs?pageIndex=0&pageSize=1000&search=${search || ''}`
    ).pipe(
      map((response: any) => {
        let symbols: TradingSymbol[] = [];
        
        // Handle different response formats
        if (Array.isArray(response)) {
          symbols = response;
        } else if (response?.items && Array.isArray(response.items)) {
          symbols = response.items;
        } else if (response?.data && Array.isArray(response.data)) {
          symbols = response.data;
        } else if (response?.tradingPairs && Array.isArray(response.tradingPairs)) {
          symbols = response.tradingPairs;
        }

        // Filter only active symbols
        const activeSymbols = symbols.filter(s => s.status === 'TRADING' || s.status === 'Active');

        // Cache if no search term
        if (!search) {
          this.symbolsCache$.next(activeSymbols);
        }

        return activeSymbols;
      }),
      tap(() => this.isLoadingSymbols$.next(false)),
      catchError(error => {
        console.error('Error fetching trading symbols:', error);
        this.isLoadingSymbols$.next(false);
        return of([]);
      })
    );
  }

  /**
   * Get available currencies for balance adjustment
   * Extracts unique currencies from trading symbols
   * @returns Observable of currency strings array
   */
  getAvailableCurrencies(): Observable<string[]> {
    // Return cached data if available
    if (this.currenciesCache$.value.length > 0) {
      return of(this.currenciesCache$.value);
    }

    this.isLoadingCurrencies$.next(true);

    return this.getTradingSymbols().pipe(
      map((symbols: TradingSymbol[]) => {
        const currencySet = new Set<string>();

        // Extract base and quote assets from symbols
        symbols.forEach(symbol => {
          if (symbol.baseAsset) {
            currencySet.add(symbol.baseAsset);
          }
          if (symbol.quoteAsset) {
            currencySet.add(symbol.quoteAsset);
          }
        });

        // Add common fiat currencies if not present
        const commonCurrencies = ['USD', 'EUR', 'GBP', 'USDT', 'USDC'];
        commonCurrencies.forEach(curr => currencySet.add(curr));

        // Convert to array and sort alphabetically
        const currencies = Array.from(currencySet).sort();

        // Cache the result
        this.currenciesCache$.next(currencies);
        this.isLoadingCurrencies$.next(false);

        return currencies;
      }),
      catchError(error => {
        console.error('Error fetching currencies:', error);
        this.isLoadingCurrencies$.next(false);
        // Return default currencies on error
        const defaultCurrencies = ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT', 'USDC'];
        this.currenciesCache$.next(defaultCurrencies);
        return of(defaultCurrencies);
      })
    );
  }

  /**
   * Search for symbols by name
   * @param searchTerm The search term to filter symbols
   * @returns Observable of filtered trading symbols
   */
  searchSymbols(searchTerm: string): Observable<TradingSymbol[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return this.getTradingSymbols();
    }

    const normalizedSearch = searchTerm.toUpperCase().trim();

    // First try cached data for instant results
    if (this.symbolsCache$.value.length > 0) {
      const filteredCache = this.symbolsCache$.value.filter(symbol =>
        symbol.symbol.toUpperCase().includes(normalizedSearch) ||
        symbol.baseAsset.toUpperCase().includes(normalizedSearch) ||
        symbol.quoteAsset.toUpperCase().includes(normalizedSearch)
      );

      if (filteredCache.length > 0) {
        return of(filteredCache);
      }
    }

    // If no cached results, fetch from API
    return this.getTradingSymbols(normalizedSearch, false);
  }

  /**
   * Get loading state for symbols
   * @returns Observable of loading state
   */
  get isLoadingSymbols(): Observable<boolean> {
    return this.isLoadingSymbols$.asObservable();
  }

  /**
   * Get loading state for currencies
   * @returns Observable of loading state
   */
  get isLoadingCurrencies(): Observable<boolean> {
    return this.isLoadingCurrencies$.asObservable();
  }

  /**
   * Clear the cache (useful when data needs to be refreshed)
   */
  clearCache(): void {
    this.symbolsCache$.next([]);
    this.currenciesCache$.next([]);
  }

  /**
   * Prefetch symbols to warm up the cache
   */
  prefetchSymbols(): void {
    this.getTradingSymbols().subscribe();
  }

  /**
   * Prefetch currencies to warm up the cache
   */
  prefetchCurrencies(): void {
    this.getAvailableCurrencies().subscribe();
  }
}

