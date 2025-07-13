// wallet-modal.component.ts

import { Component, inject, Input, OnDestroy, OnInit, OnChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { WalletService } from '../../services/wallet.service';
import { 
  WalletSummary, 
  Wallet, 
  CreateWalletRequest, 
  WalletType, 
  WalletStatus 
} from '../../models/wallet.model';
import { AlertService } from '../../../../../../core/services/alert.service';

@Component({
  selector: 'app-wallet-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './wallet-modal.component.html',
  styleUrls: ['./wallet-modal.component.scss'],
})
export class WalletModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isVisible = false;
  @Input() tradingAccountId: string | null = null;
  @Input() accountNumber: string = '';
  @Input() openAddWalletOnStart = false; // New input to auto-open add wallet modal
  @Output() onClose = new EventEmitter<void>();

  private walletService = inject(WalletService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // Expose walletService to template for utility methods
  public walletServicePublic = this.walletService;

  // Form controls
  walletForm: FormGroup;
  
  // Modal states
  showAddWalletModal = false;
  addingWallet = false;
  
  // Search and filter
  searchTerm = '';
  selectedCurrencyFilter = '';

  // Remove wallet type filter since it's not in the API response
  // selectedWalletType = '';

  constructor() {
    this.walletForm = this.fb.group({
      currency: ['', [Validators.required]],
      // Remove walletType since it's not in the basic API
      // walletType: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    if (this.isVisible && this.tradingAccountId) {
      this.loadWallets();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(): void {
    if (this.isVisible && this.tradingAccountId) {
      this.loadWallets();
    } else if (!this.isVisible) {
      this.walletService.clearWallets();
    }
  }

  // Getters for reactive data
  get walletSummary(): WalletSummary | null {
    return this.walletService.walletSummary();
  }

  get wallets(): Wallet[] {
    return this.walletService.wallets();
  }

  get loading(): boolean {
    return this.walletService.loading();
  }

  get filteredWallets(): Wallet[] {
    let filtered = this.wallets;

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter((wallet) => {
        return (
          wallet.currency.toLowerCase().includes(searchLower) ||
          this.walletServicePublic.getCurrencyDisplayName(wallet.currency).toLowerCase().includes(searchLower) ||
          wallet.totalBalance.toString().includes(searchLower) ||
          wallet.availableBalance.toString().includes(searchLower) ||
          wallet.lockedBalance.toString().includes(searchLower) ||
          wallet.usdEquivalent.toString().includes(searchLower)
        );
      });
    }

    // Apply currency filter
    if (this.selectedCurrencyFilter) {
      filtered = filtered.filter(
        (wallet) => wallet.currency === this.selectedCurrencyFilter
      );
    }

    return filtered;
  }

  // Get unique currencies for filter dropdown
  get availableCurrencies(): string[] {
    return [...new Set(this.wallets.map(w => w.currency))].sort();
  }

  private loadWallets(): void {
    if (!this.tradingAccountId) return;

    this.walletService
      .getWallets(this.tradingAccountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Wallet data is already set in the service via signals
          // No need to manually set it here since we're using reactive signals
        },
        error: (error) => {
          console.error('Error loading wallets:', error);
        },
      });
  }

  refreshWallets(): void {
    if (this.tradingAccountId) {
      this.walletService.refreshWallets(this.tradingAccountId);
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCurrencyFilter = '';
  }

  closeModal(): void {
    this.onClose.emit();
    this.walletService.clearWallets();
    // this.resetForms();
  }

  // Add Wallet Modal Methods
  toggleAddWalletModal(): void {
    this.showAddWalletModal = !this.showAddWalletModal;
    if (!this.showAddWalletModal) {
      this.walletForm.reset();
    }
  }

  submitWallet(): void {
    if (this.walletForm.valid && this.tradingAccountId) {
      this.addingWallet = true;
      const formData = this.walletForm.value;

      const request: CreateWalletRequest = {
        currency: formData.currency,
        tradingAccountId: this.tradingAccountId,
      };

      this.walletService
        .createWallet(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newWallet) => {
            this.alertService.success(`${newWallet.currency} wallet created successfully`);
            this.toggleAddWalletModal();
            this.loadWallets(); // Refresh wallets after creation
            this.addingWallet = false;
          },
          error: (error) => {
            console.error('Error creating wallet:', error);
            this.alertService.error('Failed to create wallet');
            this.addingWallet = false;
          },
        });
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }

  // Utility Methods
  formatCurrency(amount: number): string {
    return this.walletService.formatCurrency(amount);
  }

  formatDateTime(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  getWalletTypeColorClass(walletType: string): string {
    const colorMap: Record<string, string> = {
      'SPOT': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'FUTURES': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'MARGIN': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colorMap[walletType] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  getWalletStatusColorClass(status: string): string {
    const colorMap: Record<string, string> = {
      'ACTIVE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'SUSPENDED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'MAINTENANCE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'INACTIVE': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }


}