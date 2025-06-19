import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import { ModalRef } from '../../shared/models/modals/modal.model';
import { ModalService } from '../../shared/services/modals/modal.service';
import { Client, ClientStatus } from '../clients/models/clients.model';
import { ClientAccountsComponent } from './components/client-accounts/client-accounts.component';
import { ClientCallHistoryComponent } from './components/client-call-history/client-call-history.component';
import { ClientCallbacksComponent } from './components/client-callbacks/client-callbacks.component';
import { ClientFeedComponent } from './components/client-feed/client-feed.component';
import { ClientFilesComponent } from './components/client-files/client-files.component';
import { ClientNotesComponent } from './components/client-notes/client-notes.component';
import { ClientPaymentsComponent } from './components/client-payments/client-payments.component';
import { ClientProfileComponent } from './components/client-profile/client-profile.component';
import { ClientReferralsComponent } from './components/client-referrals/client-referrals.component';
import { ClientTradingActivityComponent } from './components/client-trading-activity/client-trading-activity.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientsService } from '../clients/services/clients.service';
// Import the notes service and model
import { NotesService } from './components/client-notes/services/notes.service';
import { ClientNote } from './components/client-notes/models/note.model';
// Import callback creation modal
import { CallbackCreationModalComponent } from './components/client-callbacks/components/callback-creation-modal/callback-creation-modal.component';
import { NoteCreationModalComponent } from './components/client-notes/components/note-creation-modal/note-creation-modal.component';

export enum ClientDetailSection {
  Profile = 'profile',
  Payments = 'payments',
  TradingActivity = 'trading-activity',
  Accounts = 'accounts',
  Callbacks = 'callbacks',
  Files = 'files',
  CallHistory = 'call-history',
  Notes = 'notes',
  Feed = 'feed',
  Referrals = 'referrals',
}

@Component({
  selector: 'app-client-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ClientProfileComponent,
    ClientPaymentsComponent,
    ClientTradingActivityComponent,
    ClientAccountsComponent,
    ClientCallbacksComponent,
    ClientFilesComponent,
    ClientCallHistoryComponent,
    ClientNotesComponent,
    ClientFeedComponent,
    ClientReferralsComponent,
  ],
  template: `
    <div class="general-container w-full mx-auto bg-white dark:bg-gray-900">
      <!-- Header Section -->
      <div class="relative z-10 bg-white dark:bg-gray-900">
        <div class="px-6 py-4">
          <!-- Top Header -->
          <div
            class="sticky z-50 py-3 bg-white top-0 flex items-center justify-between mb-4"
          >
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <div
                  class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg"
                >
                  {{ getInitials(client.firstName, client.lastName) }}
                </div>
                <div>
                  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ client.firstName }} {{ client.lastName }}
                  </h1>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Client ID: {{ client.id }}
                  </p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="getStatusColor(client.status)"
                >
                  {{ getStatusLabel(client.status) }}
                </span>
                <span
                  *ngIf="client.hasInvestments"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  <svg
                    class="w-3 h-3 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"
                    ></path>
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                  Investor
                </span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-3">
              <button
                type="button"
                (click)="openCallbackModal()"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
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
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  ></path>
                </svg>
                Schedule Callback
              </button>
              <button
                type="button"
                (click)="openNoteModal()"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  ></path>
                </svg>
                Add Note
              </button>
              <button
                type="button"
                (click)="refreshData()"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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

          <!-- Client Summary Cards -->
          <div
            class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6"
          >
            <!-- Account Status -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Account Status
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ getStatusLabel(client.status) }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                Since: {{ client.registrationDate | date : 'short' }}
              </div>
            </div>

            <!-- Total Balance -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Total Balance
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                $12,450.00
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                Credit: $2,340.00
              </div>
            </div>

            <!-- Last Login -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Last Login
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ client.lastLogin }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                IP: 192.168.1.1
              </div>
            </div>

            <!-- Online Status -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Status
              </div>
              <div class="flex items-center">
                <div class="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span class="font-semibold text-gray-900 dark:text-white"
                  >Offline</span
                >
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                2 hours ago
              </div>
            </div>

            <!-- Referrals -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Referrals
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">0</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                FTD: $250.00
              </div>
            </div>

            <!-- Registration Date -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Registered
              </div>
              <div class="font-semibold text-gray-900 dark:text-white">
                {{ client.registrationDate | date : 'short' }}
              </div>
            </div>
          </div>

          <!-- Personal Information & Acquisition Status -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- Personal Information -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3
                class="text-sm font-semibold text-gray-900 dark:text-white mb-3"
              >
                Personal Information
              </h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400"
                    >Date of Birth:</span
                  >
                  <span class="text-gray-900 dark:text-white">{{
                    client.dateOfBirth
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">Gender:</span>
                  <span class="text-gray-900 dark:text-white">Male</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-500 dark:text-gray-400">Phone:</span>
                  <div class="flex items-center">
                    <span class="text-gray-900 dark:text-white mr-2">{{
                      client.telephone || 'Not provided'
                    }}</span>
                    <button class="text-gray-400 hover:text-gray-600">
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
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-500 dark:text-gray-400">Email:</span>
                  <div class="flex items-center">
                    <span class="text-gray-900 dark:text-white mr-2">{{
                      client.email
                    }}</span>
                    <button class="text-gray-400 hover:text-gray-600">
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
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">Country:</span>
                  <span class="text-gray-900 dark:text-white">{{
                    client.country || 'Not provided'
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">City:</span>
                  <span class="text-gray-900 dark:text-white">New York</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400"
                    >Affiliate:</span
                  >
                  <span class="text-gray-900 dark:text-white">{{
                    client.affiliateName || 'Not assigned'
                  }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-500 dark:text-gray-400"
                    >Affiliate ID:</span
                  >
                  <div class="flex items-center">
                    <span class="text-gray-900 dark:text-white mr-2">{{
                      client.affiliateId
                    }}</span>
                    <button class="text-gray-400 hover:text-gray-600">
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
                </div>
              </div>
            </div>

            <!-- Acquisition Status -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3
                class="text-sm font-semibold text-gray-900 dark:text-white mb-3"
              >
                Acquisition Status
              </h3>
              <div class="space-y-3 text-sm">
                <div>
                  <div class="text-gray-500 dark:text-gray-400 mb-1">Sales</div>
                  <div class="text-gray-900 dark:text-white">
                    Desk: Premium Sales
                  </div>
                  <div class="text-gray-900 dark:text-white">
                    Team: Team Alpha
                  </div>
                </div>
                <div>
                  <div class="text-gray-500 dark:text-gray-400 mb-1">
                    Retention
                  </div>
                  <div class="text-gray-900 dark:text-white">
                    Desk: VIP Retention
                  </div>
                  <div class="text-gray-900 dark:text-white">
                    Team: Team Beta
                  </div>
                </div>
              </div>
            </div>

            <!-- Last 10 IPs & Pinned Notes -->
            <div class="space-y-4">
              <!-- Last 10 IPs -->
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3
                  class="text-sm font-semibold text-gray-900 dark:text-white mb-3"
                >
                  Last 10 IPs
                </h3>
                <div class="space-y-1 text-xs">
                  <div class="flex justify-between">
                    <span class="text-gray-900 dark:text-white font-mono"
                      >192.168.1.1</span
                    >
                    <span class="text-gray-500 dark:text-gray-400"
                      >2 hours ago</span
                    >
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-900 dark:text-white font-mono"
                      >10.0.0.1</span
                    >
                    <span class="text-gray-500 dark:text-gray-400"
                      >1 day ago</span
                    >
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-900 dark:text-white font-mono"
                      >172.16.0.1</span
                    >
                    <span class="text-gray-500 dark:text-gray-400"
                      >3 days ago</span
                    >
                  </div>
                </div>
              </div>

              <!-- Pinned Notes -->
              <div
                *ngIf="pinnedNotes.length > 0"
                class="bg-yellow-50 dark:bg-yellow-900/5 border border-yellow-200 dark:border-yellow-800/20 rounded-lg p-4"
              >
                <h3
                  class="text-sm font-semibold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center"
                >
                  <svg
                    class="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M4 3a1 1 0 000 2h1v6l-2 2v1h14v-1l-2-2V5h1a1 1 0 100-2H4zM9 17v1a1 1 0 102 0v-1H9z"
                    ></path>
                  </svg>
                  Pinned Notes ({{ pinnedNotes.length }})
                </h3>
                <div class="space-y-2">
                  <div
                    *ngFor="let note of pinnedNotes; let i = index"
                    class="text-sm text-yellow-700 dark:text-yellow-500"
                  >
                    <div class="flex items-start">
                      <span class="mr-2">•</span>
                      <div class="flex-1">
                        <p class="break-words">
                          {{ getPreviewText(note.note) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No Pinned Notes State -->
              <div
                *ngIf="pinnedNotes.length === 0 && !loadingPinnedNotes"
                class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <h3
                  class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center"
                >
                  <svg
                    class="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 3a1 1 0 000 2h1v6l-2 2v1h14v-1l-2-2V5h1a1 1 0 100-2H4zM9 17v1a1 1 0 102 0v-1H9z"
                    ></path>
                  </svg>
                  Pinned Notes
                </h3>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  <p>No pinned notes yet.</p>
                </div>
              </div>

              <!-- Loading State for Pinned Notes -->
              <div
                *ngIf="loadingPinnedNotes"
                class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <h3
                  class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center"
                >
                  <svg
                    class="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M4 3a1 1 0 000 2h1v6l-2 2v1h14v-1l-2-2V5h1a1 1 0 100-2H4zM9 17v1a1 1 0 102 0v-1H9z"
                    ></path>
                  </svg>
                  Pinned Notes
                </h3>
                <div class="flex justify-center items-center py-2">
                  <div
                    class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Navigation Tabs -->
      <div class="sticky top-0 z-10 bg-white">
        <div
          class="flex justify-center flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700"
        >
          <button
            *ngFor="let section of navigationSections"
            type="button"
            class="px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors"
            [ngClass]="{
              'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20':
                activeSection === section.key,
              'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600':
                activeSection !== section.key
            }"
            (click)="setActiveSection(section.key)"
          >
            <div class="flex items-center">
              <ng-container [ngSwitch]="section.key">
                <!-- Profile Icon -->
                <svg
                  *ngSwitchCase="'profile'"
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  ></path>
                </svg>
                <!-- Payments Icon -->
                <svg
                  *ngSwitchCase="'payments'"
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  ></path>
                </svg>
                <!-- Trading Activity Icon -->
                <svg
                  *ngSwitchCase="'trading-activity'"
                  class="w-4 h-4 mr-2"
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
                <!-- Default Icon for other sections -->
                <svg
                  *ngSwitchDefault
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
              </ng-container>
              {{ section.label }}
            </div>
          </button>
        </div>
      </div>
      <!-- Content Section -->
      <div class="px-6 py-6">
        <div [ngSwitch]="activeSection">
          <app-client-profile
            *ngSwitchCase="'profile'"
            [client]="client"
          ></app-client-profile>
          <app-client-payments
            *ngSwitchCase="'payments'"
            [client]="client"
          ></app-client-payments>
          <app-client-trading-activity
            *ngSwitchCase="'trading-activity'"
            [client]="client"
          ></app-client-trading-activity>
          <app-client-accounts
            *ngSwitchCase="'accounts'"
            [client]="client"
          ></app-client-accounts>
          <app-client-callbacks
            *ngSwitchCase="'callbacks'"
            [client]="client"
          ></app-client-callbacks>
          <app-client-files
            *ngSwitchCase="'files'"
            [client]="client"
          ></app-client-files>
          <app-client-call-history
            *ngSwitchCase="'call-history'"
            [client]="client"
          ></app-client-call-history>
          <app-client-notes
            *ngSwitchCase="'notes'"
            [client]="client"
          ></app-client-notes>
          <app-client-feed
            *ngSwitchCase="'feed'"
            [client]="client"
          ></app-client-feed>
          <app-client-referrals
            *ngSwitchCase="'referrals'"
            [client]="client"
          ></app-client-referrals>
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

      .sticky {
        position: -webkit-sticky;
        position: sticky;
      }
    `,
  ],
})
export class ClientDetailsComponent implements OnInit, OnDestroy {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private _service = inject(ClientsService);
  private notesService = inject(NotesService);

  private destroy$ = new Subject<void>();

  activeSection: ClientDetailSection = ClientDetailSection.Profile;

  client!: Client;

  // Pinned notes properties
  pinnedNotes: ClientNote[] = [];
  loadingPinnedNotes = false;

  navigationSections = [
    { key: ClientDetailSection.Profile, label: 'Profile' },
    { key: ClientDetailSection.Payments, label: 'Payments' },
    { key: ClientDetailSection.TradingActivity, label: 'Trading Activity' },
    { key: ClientDetailSection.Accounts, label: 'Accounts' },
    { key: ClientDetailSection.Callbacks, label: 'Callbacks' },
    { key: ClientDetailSection.Files, label: 'Files' },
    { key: ClientDetailSection.CallHistory, label: 'Call History' },
    { key: ClientDetailSection.Notes, label: 'Notes' },
    { key: ClientDetailSection.Feed, label: 'Feed' },
    { key: ClientDetailSection.Referrals, label: 'Referrals' },
  ];

  ngOnInit(): void {
    const clientId = this.activatedRoute.snapshot.paramMap.get('id');

    if (!clientId) {
      this.router.navigate(['/']);
      return;
    }

    this._service.getClientById(clientId!).subscribe((result: Client) => {
      this.client = result;
      // Load pinned notes after client is loaded
      this.loadPinnedNotes();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPinnedNotes(): void {
    if (!this.client?.id) return;

    this.loadingPinnedNotes = true;
    this.notesService
      .getClientCommentsById(this.client.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading pinned notes:', error);
          return of([]);
        })
      )
      .subscribe((notes) => {
        // Filter only pinned notes and sort by creation date (newest first)
        this.pinnedNotes = notes
          .filter((note) => note.isPinnedComment)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5); // Show only the first 5 pinned notes in the summary

        this.loadingPinnedNotes = false;
      });
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
          this.alertService.success('Callback scheduled successfully!');
          // Optionally refresh any callback-related data or navigate to callbacks section
          // this.setActiveSection(ClientDetailSection.Callbacks);
        }
      },
      () => {
        // User dismissed the modal
      }
    );
  }

  openNoteModal(): void {
    const modalRef = this.modalService.open(
      NoteCreationModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        clientId: this.client.id,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.alertService.success('Note added successfully!');
          // Refresh pinned notes to show the new note if it's pinned
          this.loadPinnedNotes();
          // Optionally navigate to notes section
          // this.setActiveSection(ClientDetailSection.Notes);
        }
      },
      () => {
        // User dismissed the modal
      }
    );
  }

  setActiveSection(section: ClientDetailSection): void {
    this.activeSection = section;
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${
      lastName?.charAt(0) || ''
    }`.toUpperCase();
  }

  getStatusLabel(status: number): string {
    const statusMap: { [key: number]: string } = {
      0: 'Inactive',
      1: 'Active',
      2: 'Suspended',
      3: 'Closed',
    };
    return statusMap[status] || 'Unknown';
  }

  getStatusColor(status: number): string {
    const colorMap: { [key: number]: string } = {
      0: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      1: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      3: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  getPreviewText(text: string | undefined): string {
    if (!text) return '';
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  }

  refreshData(): void {
    this.alertService.success('Data refreshed successfully');
    // Reload pinned notes along with other data
    this.loadPinnedNotes();
  }
}
