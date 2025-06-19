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
  enableSpotTrading: boolean;
  enableFuturesTrading: boolean;
  maxLeverage: number;
  createdAt: string;
  verifiedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
}

export interface CreateTradingAccountRequest {
  displayName: string;
  clientUserId: string;
}
