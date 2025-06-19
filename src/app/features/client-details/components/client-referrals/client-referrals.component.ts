import { CommonModule } from '@angular/common';
import { Component, OnInit, Input } from '@angular/core';
import { Client } from '../../../clients/models/clients.model';
import { FormsModule } from '@angular/forms';

interface Referral {
  id: string;
  referredClientId: string;
  referredClientName: string;
  referredClientEmail: string;
  registrationDate: Date;
  firstDepositDate?: Date;
  firstDepositAmount?: number;
  totalDeposits: number;
  status: string;
  commissionEarned: number;
  currency: string;
}

@Component({
  selector: 'app-client-referrals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-referrals.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ClientReferralsComponent implements OnInit {
  @Input() client!: Client;
  searchTerm = '';
  statusFilter = '';

  referrals: Referral[] = [
    {
      id: '1',
      referredClientId: 'REF-001',
      referredClientName: 'Alice Johnson',
      referredClientEmail: 'alice.johnson@email.com',
      registrationDate: new Date('2024-01-20T10:30:00'),
      firstDepositDate: new Date('2024-01-21T14:20:00'),
      firstDepositAmount: 1000,
      totalDeposits: 5000,
      status: 'active',
      commissionEarned: 250,
      currency: 'USD',
    },
    {
      id: '2',
      referredClientId: 'REF-002',
      referredClientName: 'Bob Smith',
      referredClientEmail: 'bob.smith@email.com',
      registrationDate: new Date('2024-01-22T16:45:00'),
      firstDepositDate: new Date('2024-01-23T09:15:00'),
      firstDepositAmount: 500,
      totalDeposits: 1500,
      status: 'active',
      commissionEarned: 75,
      currency: 'USD',
    },
    {
      id: '3',
      referredClientId: 'REF-003',
      referredClientName: 'Carol Davis',
      referredClientEmail: 'carol.davis@email.com',
      registrationDate: new Date('2024-01-25T11:20:00'),
      totalDeposits: 0,
      status: 'registered',
      commissionEarned: 0,
      currency: 'USD',
    },
  ];

  constructor() {}

  ngOnInit(): void {}

  get filteredReferrals(): Referral[] {
    let filtered = this.referrals;

    if (this.statusFilter) {
      filtered = filtered.filter(
        (referral) => referral.status === this.statusFilter
      );
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (referral) =>
          referral.referredClientName.toLowerCase().includes(term) ||
          referral.referredClientEmail.toLowerCase().includes(term)
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.registrationDate).getTime() -
        new Date(a.registrationDate).getTime()
    );
  }

  getActiveReferralsCount(): number {
    return this.referrals.filter((referral) => referral.status === 'active')
      .length;
  }

  getTotalCommission(): number {
    return this.referrals.reduce(
      (total, referral) => total + referral.commissionEarned,
      0
    );
  }

  getAverageDeposit(): number {
    const depositsWithValue = this.referrals.filter(
      (referral) => referral.totalDeposits > 0
    );
    if (depositsWithValue.length === 0) return 0;

    const total = depositsWithValue.reduce(
      (sum, referral) => sum + referral.totalDeposits,
      0
    );
    return total / depositsWithValue.length;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase();
  }
}
