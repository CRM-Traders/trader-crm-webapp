// models/portfolio.model.ts

export interface PortfolioHolding {
  currency: string;
  balance: number;
  usdPrice: number;
  usdValue: number;
  percentage: number;
  change24h: number;
}

export interface Portfolio {
  tradingAccountId: string;
  totalUsdValue: number;
  holdings: PortfolioHolding[];
  timestamp: string;
}
