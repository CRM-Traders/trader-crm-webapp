// add-wallet-modal.component.ts

import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
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
import { CreateWalletRequest, Wallet } from '../../models/wallet.model';
import { AlertService } from '../../../../../../core/services/alert.service';

@Component({
  selector: 'app-add-wallet-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-wallet-modal.component.html',
  styleUrls: ['./add-wallet-modal.component.scss'],
})
export class AddWalletModalComponent implements OnDestroy {
  @Input() isVisible = false;
  @Input() tradingAccountId: string | null = null;
  @Input() existingCurrencies: string[] = [];
  @Output() onClose = new EventEmitter<void>();
  @Output() onWalletCreated = new EventEmitter<Wallet>();

  private walletService = inject(WalletService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  walletForm: FormGroup;
  isCreating = false;

  constructor() {
    this.walletForm = this.fb.group({
      currency: ['', [Validators.required]],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeModal(): void {
    if (this.isCreating) return; // Prevent closing while creating

    this.onClose.emit();
    this.resetForm();
  }

  submitWallet(): void {
    if (this.walletForm.valid && this.tradingAccountId) {
      const formData = this.walletForm.value;

      // Check if currency already exists
      if (this.existingCurrencies.includes(formData.currency)) {
        this.alertService.error(
          `${formData.currency} wallet already exists for this account`
        );
        return;
      }

      this.isCreating = true;

      const request: CreateWalletRequest = {
        currency: formData.currency,
        tradingAccountId: this.tradingAccountId,
      };

      this.walletService
        .createWallet(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newWallet) => {
            this.alertService.success(
              `${formData.currency} wallet created successfully`
            );
            this.onWalletCreated.emit(newWallet);
            this.closeModal();
            this.isCreating = false;
          },
          error: (error) => {
            console.error('Error creating wallet:', error);
            // Display the specific error message from the backend
            let errorMessage = 'Wallet already exists or an error occurred.';

            if (error.error && error.error.detail) {
              // Extract the detail message from the backend response
              errorMessage = error.error.detail;
            } else if (error.message) {
              errorMessage = error.message;
            }

            this.alertService.error(errorMessage);
            this.isCreating = false;
          },
        });
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }

  private resetForm(): void {
    this.walletForm.reset();
    this.isCreating = false;
  }

  // Get available currencies (exclude existing ones)
  get availableCurrencies(): Array<{ value: string; label: string }> {
    const allCurrencies = [
      { value: 'BTC', label: 'Bitcoin (BTC)' },
      { value: 'ETH', label: 'Ethereum (ETH)' },
      { value: 'USDT', label: 'Tether (USDT)' },
      { value: 'USDC', label: 'USD Coin (USDC)' },
      { value: 'BNB', label: 'Binance Coin (BNB)' },
      { value: 'ADA', label: 'Cardano (ADA)' },
      { value: 'SOL', label: 'Solana (SOL)' },
      { value: 'DOT', label: 'Polkadot (DOT)' },
      { value: 'MATIC', label: 'Polygon (MATIC)' },
      { value: 'LINK', label: 'Chainlink (LINK)' },
      { value: 'UNI', label: 'Uniswap (UNI)' },
      { value: 'AAVE', label: 'Aave (AAVE)' },
      { value: 'XRP', label: 'Ripple (XRP)' },
      { value: 'LTC', label: 'Litecoin (LTC)' },
      { value: 'BCH', label: 'Bitcoin Cash (BCH)' },
      { value: 'DOGE', label: 'Dogecoin (DOGE)' },
    ];

    return allCurrencies.filter(
      (currency) => !this.existingCurrencies.includes(currency.value)
    );
  }

  // Check if all currencies are already added
  get allCurrenciesAdded(): boolean {
    return this.availableCurrencies.length === 0;
  }
}
