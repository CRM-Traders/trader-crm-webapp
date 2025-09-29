import {
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { WalletService } from '../../services/wallet.service';
import {
  DepositRequest,
  TransactionType,
  Wallet,
  WithdrawRequest,
} from '../../models/wallet.model';
import { AdminTradingAccountService } from '../../../client-accounts/services/admin-trading-accounts.service';
import { TradingAccount } from '../../../client-accounts/models/trading-account.model';
import { AlertService } from '../../../../../../core/services/alert.service';

@Component({
  selector: 'app-wallet-transaction-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './wallet-transaction-modal.component.html',
  styleUrls: ['./wallet-transaction-modal.component.scss'],
})
export class WalletTransactionModalComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() isVisible = false;
  @Input() clientId: string | null = null;
  @Input() transactionType: TransactionType = 'deposit';
  @Output() onClose = new EventEmitter<void>();
  @Output() onSuccess = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private walletService = inject(WalletService);
  private adminTradingAccountsService = inject(AdminTradingAccountService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  transactionForm!: FormGroup;
  quickAmounts = [250, 500, 1000, 5000];

  availableWallets: Wallet[] = [];
  loadingWallets = false;

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
        this.loadTradingAccounts();
        this.resetForm();
      } else if (!this.isVisible) {
        this.resetForm();
        this.clearWalletData();
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
    return (
      this.adminTradingAccountsService.loading() &&
      this.tradingAccounts.length === 0
    );
  }

  get selectedAccount(): TradingAccount | null {
    const selectedId = this.transactionForm?.get('tradingAccountId')?.value;
    return (
      this.tradingAccounts.find((account) => account.id === selectedId) || null
    );
  }

  get availableCurrencies(): string[] {
    return this.availableWallets.map((wallet) => wallet.currency);
  }

  get hasWallets(): boolean {
    return this.availableWallets.length > 0;
  }

  private initializeForm(): void {
    this.transactionForm = this.fb.group({
      tradingAccountId: ['', Validators.required],
      currency: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
    });

    this.transactionForm
      .get('tradingAccountId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((accountId: string) => {
        if (accountId) {
          this.loadWalletsForAccount(accountId);
        } else {
          this.clearWalletData();
        }
      });
  }

  private loadTradingAccounts(): void {
    if (!this.clientId) return;

    this.adminTradingAccountsService
      .getUserAccounts(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {},
      });
  }

  private loadWalletsForAccount(accountId: string): void {
    if (!accountId) {
      this.clearWalletData();
      return;
    }

    this.loadingWallets = true;

    this.walletService
      .getWalletsByTradingAccount(accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (wallets: any[]) => {
          this.availableWallets = wallets;
          this.loadingWallets = false;

          this.transactionForm.get('currency')?.setValue('');

          if (wallets.length === 1) {
            this.transactionForm.get('currency')?.setValue(wallets[0].currency);
          }
        },
        error: (error: any) => {
          this.clearWalletData();
          this.loadingWallets = false;
        },
      });
  }

  private clearWalletData(): void {
    this.availableWallets = [];
    this.loadingWallets = false;
    if (this.transactionForm) {
      this.transactionForm.get('currency')?.setValue('');
    }
  }

  private resetForm(): void {
    if (this.transactionForm) {
      this.transactionForm.reset({
        tradingAccountId: '',
        currency: '',
        amount: '',
      });
    }
  }

  submitTransaction(): void {
    if (this.transactionForm.invalid || !this.clientId) {
      return;
    }

    const formValue = this.transactionForm.value;
    const selectedWallet = this.availableWallets.find(
      (w) => w.currency === formValue.currency
    );

    if (!selectedWallet) {
      return;
    }

    if (this.transactionType === 'deposit') {
      const request: DepositRequest = {
        tradingAccountId: formValue.tradingAccountId,
        currency: formValue.currency,
        amount: parseFloat(formValue.amount),
      };

      this.walletService
        .deposit(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.onSuccess.emit();
            this.onModalClose();
          },
          error: (error: unknown) => {
            this.alertService.error(this.getErrorMessage(error));
          },
        });
    } else if (this.transactionType === 'credit') {
      const request: DepositRequest = {
        tradingAccountId: formValue.tradingAccountId,
        currency: formValue.currency,
        amount: parseFloat(formValue.amount),
      };

      this.walletService
        .credit(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.onSuccess.emit();
            this.onModalClose();
          },
          error: (error: unknown) => {
            this.alertService.error(this.getErrorMessage(error));
          },
        });
    } else {
      if (selectedWallet.balance < parseFloat(formValue.amount)) {
        return;
      }

      const request: WithdrawRequest = {
        tradingAccountId: formValue.tradingAccountId,
        currency: formValue.currency,
        amount: parseFloat(formValue.amount),
      };

      this.walletService
        .withdraw(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.onSuccess.emit();
            this.onModalClose();
          },
          error: (error: unknown) => {
            this.alertService.error(this.getErrorMessage(error));
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
      USD: '$',
      EUR: '€',
      GBP: '£',
      BTC: '₿',
      ETH: 'Ξ',
      JPY: '¥',
      AUD: 'A$',
      CAD: 'C$',
      ADA: '₳',
      DOT: '●',
      SOL: '◎',
      AVAX: '🔺',
      MATIC: '⬟',
      LINK: '🔗',
      UNI: '🦄',
      USDT: 'USDT',
    };
    return symbols[currency] || currency;
  }

  getWalletBalance(): number {
    const selectedCurrency = this.transactionForm?.get('currency')?.value;
    const wallet = this.availableWallets.find(
      (w) => w.currency === selectedCurrency
    );
    return wallet ? wallet.balance : 0;
  }

  getMaxWithdrawAmount(): number {
    return this.getWalletBalance();
  }

  setMaxAmount(): void {
    if (this.transactionType === 'withdraw') {
      const maxAmount = this.getMaxWithdrawAmount();
      this.transactionForm.get('amount')?.setValue(maxAmount);
    }
  }

  onModalClose(): void {
    this.resetForm();
    this.clearWalletData();
    this.onClose.emit();
  }

  formatCurrency(amount: number, currency?: string): string {
    const curr =
      currency || this.transactionForm?.get('currency')?.value || 'USD';
    return this.walletService.formatCurrency(amount, curr);
  }

  private getErrorMessage(error: unknown): string {
    const safe: any = error as any;
    const problemDetails = safe?.error ?? safe;
    const detail = problemDetails?.detail;
    const title = problemDetails?.title;
    const message = problemDetails?.message || safe?.message;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (typeof title === 'string' && title.trim() && title !== '400') {
      return title;
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  getName(): string {
    if (this.transactionType === 'deposit') return 'Process Deposit';
    else if (this.transactionType === 'withdraw') return 'Process Withdrawal';
    return 'Process Credit';
  }
}
