// portfolio-modal.component.ts

import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { Portfolio } from '../../models/portfolio.model';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss'],
})
export class PortfolioComponent implements OnInit, OnDestroy {
  @Input() isVisible = false;
  @Input() tradingAccountId: string | null = null;

  private portfolioService = inject(PortfolioService);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Load portfolio when modal becomes visible and we have an account ID
    if (this.isVisible && this.tradingAccountId) {
      this.loadPortfolio();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(): void {
    // Load portfolio when modal becomes visible or account changes
    if (this.isVisible && this.tradingAccountId) {
      this.loadPortfolio();
    } else if (!this.isVisible) {
      // Clear portfolio when modal is hidden
      this.portfolioService.clearPortfolio();
    }
  }

  // Getters for reactive data
  get portfolio(): Portfolio | null {
    return this.portfolioService.portfolio();
  }

  get loading(): boolean {
    return this.portfolioService.loading();
  }

  private loadPortfolio(): void {
    if (!this.tradingAccountId) return;

    this.portfolioService
      .getPortfolio(this.tradingAccountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading portfolio:', error);
        },
      });
  }

  refreshPortfolio(): void {
    if (this.tradingAccountId) {
      this.portfolioService.refreshPortfolio(this.tradingAccountId);
    }
  }

  closeModal(): void {
    this.isVisible = false;
    this.portfolioService.clearPortfolio();
    // Emit close event to parent component
    this.onClose();
  }

  onClose(): void {
    // This method should be overridden by parent component or use @Output
    // For now, we'll just set isVisible to false
    this.isVisible = false;
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return this.portfolioService.formatCurrency(amount);
  }

  formatPercentage(value: number): string {
    return this.portfolioService.formatPercentage(value);
  }

  formatBalance(balance: number, currency: string): string {
    return this.portfolioService.formatBalance(balance, currency);
  }

  getPnLColorClass(value: number): string {
    return this.portfolioService.getPnLColorClass(value);
  }

  getCurrencyTypeDisplay(currency: string): string {
    return this.portfolioService.getCurrencyTypeDisplay(currency);
  }

  getCurrencyTypeColorClass(currency: string): string {
    return this.portfolioService.getCurrencyTypeColorClass(currency);
  }

  getNonZeroHoldings(): any[] {
    if (!this.portfolio) return [];
    return this.portfolioService.getNonZeroHoldings(this.portfolio.holdings);
  }

  formatDateTime(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }
}
