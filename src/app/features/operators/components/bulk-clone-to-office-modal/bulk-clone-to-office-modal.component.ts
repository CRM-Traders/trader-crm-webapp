// src/app/features/operators/components/bulk-clone-to-office-modal/bulk-clone-to-office-modal.component.ts

import { Component, OnInit, inject, Input, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { AlertService } from '../../../../core/services/alert.service';
import { OperatorsService } from '../../services/operators.service';
import { Operator } from '../../models/operators.model';

interface OfficeDropdownItem {
  id: string;
  value: string;
}

@Component({
  selector: 'app-bulk-clone-to-office-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './bulk-clone-to-office-modal.component.html',
  styleUrls: ['./bulk-clone-to-office-modal.component.scss'],
})
export class BulkCloneToOfficeModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() operators: Operator[] = [];

  private alertService = inject(AlertService);
  private operatorsService = inject(OperatorsService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  private boundDocumentClickCapture?: (event: MouseEvent) => void;

  cloneForm: FormGroup;
  fromOffices: OfficeDropdownItem[] = [];
  toOffices: OfficeDropdownItem[] = [];
  loadingFromOffices = false;
  loadingToOffices = false;
  isSubmitting = false;

  // Dropdown states
  fromOfficeDropdownOpen = false;
  toOfficeDropdownOpen = false;
  fromOfficeSearchTerm = '';
  toOfficeSearchTerm = '';
  filteredFromOffices: OfficeDropdownItem[] = [];
  filteredToOffices: OfficeDropdownItem[] = [];
  focusedFromOfficeIndex = -1;
  focusedToOfficeIndex = -1;

  constructor() {
    this.cloneForm = this.fb.group({
      fromOfficeId: ['', [Validators.required]],
      toOfficeId: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadFromOffices();
    this.loadToOffices();

    // Use capturing phase so clicks inside the modal (which may stop propagation)
    // are still observed here to close open dropdowns when clicking outside
    this.boundDocumentClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('[data-dropdown="fromOffice"]') &&
        !target.closest('[data-dropdown="toOffice"]')
      ) {
        this.fromOfficeDropdownOpen = false;
        this.toOfficeDropdownOpen = false;
      }
    };
    document.addEventListener('click', this.boundDocumentClickCapture, true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.boundDocumentClickCapture) {
      document.removeEventListener('click', this.boundDocumentClickCapture, true);
      this.boundDocumentClickCapture = undefined;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.fromOfficeDropdownOpen = false;
    this.toOfficeDropdownOpen = false;
  }

  private loadFromOffices(): void {
    this.loadingFromOffices = true;

    const params = {
      pageIndex: 0,
      pageSize: 1000,
      globalFilter: null,
    };

    this.operatorsService
      .getOfficesDropdown(params)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load offices');
          return of({ items: [] });
        }),
        finalize(() => {
          this.loadingFromOffices = false;
        })
      )
      .subscribe((response: any) => {
        this.fromOffices = response.items || [];
        this.filteredFromOffices = this.fromOffices;
        // If there is exactly one office available, select it automatically
        if (this.fromOffices.length === 1) {
          const onlyOffice = this.fromOffices[0];
          if (onlyOffice && this.cloneForm.get('fromOfficeId')?.value !== onlyOffice.id) {
            this.cloneForm.patchValue({ fromOfficeId: onlyOffice.id });
          }
          this.fromOfficeDropdownOpen = false;
        }
      });
  }

  private loadToOffices(): void {
    this.loadingToOffices = true;

    this.operatorsService
      .getSwitchOfficesDropdown(0, 1000)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load switch offices');
          return of({ items: [] });
        }),
        finalize(() => {
          this.loadingToOffices = false;
        })
      )
      .subscribe((response: any) => {
        this.toOffices = response.items || [];
        this.filteredToOffices = this.toOffices;
      });
  }

  toggleFromOfficeDropdown(): void {
    // Prevent opening the dropdown when only one office is available
    if (this.fromOffices.length === 1) {
      this.fromOfficeDropdownOpen = false;
      return;
    }
    this.fromOfficeDropdownOpen = !this.fromOfficeDropdownOpen;
    if (this.fromOfficeDropdownOpen) {
      this.toOfficeDropdownOpen = false;
      this.fromOfficeSearchTerm = '';
      this.filteredFromOffices = this.fromOffices;
      this.focusedFromOfficeIndex = -1;
    }
  }

  toggleToOfficeDropdown(): void {
    this.toOfficeDropdownOpen = !this.toOfficeDropdownOpen;
    if (this.toOfficeDropdownOpen) {
      this.fromOfficeDropdownOpen = false;
      this.toOfficeSearchTerm = '';
      this.filteredToOffices = this.toOffices;
      this.focusedToOfficeIndex = -1;
    }
  }

  onFromOfficeSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value.toLowerCase();
    this.fromOfficeSearchTerm = searchTerm;
    this.filteredFromOffices = this.fromOffices.filter((office) =>
      office.value.toLowerCase().includes(searchTerm)
    );
    this.focusedFromOfficeIndex = -1;
  }

  onToOfficeSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value.toLowerCase();
    this.toOfficeSearchTerm = searchTerm;
    this.filteredToOffices = this.toOffices.filter((office) =>
      office.value.toLowerCase().includes(searchTerm)
    );
    this.focusedToOfficeIndex = -1;
  }

  selectFromOffice(office: OfficeDropdownItem): void {
    this.cloneForm.patchValue({ fromOfficeId: office.id });
    this.fromOfficeDropdownOpen = false;
    this.fromOfficeSearchTerm = '';
    this.filteredFromOffices = this.fromOffices;
  }

  selectToOffice(office: OfficeDropdownItem): void {
    this.cloneForm.patchValue({ toOfficeId: office.id });
    this.toOfficeDropdownOpen = false;
    this.toOfficeSearchTerm = '';
    this.filteredToOffices = this.toOffices;
  }

  getSelectedFromOfficeName(): string {
    const officeId = this.cloneForm.get('fromOfficeId')?.value;
    if (!officeId) return 'Select office...';
    const office = this.fromOffices.find((o) => o.id === officeId);
    return office ? office.value : 'Select office...';
  }

  getSelectedToOfficeName(): string {
    const officeId = this.cloneForm.get('toOfficeId')?.value;
    if (!officeId) return 'Select office...';
    const office = this.toOffices.find((o) => o.id === officeId);
    return office ? office.value : 'Select office...';
  }

  isFromOfficeFocused(index: number): boolean {
    return this.focusedFromOfficeIndex === index;
  }

  isToOfficeFocused(index: number): boolean {
    return this.focusedToOfficeIndex === index;
  }

  setFocusedFromOfficeIndex(index: number): void {
    this.focusedFromOfficeIndex = index;
  }

  setFocusedToOfficeIndex(index: number): void {
    this.focusedToOfficeIndex = index;
  }

  onFromOfficeKeydown(event: KeyboardEvent, office: OfficeDropdownItem, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectFromOffice(office);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, this.filteredFromOffices.length - 1);
      this.focusedFromOfficeIndex = nextIndex;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = Math.max(index - 1, -1);
      this.focusedFromOfficeIndex = prevIndex;
    }
  }

  onToOfficeKeydown(event: KeyboardEvent, office: OfficeDropdownItem, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectToOffice(office);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, this.filteredToOffices.length - 1);
      this.focusedToOfficeIndex = nextIndex;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = Math.max(index - 1, -1);
      this.focusedToOfficeIndex = prevIndex;
    }
  }

  onFromOfficeButtonKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleFromOfficeDropdown();
    }
  }

  onToOfficeButtonKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleToOfficeDropdown();
    }
  }

  onSubmit(): void {
    if (this.cloneForm.invalid) {
      this.cloneForm.markAllAsTouched();
      return;
    }

    const formValue = this.cloneForm.value;
    
    if (formValue.fromOfficeId === formValue.toOfficeId) {
      this.alertService.error('From office and To office must be different');
      return;
    }

    this.isSubmitting = true;

    const userIds = this.operators.map((operator) => operator.userId);

    const request = {
      userIds: userIds,
      fromOfficeId: formValue.fromOfficeId,
      toOfficeId: formValue.toOfficeId,
    };

    this.operatorsService
      .bulkCloneToOffice(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          let errorMessage = 'Failed to clone operators to office';
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          this.alertService.error(errorMessage);
          return of(null);
        }),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success(
            `Successfully cloned ${this.operators.length} operator(s) to office`
          );
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.close(false);
  }
}

