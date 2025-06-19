// src/app/features/clients/components/client-details/sections/client-accounts/client-accounts.component.ts

import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { Client } from '../../../clients/models/clients.model';

interface TradingAccount {
  id: string;
  accountNumber: string;
  login: string;
  balance: number;
  credit: number;
  leverage: string;
  marginLevel: number;
  profit: number;
  currency: string;
  platform: string;
  tradingStatus: string;
  createdDate: Date;
  lastActivity: Date;
}

@Component({
  selector: 'app-client-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './client-accounts.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ClientAccountsComponent implements OnInit {
  @Input() client!: Client;

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);

  accountForm: FormGroup;
  showAddForm = false;
  searchTerm = '';
  Math = Math;

  accounts: TradingAccount[] = [
    {
      id: '1',
      accountNumber: 'TA-001234',
      login: '5001234',
      balance: 12450.0,
      credit: 2340.0,
      leverage: '1:100',
      marginLevel: 85.5,
      profit: 450.75,
      currency: 'USD',
      platform: 'MT4',
      tradingStatus: 'active',
      createdDate: new Date('2024-01-15'),
      lastActivity: new Date('2024-01-25T14:30:00'),
    },
    {
      id: '2',
      accountNumber: 'TA-001235',
      login: '5001235',
      balance: 8750.0,
      credit: 0.0,
      leverage: '1:200',
      marginLevel: 120.0,
      profit: -125.3,
      currency: 'EUR',
      platform: 'MT5',
      tradingStatus: 'active',
      createdDate: new Date('2024-01-20'),
      lastActivity: new Date('2024-01-24T09:15:00'),
    },
    {
      id: '3',
      accountNumber: 'TA-001236',
      login: '5001236',
      balance: 0.0,
      credit: 0.0,
      leverage: '1:50',
      marginLevel: 0.0,
      profit: 0.0,
      currency: 'USD',
      platform: 'cTrader',
      tradingStatus: 'inactive',
      createdDate: new Date('2024-02-01'),
      lastActivity: new Date('2024-02-01T10:00:00'),
    },
  ];

  constructor() {
    this.accountForm = this.fb.group({
      accountName: ['', Validators.required],
      currency: ['', Validators.required],
      platform: ['', Validators.required],
      accountType: ['', Validators.required],
      leverage: ['', Validators.required],
      initialDeposit: [0],
      notes: [''],
    });
  }

  ngOnInit(): void {
    // Initialize component
  }

  get filteredAccounts(): TradingAccount[] {
    if (!this.searchTerm) {
      return this.accounts;
    }

    const term = this.searchTerm.toLowerCase();
    return this.accounts.filter(
      (account) =>
        account.accountNumber.toLowerCase().includes(term) ||
        account.login.toLowerCase().includes(term) ||
        account.platform.toLowerCase().includes(term) ||
        account.tradingStatus.toLowerCase().includes(term) ||
        account.currency.toLowerCase().includes(term)
    );
  }

  getActiveAccountsCount(): number {
    return this.accounts.filter((account) => account.tradingStatus === 'active')
      .length;
  }

  getTotalBalance(): number {
    return this.accounts.reduce((total, account) => {
      // Convert all to USD for simplicity (in real app, use exchange rates)
      const rate = account.currency === 'EUR' ? 1.1 : 1; // Mock exchange rate
      return total + account.balance * rate;
    }, 0);
  }

  getTotalProfit(): number {
    return this.accounts.reduce((total, account) => {
      const rate = account.currency === 'EUR' ? 1.1 : 1;
      return total + account.profit * rate;
    }, 0);
  }

  getAverageMarginLevel(): number {
    const activeAccounts = this.accounts.filter(
      (account) => account.tradingStatus === 'active'
    );
    if (activeAccounts.length === 0) return 0;

    const total = activeAccounts.reduce(
      (sum, account) => sum + account.marginLevel,
      0
    );
    return total / activeAccounts.length;
  }

  toggleAddAccount(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.accountForm.reset();
    }
  }

  submitAccount(): void {
    if (this.accountForm.valid) {
      const formData = this.accountForm.value;

      // Generate account number and login
      const accountNumber = `TA-${String(
        Math.floor(Math.random() * 999999)
      ).padStart(6, '0')}`;
      const login = `5${String(Math.floor(Math.random() * 999999)).padStart(
        6,
        '0'
      )}`;

      const newAccount: TradingAccount = {
        id: String(this.accounts.length + 1),
        accountNumber: accountNumber,
        login: login,
        balance: formData.initialDeposit || 0,
        credit: 0,
        leverage: formData.leverage,
        marginLevel: 100,
        profit: 0,
        currency: formData.currency,
        platform: formData.platform,
        tradingStatus: 'active',
        createdDate: new Date(),
        lastActivity: new Date(),
      };

      this.accounts.unshift(newAccount);
      this.accountForm.reset();
      this.showAddForm = false;

      this.alertService.success(
        `Trading account ${accountNumber} created successfully`
      );
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }
}
