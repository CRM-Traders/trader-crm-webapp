// models/ticket.model.ts

export enum TicketStatus {
  Pending = 0,
  Processing = 1,
  Completed = 2,
  Cancelled = 3,
  Failed = 4,
  Rejected = 5
}

export interface UpdateTicketStatusRequest {
  id: string;
  status: TicketStatus;
}

export interface FinancialTicket {
  id: string;
  ticketType: number; // 0 = Deposit, 1 = Withdraw
  ticketTypeName: string;
  amount: number;
  walletId: string;
  ticketStatus: number;
  ticketStatusName: string;
  createdAt: string;
  walletCurrency: string;
  tradingAccountId: string;
}

export interface FinancialTicketResponse {
  data: {
    tickets: FinancialTicket[];
    totalCount: number;
    activeTickets: number;
    totalWithdrawals: number;
    totalDeposits: number;
  }[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

export interface FinancialTicketSummary {
  totalTickets: number;
  activeTickets: number;
  totalWithdrawals: number;
  totalDeposits: number;
  totalAmount: number;
  totalWithdrawalAmount: number;
  totalDepositAmount: number;
}

// Legacy interfaces for backward compatibility
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  clientUserId: string;
  ticketNumber: string;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  pageIndex: number;
  pageSize: number;
}

export interface TicketResponse {
  items: Ticket[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TicketSummary {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  criticalTickets: number;
  highPriorityTickets: number;
  lastUpdated: string;
} 