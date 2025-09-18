export interface Payment {
  transactionId: string;
  client: string;
  clientId: string;
  affiliateId?: string;
  affiliateCode?: string;
  originalAgent?: string;
  originalAgentId?: string;
  country: string;
  paymentType: 'DEPOSIT' | 'WITHDRAW' | 'BONUS' | 'REFUND';
  amount: number;
  currency: string;
  tradingAccount: string;
  paymentAggregator?: string;
  paymentMethod: string;
  dateTime: Date;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdBy?: string;
  processedBy?: string;
  notes?: string;
}
