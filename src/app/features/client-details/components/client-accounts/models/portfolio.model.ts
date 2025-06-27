// models/portfolio.model.ts

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  side: 'LONG' | 'SHORT';
  assetType: 'STOCK' | 'CRYPTO' | 'FOREX' | 'COMMODITY' | 'INDEX';
  lastUpdated: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercentage: number;
  cashBalance: number;
  availableBalance: number;
  marginUsed: number;
  marginAvailable: number;
  buyingPower: number;
  dayPnL: number;
  dayPnLPercentage: number;
}

export interface Portfolio {
  tradingAccountId: string;
  accountNumber: string;
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
  lastUpdated: string;
}
