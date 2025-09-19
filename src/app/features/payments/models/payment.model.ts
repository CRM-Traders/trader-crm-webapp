export enum TransactionType {
  Deposit = 1,
  Withdrawal = 2,
  Buy = 3,
  Sell = 4,
  Fee = 5,
  PnLAdjustment = 6,
  Transfer = 7,
  CreditIn = 8,
  CreditOut = 9,
  MarginLock = 10,
  Liquidation = 11,
  OrderPlaced = 12,
  PositionClosed = 13,
  PositionClosedWithLoss = 14,
  Swap = 15,
}

export interface Payment {
  transactionId: string;
  affiliate: string;
  client: string;
  originalAgent?: string;
  country: string;
  paymentType: string | number;
  amount: number;
  currency: string;
  tradingAccount: string;
  paymentAggregator?: string;
  paymentMethod: string;
  dateTime: Date;
  status: string;
}
