// wallet-transaction-modal.component.ts

import { Component, inject, Input, OnDestroy, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { WalletService } from '../../services/wallet.service';
import { DepositRequest, TradingAccountSummary, TransactionType, WithdrawRequest } from '../../models/wallet.model';
import { AdminTradingAccountService } from '../../../client-accounts/services/admin-trading-accounts.service';
import { TradingAccount } from '../../../client-accounts/models/trading-account.model';

@Component({
  selector: 'app-wallet-transaction-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './wallet-transaction-modal.component.html',
  styleUrls: ['./wallet-transaction-modal.component.scss'],
})
export class WalletTransactionModalComponent implements OnInit, OnDestroy, OnChanges {
   @Input() isVisible = false;
  @Input() clientId: string | null = null;
  @Input() transactionType: TransactionType = 'deposit';
  @Output() onClose = new EventEmitter<void>();
  @Output() onSuccess = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private walletService = inject(WalletService);
  private adminTradingAccountsService = inject(AdminTradingAccountService);
  private destroy$ = new Subject<void>();

  transactionForm!: FormGroup;
  quickAmounts = [100, 500, 1000, 5000];
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'BTC', 'ETH'];

  ngOnInit(): void {
    this.initializeForm();

    if (this.isVisible && this.clientId) {
      this.loadTradingAccounts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const visibilityChanged = changes['isVisible'];
    const clientChanged = changes['clientId'];

    if (visibilityChanged || clientChanged) {
      if (this.isVisible && this.clientId) {
        console.log('Loading trading accounts for wallet modal, client:', this.clientId);
        this.loadTradingAccounts();
        this.resetForm();
      } else if (!this.isVisible) {
        console.log('Clearing wallet modal state');
        this.resetForm();
      }
    }
  }

  // Getters for reactive data
  get tradingAccounts(): TradingAccount[] {
    return this.adminTradingAccountsService.accounts();
  }

  get loading(): boolean {
    return this.walletService.loading();
  }

  get loadingAccounts(): boolean {
    return this.adminTradingAccountsService.loading() && this.tradingAccounts.length === 0;
  }

  get selectedAccount(): TradingAccount | null {
    const selectedId = this.transactionForm?.get('tradingAccountId')?.value;
    return this.tradingAccounts.find(account => account.id === selectedId) || null;
  }

  private initializeForm(): void {
    this.transactionForm = this.fb.group({
      tradingAccountId: ['', Validators.required],
      currency: ['USD', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
    });
  }

  private loadTradingAccounts(): void {
    if (!this.clientId) return;

    this.adminTradingAccountsService
      .getUserAccounts(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading trading accounts for wallet:', error);
        },
      });
  }

  private resetForm(): void {
    if (this.transactionForm) {
      this.transactionForm.reset({
        tradingAccountId: '',
        currency: 'USD',
        amount: ''
      });
    }
  }

  submitTransaction(): void {
    if (this.transactionForm.invalid || !this.clientId) {
      return;
    }

    const formValue = this.transactionForm.value;

    if (this.transactionType === 'deposit') {
      const request: DepositRequest = {
        tradingAccountId: formValue.tradingAccountId,
        currency: formValue.currency,
        amount: parseFloat(formValue.amount)
      };

      this.walletService
        .deposit(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.onSuccess.emit();
            this.onModalClose();
          },
          error: (error) => {
            console.error('Error processing deposit:', error);
          },
        });
    } else {
      const request: WithdrawRequest = {
        tradingAccountId: formValue.tradingAccountId,
        currency: formValue.currency,
        amount: parseFloat(formValue.amount)
      };

      this.walletService
        .withdraw(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.onSuccess.emit();
            this.onModalClose();
          },
          error: (error) => {
            console.error('Error processing withdrawal:', error);
          },
        });
    }
  }

  setQuickAmount(amount: number): void {
    this.transactionForm.get('amount')?.setValue(amount);
  }

  getCurrencySymbol(): string {
    const currency = this.transactionForm?.get('currency')?.value;
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'BTC': '₿',
      'ETH': 'Ξ',
      'JPY': '¥',
      'AUD': 'A$',
      'CAD': 'C$',
    };
    return symbols[currency] || '';
  }

  onModalClose(): void {
    console.log('Closing wallet transaction modal');
    this.resetForm();
    this.onClose.emit();
  }

  // Utility methods
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return this.walletService.formatCurrency(amount, currency);
  }
}
