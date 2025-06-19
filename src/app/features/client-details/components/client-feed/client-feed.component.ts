import { CommonModule } from '@angular/common';
import { Component, OnInit, Input } from '@angular/core';
import { Client } from '../../../clients/models/clients.model';
import { FormsModule } from '@angular/forms';

interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  user: string;
  icon: string;
  color: string;
  metadata?: any;
}

@Component({
  selector: 'app-client-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Activity Feed
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Client activity timeline and system events
        </p>
      </div>

      <!-- Activity Feed -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <div class="flex items-center space-x-3">
              <!-- Filter -->
              <select
                [(ngModel)]="typeFilter"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">All Activities</option>
                <option value="login">Login</option>
                <option value="trade">Trading</option>
                <option value="deposit">Deposits</option>
                <option value="kyc">KYC</option>
                <option value="support">Support</option>
                <option value="system">System</option>
              </select>
              <button
                type="button"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="p-6">
          <div class="flow-root">
            <ul class="-mb-8">
              <li *ngFor="let item of filteredFeed; let last = last">
                <div class="relative pb-8">
                  <span
                    *ngIf="!last"
                    class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                    aria-hidden="true"
                  ></span>
                  <div class="relative flex space-x-3">
                    <div>
                      <span
                        class="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800"
                        [ngClass]="item.color"
                      >
                        <svg
                          class="h-5 w-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <!-- Login Icon -->
                          <path
                            *ngIf="item.icon === 'login'"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                          ></path>
                          <!-- Trade Icon -->
                          <path
                            *ngIf="item.icon === 'trade'"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          ></path>
                          <!-- Deposit Icon -->
                          <path
                            *ngIf="item.icon === 'deposit'"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          ></path>
                          <!-- KYC Icon -->
                          <path
                            *ngIf="item.icon === 'kyc'"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          ></path>
                          <!-- Support Icon -->
                          <path
                            *ngIf="item.icon === 'support'"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          ></path>
                          <!-- System Icon -->
                          <path
                            *ngIf="item.icon === 'system'"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          ></path>
                        </svg>
                      </span>
                    </div>
                    <div
                      class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4"
                    >
                      <div>
                        <p
                          class="text-sm font-medium text-gray-900 dark:text-white"
                        >
                          {{ item.title }}
                        </p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          {{ item.description }}
                        </p>
                        <p
                          class="text-xs text-gray-400 dark:text-gray-500 mt-1"
                        >
                          by {{ item.user }}
                        </p>
                      </div>
                      <div
                        class="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400"
                      >
                        <time [dateTime]="item.timestamp">{{
                          item.timestamp | date : 'short'
                        }}</time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ClientFeedComponent implements OnInit {
  @Input() client!: Client;
  typeFilter = '';

  feed: ActivityFeedItem[] = [
    {
      id: '1',
      type: 'login',
      title: 'Client Login',
      description: 'Client logged in from New York, NY (IP: 192.168.1.1)',
      timestamp: new Date('2024-01-26T08:30:00'),
      user: 'System',
      icon: 'login',
      color: 'bg-blue-500',
    },
    {
      id: '2',
      type: 'trade',
      title: 'Trade Executed',
      description: 'Buy order for EURUSD - 1.5 lots executed at 1.0850',
      timestamp: new Date('2024-01-25T14:15:00'),
      user: 'Trading System',
      icon: 'trade',
      color: 'bg-green-500',
    },
    {
      id: '3',
      type: 'deposit',
      title: 'Deposit Processed',
      description: '$2,500 deposit via Bank Transfer completed',
      timestamp: new Date('2024-01-25T10:20:00'),
      user: 'Payment System',
      icon: 'deposit',
      color: 'bg-purple-500',
    },
    {
      id: '4',
      type: 'kyc',
      title: 'KYC Document Approved',
      description: 'Passport document has been reviewed and approved',
      timestamp: new Date('2024-01-24T16:45:00'),
      user: 'Sarah Johnson',
      icon: 'kyc',
      color: 'bg-green-500',
    },
    {
      id: '5',
      type: 'support',
      title: 'Support Ticket Created',
      description:
        'Client submitted a support request regarding account verification',
      timestamp: new Date('2024-01-24T09:30:00'),
      user: 'Client Portal',
      icon: 'support',
      color: 'bg-yellow-500',
    },
    {
      id: '6',
      type: 'system',
      title: 'Account Created',
      description: 'New trading account TA-001234 created for the client',
      timestamp: new Date('2024-01-15T12:00:00'),
      user: 'System',
      icon: 'system',
      color: 'bg-gray-500',
    },
  ];

  constructor() {}

  ngOnInit(): void {}

  get filteredFeed(): ActivityFeedItem[] {
    let filtered = this.feed;

    if (this.typeFilter) {
      filtered = filtered.filter((item) => item.type === this.typeFilter);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
