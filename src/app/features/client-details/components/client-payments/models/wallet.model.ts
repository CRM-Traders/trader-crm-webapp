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
  transactionType: 'deposit' | 'withdraw';
  currency: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  note?: string;
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
