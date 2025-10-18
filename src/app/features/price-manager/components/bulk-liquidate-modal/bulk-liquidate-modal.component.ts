import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, finalize, tap } from 'rxjs';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { PriceManagerService, TradingAccount } from '../../services/price-manager.service';
import { AlertService } from '../../../../core/services/alert.service';

export interface BulkLiquidateData {
  userId: string;
  userFullName: string;
}

@Component({
  selector: 'app-bulk-liquidate-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-liquidate-modal.component.html',
  styleUrls: ['./bulk-liquidate-modal.component.scss'],
})
export class BulkLiquidateModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() data!: BulkLiquidateData;

  private priceManagerService = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  // Form fields
  tradingAccountId = signal<string>('');
  confirmationText = signal<string>('');

  submitting = signal<boolean>(false);
  loadingAccounts = signal<boolean>(false);
  tradingAccounts = signal<TradingAccount[]>([]);

  ngOnInit(): void {
    // Fetch trading accounts for the user
    this.loadTradingAccounts();
  }

  loadTradingAccounts(): void {
    if (!this.data?.userId) {
      return;
    }

    this.loadingAccounts.set(true);

    this.priceManagerService
      .getClientTradingAccounts(this.data.userId)
      .pipe(
        tap((response: any) => {
          // Handle different response formats (API returns array directly)
          let accounts: TradingAccount[] = [];
          if (Array.isArray(response)) {
            accounts = response;
          } else if (response?.accounts && Array.isArray(response.accounts)) {
            accounts = response.accounts;
          } else if (response?.items && Array.isArray(response.items)) {
            accounts = response.items;
          } else if (response?.data && Array.isArray(response.data)) {
            accounts = response.data;
          }

          this.tradingAccounts.set(accounts);

          // Set default trading account if available
          if (accounts.length > 0) {
            this.tradingAccountId.set(accounts[0].id);
          }
        }),
        catchError((err: any) => {
          console.error('Error loading trading accounts:', err);
          let errorMessage = 'Failed to load trading accounts';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return [];
        }),
        finalize(() => this.loadingAccounts.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isConfirmationValid(): boolean {
    return this.confirmationText().trim().toUpperCase() === 'LIQUIDATE';
  }

  onSubmit(): void {
    // Validate required fields
    if (!this.tradingAccountId()) {
      this.alertService.error('Please select a trading account');
      return;
    }

    if (!this.isConfirmationValid()) {
      this.alertService.error('Please type "LIQUIDATE" to confirm');
      return;
    }

    this.submitting.set(true);

    const requestBody = {
      tradingAccountId: this.tradingAccountId(),
      userId: this.data.userId,
    };

    this.priceManagerService.bulkLiquidate(requestBody)
      .pipe(
        tap(() => {
          this.alertService.success('Bulk liquidation completed successfully');
          this.modalRef.close(true); // Return true to indicate success
        }),
        catchError((err: any) => {
          console.error('Error during bulk liquidation:', err);
          let errorMessage = 'Failed to complete bulk liquidation. Please try again.';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return [];
        }),
        finalize(() => this.submitting.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}

