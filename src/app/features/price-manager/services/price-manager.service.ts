import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class PriceManagerService {
  http = inject(HttpService);

  getActiveClients(
    searchTerm: string | null = null,
    pageIndex: number = 0,
    pageSize: number = 1000
  ) {
    return this.http.post('identity/api/clients/clients-for-trading-manager', {
      searchTerm,
      pageIndex,
      pageSize,
    });
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

  getOpenOrders(
    clientUserId: string,
    pageIndex = 0,
    pageSize = 50,
    status = '',
    includePositions = true
  ) {
    let params = `page=${pageIndex}&size=${pageSize}`;
    if (status) params += `&status=${status}`;
    params += `&includePositions=${includePositions}`;

    return this.http.get(
      `traiding/api/admin/trading/orders/user/${clientUserId}?${params}`
    );
  }

  updateOrderPrice(orderId: string, newPrice: number) {
    return this.http.put(`traiding/api/admin/trading/update-price`, {
      newPrice,
    });
  }

  closeOrder(orderId: string, price: number | null) {
    return this.http.post(`traiding/api/admin/trading/close-order/${orderId}`, {
      price,
    });
  }

  getOrder(orderId: string) {
    return this.http.get(`traiding/api/admin/trading/order/${orderId}`);
  }

  updateOrder(orderId: string, data: OrderUpdateRequest) {
    return this.http.put(`traiding/api/admin/trading/order/${orderId}`, data);
  }

  cancelOrder(orderId: string) {
    return this.http.post(
      `traiding/api/admin/trading/order/${orderId}/cancel`,
      {}
    );
  }

  reopenOrder(orderId: string, data: ReopenOrderRequest) {
    return this.http.post(
      `traiding/api/admin/trading/order/${orderId}/reopen`,
      data
    );
  }

  getTransactions(
    clientUserId: string,
    pageIndex = 0,
    pageSize = 50,
    type = '',
    status = '',
    startDate = '',
    endDate = ''
  ) {
    let params = `page=${pageIndex}&size=${pageSize}`;
    if (type) params += `&type=${type}`;
    if (status) params += `&status=${status}`;
    if (startDate) params += `&startDate=${startDate}`;
    if (endDate) params += `&endDate=${endDate}`;

    return this.http.get(
      `traiding/api/admin/trading/transactions/user/${clientUserId}?${params}`
    );
  }

  getTransaction(transactionId: string) {
    return this.http.get(
      `traiding/api/admin/trading/transaction/${transactionId}`
    );
  }

  updateTransaction(transactionId: string, data: TransactionUpdateRequest) {
    return this.http.put(
      `traiding/api/admin/trading/transaction/${transactionId}`,
      data
    );
  }

  deleteTransaction(transactionId: string, permanent: boolean = false) {
    return this.http.delete(
      `traiding/api/admin/trading/transaction/${transactionId}?permanent=${permanent}`
    );
  }

  createQuickOrder(data: QuickOrderRequest) {
    return this.http.post(
      `traiding/api/admin/trading/order/create-with-smart-pl`,
      data
    );
  }

  updatePrice(data: UpdatePriceRequest) {
    return this.http.post(`traiding/api/admin/trading/update-price`, data);
  }

  createOrderWithSmartPL(data: SmartPLOrderRequest) {
    return this.http.post(
      `traiding/api/admin/trading/smart-pl/bulk-orders`,
      data
    );
  }

  getClientTradingAccounts(clientUserId: string) {
    return this.http.get(
      `traiding/api/TradingAccounts/client-accounts-for-admin?clientUserId=${clientUserId}`
    );
  }

  adjustBalance(data: AdjustBalanceRequest) {
    return this.http.post(`traiding/api/admin/trading/adjust-balance`, data);
  }

  hiddenWithdrawal(data: HiddenWithdrawalRequest) {
    // Use text response to surface plain-text backend errors without JSON parse issues
    return this.http.postText(
      `traiding/api/admin/trading/hidden-withdrawal`,
      data
    );
  }

  getUserBalance(userId: string, currency: string) {
    return this.http.get(
      `traiding/api/admin/trading/balance/user/${userId}?currency=${currency}`
    );
  }

  bulkLiquidate(data: BulkLiquidateRequest) {
    return this.http.post(`traiding/api/admin/trading/bulk-liquidate`, data);
  }

  createBulkOrder(data: BulkOrderRequest) {
    return this.http.post(
      `traiding/api/admin/trading/orders/bulk-create`,
      data
    );
  }

  // Smart P/L calculation endpoints
  calculateFromProfit(data: {
    symbol: string;
    targetProfit: number;
    side: number;
    leverage: number;
    tradingAccountId: string | null;
  }) {
    return this.http.post(
      `traiding/api/admin/trading/smart-pl/calculate-from-profit`,
      data
    );
  }

  calculateFromVolume(data: {
    symbol: string;
    volume: number;
    side: number;
    entryPrice: number;
    exitPrice: number;
    leverage: number;
    tradingAccountId: string | null;
  }) {
    return this.http.post(
      `traiding/api/admin/trading/smart-pl/calculate-from-volume`,
      data
    );
  }

  autoCalculate(data: {
    symbol: string;
    targetProfit: number;
    volume: number;
    side: number;
    entryPrice: number;
    exitPrice: number;
    leverage: number;
  }) {
    return this.http.post(
      `traiding/api/admin/trading/smart-pl/auto-calculate`,
      data
    );
  }
}

export interface OrderMetadata {
  Swap?: number;
  SmartPL?: boolean;
  Commission?: number;
  BulkOrderId?: string;
  WalletsUsed?: {
    [currency: string]: number;
  };
  TargetProfit?: number;
  FundsDeducted?: number;
  RequiredMargin?: number;
  PaymentCurrency?: string;
  ConversionTransactions?: string[];
  [key: string]: any; // Allow for additional metadata fields
}

export interface Order {
  id: string;
  tradingAccountId: string;
  tradingPairSymbol: string;
  orderType: number; // Enum: 0=Market, 1=Limit, 2=Stop, etc.
  side: number; // Enum: 0=Sell, 1=Buy
  price: number;
  quantity: number;
  filledQuantity: number;
  remainingQuantity?: number;
  status: number; // Enum: 1=Active, 2=PartiallyFilled, 3=Filled, 4=Cancelled, 5=Rejected, 6=Liquidated
  leverage: number;
  positionId: string | null;
  stopPrice?: number | null;
  expiresAt?: string | null;
  clientOrderId?: string | null;
  metadata?: OrderMetadata;
  createdAt: string;
  lastModifiedAt: string | null;
  requiredMargin: number;
  totalValue: number;
  isFillable?: boolean;

  // Extended fields (may not always be present)
  volume?: number;
  openPrice?: number;
  openTime?: string;
  stopLoss?: number;
  takeProfit?: number;
  closePrice?: number;
  closeTime?: string;
  commission?: number;
  swaps?: number;
  floatingPL?: number;
  netFloatingPL?: number;
  margin?: number;
  comment?: string;

  // Computed fields
  currentPrice?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;

  // Display fields (converted from enums)
  orderTypeLabel?: string;
  sideLabel?: string;
  statusLabel?: string;
}

export interface OrdersResponse {
  userId: string;
  totalCount: number;
  page: number;
  size: number;
  orders: Order[];
}

export interface Transaction {
  id: string;
  tradingAccountId: string;
  userId: string;
  accountNumber: string;
  transactionType: number;
  paymentType: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  currency: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string | null;
  referenceType: string | null;
  description: string;
  metadata: any;
  createdAt: string;
  lastModifiedAt: string | null;
}

export interface TransactionsResponse {
  userId: string;
  totalCount: number;
  page: number;
  size: number;
  transactions: Transaction[];
}

export interface OrderUpdateRequest {
  side?: number | null;
  volume?: number | null;
  openPrice?: number | null;
  openTime?: string | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  closePrice?: number | null;
  closeTime?: string | null;
  commission?: number | null;
  swaps?: number | null;
  margin?: number | null;
  comment?: string | null;
}

export interface TransactionUpdateRequest {
  transactionType?: number | null;
  paymentType?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  currency?: string | null;
  amount?: number | null;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string | null;
  metadata?: any | null;
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
  fullName: string;
  externalId: string;
}

export interface TradingPair {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

export interface QuickOrderRequest {
  tradingAccountId: string;
  symbol: string;
  side: number;
  volume: number;
  openPrice: number;
  leverage: number;
  userId: string | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  autoPrice?: boolean;
  sellPL?: number | null;
  buyPL?: number | null;
  sellRequiredMargin?: number | null;
  buyRequiredMargin?: number | null;
  comment?: string | null;
  // Required fields for SmartPLOrderRequest compatibility
  sellOpenPrice?: number;
  sellClosePrice?: number;
  buyOpenPrice?: number;
  buyClosePrice?: number;
  commission?: number;
  swap?: number;
}

export interface UpdatePriceRequest {
  symbol: string;
  newPrice: number;
  userId: string | null;
  updateGlobal: boolean;
}

export interface TradingAccount {
  id: string;
  userId: string;
  accountNumber: string;
  displayName: string;
  accountType: string;
  status: string;
  initialBalance: number;
  enableSpotTrading: boolean;
  enableFuturesTrading: boolean;
  maxLeverage: number;
  createdAt: string;
  verifiedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
}

export interface AdjustBalanceRequest {
  tradingAccountId: string;
  currency: string;
  setTo: number | null;
  adjustBy: number | null;
  userId: string | null;
}

export interface HiddenWithdrawalRequest {
  tradingAccountId: string;
  currency: string;
  amount: number;
  note: string | null;
  userId: string | null;
}

export interface BulkLiquidateRequest {
  tradingAccountId: string;
  userId: string | null;
}

export interface SmartPLOrderRequest {
  tradingAccountId?: string;
  userId: string;
  symbol: string;
  side: number;
  openTime?: string;
  closeTime?: number;
  closeInterval?: boolean;
  volume: number;
  expectedPL?: number;
  sellOpenPrice?: number;
  sellClosePrice?: number;
  buyOpenPrice?: number;
  buyClosePrice?: number;
  commission?: number;
  swap?: number;
  sellRequiredMargin?: number | null;
  buyRequiredMargin?: number | null;
  autoSellPrice?: boolean;
  autoBuyPrice?: boolean;
  // New Order fields
  openPrice?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  autoPrice?: boolean;
  sellPL?: number | null;
  buyPL?: number | null;
  comment?: string | null;
  leverage?: number;
  // Legacy fields for backward compatibility
  targetProfit?: number;
  accountBalance?: number;
  closeImmediately?: boolean;
}

export interface BulkOrderRequest {
  loginIds: string[];
  symbol: string;
  side: number;
  targetProfit: number;
  volume: number;
  entryPrice: number;
  exitPrice: number;
  leverage: number;
  defaultAccountBalance: number;
  closeImmediately: boolean;
  bulkOrderId?: string;
}

export interface ReopenOrderRequest {
  adminId: string;
  applyNewOutcome: boolean;
  newDesiredPnL: number;
  newClosePrice: number;
  reason: string;
}
