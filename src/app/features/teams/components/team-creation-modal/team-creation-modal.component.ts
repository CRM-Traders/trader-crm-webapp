// src/app/features/teams/components/team-creation-modal/team-creation-modal.component.ts

import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
  NgZone,
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
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  TeamCreateRequest,
  TeamCreateResponse,
  DeskDropdownItem,
  DeskDropdownResponse,
} from '../../models/team.model';
import { TeamsService } from '../../services/teams.service';

interface BrandDropdownItem {
  id: string;
  value: string;
  description?: string;
}

interface BrandDropdownResponse {
  items: BrandDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

@Component({
  selector: 'app-team-creation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './team-creation-modal.component.html',
  styles: [],
})
export class TeamCreationModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @ViewChild('deskSearchInput', { static: false })
  deskSearchInput!: ElementRef;
  @ViewChild('brandSearchInput', { static: false })
  brandSearchInput!: ElementRef;

  private fb = inject(FormBuilder);
  private teamsService = inject(TeamsService);
  private alertService = inject(AlertService);
  private ngZone = inject(NgZone);
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  teamForm: FormGroup;
  availableDesks: DeskDropdownItem[] = [];
  availableBrands: BrandDropdownItem[] = [];

  // Brand dropdown state
  brandSearchTerm = '';
  brandPageIndex = 0;
  brandPageSize = 20;
  brandTotalCount = 0;
  brandLoading = false;
  brandHasNextPage = false;
  brandDropdownOpen = false;

  // Desk dropdown state
  deskSearchTerm = '';
  deskPageIndex = 0;
  deskPageSize = 20;
  deskTotalCount = 0;
  deskLoading = false;
  deskHasNextPage = false;
  deskDropdownOpen = false;

  // Keyboard navigation properties
  focusedBrandIndex = -1;
  focusedDeskIndex = -1;

  constructor() {
    this.teamForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      brandId: ['', [Validators.required]],
      deskId: ['', [Validators.required]],
      brandSearch: [''],
      deskSearch: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.initializeSearchObservables();
    this.loadInitialBrands();
    this.setupBrandWatcher();

    // Capture-phase listeners to reliably detect outside clicks
    document.addEventListener('mousedown', this.boundGlobalHandler, true);
    document.addEventListener('touchstart', this.boundGlobalHandler, true);
    document.addEventListener('click', this.boundGlobalHandler, true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    document.removeEventListener('mousedown', this.boundGlobalHandler, true);
    document.removeEventListener('touchstart', this.boundGlobalHandler, true);
    document.removeEventListener('click', this.boundGlobalHandler, true);
  }

  private initializeSearchObservables(): void {
    // Brand search
    this.teamForm
      .get('brandSearch')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.brandSearchTerm = searchTerm || '';
        this.resetBrandDropdown();
        this.loadBrands();
      });

    // Desk search
    this.teamForm
      .get('deskSearch')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.deskSearchTerm = searchTerm || '';
        this.resetDeskDropdown();
        this.loadDesks();
      });
  }

  private setupBrandWatcher(): void {
    this.teamForm
      .get('brandId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((brandId: string) => {
        // Clear desk selection when brand changes
        this.teamForm.patchValue({ deskId: '' });
        this.resetDeskDropdown();
        if (brandId) {
          this.loadDesks();
        }
      });
  }

  private loadInitialBrands(): void {
    this.resetBrandDropdown();
    this.loadBrands();
  }

  private resetBrandDropdown(): void {
    this.brandPageIndex = 0;
    this.availableBrands = [];
    this.brandHasNextPage = false;
  }

  private resetDeskDropdown(): void {
    this.deskPageIndex = 0;
    this.availableDesks = [];
    this.deskHasNextPage = false;
  }

  private loadBrands(): void {
    if (this.brandLoading) return;

    this.brandLoading = true;
    const request = {
      pageIndex: this.brandPageIndex,
      pageSize: this.brandPageSize,
      sortField: 'name',
      sortDirection: 'asc',
      visibleColumns: ['array', 'null'],
      globalFilter: this.brandSearchTerm,
      filters: null,
    };

    this.teamsService
      .getBrandsDropdown(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load brands');
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 1,
            pageSize: 20,
            totalPages: 0,
          });
        })
      )
      .subscribe((response: BrandDropdownResponse) => {
        if (this.brandPageIndex === 0) {
          this.availableBrands = response.items;
        } else {
          this.availableBrands = [...this.availableBrands, ...response.items];
        }

        this.brandTotalCount = response.totalCount;
        this.brandHasNextPage = response.pageIndex < response.totalPages;
        this.brandLoading = false;
      });
  }

  private loadDesks(): void {
    if (this.deskLoading) return;

    const selectedBrandId = this.teamForm.get('brandId')?.value;
    if (!selectedBrandId) return;

    this.deskLoading = true;
    const request = {
      brandId: selectedBrandId,
      pageIndex: this.deskPageIndex,
      pageSize: this.deskPageSize,
      sortField: 'name',
      sortDirection: 'asc',
      visibleColumns: ['array', 'null'],
      globalFilter: this.deskSearchTerm,
      filters: null,
    };

    this.teamsService
      .getDesksDropdown(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load desks');
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 1,
            pageSize: 20,
            totalPages: 0,
          });
        })
      )
      .subscribe((response: DeskDropdownResponse) => {
        if (this.deskPageIndex === 0) {
          this.availableDesks = response.items;
        } else {
          this.availableDesks = [...this.availableDesks, ...response.items];
        }

        this.deskTotalCount = response.totalCount;
        this.deskHasNextPage = response.pageIndex < response.totalPages;
        this.deskLoading = false;
      });
  }

  onBrandDropdownScroll(event: any): void {
    const element = event.target;
    const threshold = 100;

    if (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - threshold
    ) {
      this.loadMoreBrands();
    }
  }

  private loadMoreBrands(): void {
    if (this.brandHasNextPage && !this.brandLoading) {
      this.brandPageIndex++;
      this.loadBrands();
    }
  }

  onBrandSearch(event: any): void {
    const searchTerm = event.target.value;
    this.teamForm.patchValue({ brandSearch: searchTerm });
  }

  toggleBrandDropdown(): void {
    // Close desk dropdown if open
    if (this.deskDropdownOpen) {
      this.deskDropdownOpen = false;
    }
    this.brandDropdownOpen = !this.brandDropdownOpen;
    if (this.brandDropdownOpen) {
      this.focusedBrandIndex = 0; // Start with first item focused
    }
  }

  selectBrand(brand: BrandDropdownItem): void {
    this.teamForm.patchValue({ brandId: brand.id });
    this.brandDropdownOpen = false;
  }

  getSelectedBrandName(): string {
    const selectedBrandId = this.teamForm.get('brandId')?.value;
    const selectedBrand = this.availableBrands.find(
      (brand) => brand.id === selectedBrandId
    );
    return selectedBrand ? selectedBrand.value : 'Select a brand';
  }

  // Desk dropdown methods
  onDeskDropdownScroll(event: any): void {
    const element = event.target;
    const threshold = 100;

    if (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - threshold
    ) {
      this.loadMoreDesks();
    }
  }

  private loadMoreDesks(): void {
    if (this.deskHasNextPage && !this.deskLoading) {
      this.deskPageIndex++;
      this.loadDesks();
    }
  }

  onDeskSearch(event: any): void {
    const searchTerm = event.target.value;
    this.teamForm.patchValue({ deskSearch: searchTerm });
  }

  toggleDeskDropdown(): void {
    if (this.teamForm.get('brandId')?.value) {
      // Close brand dropdown if open
      if (this.brandDropdownOpen) {
        this.brandDropdownOpen = false;
      }
      this.deskDropdownOpen = !this.deskDropdownOpen;
      if (this.deskDropdownOpen) {
        this.focusedDeskIndex = 0; // Start with first item focused
      }
    }
  }

  selectDesk(desk: DeskDropdownItem): void {
    this.teamForm.patchValue({ deskId: desk.id });
    this.deskDropdownOpen = false;
  }

  getSelectedDeskName(): string {
    const selectedDeskId = this.teamForm.get('deskId')?.value;
    const selectedDesk = this.availableDesks.find(
      (desk) => desk.id === selectedDeskId
    );
    return selectedDesk ? selectedDesk.value : 'Select a desk';
  }

  onSubmit(): void {
    if (this.teamForm.invalid) {
      Object.keys(this.teamForm.controls).forEach((key) => {
        this.teamForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.teamForm.value;

    const teamData: TeamCreateRequest = {
      name: formValue.name.trim(),
      brandId: formValue.brandId,
      deskId: formValue.deskId,
      isActive: formValue.isActive,
    };

    this.teamsService
      .createTeam(teamData)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          if (error.status === 400) {
            this.alertService.error(
              'Invalid data provided. Please check your inputs.'
            );
          } else if (error.status === 409) {
            this.alertService.error(
              'A team with this name already exists in this desk.'
            );
          } else {
            this.alertService.error('Failed to create team. Please try again.');
          }
          return of(null);
        })
      )
      .subscribe((response: TeamCreateResponse | null) => {
        this.isSubmitting = false;
        if (response) {
          this.alertService.success('Team created successfully!');
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }

  // Keyboard navigation methods for Brand dropdown
  isBrandFocused(index: number): boolean {
    return this.focusedBrandIndex === index;
  }

  setFocusedBrandIndex(index: number): void {
    this.focusedBrandIndex = index;
  }

  onBrandKeydown(event: KeyboardEvent, brand: BrandDropdownItem, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectBrand(brand);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextBrand();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousBrand();
        break;
      case 'Escape':
        this.brandDropdownOpen = false;
        break;
    }
  }

  private focusNextBrand(): void {
    if (this.focusedBrandIndex < this.availableBrands.length - 1) {
      this.focusedBrandIndex++;
    }
  }

  private focusPreviousBrand(): void {
    if (this.focusedBrandIndex > 0) {
      this.focusedBrandIndex--;
    }
  }

  // Keyboard navigation methods for Desk dropdown
  isDeskFocused(index: number): boolean {
    return this.focusedDeskIndex === index;
  }

  setFocusedDeskIndex(index: number): void {
    this.focusedDeskIndex = index;
  }

  onDeskKeydown(event: KeyboardEvent, desk: DeskDropdownItem, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDesk(desk);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextDesk();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousDesk();
        break;
      case 'Escape':
        this.deskDropdownOpen = false;
        break;
    }
  }

  private focusNextDesk(): void {
    if (this.focusedDeskIndex < this.availableDesks.length - 1) {
      this.focusedDeskIndex++;
    }
  }

  private focusPreviousDesk(): void {
    if (this.focusedDeskIndex > 0) {
      this.focusedDeskIndex--;
    }
  }

  // Button keydown handlers for opening dropdowns
  onBrandButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.brandDropdownOpen) {
          this.toggleBrandDropdown();
        }
        break;
    }
  }

  onDeskButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.deskDropdownOpen && this.teamForm.get('brandId')?.value) {
          this.toggleDeskDropdown();
        }
        break;
    }
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  private handleGlobalPointerEvent(event: Event): void {
    const target = event.target as HTMLElement;

    const brandDropdown = target.closest('[data-dropdown="brand"]');
    const deskDropdown = target.closest('[data-dropdown="desk"]');

    if (!brandDropdown) {
      this.brandDropdownOpen = false;
      this.focusedBrandIndex = -1;
    }
    if (!deskDropdown) {
      this.deskDropdownOpen = false;
      this.focusedDeskIndex = -1;
    }
  }

  private boundGlobalHandler = (event: Event) => this.ngZone.run(() => this.handleGlobalPointerEvent(event));
}
