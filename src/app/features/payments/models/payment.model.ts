export interface Payment {
  transactionId: string;
  affiliate: string;
  client: string;
  originalAgent?: string;
  country: string;
  paymentType: string;
  amount: number;
  currency: string;
  tradingAccount: string;
  paymentAggregator?: string;
  paymentMethod: string;
  dateTime: Date;
  status: string;
}
