// models/trading-activity.model.ts

export interface TradingOrder {
  id: string;
  tradingAccountId: string;
  accountNumber: string;
  tradingPairSymbol: string;
  orderType: string;
  side: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  status: string;
  createdAt: string;
  updatedAt: string | null;
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
