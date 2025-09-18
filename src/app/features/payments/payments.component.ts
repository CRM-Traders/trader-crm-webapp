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
import { ModalService } from '../../shared/services/modals/modal.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { Payment } from './models/payment.model';
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
  private modalService = inject(ModalService);
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
      selector: (row: Payment) => row.affiliateId || 'N/A',
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
        { value: 'WITHDRAW', label: 'Withdrawal' },
        { value: 'BONUS', label: 'Bonus' },
        { value: 'REFUND', label: 'Refund' },
      ],
      cellTemplate: null,
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

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Payment) => this.openDetailsModal(item),
      permission: 70, // Adjust permission as needed
    },
    {
      id: 'approve',
      label: 'Approve',
      icon: 'check',
      action: (item: Payment) => this.approvePayment(item),
      permission: 71,
    },
    {
      id: 'reject',
      label: 'Reject',
      icon: 'close',
      action: (item: Payment) => this.rejectPayment(item),
      permission: 72,
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

  onExport(options: any): void {
    const request = {
      ...this.dateRange,
      sortField: options.sortField,
      sortDirection: options.sortDirection,
      globalFilter: options.globalFilter,
    };

    this.paymentsService
      .exportPayments(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to export payments');
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `payments_${
            new Date().toISOString().split('T')[0]
          }.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.alertService.success('Export completed successfully');
        }
      });
  }

  getCountryFlag(countryCode: string): string {
    return this.countryFlags[countryCode] || '🌍';
  }

  onDateRangeChange(): void {
    this.loadPaymentStatistics();
    this.refreshGrid();
  }
}
