import { CommonModule } from '@angular/common';
import { Component, OnInit, Input } from '@angular/core';
import { Client } from '../../../clients/models/clients.model';
import { FormsModule } from '@angular/forms';

interface CallRecord {
  id: string;
  callId: string;
  type: string;
  direction: string;
  duration: number;
  outcome: string;
  callDate: Date;
  operatorName: string;
  phoneNumber: string;
  notes?: string;
  recordingUrl?: string;
}

@Component({
  selector: 'app-client-call-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Call History
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          View all phone communications with the client
        </p>
      </div>

      <!-- Call History Grid -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Call Records
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
                  class="block w-full !pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Search calls..."
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table
            class="min-w-full divide-y divide-gray-200 dark:divide-gray-700/30"
          >
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Call ID
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Direction
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Duration
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Outcome
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Operator
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Phone
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Date & Time
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Notes
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700/30"
            >
              <tr
                *ngFor="let call of filteredCalls"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400"
                >
                  {{ call.callId }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {{ call.type | titlecase }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        call.direction === 'outbound',
                      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200':
                        call.direction === 'inbound'
                    }"
                  >
                    {{ call.direction | titlecase }}
                  </span>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ formatDuration(call.duration) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        call.outcome === 'successful',
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                        call.outcome === 'voicemail',
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                        call.outcome === 'no-answer'
                    }"
                  >
                    {{ call.outcome | titlecase }}
                  </span>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ call.operatorName }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono"
                >
                  {{ call.phoneNumber }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ call.callDate | date : 'short' }}
                </td>
                <td
                  class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs"
                >
                  <div class="truncate" [title]="call.notes">
                    {{ call.notes || '-' }}
                  </div>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  <div class="flex items-center space-x-2">
                    <button
                      type="button"
                      *ngIf="call.recordingUrl"
                      class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      title="Play Recording"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10v4a1 1 0 001 1h1.586a1 1 0 00.707-.293l2.414-2.414A1 1 0 0015 12V8a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0011.586 5H10a1 1 0 00-1 1v4z"
                        ></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                      title="View Details"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        ></path>
                      </svg>
                    </button>
                  </div>
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
export class ClientCallHistoryComponent implements OnInit {
  @Input() client!: Client;
  searchTerm = '';

  calls: CallRecord[] = [
    {
      id: '1',
      callId: 'CALL-001',
      type: 'sales',
      direction: 'outbound',
      duration: 1230, // seconds
      outcome: 'successful',
      callDate: new Date('2024-01-25T14:30:00'),
      operatorName: 'John Smith',
      phoneNumber: '+1 555 123 4567',
      notes: 'Discussed new investment opportunities and portfolio management',
      recordingUrl: '/recordings/call-001.mp3',
    },
    {
      id: '2',
      callId: 'CALL-002',
      type: 'support',
      direction: 'inbound',
      duration: 845,
      outcome: 'successful',
      callDate: new Date('2024-01-24T10:15:00'),
      operatorName: 'Sarah Johnson',
      phoneNumber: '+1 555 123 4567',
      notes: 'Client inquired about account verification process',
    },
    {
      id: '3',
      callId: 'CALL-003',
      type: 'follow-up',
      direction: 'outbound',
      duration: 0,
      outcome: 'no-answer',
      callDate: new Date('2024-01-23T16:45:00'),
      operatorName: 'Mike Brown',
      phoneNumber: '+1 555 123 4567',
      notes: 'Follow-up call regarding KYC documents - no answer',
    },
  ];

  constructor() {}

  ngOnInit(): void {}

  get filteredCalls(): CallRecord[] {
    if (!this.searchTerm) {
      return this.calls;
    }

    const term = this.searchTerm.toLowerCase();
    return this.calls.filter(
      (call) =>
        call.callId.toLowerCase().includes(term) ||
        call.operatorName.toLowerCase().includes(term) ||
        call.type.toLowerCase().includes(term) ||
        call.outcome.toLowerCase().includes(term)
    );
  }

  formatDuration(seconds: number): string {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
