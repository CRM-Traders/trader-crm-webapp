import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class PriceManagerService {
  http = inject(HttpService);

  getActiveClients() {
    return this.http.get('identity/api/users/get-active-traders');
  }

  chartData(symbol: string, interval: string = '1h', limit = 500) {
    return this.http.get(
      `binance/api/CryptoData/historical-data?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
  }

  manipulatePrice(data: ManipulatePriceRequest) {
    return this.http.post('binance/api/CryptoData/manipulate-price', data);
  }

  tradingPairs(search: string | null) {
    return this.http.get(
      `binance/api/Binance/trading-pairs?pageIndex=0&pageSize=20&search=${search}`
    );
  }
}

export interface ManipulatePriceRequest {
  userId: string;
  symbol: string;
  price: number;
  force: boolean;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registrationDate: string;
}

export interface TradingPair {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

export interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
