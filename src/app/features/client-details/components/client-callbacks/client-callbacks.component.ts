// src/app/features/clients/components/client-details/sections/client-callbacks/client-callbacks.component.ts

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

interface Callback {
  id: string;
  operatorId: string;
  operatorName: string;
  status: string;
  callbackDateTime: Date;
  reminderDateTime?: Date;
  note: string;
  priority: string;
  outcome?: string;
  duration?: number;
  createdDate: Date;
  completedDate?: Date;
}

@Component({
  selector: 'app-client-callbacks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Callbacks & Reminders
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Schedule and manage client callbacks and follow-up activities
        </p>
      </div>

      <!-- Callback Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
                Pending Callbacks
              </p>
              <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {{ getPendingCallbacksCount() }}
              </p>
              <p class="text-xs text-blue-700 dark:text-blue-300">Scheduled</p>
            </div>
          </div>
        </div>

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
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-800 dark:text-green-200">
                Completed
              </p>
              <p class="text-2xl font-bold text-green-900 dark:text-green-100">
                {{ getCompletedCallbacksCount() }}
              </p>
              <p class="text-xs text-green-700 dark:text-green-300">
                This month
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p
                class="text-sm font-medium text-orange-800 dark:text-orange-200"
              >
                Overdue
              </p>
              <p
                class="text-2xl font-bold text-orange-900 dark:text-orange-100"
              >
                {{ getOverdueCallbacksCount() }}
              </p>
              <p class="text-xs text-orange-700 dark:text-orange-300">
                Needs attention
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
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p
                class="text-sm font-medium text-purple-800 dark:text-purple-200"
              >
                Success Rate
              </p>
              <p
                class="text-2xl font-bold text-purple-900 dark:text-purple-100"
              >
                {{ getSuccessRate() }}%
              </p>
              <p class="text-xs text-purple-700 dark:text-purple-300">
                Successful contacts
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Callback Section -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Schedule New Callback
          </h3>
          <button
            type="button"
            (click)="toggleAddCallback()"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            {{ showAddForm ? 'Cancel' : 'Add Callback' }}
          </button>
        </div>

        <div
          *ngIf="showAddForm"
          class="border-t border-gray-200 dark:border-gray-700 pt-6"
        >
          <form [formGroup]="callbackForm" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Operator -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Operator <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="operator"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Operator</option>
                  <option value="john-smith">John Smith - Sales Manager</option>
                  <option value="sarah-johnson">
                    Sarah Johnson - Account Manager
                  </option>
                  <option value="mike-brown">Mike Brown - Senior Broker</option>
                  <option value="lisa-davis">Lisa Davis - VIP Manager</option>
                  <option value="current-user">Assign to Me</option>
                </select>
              </div>

              <!-- Priority -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Priority <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="priority"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Priority</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <!-- Callback Date & Time -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Callback Date & Time <span class="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  formControlName="callbackDateTime"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              <!-- Reminder -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Reminder Date & Time
                </label>
                <input
                  type="datetime-local"
                  formControlName="reminderDateTime"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <!-- Callback Type -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Callback Type <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label class="flex items-center">
                  <input
                    type="radio"
                    formControlName="callbackType"
                    value="follow-up"
                    class="mr-2 text-blue-600"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300"
                    >Follow-up</span
                  >
                </label>
                <label class="flex items-center">
                  <input
                    type="radio"
                    formControlName="callbackType"
                    value="sales"
                    class="mr-2 text-blue-600"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300"
                    >Sales Call</span
                  >
                </label>
                <label class="flex items-center">
                  <input
                    type="radio"
                    formControlName="callbackType"
                    value="support"
                    class="mr-2 text-blue-600"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300"
                    >Support</span
                  >
                </label>
                <label class="flex items-center">
                  <input
                    type="radio"
                    formControlName="callbackType"
                    value="retention"
                    class="mr-2 text-blue-600"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300"
                    >Retention</span
                  >
                </label>
              </div>
            </div>

            <!-- Add Note -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Callback Note <span class="text-red-500">*</span>
              </label>
              <textarea
                formControlName="note"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Enter the purpose and details for this callback..."
              ></textarea>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                (click)="toggleAddCallback()"
                class="px-6 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="submitCallback()"
                [disabled]="callbackForm.invalid"
                class="px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Schedule Callback
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Callbacks Grid -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Callback History
            </h3>
            <div class="flex items-center space-x-3">
              <!-- Filter -->
              <select
                [(ngModel)]="statusFilter"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="overdue">Overdue</option>
              </select>
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
                  placeholder="Search callbacks..."
                />
              </div>
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
                  Operator
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Priority
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Scheduled Date & Time
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Reminder
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
                  Note
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
            >
              <tr
                *ngFor="let callback of filteredCallbacks"
                class="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-8 w-8">
                      <div
                        class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium"
                      >
                        {{ getOperatorInitials(callback.operatorName) }}
                      </div>
                    </div>
                    <div class="ml-3">
                      <div
                        class="text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {{ callback.operatorName }}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        {{ callback.operatorId }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                        callback.status === 'pending',
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        callback.status === 'completed',
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                        callback.status === 'overdue',
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200':
                        callback.status === 'cancelled'
                    }"
                  >
                    {{ callback.status | titlecase }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        callback.priority === 'low',
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200':
                        callback.priority === 'normal',
                      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200':
                        callback.priority === 'high',
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                        callback.priority === 'urgent'
                    }"
                  >
                    {{ callback.priority | titlecase }}
                  </span>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ callback.callbackDateTime | date : 'medium' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  {{
                    callback.reminderDateTime
                      ? (callback.reminderDateTime | date : 'short')
                      : '-'
                  }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ callback.duration ? callback.duration + ' min' : '-' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  <span
                    *ngIf="callback.outcome"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        callback.outcome === 'successful',
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                        callback.outcome === 'rescheduled',
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                        callback.outcome === 'no-answer'
                    }"
                  >
                    {{ callback.outcome | titlecase }}
                  </span>
                  <span *ngIf="!callback.outcome">-</span>
                </td>
                <td
                  class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs"
                >
                  <div class="truncate" [title]="callback.note">
                    {{ callback.note }}
                  </div>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  <div class="flex items-center space-x-2">
                    <button
                      type="button"
                      *ngIf="callback.status === 'pending'"
                      (click)="markAsCompleted(callback)"
                      class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                      title="Mark as Completed"
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
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      title="Edit Callback"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      *ngIf="callback.status === 'pending'"
                      (click)="rescheduleCallback(callback)"
                      class="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300"
                      title="Reschedule"
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
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
export class ClientCallbacksComponent implements OnInit {
  @Input() client!: Client;

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);

  callbackForm: FormGroup;
  showAddForm = false;
  searchTerm = '';
  statusFilter = '';

  callbacks: Callback[] = [
    {
      id: '1',
      operatorId: 'john-smith',
      operatorName: 'John Smith',
      status: 'pending',
      callbackDateTime: new Date('2024-01-26T10:00:00'),
      reminderDateTime: new Date('2024-01-26T09:30:00'),
      note: 'Follow up on new investment opportunity discussion',
      priority: 'high',
      createdDate: new Date('2024-01-25T14:30:00'),
    },
    {
      id: '2',
      operatorId: 'sarah-johnson',
      operatorName: 'Sarah Johnson',
      status: 'completed',
      callbackDateTime: new Date('2024-01-24T15:00:00'),
      note: 'Account verification and KYC document review',
      priority: 'normal',
      outcome: 'successful',
      duration: 25,
      createdDate: new Date('2024-01-23T09:15:00'),
      completedDate: new Date('2024-01-24T15:25:00'),
    },
    {
      id: '3',
      operatorId: 'mike-brown',
      operatorName: 'Mike Brown',
      status: 'overdue',
      callbackDateTime: new Date('2024-01-23T11:00:00'),
      reminderDateTime: new Date('2024-01-23T10:30:00'),
      note: 'Discuss trading strategy and risk management',
      priority: 'urgent',
      createdDate: new Date('2024-01-22T16:45:00'),
    },
    {
      id: '4',
      operatorId: 'lisa-davis',
      operatorName: 'Lisa Davis',
      status: 'completed',
      callbackDateTime: new Date('2024-01-22T14:00:00'),
      note: 'VIP account upgrade and benefits explanation',
      priority: 'high',
      outcome: 'successful',
      duration: 35,
      createdDate: new Date('2024-01-21T11:20:00'),
      completedDate: new Date('2024-01-22T14:35:00'),
    },
    {
      id: '5',
      operatorId: 'john-smith',
      operatorName: 'John Smith',
      status: 'cancelled',
      callbackDateTime: new Date('2024-01-21T16:00:00'),
      note: 'Initial welcome call and platform orientation',
      priority: 'normal',
      createdDate: new Date('2024-01-20T13:10:00'),
    },
  ];

  constructor() {
    this.callbackForm = this.fb.group({
      operator: ['', Validators.required],
      priority: ['', Validators.required],
      callbackDateTime: ['', Validators.required],
      reminderDateTime: [''],
      callbackType: ['', Validators.required],
      note: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Set default callback time to tomorrow at 10 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    this.callbackForm.patchValue({
      callbackDateTime: tomorrow.toISOString().slice(0, 16),
    });
  }

  get filteredCallbacks(): Callback[] {
    let filtered = this.callbacks;

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(
        (callback) => callback.status === this.statusFilter
      );
    }

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (callback) =>
          callback.operatorName.toLowerCase().includes(term) ||
          callback.note.toLowerCase().includes(term) ||
          callback.status.toLowerCase().includes(term) ||
          callback.priority.toLowerCase().includes(term)
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.callbackDateTime).getTime() -
        new Date(a.callbackDateTime).getTime()
    );
  }

  getPendingCallbacksCount(): number {
    return this.callbacks.filter((callback) => callback.status === 'pending')
      .length;
  }

  getCompletedCallbacksCount(): number {
    return this.callbacks.filter((callback) => callback.status === 'completed')
      .length;
  }

  getOverdueCallbacksCount(): number {
    const now = new Date();
    return this.callbacks.filter(
      (callback) =>
        callback.status === 'pending' &&
        new Date(callback.callbackDateTime) < now
    ).length;
  }

  getSuccessRate(): number {
    const completed = this.callbacks.filter(
      (callback) => callback.status === 'completed'
    );
    const successful = completed.filter(
      (callback) => callback.outcome === 'successful'
    );

    return completed.length > 0
      ? Math.round((successful.length / completed.length) * 100)
      : 0;
  }

  getOperatorInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase();
  }

  toggleAddCallback(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.callbackForm.reset();
      // Reset default time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      this.callbackForm.patchValue({
        callbackDateTime: tomorrow.toISOString().slice(0, 16),
      });
    }
  }

  submitCallback(): void {
    if (this.callbackForm.valid) {
      const formData = this.callbackForm.value;

      const newCallback: Callback = {
        id: String(this.callbacks.length + 1),
        operatorId: formData.operator,
        operatorName: this.getOperatorNameById(formData.operator),
        status: 'pending',
        callbackDateTime: new Date(formData.callbackDateTime),
        reminderDateTime: formData.reminderDateTime
          ? new Date(formData.reminderDateTime)
          : undefined,
        note: formData.note,
        priority: formData.priority,
        createdDate: new Date(),
      };

      this.callbacks.unshift(newCallback);
      this.callbackForm.reset();
      this.showAddForm = false;

      this.alertService.success('Callback scheduled successfully');
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }

  markAsCompleted(callback: Callback): void {
    callback.status = 'completed';
    callback.completedDate = new Date();
    callback.outcome = 'successful'; // Default outcome
    callback.duration = 15; // Default duration

    this.alertService.success('Callback marked as completed');
  }

  rescheduleCallback(callback: Callback): void {
    // In a real app, this would open a modal to select new date/time
    const newDate = new Date(callback.callbackDateTime);
    newDate.setDate(newDate.getDate() + 1);
    callback.callbackDateTime = newDate;

    this.alertService.success('Callback rescheduled successfully');
  }

  private getOperatorNameById(operatorId: string): string {
    const operatorMap: { [key: string]: string } = {
      'john-smith': 'John Smith',
      'sarah-johnson': 'Sarah Johnson',
      'mike-brown': 'Mike Brown',
      'lisa-davis': 'Lisa Davis',
      'current-user': 'Current User',
    };

    return operatorMap[operatorId] || operatorId;
  }
}
