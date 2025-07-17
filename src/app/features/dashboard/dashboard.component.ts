// dashboard.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DashboardService } from './services/dashboard.services';
import { DashboardData, OfficeDashboardStats, DepositStat, Transaction, UserTicket, PaymentType, PaymentStatus, TransactionType, DepositType, TicketType, TicketStatus } from './models/dashboard.models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: true,
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

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

  loadOfficeDashboardStats(): void {
    this.dashboardService.getOfficeDashboardStats().subscribe({
      next: (data: OfficeDashboardStats) => {
        this.officeDashboardStats = data;
        // Set monthlyDepositIncome and todayIncome from depositStats
        if (data && Array.isArray(data.depositStats)) {
          const thisMonth = data.depositStats.find((ds: DepositStat) => ds.depositTypeEnum === DepositType.ThisMonth);
          const today = data.depositStats.find((ds: DepositStat) => ds.depositTypeEnum === DepositType.Today);
          this.monthlyDepositIncome = thisMonth ? thisMonth.amount : 0;
          this.todayIncome = today ? today.amount : 0;
          this.leadsTraffic = data.depositStats;
          this.productivityStats = data.depositStats;
        }
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

  getPaymentTypeDisplay(paymentType: PaymentType): string {
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

  getPaymentStatusDisplay(paymentStatus: PaymentStatus): string {
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
      default:
        return 'Unknown';
    }
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

  getPaymentTypeClass(paymentType: PaymentType): string {
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
