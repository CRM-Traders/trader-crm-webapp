// src/app/features/clients/components/client-details/sections/client-files/client-files.component.ts

import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { Client } from '../../../clients/models/clients.model';
import {
  FilesService,
  StoredFileDto,
  FileType,
  FileStatus,
  UploadFileResponse,
} from './services/files.service';
import { AddFileModalComponent } from './components/add-file-modal.component';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

interface ClientFile {
  id: string;
  userId: string;
  fileName: string;
  fileExtension: string;
  contentType: string;
  fileSize: number;
  fileType: FileType;
  status: FileStatus;
  bucketName: string;
  kycProcessId?: string | null;
  creationTime: string;
  fileUrl: string;
  reference?: string | null;
  description?: string | null;
  // Additional UI-specific fields
  uploadedBy?: string;
  uploadDate?: Date;
  kycNote?: string;
  isKycDocument?: boolean;
  displayStatus?: 'temporary' | 'permanent' | 'processing' | 'deleted';
  fileCategory?: string;
}

@Component({
  selector: 'app-client-files',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AddFileModalComponent,
    HasPermissionDirective,
  ],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Files & Documents
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Manage client documents, KYC files, and other important files
        </p>
      </div>

      <!-- File Summary Cards -->
      <div
        class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        *hasPermission="29"
      >
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
                Total Files
              </p>
              <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {{ files.length }}
              </p>
              <p class="text-xs text-blue-700 dark:text-blue-300">
                {{ formatFileSize(getTotalFileSize()) }}
              </p>
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-800 dark:text-green-200">
                KYC Documents
              </p>
              <p class="text-2xl font-bold text-green-900 dark:text-green-100">
                {{ getKycDocumentsCount() }}
              </p>
              <p class="text-xs text-green-700 dark:text-green-300">
                {{ getApprovedKycCount() }} approved
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
                Pending Review
              </p>
              <p
                class="text-2xl font-bold text-orange-900 dark:text-orange-100"
              >
                {{ getPendingFilesCount() }}
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p
                class="text-sm font-medium text-purple-800 dark:text-purple-200"
              >
                Images
              </p>
              <p
                class="text-2xl font-bold text-purple-900 dark:text-purple-100"
              >
                {{ getImageFilesCount() }}
              </p>
              <p class="text-xs text-purple-700 dark:text-purple-300">
                Photos & scans
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload File Section -->
      <div
        *hasPermission="30"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Upload New File
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Add documents, images, or other files for this client
            </p>
          </div>
          <button
            type="button"
            (click)="openUploadModal()"
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            Upload File
          </button>
        </div>
      </div>

      <!-- Files Grid -->
      <div
        *hasPermission="23"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Document Library
            </h3>
            <div class="flex items-center space-x-3">
              <!-- Filter -->
              <select
                [(ngModel)]="categoryFilter"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">All Categories</option>
                <option value="kyc">KYC Documents</option>
                <option value="document">Documents</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
                <option value="contract">Contracts</option>
                <option value="invoice">Invoices</option>
                <option value="report">Reports</option>
                <option value="presentation">Presentations</option>
                <option value="archive">Archives</option>
                <option value="other">Other</option>
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
                  placeholder="Search files..."
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Files List -->
        <div class="divide-y divide-gray-200 dark:divide-gray-700/30">
          <!-- Loading State -->
          <div
            *ngIf="isLoading"
            class="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
          >
            <svg
              class="animate-spin mx-auto h-8 w-8 text-gray-400 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p>Loading files...</p>
          </div>

          <!-- Empty State -->
          <div
            *ngIf="!isLoading && filteredFiles.length === 0"
            class="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
          >
            <svg
              class="mx-auto h-12 w-12 text-gray-400 mb-4"
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
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No files found
            </h3>
            <p class="mb-4">
              {{
                searchTerm || categoryFilter
                  ? 'No files match your filters.'
                  : 'This client has no uploaded files yet.'
              }}
            </p>
              <div *hasPermission="30">
              <button
              *ngIf="!searchTerm && !categoryFilter"
              type="button"
              (click)="openUploadModal()"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Upload First File
            </button>
              </div>
          </div>

          <!-- Files -->
          <div
            *ngFor="let file of filteredFiles"
            class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- File Icon -->
                <div class="flex-shrink-0">
                  <div
                    class="w-10 h-10 rounded-lg flex items-center justify-center"
                    [ngClass]="{
                      'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400':
                        getFileIcon(file.fileName) === 'pdf',
                      'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400':
                        getFileIcon(file.fileName) === 'doc',
                      'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400':
                        getFileIcon(file.fileName) === 'image',
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400':
                        getFileIcon(file.fileName) === 'other'
                    }"
                  >
                    <svg
                      class="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        *ngIf="getFileIcon(file.fileName) === 'pdf'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                      <path
                        *ngIf="getFileIcon(file.fileName) === 'image'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                      <path
                        *ngIf="
                          getFileIcon(file.fileName) === 'doc' ||
                          getFileIcon(file.fileName) === 'other'
                        "
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                  </div>
                </div>

                <!-- File Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-2">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white truncate"
                    >
                      {{ file.fileName }}
                    </p>
                    <span
                      *ngIf="file.isKycDocument"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      KYC
                    </span>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                          getDisplayStatus(file) === 'permanent',
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                          getDisplayStatus(file) === 'processing',
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                          getDisplayStatus(file) === 'temporary',
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200':
                          getDisplayStatus(file) === 'deleted'
                      }"
                    >
                      {{ getDisplayStatus(file) | titlecase }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-4 mt-1">
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatFileSize(file.fileSize) }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ file.fileCategory | titlecase }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{
                        file.uploadDate || file.creationTime | date : 'short'
                      }}
                    </p>
                    <p
                      class="text-xs text-gray-500 dark:text-gray-400"
                      *ngIf="file.uploadedBy"
                    >
                      by {{ file.uploadedBy }}
                    </p>
                  </div>
                  <p
                    *ngIf="file.description"
                    class="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    {{ file.description }}
                  </p>
                  <p
                    *ngIf="file.kycNote"
                    class="text-xs text-blue-600 dark:text-blue-400 mt-1"
                  >
                    KYC Note: {{ file.kycNote }}
                  </p>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2">
                <button
                  *hasPermission="31"
                  type="button"
                  (click)="showDeleteConfirmation(file)"
                  class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                  title="Delete"
                >
                  <svg
                    class="w-5 h-5"
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
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add File Modal -->
    <app-add-file-modal
      [isOpen]="showUploadModal"
      [clientId]="client.userId"
      (closeEvent)="closeUploadModal()"
      (uploadSuccess)="onFilesUploaded($event)"
    ></app-add-file-modal>

    <!-- Delete Confirmation Modal -->
    <div
      *ngIf="showDeleteModal"
      class="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <!-- Background overlay -->
      <div
        class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <div
          class="fixed inset-0 bg-gray-500/10 transition-opacity"
          aria-hidden="true"
          (click)="cancelDelete()"
        ></div>

        <!-- This element is to trick the browser into centering the modal contents. -->
        <span
          class="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
          >&#8203;</span
        >

        <!-- Modal panel -->
        <div
          class="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
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
                aria-hidden="true"
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
                id="modal-title"
              >
                Delete File
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete
                  <span class="font-medium text-gray-900 dark:text-white">{{
                    fileToDelete?.fileName
                  }}</span
                  >? This action cannot be undone.
                </p>
                <div class="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <div
                      class="w-8 h-8 rounded flex items-center justify-center"
                      [ngClass]="{
                        'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400':
                          getFileIcon(fileToDelete?.fileName || '') === 'pdf',
                        'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400':
                          getFileIcon(fileToDelete?.fileName || '') === 'doc',
                        'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400':
                          getFileIcon(fileToDelete?.fileName || '') === 'image',
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400':
                          getFileIcon(fileToDelete?.fileName || '') === 'other'
                      }"
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p
                        class="text-sm font-medium text-gray-900 dark:text-white truncate"
                      >
                        {{ fileToDelete?.fileName }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatFileSize(fileToDelete?.fileSize || 0) }} •
                        {{ fileToDelete?.fileCategory | titlecase }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              (click)="confirmDelete()"
              [disabled]="isDeleting"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                *ngIf="isDeleting"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </button>
            <button
              type="button"
              (click)="cancelDelete()"
              [disabled]="isDeleting"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
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
export class ClientFilesComponent implements OnInit {
  @Input() client!: Client;

  private alertService = inject(AlertService);
  private filesService = inject(FilesService);

  showUploadModal = false;
  showDeleteModal = false;
  fileToDelete: ClientFile | null = null;
  isDeleting = false;
  searchTerm = '';
  categoryFilter = '';
  isLoading = false;

  files: ClientFile[] = [];

  ngOnInit(): void {
    if (this.client.id) {
      this.loadClientFiles();
    }
  }

  /**
   * Load files for the current client
   */
  private loadClientFiles(): void {
    if (!this.client?.id) {
      return;
    }

    this.isLoading = true;
    this.filesService
      .getFilesByUserId(this.client.userId)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to load files');
          // Fallback to demo data in case of error
          return of([]);
        }),
        finalize(() => (this.isLoading = false))
      )
      .subscribe((files) => {
        this.files = files.map((file) =>
          this.mapStoredFileDtoToClientFile(file)
        );
      });
  }

  private mapStoredFileDtoToClientFile(dto: StoredFileDto): ClientFile {
    const mappedFile: ClientFile = {
      id: dto.id,
      userId: dto.userId,
      fileName: dto.fileName,
      fileExtension: dto.fileExtension,
      contentType: dto.contentType,
      fileSize: dto.fileSize,
      fileType: dto.fileType,
      status: dto.status,
      bucketName: dto.bucketName,
      kycProcessId: dto.kycProcessId,
      creationTime: dto.creationTime,
      fileUrl: dto.fileUrl,
      reference: dto.reference,
      description: dto.description,
      // Map additional UI fields
      uploadDate: new Date(dto.creationTime),
      isKycDocument:
        dto.kycProcessId !== null && dto.kycProcessId !== undefined,
      displayStatus: this.mapFileStatusToDisplayStatus(dto.status),
      fileCategory: this.getFileCategoryFromType(dto.fileType),
      uploadedBy: 'System', // Could be enhanced to include actual user info
    };

    return mappedFile;
  }

  /**
   * Map FileStatus enum to display status
   */
  private mapFileStatusToDisplayStatus(
    status: FileStatus
  ): 'temporary' | 'permanent' | 'processing' | 'deleted' {
    switch (status) {
      case FileStatus.Temporary: // 1
        return 'temporary';
      case FileStatus.Permanent: // 2
        return 'permanent';
      case FileStatus.Processing: // 3
        return 'processing';
      case FileStatus.Deleted: // 4
        return 'deleted';
      default:
        return 'processing';
    }
  }

  /**
   * Get file category from FileType enum
   */
  private getFileCategoryFromType(fileType: FileType): string {
    switch (fileType) {
      case FileType.IdFront:
      case FileType.IdBack:
      case FileType.PassportMain:
      case FileType.FacePhoto:
        return 'kyc';
      case FileType.Document:
        return 'document';
      case FileType.Image:
        return 'image';
      case FileType.Video:
        return 'video';
      case FileType.Audio:
        return 'audio';
      case FileType.Contract:
        return 'contract';
      case FileType.Invoice:
        return 'invoice';
      case FileType.Report:
        return 'report';
      case FileType.Presentation:
        return 'presentation';
      case FileType.Archive:
        return 'archive';
      default:
        return 'other';
    }
  }

  /**
   * Determine FileType enum from file
   */
  private getFileTypeFromFile(file: File): FileType {
    if (file.type.startsWith('image/')) {
      return FileType.Image;
    } else if (file.type.startsWith('video/')) {
      return FileType.Video;
    } else if (file.type.startsWith('audio/')) {
      return FileType.Audio;
    } else if (file.type === 'application/pdf') {
      return FileType.Document;
    } else if (file.type.includes('document') || file.type.includes('word')) {
      return FileType.Document;
    } else if (
      file.type.includes('presentation') ||
      file.type.includes('powerpoint')
    ) {
      return FileType.Presentation;
    } else if (file.type.includes('zip') || file.type.includes('archive')) {
      return FileType.Archive;
    } else {
      return FileType.Other;
    }
  }

  get filteredFiles(): ClientFile[] {
    let filtered = this.files;

    // Apply category filter
    if (this.categoryFilter) {
      filtered = filtered.filter(
        (file) => file.fileCategory === this.categoryFilter
      );
    }

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (file) =>
          file.fileName.toLowerCase().includes(term) ||
          file.description?.toLowerCase().includes(term) ||
          file.uploadedBy?.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => {
      const aDate = a.uploadDate || new Date(a.creationTime);
      const bDate = b.uploadDate || new Date(b.creationTime);
      return bDate.getTime() - aDate.getTime();
    });
  }

  getTotalFileSize(): number {
    return this.files.reduce((total, file) => total + file.fileSize, 0);
  }

  getKycDocumentsCount(): number {
    return this.files.filter((file) => file.isKycDocument).length;
  }

  getApprovedKycCount(): number {
    return this.files.filter(
      (file) => file.isKycDocument && file.displayStatus === 'permanent'
    ).length;
  }

  getPendingFilesCount(): number {
    return this.files.filter((file) => file.displayStatus === 'processing')
      .length;
  }

  getImageFilesCount(): number {
    return this.files.filter(
      (file) =>
        file.fileType === FileType.Image ||
        file.fileType === FileType.IdFront ||
        file.fileType === FileType.IdBack ||
        file.fileType === FileType.PassportMain ||
        file.fileType === FileType.FacePhoto
    ).length;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension!)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else if (['doc', 'docx'].includes(extension!)) {
      return 'doc';
    } else {
      return 'other';
    }
  }

  /**
   * Get display status for template
   */
  getDisplayStatus(file: ClientFile): string {
    return file.displayStatus || 'pending';
  }

  /**
   * Open upload modal
   */
  openUploadModal(): void {
    this.showUploadModal = true;
  }

  /**
   * Close upload modal
   */
  closeUploadModal(): void {
    this.showUploadModal = false;
  }

  /**
   * Handle successful file uploads from modal
   */
  onFilesUploaded(responses: UploadFileResponse[]): void {
    this.loadClientFiles(); // Reload files to show new uploads
  }

  /**
   * Show delete confirmation modal
   */
  showDeleteConfirmation(file: ClientFile): void {
    this.fileToDelete = file;
    this.showDeleteModal = true;
  }

  /**
   * Cancel delete operation
   */
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.fileToDelete = null;
    this.isDeleting = false;
  }

  /**
   * Confirm and execute delete operation
   */
  confirmDelete(): void {
    if (!this.fileToDelete) return;

    this.isDeleting = true;
    const fileName = this.fileToDelete.fileName;

    this.filesService
      .deleteFile(this.fileToDelete.id)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to delete file');
          return of(null);
        }),
        finalize(() => {
          this.isDeleting = false;
          this.showDeleteModal = false;
          this.fileToDelete = null;
        })
      )
      .subscribe(() => {
        this.alertService.success(`File "${fileName}" deleted successfully`);
        this.loadClientFiles(); // Reload files
      });
  }

  /**
   * Download a file
   */
  downloadFile(file: ClientFile): void {
    this.filesService
      .downloadFile(file.id)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to download file');
          return of(new Blob());
        })
      )
      .subscribe((blob) => {
        if (blob.size > 0) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.fileName;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      });
  }

  /**
   * Preview a file using the modal service
   */
  previewFile(file: ClientFile): void {
    // Convert ClientFile to StoredFileDto for the modal service
    const storedFileDto: StoredFileDto = {
      id: file.id,
      userId: file.userId,
      fileName: file.fileName,
      fileExtension: file.fileExtension,
      contentType: file.contentType,
      fileSize: file.fileSize,
      fileType: file.fileType,
      status: file.status,
      bucketName: file.bucketName,
      kycProcessId: file.kycProcessId,
      creationTime: file.creationTime,
      fileUrl: file.fileUrl,
      reference: file.reference,
      description: file.description
    };

    this.filesService.openFilePreview(storedFileDto);
  }

  /**
   * Approve KYC document
   */
  approveKycDocument(file: ClientFile): void {
    this.filesService
      .makeFilePermanent(file.id)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to approve document');
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response?.success) {
          file.displayStatus = 'permanent';
          file.status = FileStatus.Permanent;
          this.alertService.success(`KYC document ${file.fileName} approved`);
          this.loadClientFiles(); // Reload to get updated data
        }
      });
  }

  /**
   * Get full URL for file preview/download
   */
  getFullFileUrl(fileUrl: string): string {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    // Handle relative URLs - assuming they're relative to the current domain
    return `${window.location.origin}${
      fileUrl.startsWith('/') ? '' : '/'
    }${fileUrl}`;
  }
}
