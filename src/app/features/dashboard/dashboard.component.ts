// dashboard.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DashboardService } from './services/dashboard.services';
import { DashboardData, OfficeDashboardStats, DepositStat, Transaction, UserTicket, PaymentType, PaymentStatus, TransactionType, DepositType, TicketType, TicketStatus } from './models/dashboard.models';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, HasPermissionDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: true,
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private alertService = inject(AlertService);

  dashboardData: DashboardData | null = null;
  officeDashboardStats: OfficeDashboardStats | null = null;
  loading = true;
  error: string | null = null;

  monthlyDepositIncome: number = 0;
  todayIncome: number = 0;

  // Dashboard section data
  leadsTraffic: DepositStat[] = [];
  productivityStats: DepositStat[] = [];
  depositAttempts: Transaction[] = [];
  registrationCountries: string[] = [];
  failedDeposits: Transaction[] = [];
  recentTickets: UserTicket[] = [];
  bonuses: Transaction[] = [];
  deposits: Transaction[] = [];

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadOfficeDashboardStats();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.registrationCountries = this.getValidCountries();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load dashboard data';
        this.loading = false;
      },
    });
  }

  // Section-specific refreshers
  refreshNewLeads(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        if (!this.dashboardData) {
          this.dashboardData = data;
        } else {
          this.dashboardData.newLeads = data.newLeads;
        }
        this.alertService.success('Successfully updated');
      },
      error: () => {
        // no-op for now
      },
    });
  }

  refreshRegistrationCountries(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        if (!this.dashboardData) {
          this.dashboardData = data;
        } else {
          this.dashboardData.registrationCountries = data.registrationCountries;
        }
        this.registrationCountries = this.getValidCountries();
        this.alertService.success('Successfully updated');
      },
      error: () => {
        // no-op for now
      },
    });
  }

  refreshLeadsTraffic(): void {
    this.dashboardService.getOfficeDashboardStats().subscribe({
      next: (data: OfficeDashboardStats) => {
        if (data && Array.isArray(data.depositStats)) {
          this.leadsTraffic = data.depositStats;
        }
        this.alertService.success('Successfully updated');
      },
      error: () => {
        // no-op for now
      },
    });
  }

  refreshProductivityStats(): void {
    this.dashboardService.getOfficeDashboardStats().subscribe({
      next: (data: OfficeDashboardStats) => {
        if (data && Array.isArray(data.depositStats)) {
          this.productivityStats = data.depositStats;
        }
        this.alertService.success('Successfully updated');
      },
      error: () => {
        // no-op for now
      },
    });
  }

  refreshDepositAttempts(): void {
    this.dashboardService.getOfficeDashboardStats().subscribe({
      next: (data: OfficeDashboardStats) => {
        this.depositAttempts = (data.transactions || []).filter(
          (t: Transaction) => t.transactionType === TransactionType.Deposit,
        );
        this.alertService.success('Successfully updated');
      },
      error: () => {
        // no-op for now
      },
    });
  }

  refreshFailedDeposits(): void {
    this.dashboardService.getOfficeDashboardStats().subscribe({
      next: (data: OfficeDashboardStats) => {
        this.failedDeposits = (data.transactions || []).filter(
          (t: Transaction) =>
            t.transactionType === TransactionType.Deposit &&
            t.transactionStatus === PaymentStatus.Failed,
        );
        this.alertService.success('Successfully updated');
      },
      error: () => {
        // no-op for now
      },
    });
  }

  refreshRecentTickets(): void {
    this.dashboardService.getOfficeDashboardStats().subscribe({
      next: (data: OfficeDashboardStats) => {
        this.recentTickets = data.usersTickets || [];
        this.alertService.success('Successfully updated');
      },
      error: () => {
        // no-op for now
      },
    });
  }

  refreshBonuses(): void {
    this.dashboardService.getOfficeDashboardStats().subscribe({
      next: (data: OfficeDashboardStats) => {
        this.bonuses = (data.transactions || []).filter(
          (t: Transaction) => t.paymentMethod === PaymentType.Bonus,
        );
        this.alertService.success('Successfully updated');
      },
      error: () => {
        // no-op for now
      },
    });
  }

  refreshDeposits(): void {
    this.dashboardService.getOfficeDashboardStats().subscribe({
      next: (data: OfficeDashboardStats) => {
        this.deposits = (data.transactions || []).filter(
          (t: Transaction) => t.transactionType === TransactionType.Deposit,
        );
        this.alertService.success('Successfully updated');
      },
      error: () => {
        // no-op for now
      },
    });
  }

  loadOfficeDashboardStats(): void {
    this.dashboardService.getOfficeDashboardStats().subscribe({
      next: (data: OfficeDashboardStats) => {
        this.officeDashboardStats = data;
        // Build leadsTraffic and productivityStats from transactions
        const builtStats = this.buildDepositStatsFromTransactions(data.transactions || []);
        this.leadsTraffic = builtStats;
        this.productivityStats = builtStats;
        
        // Calculate monthly deposit income from transactions
        this.monthlyDepositIncome = this.calculateMonthlyDepositIncome(data.transactions || []);
        
        // Calculate today's income from transactions
        this.todayIncome = this.calculateTodayIncome(data.transactions || []);
        
        // Deposit attempts: transactionType = Deposit
        this.depositAttempts = (data.transactions || []).filter((t: Transaction) => t.transactionType === TransactionType.Deposit);
        // Failed deposits: transactionType = Deposit, transactionStatus = Failed
        this.failedDeposits = (data.transactions || []).filter((t: Transaction) => t.transactionType === TransactionType.Deposit && t.transactionStatus === PaymentStatus.Failed);
        // Recent tickets
        this.recentTickets = data.usersTickets || [];
        // Bonuses: paymentMethod = Bonus
        this.bonuses = (data.transactions || []).filter((t: Transaction) => t.paymentMethod === PaymentType.Bonus);
        // Deposits: transactionType = Deposit
        this.deposits = (data.transactions || []).filter((t: Transaction) => t.transactionType === TransactionType.Deposit);
      },
      error: (err) => {
        console.error('Failed to load office dashboard stats:', err);
      },
    });
  }

  private buildDepositStatsFromTransactions(transactions: Transaction[]): DepositStat[] {
    const now = new Date();
    const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const startOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
      return new Date(d.getFullYear(), d.getMonth(), diff);
    };
    const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const ranges: { type: DepositType; label: string; start: Date; end: Date }[] = [
      { type: DepositType.Today, label: 'Today', start: startOfDay(now), end: endOfDay(now) },
      { type: DepositType.Yesterday, label: 'Yesterday', start: startOfDay(new Date(now.getTime() - 86400000)), end: endOfDay(new Date(now.getTime() - 86400000)) },
      { type: DepositType.LastWeek, label: 'LastWeek', start: startOfWeek(new Date(now.getTime() - 7 * 86400000)), end: endOfDay(new Date(startOfWeek(new Date(now.getTime() - 7 * 86400000)).getTime() + 6 * 86400000)) },
      { type: DepositType.ThisMonth, label: 'ThisMonth', start: startOfMonth(now), end: endOfMonth(now) },
      { type: DepositType.LastMonth, label: 'LastMonth', start: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)), end: endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)) },
    ];

    const isDeposit = (t: Transaction) => t.transactionType === TransactionType.Deposit;

    const stats: DepositStat[] = ranges.map(r => {
      const inRange = transactions.filter(t => {
        if (!isDeposit(t)) return false;
        const d = new Date(t.transactionDate);
        return d >= r.start && d <= r.end;
      });
      const depositCount = inRange.length;
      const amount = inRange.reduce((sum, t) => sum + t.amount, 0);
      const clients = new Set(inRange.map(t => t.userId));
      return {
        depositTypeEnum: r.type,
        depositType: r.label,
        depositCount,
        amount,
        clientsCount: clients.size,
      } as DepositStat;
    });

    return stats;
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  getRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else if (diffDays <= 14) {
      return '1 week ago';
    } else {
      return `${Math.floor((diffDays - 1) / 7)} weeks ago`;
    }
  }

  getCountryDisplayName(country: string): string {
    // Handle phone numbers and country codes
    if (country.startsWith('+') || /^\d+$/.test(country)) {
      return 'Unknown';
    }

    // Country code mapping for better display
    const countryMap: { [key: string]: string } = {
      AF: 'Afghanistan',
      AL: 'Albania',
      AR: 'Argentina',
      AS: 'American Samoa',
      AW: 'Aruba',
      AX: 'Åland Islands',
      BA: 'Bosnia and Herzegovina',
      BS: 'Bahamas',
      GE: 'Georgia',
      MX: 'Mexico',
    };

    return countryMap[country] || country;
  }

  getValidCountries(): string[] {
    if (!this.dashboardData?.registrationCountries) return [];

    return this.dashboardData.registrationCountries
      .filter((country: string) => !country.startsWith('+') && !/^\d+$/.test(country))
      .map((country: string) => this.getCountryDisplayName(country))
      .filter((country: string) => country !== 'Unknown');
  }

  // Helper methods to convert enums to readable text
  getTicketTypeDisplay(ticketType: TicketType): string {
    switch (ticketType) {
      case TicketType.Deposit:
        return 'Deposit';
      case TicketType.Withdraw:
        return 'Withdraw';
      default:
        return 'Unknown';
    }
  }

  getTicketStatusDisplay(ticketStatus: TicketStatus): string {
    switch (ticketStatus) {
      case TicketStatus.Pending:
        return 'Pending';
      case TicketStatus.Processing:
        return 'Processing';
      case TicketStatus.Completed:
        return 'Completed';
      case TicketStatus.Cancelled:
        return 'Cancelled';
      case TicketStatus.Failed:
        return 'Failed';
      case TicketStatus.Rejected:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  getPaymentTypeDisplay(paymentType: PaymentType | null): string {
    switch (paymentType) {
      case PaymentType.Bonus:
        return 'Bonus';
      case PaymentType.ChargeBack:
        return 'Charge Back';
      case PaymentType.CreditCard:
        return 'Credit Card';
      case PaymentType.Electronic:
        return 'Electronic';
      case PaymentType.External:
        return 'External';
      case PaymentType.InternalTransfer:
        return 'Internal Transfer';
      case PaymentType.Migration:
        return 'Migration';
      case PaymentType.PayRetailers:
        return 'Pay Retailers';
      case PaymentType.Recall:
        return 'Recall';
      case PaymentType.System:
        return 'System';
      case PaymentType.Wire:
        return 'Wire';
      default:
        return 'Unknown';
    }
  }

  getPaymentStatusDisplay(paymentStatus: PaymentStatus | null): string {
    switch (paymentStatus) {
      case PaymentStatus.Completed:
        return 'Completed';
      case PaymentStatus.Approved:
        return 'Approved';
      case PaymentStatus.Failed:
        return 'Failed';
      case PaymentStatus.Rejected:
        return 'Rejected';
      case PaymentStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getTransactionTypeDisplay(transactionType: TransactionType): string {
    switch (transactionType) {
      case TransactionType.Deposit:
        return 'Deposit';
      case TransactionType.Withdrawal:
        return 'Withdrawal';
      case TransactionType.Buy:
        return 'Buy';
      case TransactionType.Sell:
        return 'Sell';
      case TransactionType.Fee:
        return 'Fee';
      case TransactionType.PnLAdjustment:
        return 'PnLAdjustment';
      case TransactionType.Transfer:
        return 'Transfer';
      case TransactionType.CreditIn:
        return 'Credit In';
      case TransactionType.CreditOut:
        return 'Credit Out';
      case TransactionType.MarginLock:
        return 'Margin Lock';
      case TransactionType.Liquidation:
        return 'Liquidation';
      case TransactionType.OrderPlaced:
        return 'Order Placed';
      case TransactionType.PositionClosed:
        return 'Position Closed';
      case TransactionType.PositionClosedWithLoss:
        return 'Position Closed (Loss)';
      case TransactionType.Swap:
        return 'Swap';
      default:
        return 'Unknown';
    }
  }

  getTransactionTypeClass(transactionType: TransactionType): string {
    switch (transactionType) {
      case TransactionType.Deposit:
        return 'bg-green-100 text-green-800';
      case TransactionType.Withdrawal:
        return 'bg-blue-100 text-blue-800';
      case TransactionType.Buy:
        return 'bg-indigo-100 text-indigo-800';
      case TransactionType.Sell:
        return 'bg-pink-100 text-pink-800';
      case TransactionType.Fee:
        return 'bg-yellow-100 text-yellow-800';
      case TransactionType.PnLAdjustment:
        return 'bg-purple-100 text-purple-800';
      case TransactionType.Transfer:
        return 'bg-gray-100 text-gray-800';
      case TransactionType.CreditIn:
        return 'bg-emerald-100 text-emerald-800';
      case TransactionType.CreditOut:
        return 'bg-orange-100 text-orange-800';
      case TransactionType.MarginLock:
        return 'bg-amber-100 text-amber-800';
      case TransactionType.Liquidation:
        return 'bg-red-100 text-red-800';
      case TransactionType.OrderPlaced:
        return 'bg-sky-100 text-sky-800';
      case TransactionType.PositionClosed:
        return 'bg-teal-100 text-teal-800';
      case TransactionType.PositionClosedWithLoss:
        return 'bg-rose-100 text-rose-800';
      case TransactionType.Swap:
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Calculate today's income from transactions
  calculateTodayIncome(transactions: Transaction[]): number {
    if (!transactions || transactions.length === 0) {
      return 0;
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    return transactions
      .filter(transaction => {
        const transactionDate = new Date(transaction.transactionDate);
        return transaction.transactionType === TransactionType.Deposit && transactionDate >= todayStart && transactionDate <= todayEnd;
      })
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  // Calculate monthly deposit income from transactions
  calculateMonthlyDepositIncome(transactions: Transaction[]): number {
    if (!transactions || transactions.length === 0) {
      return 0;
    }

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    return transactions
      .filter(transaction => {
        const transactionDate = new Date(transaction.transactionDate);
        return transaction.transactionType === TransactionType.Deposit && transactionDate >= monthStart && transactionDate <= monthEnd;
      })
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  // Calculate total deposits value
  getTotalDepositsValue(): number {
    if (!this.deposits || this.deposits.length === 0) {
      return 0;
    }
    return this.deposits.reduce((total, deposit) => total + deposit.amount, 0);
  }

  // Calculate total tickets value
  getTotalTicketsValue(): number {
    if (!this.recentTickets || this.recentTickets.length === 0) {
      return 0;
    }
    return this.recentTickets.reduce((total, ticket) => total + ticket.amount, 0);
  }

  // Calculate average ticket value
  getAverageTicketValue(): number {
    if (!this.recentTickets || this.recentTickets.length === 0) {
      return 0;
    }
    const total = this.getTotalTicketsValue();
    return total / this.recentTickets.length;
  }

  // Get ticket status breakdown
  getTicketStatusBreakdown(): Array<{status: string, count: number}> {
    if (!this.recentTickets || this.recentTickets.length === 0) {
      return [];
    }

    const statusCounts: { [key: string]: number } = {};
    
    this.recentTickets.forEach(ticket => {
      const status = this.getTicketStatusDisplay(ticket.ticketStatus);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  }

  // Calculate average deposit value
  getAverageDepositValue(): number {
    if (!this.deposits || this.deposits.length === 0) {
      return 0;
    }
    const total = this.getTotalDepositsValue();
    return total / this.deposits.length;
  }

  // Get deposit status breakdown
  getDepositStatusBreakdown(): Array<{status: string, count: number}> {
    if (!this.deposits || this.deposits.length === 0) {
      return [];
    }

    const statusCounts: { [key: string]: number } = {};
    
    this.deposits.forEach(deposit => {
      const status = this.getPaymentStatusDisplay(deposit.transactionStatus);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  }

  // Helper methods to return background color classes for enums
  getTicketTypeClass(ticketType: TicketType): string {
    switch (ticketType) {
      case TicketType.Deposit:
        return 'bg-green-100 text-green-800';
      case TicketType.Withdraw:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getTicketStatusClass(ticketStatus: TicketStatus): string {
    switch (ticketStatus) {
      case TicketStatus.Pending:
        return 'bg-yellow-100 text-yellow-800';
      case TicketStatus.Processing:
        return 'bg-blue-100 text-blue-800';
      case TicketStatus.Completed:
        return 'bg-green-100 text-green-800';
      case TicketStatus.Cancelled:
        return 'bg-gray-200 text-gray-800';
      case TicketStatus.Failed:
        return 'bg-red-100 text-red-800';
      case TicketStatus.Rejected:
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getPaymentTypeClass(paymentType: PaymentType | null): string {
    switch (paymentType) {
      case PaymentType.Bonus:
        return 'bg-purple-100 text-purple-800';
      case PaymentType.CreditCard:
        return 'bg-blue-100 text-blue-800';
      case PaymentType.Wire:
        return 'bg-green-100 text-green-800';
      case PaymentType.Electronic:
        return 'bg-yellow-100 text-yellow-800';
      case PaymentType.External:
        return 'bg-pink-100 text-pink-800';
      case PaymentType.InternalTransfer:
        return 'bg-gray-100 text-gray-800';
      case PaymentType.Migration:
        return 'bg-orange-100 text-orange-800';
      case PaymentType.PayRetailers:
        return 'bg-indigo-100 text-indigo-800';
      case PaymentType.Recall:
        return 'bg-red-100 text-red-800';
      case PaymentType.System:
        return 'bg-gray-200 text-gray-800';
      case PaymentType.ChargeBack:
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  refreshData(): void {
    this.loadDashboardData();
  }
}
