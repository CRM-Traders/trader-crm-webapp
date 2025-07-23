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

  getOpenOrders(clientUserId: string, pageIndex = 0, pageSize = 50) {
    return this.http.get(
      `traiding/api/Trading/active-orders?clientUserId=${clientUserId}&pageSize=${pageSize}&pageIndex=${pageIndex}`
    );
  }

  updateOrderPrice(orderId: string, newPrice: number) {
    return this.http.put(`traiding/api/Orders/${orderId}/price`, { newPrice });
  }

  closeOrder(orderId: string) {
    return this.http.post(`traiding/api/Trading/${orderId}/close`, null);
  }
}

export interface Order {
  id: string;
  tradingPairSymbol: string;
  orderType: string;
  side: 'Buy' | 'Sell';
  price: number;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  status: 'Active' | 'Partial' | 'Filled' | 'Cancelled';
  leverage: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  requiredMargin: number;
  createdAt: string;
}

export interface ManipulatePriceRequest {
  userId: string;
  symbol: string;
  price: number;
  force: boolean;
}

export interface Client {
  id: string;
  userId: string;
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
