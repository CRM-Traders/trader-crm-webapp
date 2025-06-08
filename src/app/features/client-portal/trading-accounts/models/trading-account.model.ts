// src/app/core/models/trading-account.model.ts

export enum AccountType {
  DEMO = 1,
  REAL = 2,
  PAPER = 3,
}

export enum AccountStatus {
  ACTIVE = 'Active',
  PENDING = 'Pending',
  SUSPENDED = 'Suspended',
  CLOSED = 'Closed',
  VERIFICATION_REQUIRED = 'VerificationRequired',
}

export interface TradingAccount {
  id: string;
  userId: string;
  accountNumber: string;
  displayName: string;
  accountType: AccountType;
  status: AccountStatus;
  initialBalance: number;
  currentBalance?: number;
  enableSpotTrading: boolean;
  enableFuturesTrading: boolean;
  maxLeverage: number;
  createdAt: string;
  verifiedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
}

export interface CreateTradingAccountRequest {
  userId: string;
  displayName: string;
  accountType: AccountType;
  initialBalance: number;
  enableSpotTrading?: boolean;
  enableFuturesTrading?: boolean;
  maxLeverage?: number;
}

export interface TradingAccountStats {
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface AccountTypeInfo {
  type: AccountType;
  name: string;
  description: string;
  features: string[];
  isRecommended?: boolean;
}

export const ACCOUNT_TYPE_CONFIG: Record<AccountType, AccountTypeInfo> = {
  [AccountType.DEMO]: {
    type: AccountType.DEMO,
    name: 'Demo Account',
    description:
      'Practice trading with virtual funds. Perfect for learning and testing strategies.',
    features: [
      'Virtual funds',
      'Real market data',
      'No financial risk',
      'Full platform features',
      'Educational resources',
    ],
    isRecommended: true,
  },
  [AccountType.REAL]: {
    type: AccountType.REAL,
    name: 'Live Account',
    description:
      'Trade with real money in live markets. Full access to all trading features.',
    features: [
      'Real money trading',
      'Live market execution',
      'Advanced order types',
      'Professional tools',
      'Priority support',
    ],
  },
  [AccountType.PAPER]: {
    type: AccountType.PAPER,
    name: 'Paper Trading',
    description:
      'Simulate real trading without financial risk. Great for strategy backtesting.',
    features: [
      'Simulated trading',
      'Historical data',
      'Strategy testing',
      'Performance analytics',
      'Risk-free environment',
    ],
  },
};
