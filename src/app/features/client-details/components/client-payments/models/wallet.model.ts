// models/wallet.model.ts

export interface Wallet {
  id: string;
  currency: string;
  balance: number;
  availableBalance: number;
  lockedBalance: number;
  tradingAccountId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastTransactionAt?: string;
}

export interface DepositRequest {
  tradingAccountId: string;
  currency: string;
  amount: number;
}

export interface WithdrawRequest {
  tradingAccountId: string;
  currency: string;
  amount: number;
}

export interface WalletTransaction {
  id: string;
  tradingAccountId: string;
  accountNumber: string;
  transactionType: 'Deposit' | 'Withdrawal';
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
  createdAt: string;
  updatedAt: string | null;
}

export interface TradingAccountSummary {
  id: string;
  accountNumber: string;
  displayName: string;
  accountType: string;
  status: string;
  currency: string;
  balance: number;
}

export type TransactionType = 'deposit' | 'withdraw';

export interface CurrencyBreakdown {
  currency: string;
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
  usdEquivalent: number;
  walletCount: number;
}

export interface ClientWalletsSummary {
  userId: string;
  totalAccounts: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTradingOrders: number;
  totalUsdEquivalent: number;
  totalAvailableBalance: number;
  totalLockedBalance: number;
  totalBalance: number;
  currencyBreakdown: CurrencyBreakdown[];
  lastUpdated: string;
}
