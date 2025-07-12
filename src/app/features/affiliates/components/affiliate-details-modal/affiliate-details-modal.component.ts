import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Subject,
  takeUntil,
  catchError,
  of,
  finalize,
} from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { AffiliatesService } from '../../services/affiliates.service';
import {
  Affiliate,
  AffiliateUpdateRequest,
} from '../../models/affiliates.model';

@Component({
  selector: 'app-affiliate-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div
        class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            Affiliate Details - {{ affiliate.name || '' }}
          </h2>
        </div>
      </div>

      <!-- Modal Body -->
      <div
        class="px-6 py-4 bg-white dark:bg-gray-900 max-h-[70vh] overflow-y-auto"
      >
        <ng-container *ngIf="!loadingDetails; else loadingTpl">
          <div class="space-y-6">
            <!-- Affiliate Information Section -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <dl class="space-y-4">
                <!-- ID -->
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ID</dt>
                  <dd class="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md break-all">
                    {{ affiliate.id }}
                  </dd>
                </div>

                <!-- Name -->
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Name</dt>
                  <dd class="text-base font-medium text-gray-900 dark:text-white">
                    {{ affiliate.name }}
                  </dd>
                </div>

                <!-- Email -->
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</dt>
                  <dd class="text-sm text-gray-900 dark:text-white break-all">
                    <a
                      [href]="'mailto:' + affiliate.email"
                      class="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {{ affiliate.email }}
                    </a>
                  </dd>
                </div>

                <!-- Phone -->
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</dt>
                  <dd>
                    <form [formGroup]="editForm">
                      <input
                        *ngIf="isEditing"
                        type="tel"
                        formControlName="phone"
                        class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        [class.border-red-300]="
                          editForm.get('phone')?.invalid &&
                          editForm.get('phone')?.touched
                        "
                        placeholder="+1 (555) 123-4567"
                      />
                    </form>
                    <span *ngIf="!isEditing" class="text-sm text-gray-900 dark:text-white">
                      <a
                        *ngIf="affiliate.phone"
                        [href]="'tel:' + affiliate.phone"
                        class="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {{ affiliate.phone }}
                      </a>
                      <span
                        *ngIf="!affiliate.phone"
                        class="text-gray-400 dark:text-gray-500"
                      >-</span>
                    </span>
                    <p
                      *ngIf="
                        isEditing &&
                        editForm.get('phone')?.invalid &&
                        editForm.get('phone')?.touched
                      "
                      class="mt-2 text-sm text-red-600 dark:text-red-400"
                    >
                      Invalid phone number format
                    </p>
                  </dd>
                </div>

                <!-- Website -->
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Website</dt>
                  <dd>
                    <form [formGroup]="editForm">
                      <input
                        *ngIf="isEditing"
                        type="url"
                        formControlName="website"
                        class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        [class.border-red-300]="
                          editForm.get('website')?.invalid &&
                          editForm.get('website')?.touched
                        "
                        placeholder="https://example.com"
                      />
                    </form>
                    <a
                      *ngIf="!isEditing && affiliate.website"
                      [href]="affiliate.website"
                      target="_blank"
                      class="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {{ affiliate.website }}
                      <svg
                        class="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                    <span
                      *ngIf="!isEditing && !affiliate.website"
                      class="text-sm text-gray-400 dark:text-gray-500"
                    >-</span>
                    <p
                      *ngIf="
                        isEditing &&
                        editForm.get('website')?.invalid &&
                        editForm.get('website')?.touched
                      "
                      class="mt-2 text-sm text-red-600 dark:text-red-400"
                    >
                      Invalid URL format (must start with http:// or https://)
                    </p>
                  </dd>
                </div>

                <!-- Status -->
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</dt>
                  <dd>
                    <span
                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                          affiliate.isActive,
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': !affiliate.isActive
                      }"
                    >
                      <span
                        class="w-2 h-2 rounded-full mr-2"
                        [ngClass]="{
                          'bg-green-600 dark:bg-green-400': affiliate.isActive,
                          'bg-gray-600 dark:bg-gray-400': !affiliate.isActive
                        }"
                      ></span>
                      {{ affiliate.isActive ? "Active" : "Inactive" }}
                    </span>
                  </dd>
                </div>

                <!-- Clients -->
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Clients</dt>
                  <dd class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ affiliate.clientsCount }}
                  </dd>
                </div>

                <!-- Created Date -->
                <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created</dt>
                  <dd class="text-sm text-gray-600 dark:text-gray-400">
                    {{ affiliate.createdAt | date : "MMMM d, y 'at' h:mm a" }}
                  </dd>
                </div>

                <!-- Last Modified -->
                <div *ngIf="affiliate?.lastModifiedAt">
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Modified</dt>
                  <dd class="text-sm text-gray-600 dark:text-gray-400">
                    {{ affiliate.lastModifiedAt | date : "MMMM d, y 'at' h:mm a" }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </ng-container>
        <ng-template #loadingTpl>
          <div class="flex items-center justify-center min-h-[200px]">
            <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </ng-template>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <div class="flex gap-3">
          <button
            *ngIf="!isEditing && !loadingDetails"
            type="button"
            class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            (click)="startEdit()"
          >
            <svg
              class="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Details
          </button>

          <button
            *ngIf="isEditing && !loadingDetails"
            type="button"
            class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            [disabled]="editForm.invalid || loading"
            (click)="saveAffiliate()"
          >
            <svg
              *ngIf="!loading"
              class="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <svg
              *ngIf="loading"
              class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
            {{ loading ? "Saving..." : "Save Changes" }}
          </button>

          <button
            *ngIf="isEditing && !loadingDetails"
            type="button"
            class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            (click)="cancelEdit()"
          >
            Cancel
          </button>
        </div>

        <button
          type="button"
          class="w-full inline-flex justify-center items-center px-4 py-2.5 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          [disabled]="(affiliate.clientsCount || 0) > 0 || loadingDetails"
          [title]="
            (affiliate.clientsCount || 0) > 0
              ? 'Cannot delete affiliate with active clients'
              : ''
          "
          (click)="confirmDelete()"
        >
          <svg
            class="-ml-1 mr-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete Affiliate
        </button>
      </div>
    </div>
  `,
})
export class AffiliateDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() affiliate!: Affiliate;

  private fb = inject(FormBuilder);
  private affiliatesService = inject(AffiliatesService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;
  loadingDetails = false;

  constructor() {
    this.editForm = this.fb.group({
      phone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
    });
  }

  ngOnInit(): void {
    if (this.affiliate?.id) {
      this.loadingDetails = true;
      this.affiliatesService.getAffiliateById(this.affiliate.id)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to load affiliate details');
            this.loadingDetails = false;
            return of(null);
          }),
          finalize(() => (this.loadingDetails = false))
        )
        .subscribe((affiliate) => {
          if (affiliate) {
            this.affiliate = affiliate;
            this.editForm.patchValue({
              phone: affiliate.phone || '',
              website: affiliate.website || '',
            });
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startEdit(): void {
    this.isEditing = true;
    this.editForm.patchValue({
      phone: this.affiliate?.phone || '',
      website: this.affiliate?.website || '',
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editForm.patchValue({
      phone: this.affiliate?.phone || '',
      website: this.affiliate?.website || '',
    });
  }

  saveAffiliate(): void {
    if (this.editForm.invalid) return;
    if (!this.affiliate || !this.affiliate.id) return;

    const updateRequest: AffiliateUpdateRequest = {
      id: this.affiliate.id,
      phone: this.editForm.value.phone || null,
      website: this.editForm.value.website || null,
    };

    this.loading = true;
    this.affiliatesService
      .updateAffiliate(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update affiliate');
          console.error('Error updating affiliate:', error);
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Affiliate updated successfully');
          this.isEditing = false;
          // Update the affiliate data with form values
          this.affiliate = {
            ...this.affiliate,
            phone: this.editForm.value.phone || null,
            website: this.editForm.value.website || null
          };
          this.modalRef.close(true);
        }
      });
  }

  confirmDelete(): void {
    if (this.affiliate?.clientsCount > 0) {
      this.alertService.error('Cannot delete affiliate with active clients');
      return;
    }

    if (confirm(`Are you sure you want to delete ${this.affiliate?.name}? This action cannot be undone.`)) {
      this.deleteAffiliate();
    }
  }

  deleteAffiliate(): void {
    if (!this.affiliate || !this.affiliate.id) return;
    this.loading = true;
    this.affiliatesService
      .deleteAffiliate(this.affiliate.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          if (error.status === 409) {
            this.alertService.error(
              'Cannot delete affiliate with associated clients'
            );
          } else {
            this.alertService.error('Failed to delete affiliate');
          }
          console.error('Error deleting affiliate:', error);
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Affiliate deleted successfully');
          this.modalRef.close(true);
        }
      });
  }
}
