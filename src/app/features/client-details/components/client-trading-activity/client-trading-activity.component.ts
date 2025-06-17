import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { Client } from '../../../clients/models/clients.model';

interface TradingActivity {
  id: string;
  tradeId: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  closePrice?: number;
  profit?: number;
  status: string;
  openTime: Date;
  closeTime?: Date;
  comment?: string;
}

@Component({
  selector: 'app-client-trading-activity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Trading Activity
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          View client's trading history and performance
        </p>
      </div>

      <!-- Trading Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          class="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-6"
        >
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-green-200 dark:bg-green-700">
              <svg
                class="w-6 h-6 text-green-600 dark:text-green-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-800 dark:text-green-200">
                Total Trades
              </p>
              <p class="text-2xl font-bold text-green-900 dark:text-green-100">
                {{ trades.length }}
              </p>
              <p class="text-xs text-green-700 dark:text-green-300">
                This month
              </p>
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-6"
        >
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-blue-200 dark:bg-blue-700">
              <svg
                class="w-6 h-6 text-blue-600 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
                Total Volume
              </p>
              <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {{ getTotalVolume() }}
              </p>
              <p class="text-xs text-blue-700 dark:text-blue-300">
                Lots traded
              </p>
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-6"
        >
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-purple-200 dark:bg-purple-700">
              <svg
                class="w-6 h-6 text-purple-600 dark:text-purple-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p
                class="text-sm font-medium text-purple-800 dark:text-purple-200"
              >
                Win Rate
              </p>
              <p
                class="text-2xl font-bold text-purple-900 dark:text-purple-100"
              >
                {{ getWinRate() }}%
              </p>
              <p class="text-xs text-purple-700 dark:text-purple-300">
                Success ratio
              </p>
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-6"
        >
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-orange-200 dark:bg-orange-700">
              <svg
                class="w-6 h-6 text-orange-600 dark:text-orange-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p
                class="text-sm font-medium text-orange-800 dark:text-orange-200"
              >
                Net P&L
              </p>
              <p
                class="text-2xl font-bold"
                [ngClass]="{
                  'text-green-900 dark:text-green-100': getTotalProfit() >= 0,
                  'text-red-900 dark:text-red-100': getTotalProfit() < 0
                }"
              >
                {{ getTotalProfit() | currency : 'USD' }}
              </p>
              <p class="text-xs text-orange-700 dark:text-orange-300">
                Total profit/loss
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Trading Activity Grid -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Trades
            </h3>
            <div class="flex items-center space-x-3">
              <!-- Search -->
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                >
                  <svg
                    class="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                  </svg>
                </div>
                <input
                  type="text"
                  [(ngModel)]="searchTerm"
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Search trades..."
                />
              </div>
              <button
                type="button"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table
            class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          >
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Trade ID
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Symbol
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Volume
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Open Price
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Close Price
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Profit/Loss
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Open Time
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Close Time
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
            >
              <tr
                *ngFor="let trade of filteredTrades"
                class="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400"
                >
                  {{ trade.tradeId }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {{ trade.symbol }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        trade.type === 'buy',
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                        trade.type === 'sell'
                    }"
                  >
                    {{ trade.type | uppercase }}
                  </span>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ trade.volume }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ trade.openPrice | number : '1.5-5' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{
                    trade.closePrice
                      ? (trade.closePrice | number : '1.5-5')
                      : '-'
                  }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-semibold"
                  [ngClass]="{
                    'text-green-600 dark:text-green-400':
                      trade.profit && trade.profit >= 0,
                    'text-red-600 dark:text-red-400':
                      trade.profit && trade.profit < 0,
                    'text-gray-500 dark:text-gray-400': !trade.profit
                  }"
                >
                  {{ trade.profit ? (trade.profit | currency : 'USD') : '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200':
                        trade.status === 'open',
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        trade.status === 'closed' &&
                        trade.profit &&
                        trade.profit >= 0,
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                        trade.status === 'closed' &&
                        trade.profit &&
                        trade.profit < 0,
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200':
                        trade.status === 'cancelled'
                    }"
                  >
                    {{ trade.status | titlecase }}
                  </span>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ trade.openTime | date : 'short' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  {{
                    trade.closeTime ? (trade.closeTime | date : 'short') : '-'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
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
export class ClientTradingActivityComponent implements OnInit {
  @Input() client!: Client;

  private alertService = inject(AlertService);
  searchTerm = '';

  trades: TradingActivity[] = [
    {
      id: '1',
      tradeId: 'T001234',
      symbol: 'EURUSD',
      type: 'buy',
      volume: 1.5,
      openPrice: 1.085,
      closePrice: 1.0875,
      profit: 375.0,
      status: 'closed',
      openTime: new Date('2024-01-25T10:30:00'),
      closeTime: new Date('2024-01-25T14:15:00'),
      comment: 'Good trend following trade',
    },
    {
      id: '2',
      tradeId: 'T001235',
      symbol: 'GBPUSD',
      type: 'sell',
      volume: 2.0,
      openPrice: 1.265,
      closePrice: 1.262,
      profit: 600.0,
      status: 'closed',
      openTime: new Date('2024-01-24T09:45:00'),
      closeTime: new Date('2024-01-24T16:30:00'),
    },
    {
      id: '3',
      tradeId: 'T001236',
      symbol: 'USDJPY',
      type: 'buy',
      volume: 1.0,
      openPrice: 149.5,
      status: 'open',
      openTime: new Date('2024-01-26T08:00:00'),
    },
    {
      id: '4',
      tradeId: 'T001237',
      symbol: 'AUDUSD',
      type: 'sell',
      volume: 0.5,
      openPrice: 0.675,
      closePrice: 0.678,
      profit: -150.0,
      status: 'closed',
      openTime: new Date('2024-01-23T13:20:00'),
      closeTime: new Date('2024-01-23T15:45:00'),
    },
  ];

  constructor() {}

  ngOnInit(): void {
    // Initialize component
  }

  get filteredTrades(): TradingActivity[] {
    if (!this.searchTerm) {
      return this.trades;
    }

    const term = this.searchTerm.toLowerCase();
    return this.trades.filter(
      (trade) =>
        trade.tradeId.toLowerCase().includes(term) ||
        trade.symbol.toLowerCase().includes(term) ||
        trade.type.toLowerCase().includes(term) ||
        trade.status.toLowerCase().includes(term)
    );
  }

  getTotalVolume(): number {
    return this.trades.reduce((total, trade) => total + trade.volume, 0);
  }

  getWinRate(): number {
    const closedTrades = this.trades.filter(
      (trade) => trade.status === 'closed' && trade.profit !== undefined
    );
    const winningTrades = closedTrades.filter((trade) => trade.profit! > 0);

    return closedTrades.length > 0
      ? Math.round((winningTrades.length / closedTrades.length) * 100)
      : 0;
  }

  getTotalProfit(): number {
    return this.trades
      .filter((trade) => trade.profit !== undefined)
      .reduce((total, trade) => total + trade.profit!, 0);
  }
}
