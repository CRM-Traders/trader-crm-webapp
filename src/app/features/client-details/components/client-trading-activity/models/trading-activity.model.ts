// models/trading-activity.model.ts

export interface TradingOrder {
  id: string;
  orderId: string;
  tradingAccountId: string;
  symbol: string;
  orderType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop';
  volume: number;
  openPrice: number;
  closePrice?: number;
  currentPrice?: number;
  profit?: number;
  commission?: number;
  swap?: number;
  status: 'open' | 'closed' | 'pending' | 'cancelled' | 'rejected';
  openTime: string;
  closeTime?: string;
  comment?: string;
  stopLoss?: number;
  takeProfit?: number;
  expiration?: string;
}

export interface TradingActivitySummary {
  totalTrades: number;
  totalVolume: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netPnL: number;
  openTrades: number;
  closedTrades: number;
  averageWin: number;
  averageLoss: number;
}

export interface TradingActivityFilters {
  status?: string;
  symbol?: string;
  orderType?: string;
  dateFrom?: string;
  dateTo?: string;
  pageIndex: number;
  pageSize: number;
}

export interface TradingActivityResponse {
  orders: TradingOrder[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  summary: TradingActivitySummary;
}
