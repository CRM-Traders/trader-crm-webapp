import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorsService } from '../../services/operators.service';
import { AlertService } from '../../../../core/services/alert.service';
import { takeUntil, catchError, of, finalize } from 'rxjs';
import { Subject } from 'rxjs';
import { ModalService } from '../../../../shared/services/modals/modal.service';

export interface OperatorDetailsData {
  operatorId: string;
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-operator-details-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-900">
          Operator Details
        </h2>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600"
          (click)="closeModal()"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div *ngIf="loading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div *ngIf="!loading && operator" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Personal Information</h3>
            <div class="space-y-2">
              <div>
                <span class="text-sm font-medium text-gray-700">Full Name:</span>
                <span class="ml-2 text-sm text-gray-900">{{ operator.userFullName || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700">Email:</span>
                <span class="ml-2 text-sm text-gray-900">{{ operator.userEmail || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700">User ID:</span>
                <span class="ml-2 text-sm text-gray-900 font-mono">{{ operator.userId || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Work Information</h3>
            <div class="space-y-2">
              <div>
                <span class="text-sm font-medium text-gray-700">Department:</span>
                <span class="ml-2 text-sm text-gray-900">{{ operator.departmentName || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700">Role:</span>
                <span class="ml-2 text-sm text-gray-900">{{ operator.roleName || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700">Branch:</span>
                <span class="ml-2 text-sm text-gray-900">{{ operator.branchName || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700">Branch Type:</span>
                <span class="ml-2 text-sm text-gray-900">{{ operator.branchTypeName || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-500 mb-2">System Information</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span class="text-sm font-medium text-gray-700">User Type:</span>
              <span class="ml-2 text-sm text-gray-900">{{ operator.userTypeName || 'N/A' }}</span>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-700">Operator Type:</span>
              <span class="ml-2 text-sm text-gray-900">{{ operator.operatorTypeName || 'N/A' }}</span>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-700">Created:</span>
              <span class="ml-2 text-sm text-gray-900">{{ operator.createdAt ? (operator.createdAt | date:'short') : 'N/A' }}</span>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-700">Created By:</span>
              <span class="ml-2 text-sm text-gray-900">{{ operator.createdBy || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <div *ngIf="operator.branches && operator.branches.length > 0" class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-500 mb-2">Assigned Branches</h3>
          <div class="space-y-2">
            <div *ngFor="let branch of operator.branches" class="flex items-center justify-between p-2 bg-white rounded border-gray-200 border">
              <div>
                <span class="text-sm font-medium text-gray-900">{{ branch.name }}</span>
                <span class="ml-2 text-xs text-gray-500">({{ branch.type }})</span>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="operator.departments && operator.departments.length > 0" class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-500 mb-2">Assigned Departments</h3>
          <div class="space-y-2">
            <div *ngFor="let dept of operator.departments" class="flex items-center justify-between p-2 bg-white rounded border-gray-200 border">
              <span class="text-sm font-medium text-gray-900">{{ dept.name || dept.departmentName }}</span>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && !operator" class="text-center py-8">
        <p class="text-gray-500">Operator not found</p>
      </div>

      <div class="flex justify-end mt-6">
        <button
          type="button"
          class="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-400 transition-colors"
          (click)="closeModal()"
        >
          Close
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class OperatorDetailsModalComponent implements OnInit, OnDestroy {
  private operatorsService = inject(OperatorsService);
  private modalService = inject(ModalService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  operator: any = null;
  loading = true;
  operatorId: string = '';

  constructor() {
    // The modal service will inject the data
  }

  ngOnInit(): void {
    // This will be called after the modal is opened with data
    // The modal service automatically injects data into the component instance
    if (this.operatorId) {
      this.loadOperatorDetails(this.operatorId);
    }
  }

  loadOperatorDetails(operatorId: string): void {
    this.loading = true;
    
    this.operatorsService.getOperatorById(operatorId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load operator details');
          console.error('Error loading operator details:', error);
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((operator) => {
        this.operator = operator;
      });
  }

  closeModal(): void {
    this.modalService.closeAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 