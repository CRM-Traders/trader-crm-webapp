// src/app/features/clients/components/client-details/sections/client-files/client-files.component.ts

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

interface ClientFile {
  id: string;
  fileName: string;
  fileType: string;
  fileCategory: string;
  fileSize: number;
  uploadedBy: string;
  uploadDate: Date;
  description?: string;
  kycNote?: string;
  isKycDocument: boolean;
  status: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
}

@Component({
  selector: 'app-client-files',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Upload New File
          </h3>
          <button
            type="button"
            (click)="toggleUploadForm()"
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
            {{ showUploadForm ? 'Cancel' : 'Upload File' }}
          </button>
        </div>

        <div
          *ngIf="showUploadForm"
          class="border-t border-gray-200 dark:border-gray-700 pt-6"
        >
          <form [formGroup]="uploadForm" class="space-y-6">
            <!-- File Upload Drag & Drop Area -->
            <div
              class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
            >
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="mt-4">
                <label for="file-upload" class="cursor-pointer">
                  <span
                    class="mt-2 block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Drop files here or
                    <span
                      class="text-blue-600 dark:text-blue-400 hover:text-blue-500"
                      >browse</span
                    >
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    class="sr-only"
                    multiple
                    (change)="onFileSelected($event)"
                  />
                </label>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, PDF up to 10MB each
                </p>
              </div>
            </div>

            <!-- Selected Files Preview -->
            <div *ngIf="selectedFiles.length > 0" class="space-y-3">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                Selected Files:
              </h4>
              <div class="space-y-2">
                <div
                  *ngFor="let file of selectedFiles; let i = index"
                  class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                      <svg
                        class="h-8 w-8 text-gray-400"
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
                    <div>
                      <p
                        class="text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {{ file.name }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatFileSize(file.size) }}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeSelectedFile(i)"
                    class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    <svg
                      class="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- File Category -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  File Category <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="fileCategory"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Category</option>
                  <option value="kyc-id">KYC - ID Document</option>
                  <option value="kyc-proof-address">
                    KYC - Proof of Address
                  </option>
                  <option value="kyc-photo">KYC - Photo ID</option>
                  <option value="financial">Financial Document</option>
                  <option value="contract">Contract</option>
                  <option value="communication">Communication</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <!-- Is KYC Document -->
              <div class="flex items-center">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Document Type
                </label>
                <div class="mt-2">
                  <label class="inline-flex items-center">
                    <input
                      type="checkbox"
                      formControlName="isKycDocument"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >KYC Document</span
                    >
                  </label>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Description
              </label>
              <textarea
                formControlName="description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Enter file description..."
              ></textarea>
            </div>

            <!-- KYC Note (shown only if KYC document) -->
            <div *ngIf="uploadForm.get('isKycDocument')?.value">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                KYC Review Note
              </label>
              <textarea
                formControlName="kycNote"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Add KYC review notes..."
              ></textarea>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                (click)="toggleUploadForm()"
                class="px-6 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="uploadFiles()"
                [disabled]="uploadForm.invalid || selectedFiles.length === 0"
                class="px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Upload {{ selectedFiles.length }} File{{
                  selectedFiles.length !== 1 ? 's' : ''
                }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Files Grid -->
      <div
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
                <option value="kyc-id">KYC - ID</option>
                <option value="kyc-proof-address">KYC - Address</option>
                <option value="kyc-photo">KYC - Photo</option>
                <option value="financial">Financial</option>
                <option value="contract">Contract</option>
                <option value="communication">Communication</option>
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
        <div class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            *ngFor="let file of filteredFiles"
            class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                          file.status === 'approved',
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                          file.status === 'pending',
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                          file.status === 'rejected'
                      }"
                    >
                      {{ file.status | titlecase }}
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
                      {{ file.uploadDate | date : 'short' }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
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
                  type="button"
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  title="Download"
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                </button>
                <button
                  type="button"
                  class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                  title="Preview"
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
                <button
                  type="button"
                  *ngIf="file.isKycDocument && file.status === 'pending'"
                  (click)="approveKycDocument(file)"
                  class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                  title="Approve KYC"
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
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </button>
                <button
                  type="button"
                  class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
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

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);

  uploadForm: FormGroup;
  showUploadForm = false;
  searchTerm = '';
  categoryFilter = '';
  selectedFiles: File[] = [];

  files: ClientFile[] = [
    {
      id: '1',
      fileName: 'passport_front.jpg',
      fileType: 'image/jpeg',
      fileCategory: 'kyc-id',
      fileSize: 2048576, // 2MB
      uploadedBy: 'John Smith',
      uploadDate: new Date('2024-01-15T10:30:00'),
      description: 'Passport front page scan',
      kycNote: 'Document is clear and valid',
      isKycDocument: true,
      status: 'approved',
    },
    {
      id: '2',
      fileName: 'utility_bill.pdf',
      fileType: 'application/pdf',
      fileCategory: 'kyc-proof-address',
      fileSize: 1536000, // 1.5MB
      uploadedBy: 'Sarah Johnson',
      uploadDate: new Date('2024-01-16T14:20:00'),
      description: 'Electricity bill for address verification',
      kycNote: 'Address matches client records',
      isKycDocument: true,
      status: 'approved',
    },
    {
      id: '3',
      fileName: 'selfie_with_id.jpg',
      fileType: 'image/jpeg',
      fileCategory: 'kyc-photo',
      fileSize: 3072000, // 3MB
      uploadedBy: 'Client Upload',
      uploadDate: new Date('2024-01-17T09:45:00'),
      description: 'Client selfie holding ID document',
      kycNote: 'Pending review - face verification needed',
      isKycDocument: true,
      status: 'pending',
    },
    {
      id: '4',
      fileName: 'bank_statement.pdf',
      fileType: 'application/pdf',
      fileCategory: 'financial',
      fileSize: 512000, // 512KB
      uploadedBy: 'Mike Brown',
      uploadDate: new Date('2024-01-18T11:15:00'),
      description: 'Bank statement for income verification',
      isKycDocument: false,
      status: 'approved',
    },
    {
      id: '5',
      fileName: 'trading_agreement.pdf',
      fileType: 'application/pdf',
      fileCategory: 'contract',
      fileSize: 1024000, // 1MB
      uploadedBy: 'System',
      uploadDate: new Date('2024-01-15T12:00:00'),
      description: 'Signed trading agreement and terms',
      isKycDocument: false,
      status: 'approved',
    },
  ];

  constructor() {
    this.uploadForm = this.fb.group({
      fileCategory: ['', Validators.required],
      isKycDocument: [false],
      description: [''],
      kycNote: [''],
    });
  }

  ngOnInit(): void {
    // Initialize component
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
          file.uploadedBy.toLowerCase().includes(term)
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
  }

  getTotalFileSize(): number {
    return this.files.reduce((total, file) => total + file.fileSize, 0);
  }

  getKycDocumentsCount(): number {
    return this.files.filter((file) => file.isKycDocument).length;
  }

  getApprovedKycCount(): number {
    return this.files.filter(
      (file) => file.isKycDocument && file.status === 'approved'
    ).length;
  }

  getPendingFilesCount(): number {
    return this.files.filter((file) => file.status === 'pending').length;
  }

  getImageFilesCount(): number {
    return this.files.filter((file) => file.fileType.startsWith('image/'))
      .length;
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

  toggleUploadForm(): void {
    this.showUploadForm = !this.showUploadForm;
    if (!this.showUploadForm) {
      this.uploadForm.reset();
      this.selectedFiles = [];
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer?.files || []);
    this.handleFiles(files);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.handleFiles(files);
    }
  }

  private handleFiles(files: File[]): void {
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        this.alertService.error(
          `File ${file.name} is too large. Maximum size is 10MB.`
        );
        return false;
      }
      return true;
    });

    this.selectedFiles = [...this.selectedFiles, ...validFiles];
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  uploadFiles(): void {
    if (this.uploadForm.valid && this.selectedFiles.length > 0) {
      const formData = this.uploadForm.value;

      this.selectedFiles.forEach((file) => {
        const newFile: ClientFile = {
          id: String(this.files.length + 1),
          fileName: file.name,
          fileType: file.type,
          fileCategory: formData.fileCategory,
          fileSize: file.size,
          uploadedBy: 'Current User', // Replace with actual user
          uploadDate: new Date(),
          description: formData.description,
          kycNote: formData.isKycDocument ? formData.kycNote : undefined,
          isKycDocument: formData.isKycDocument,
          status: formData.isKycDocument ? 'pending' : 'approved',
        };

        this.files.unshift(newFile);
      });

      this.uploadForm.reset();
      this.selectedFiles = [];
      this.showUploadForm = false;

      this.alertService.success(
        `${this.selectedFiles.length} file(s) uploaded successfully`
      );
    } else {
      this.alertService.error(
        'Please fill in all required fields and select files'
      );
    }
  }

  approveKycDocument(file: ClientFile): void {
    file.status = 'approved';
    file.kycNote = 'Document approved after review';
    this.alertService.success(`KYC document ${file.fileName} approved`);
  }
}
