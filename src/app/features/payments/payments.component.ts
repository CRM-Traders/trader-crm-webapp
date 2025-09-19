import {
  Component,
  OnInit,
  ViewChild,
  TemplateRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { Payment, TransactionType } from './models/payment.model';
import { PaymentsService } from './services/payments.service';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss'],
})
export class PaymentsComponent implements OnInit, OnDestroy {
  private paymentsService = inject(PaymentsService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  private destroy$ = new Subject<void>();
  gridId = 'payments-grid';

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;
  @ViewChild('paymentTypeCell', { static: true })
  paymentTypeCellTemplate!: TemplateRef<any>;
  @ViewChild('countryCell', { static: true })
  countryCellTemplate!: TemplateRef<any>;
  @ViewChild('amountCell', { static: true })
  amountCellTemplate!: TemplateRef<any>;
  @ViewChild('clientCell', { static: true })
  clientCellTemplate!: TemplateRef<any>;

  // Statistics
  totalTransactions = 0;
  totalVolume = 0;
  pendingCount = 0;
  completedCount = 0;
  withdrawalsCount = 0;
  depositsCount = 0;

  // Filters
  dateRange = {
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  };

  gridColumns: GridColumn[] = [
    {
      field: 'transactionId',
      header: 'Transaction',
      sortable: true,
      filterable: true,
      cellClass: 'font-mono text-xs text-gray-600',
    },
    {
      field: 'client',
      header: 'Client',
      sortable: true,
      filterable: true,
      cellTemplate: null,
    },
    {
      field: 'affiliate',
      header: 'Affiliate',
      sortable: true,
      filterable: true,
      selector: (row: Payment) => row.affiliate || 'N/A',
      cellClass: 'text-xs text-gray-500',
    },
    {
      field: 'originalAgent',
      header: 'Original Agent',
      sortable: true,
      filterable: true,
      selector: (row: Payment) => row.originalAgent || 'N/A',
    },
    {
      field: 'country',
      header: 'Country',
      sortable: true,
      filterable: true,
      filterType: 'select',
      cellTemplate: null,
    },
    {
      field: 'paymentType',
      header: 'Payment Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'DEPOSIT', label: 'Deposit' },
        { value: 'WITHDRAWAL', label: 'Withdrawal' },
        { value: 'BUY', label: 'Buy' },
        { value: 'SELL', label: 'Sell' },
        { value: 'FEE', label: 'Fee' },
        { value: 'PNL ADJUSTMENT', label: 'PnL Adjustment' },
        { value: 'TRANSFER', label: 'Transfer' },
        { value: 'CREDIT IN', label: 'Credit In' },
        { value: 'CREDIT OUT', label: 'Credit Out' },
        { value: 'MARGIN LOCK', label: 'Margin Lock' },
        { value: 'LIQUIDATION', label: 'Liquidation' },
        { value: 'ORDER PLACED', label: 'Order Placed' },
        { value: 'POSITION CLOSED', label: 'Position Closed' },
        { value: 'POSITION CLOSED (LOSS)', label: 'Position Closed (Loss)' },
        { value: 'SWAP', label: 'Swap' },
      ],
    },
    {
      field: 'amount',
      header: 'Amount',
      sortable: true,
      filterable: true,
      cellTemplate: null,
      type: 'currency',
    },
    {
      field: 'tradingAccount',
      header: 'Trading Acc',
      sortable: true,
      filterable: true,
      cellClass: 'font-mono text-xs',
    },
    {
      field: 'paymentAggregator',
      header: 'Payment Aggregator',
      sortable: true,
      filterable: true,
      selector: (row: Payment) => row.paymentAggregator || '—',
    },
    {
      field: 'paymentMethod',
      header: 'Payment Method',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'ELECTRONIC', label: 'Electronic' },
        { value: 'BONUS', label: 'Bonus' },
        { value: 'CARD', label: 'Card' },
        { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
        { value: 'CRYPTO', label: 'Cryptocurrency' },
      ],
    },
    {
      field: 'dateTime',
      header: 'Date & Time',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
    },
    {
      field: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'PENDING', label: 'Pending' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'FAILED', label: 'Failed' },
        { value: 'CANCELLED', label: 'Cancelled' },
      ],
      cellTemplate: null,
    },
  ];

  // Country flags mapping
  countryFlags: { [key: string]: string } = {
    DE: '🇩🇪',
    AT: '🇦🇹',
    US: '🇺🇸',
    GB: '🇬🇧',
    FR: '🇫🇷',
    ES: '🇪🇸',
    IT: '🇮🇹',
    NL: '🇳🇱',
    CH: '🇨🇭',
    // Add more as needed
  };

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadPaymentStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeGridTemplates(): void {
    const statusColumn = this.gridColumns.find((col) => col.field === 'status');
    if (statusColumn) {
      statusColumn.cellTemplate = this.statusCellTemplate;
    }

    const paymentTypeColumn = this.gridColumns.find(
      (col) => col.field === 'paymentType'
    );
    if (paymentTypeColumn) {
      paymentTypeColumn.cellTemplate = this.paymentTypeCellTemplate;
    }

    const countryColumn = this.gridColumns.find(
      (col) => col.field === 'country'
    );
    if (countryColumn) {
      countryColumn.cellTemplate = this.countryCellTemplate;
    }

    const amountColumn = this.gridColumns.find((col) => col.field === 'amount');
    if (amountColumn) {
      amountColumn.cellTemplate = this.amountCellTemplate;
    }

    const clientColumn = this.gridColumns.find((col) => col.field === 'client');
    if (clientColumn) {
      clientColumn.cellTemplate = this.clientCellTemplate;
    }
  }

  private loadPaymentStatistics(): void {
    this.paymentsService
      .getPaymentStatistics(this.dateRange)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load payment statistics');
          return of(null);
        })
      )
      .subscribe((stats: any) => {
        if (stats) {
          this.totalTransactions = stats.totalTransactions;
          this.totalVolume = stats.totalVolume;
          this.pendingCount = stats.pendingCount;
          this.completedCount = stats.completedCount;
          this.withdrawalsCount = stats.withdrawalsCount;
          this.depositsCount = stats.depositsCount;
        }
      });
  }

  onRowClick(payment: Payment): void {
    // this.openDetailsModal(payment);
  }

  onRowDoubleClick(payment: any): void {
    // Navigate to detailed transaction view if needed
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/payments', payment.transactionId])
    );
    window.open(url, '_blank');
  }

  openDetailsModal(payment: any): void {
    // const modalRef = this.modalService.open(
    //   PaymentDetailsModalComponent,
    //   {
    //     size: 'lg',
    //     centered: true,
    //     closable: true,
    //   },
    //   {
    //     payment: payment,
    //   }
    // );
    // modalRef.result.then(
    //   (result) => {
    //     if (result) {
    //       this.refreshGrid();
    //       this.loadPaymentStatistics();
    //     }
    //   },
    //   () => {}
    // );
  }

  approvePayment(payment: Payment): void {
    if (
      confirm(
        `Are you sure you want to approve payment ${payment.transactionId}?`
      )
    ) {
      this.paymentsService
        .approvePayment(payment.transactionId)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to approve payment');
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result) {
            this.alertService.success('Payment approved successfully');
            this.refreshGrid();
            this.loadPaymentStatistics();
          }
        });
    }
  }

  rejectPayment(payment: Payment): void {
    if (
      confirm(
        `Are you sure you want to reject payment ${payment.transactionId}?`
      )
    ) {
      this.paymentsService
        .rejectPayment(payment.transactionId)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to reject payment');
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result) {
            this.alertService.success('Payment rejected successfully');
            this.refreshGrid();
            this.loadPaymentStatistics();
          }
        });
    }
  }

  refreshGrid(): void {
    const event = new CustomEvent('refreshGrid', {
      detail: { gridId: this.gridId },
    });
    window.dispatchEvent(event);
  }

  getCountryFlag(countryCode: string): string {
    return this.countryFlags[countryCode] || '🌍';
  }

  onDateRangeChange(): void {
    this.loadPaymentStatistics();
    this.refreshGrid();
  }

  // Transaction type helpers to render enum-based labels and colors
  getTransactionTypeDisplay(type: number | string | null | undefined): string {
    if (type === null || type === undefined) return 'Unknown';

    // If backend returns numeric enum values
    if (typeof type === 'number') {
      switch (type as TransactionType) {
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
          return 'PnL Adjustment';
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

    // If backend returns numeric enum as string like "12"
    if (/^\d+$/.test(type)) {
      const numeric = parseInt(type, 10);
      return this.getTransactionTypeDisplay(numeric);
    }

    // If backend returns uppercase strings
    switch (type) {
      case 'DEPOSIT':
        return 'Deposit';
      case 'WITHDRAW':
      case 'WITHDRAWAL':
        return 'Withdrawal';
      case 'BUY':
        return 'Buy';
      case 'SELL':
        return 'Sell';
      default:
        return 'Unknown';
    }
  }

  getTransactionTypeClass(type: number | string | null | undefined): string {
    if (type === null || type === undefined) return 'bg-gray-100 text-gray-800';

    if (typeof type === 'number') {
      switch (type as TransactionType) {
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

    // Numeric enum as string like "12"
    if (/^\d+$/.test(type)) {
      const numeric = parseInt(type, 10);
      return this.getTransactionTypeClass(numeric);
    }

    switch (type) {
      case 'DEPOSIT':
        return 'bg-green-100 text-green-800';
      case 'WITHDRAW':
      case 'WITHDRAWAL':
        return 'bg-blue-100 text-blue-800';
      case 'BUY':
        return 'bg-indigo-100 text-indigo-800';
      case 'SELL':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
