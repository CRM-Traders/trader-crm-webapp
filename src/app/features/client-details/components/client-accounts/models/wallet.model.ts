// wallet.model.ts - Updated to match actual API response

export enum WalletType {
  SPOT = 'SPOT',
  FUTURES = 'FUTURES', 
  MARGIN = 'MARGIN'
}

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE'
}

// Main Wallet interface matching your API response
export interface Wallet {
  id: string;
  currency: string;
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
  usdEquivalent: number;
  lastPriceUpdate: string;
}

// Extended wallet info for display purposes
export interface WalletDisplayInfo extends Wallet {
  currencyName?: string;
  walletType?: WalletType;
  status?: WalletStatus;
  tradingAccountId?: string;
  createdAt?: string;
}

export interface WalletSummary {
  tradingAccountId: string;
  totalWallets: number;
  activeWallets: number;
  totalBalance: number;
  availableBalance: number;
  lockedBalance: number;
  lastUpdated: string;
}

export interface CreateWalletRequest {
  currency: string;
  walletType?: WalletType;
  tradingAccountId: string;
}

export interface DepositRequest {
  walletId: string;
  amount: number;
  network?: string;
  memo?: string;
}

export interface WithdrawRequest {
  walletId: string;
  amount: number;
  address: string;
  network?: string;
  memo?: string;
}

export interface TransferRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  note?: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'TRADE' | 'FEE';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  txHash?: string;
  fee?: number;
  note?: string;
  createdAt: string;
  completedAt?: string;
}

export interface WalletSettings {
  walletId: string;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  tradingEnabled: boolean;
  autoConvertDust: boolean;
  minWithdrawAmount: number;
  maxWithdrawAmount: number;
  withdrawFeeRate: number;
  notifications: {
    deposits: boolean;
    withdrawals: boolean;
    trades: boolean;
  };
}

// Helper interfaces for currency information
export interface CurrencyInfo {
  symbol: string;
  name: string;
  decimals: number;
  isActive: boolean;
}