import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import { Client } from '../../../clients/models/clients.model';
import { Callback } from './models/callback.model';
import { CallbacksService } from './services/callbacks.service';
import { CallbackCreationModalComponent } from './components/callback-creation-modal/callback-creation-modal.component';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-client-callbacks',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Callbacks & Reminders
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            Schedule and manage client callbacks and follow-up activities
          </p>
        </div>
        <div class="">
          <button
            *hasPermission="33"
            type="button"
            (click)="openCallbackModal()"
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
            Add Callback
          </button>
        </div>
      </div>
      <!-- Callback Summary Cards -->
      <div
        class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        *hasPermission="32"
      >
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
                  d="M15 17h5l-5 5v-5z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-800 dark:text-green-200">
                Reminders Open
              </p>
              <p class="text-2xl font-bold text-green-900 dark:text-green-100">
                {{ getOpenRemindersCount() }}
              </p>
              <p class="text-xs text-green-700 dark:text-green-300">Active</p>
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
                  d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 0V3a2 2 0 00-2 0V3m-1 0V3"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p
                class="text-sm font-medium text-purple-800 dark:text-purple-200"
              >
                Total Callbacks
              </p>
              <p
                class="text-2xl font-bold text-purple-900 dark:text-purple-100"
              >
                {{ getTotalCallbacksCount() }}
              </p>
              <p class="text-xs text-purple-700 dark:text-purple-300">
                All time
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Callbacks Grid -->
      <div
        *hasPermission="22"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Callback History
            </h3>
            <div class="flex items-center space-x-3">
              <select
                [(ngModel)]="statusFilter"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">All Status</option>
                <option value="due">Due</option>
                <option value="overdue">Overdue</option>
                <option value="reminder-open">Reminder Open</option>
              </select>
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

        <div class="overflow-x-auto">
          <table
            class="min-w-full divide-y divide-gray-200 dark:divide-gray-700/30"
          >
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Client
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Callback Date & Time
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Reminder
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Created Date
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
                *ngFor="let callback of filteredCallbacks"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-8 w-8">
                      <div
                        class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium"
                      >
                        {{
                          getClientInitials(
                            callback.clientFirstName,
                            callback.clientLastName
                          )
                        }}
                      </div>
                    </div>
                    <div class="ml-3">
                      <div
                        class="text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {{ callback.clientFirstName }}
                        {{ callback.clientLastName }}
                      </div>
                      <div
                        class="text-sm text-gray-500 dark:text-gray-400"
                        *hasPermission="9"
                      >
                        {{ callback.clientEmail }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200':
                        callback.isDue && !callback.isOverdue,
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                        callback.isOverdue,
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        callback.isOpenedReminder,
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200':
                        !callback.isDue &&
                        !callback.isOverdue &&
                        !callback.isOpenedReminder
                    }"
                  >
                    {{ getCallbackStatus(callback) | titlecase }}
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
                  {{ callback.reminderInMinutes }} min before
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ callback.createdAt | date : 'short' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  <div class="flex items-center space-x-2">
                    <ng-container *hasPermission="34">
                      <button
                        type="button"
                        *ngIf="!callback.isOpenedReminder"
                        (click)="openReminder(callback)"
                        class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                        title="Open Reminder"
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
                            d="M15 17h5l-5 5v-5z"
                          ></path>
                        </svg>
                      </button>
                    </ng-container>
                    <button
                      *hasPermission="35"
                      type="button"
                      (click)="completeCallback(callback)"
                      class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      title="Complete Callback"
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
                      *hasPermission="36"
                      type="button"
                      (click)="editCallback(callback)"
                      class="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
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
                      *hasPermission="37"
                      type="button"
                      (click)="showDeleteConfirmation(callback)"
                      class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      title="Delete Callback"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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

      <!-- Delete Confirmation Modal -->
      <div *ngIf="showDeleteModal" class="fixed z-50 inset-0 overflow-y-auto">
        <div
          class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        >
          <div class="fixed inset-0 transition-opacity -z-1" aria-hidden="true">
            <div class="absolute inset-0 bg-black/30 -z-1"></div>
          </div>

          <span
            class="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
            >&#8203;</span
          >

          <div
            class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          >
            <div
              class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4"
            >
              <div class="sm:flex sm:items-start">
                <div
                  class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10"
                >
                  <svg
                    class="h-6 w-6 text-red-600 dark:text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3
                    class="text-lg leading-6 font-medium text-gray-900 dark:text-white"
                  >
                    Delete Callback
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete the callback for
                      <strong
                        >{{ callbackToDelete?.clientFirstName }}
                        {{ callbackToDelete?.clientLastName }}</strong
                      >
                      scheduled on
                      <strong>{{
                        callbackToDelete?.callbackDateTime | date : 'medium'
                      }}</strong
                      >? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div
              class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
            >
              <button
                type="button"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                (click)="confirmDelete()"
              >
                Delete
              </button>
              <button
                type="button"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                (click)="cancelDelete()"
              >
                Cancel
              </button>
            </div>
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
export class ClientCallbacksComponent implements OnInit, OnDestroy {
  @Input() client!: Client;

  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private callbacksService = inject(CallbacksService);
  private destroy$ = new Subject<void>();

  searchTerm = '';
  statusFilter = '';
  callbacks: Callback[] = [];
  loading = false;

  // Delete confirmation modal properties
  showDeleteModal = false;
  callbackToDelete: Callback | null = null;

  ngOnInit(): void {
    this.loadCallbacks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCallbacks(): void {
    if (!this.client?.id) return;

    this.loading = true;
    this.callbacksService
      .getCallbacksByClientId(this.client.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load callbacks');
          return of([]);
        })
      )
      .subscribe((callbacks) => {
        this.callbacks = callbacks;
        this.loading = false;
      });
  }

  get filteredCallbacks(): Callback[] {
    let filtered = this.callbacks;

    if (this.statusFilter) {
      filtered = filtered.filter((callback) => {
        switch (this.statusFilter) {
          case 'due':
            return callback.isDue && !callback.isOverdue;
          case 'overdue':
            return callback.isOverdue;
          case 'reminder-open':
            return callback.isOpenedReminder;
          default:
            return true;
        }
      });
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (callback) =>
          callback.clientFirstName?.toLowerCase().includes(term) ||
          callback.clientLastName?.toLowerCase().includes(term) ||
          callback.clientEmail?.toLowerCase().includes(term)
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.callbackDateTime).getTime() -
        new Date(a.callbackDateTime).getTime()
    );
  }

  getCallbackStatus(callback: Callback): string {
    if (callback.isOverdue) return 'overdue';
    if (callback.isOpenedReminder) return 'reminder open';
    if (callback.isDue) return 'due';
    return 'scheduled';
  }

  getPendingCallbacksCount(): number {
    return this.callbacks.filter(
      (callback) => callback.isDue && !callback.isOverdue
    ).length;
  }

  getOpenRemindersCount(): number {
    return this.callbacks.filter((callback) => callback.isOpenedReminder)
      .length;
  }

  getOverdueCallbacksCount(): number {
    return this.callbacks.filter((callback) => callback.isOverdue).length;
  }

  getTotalCallbacksCount(): number {
    return this.callbacks.length;
  }

  getClientInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${
      lastName?.charAt(0) || ''
    }`.toUpperCase();
  }

  openCallbackModal(): void {
    const modalRef = this.modalService.open(
      CallbackCreationModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        client: this.client,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadCallbacks();
        }
      },
      () => {}
    );
  }

  editCallback(callback: Callback): void {
    const modalRef = this.modalService.open(
      CallbackCreationModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        client: this.client,
        callback: callback,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadCallbacks();
        }
      },
      () => {}
    );
  }

  openReminder(callback: Callback): void {
    this.callbacksService
      .openReminder(callback.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to open reminder');
          return of(null);
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Reminder opened successfully');
        }
        this.loadCallbacks();
      });
  }

  completeCallback(callback: Callback): void {
    this.callbacksService
      .completeCallback(callback.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to complete callback');
          return of(null);
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Callback completed successfully');
        }
        this.loadCallbacks();
      });
  }

  // Show delete confirmation modal
  showDeleteConfirmation(callback: Callback): void {
    this.callbackToDelete = callback;
    this.showDeleteModal = true;
  }

  // Confirm and execute delete
  confirmDelete(): void {
    if (this.callbackToDelete) {
      this.callbacksService
        .deleteCallback(this.callbackToDelete.id)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to delete callback');
            return of(null);
          })
        )
        .subscribe((result) => {
          if (result !== null) {
            this.alertService.success('Callback deleted successfully');
          }
          this.loadCallbacks();
        });
    }
    this.cancelDelete();
  }

  // Cancel delete and close modal
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.callbackToDelete = null;
  }

  // Legacy method - now redirects to showDeleteConfirmation
  deleteCallback(callback: Callback): void {
    this.showDeleteConfirmation(callback);
  }
}
