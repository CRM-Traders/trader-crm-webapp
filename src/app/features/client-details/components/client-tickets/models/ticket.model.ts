// models/ticket.model.ts

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