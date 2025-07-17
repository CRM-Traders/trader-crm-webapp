// dashboard.models.ts

// Enums
export enum TicketType {
  Deposit = 0,
  Withdraw = 1
}

export enum TicketStatus {
  Pending = 0,
  Processing = 1,
  Completed = 2,
  Cancelled = 3,
  Failed = 4,
  Rejected = 5
}

export enum DepositType {
  Today = 0,
  Yesterday = 1,
  LastWeek = 2,
  ThisMonth = 3,
  LastMonth = 4
}

export enum TransactionType {
  Deposit = 1,
  Withdrawal = 2,
  Buy = 3,
  Sell = 4,
  Fee = 5,
  PnLAdjustment = 6,
  Transfer = 7,
  CreditIn = 8,
  CreditOut = 9
}

export enum PaymentType {
  Bonus = 0,
  ChargeBack = 1,
  CreditCard = 2,
  Electronic = 3,
  External = 4,
  InternalTransfer = 5,
  Migration = 6,
  PayRetailers = 7,
  Recall = 8,
  System = 9,
  Wire = 10
}

export enum PaymentStatus {
  Completed = 0,
  Approved = 1,
  Failed = 2,
  Rejected = 3,
  Cancelled = 4
}

// Interfaces
export interface NewLead {
  clientId: string;
  clientName: string;
  createdAt: string;
}

export interface DashboardData {
  todayUsers: number;
  totalUsers: number;
  todayComments: number;
  newLeads: NewLead[];
  registrationCountries: string[];
}

export interface UserTicket {
  id: string;
  userId: string;
  ticketType: TicketType;
  amount: number;
  walletId: string;
  ticketStatus: TicketStatus;
}

export interface Transaction {
  userId: string;
  transactionType: TransactionType;
  paymentMethod: PaymentType;
  transactionStatus: PaymentStatus;
  amount: number;
  transactionDate: string;
}

export interface DepositStat {
  depositTypeEnum: DepositType;
  depositType: string;
  depositCount: number;
  amount: number;
  clientsCount: number;
}

export interface Deposit {
  id: string;
  amount: number;
  customer: string;
  date: string;
}

export interface OfficeDashboardStats {
  usersTickets: UserTicket[];
  transactions: Transaction[];
  depositStats: DepositStat[];
  deposits: Deposit[];
} 