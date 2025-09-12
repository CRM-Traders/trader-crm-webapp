// src/app/features/brands/components/brand-creation-modal/brand-creation-modal.component.ts

import { Component, inject, Input, OnInit, HostListener, ViewChild, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { CountryService } from '../../../../core/services/country.service';
import { Country } from '../../../../core/models/country.model';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  BrandCreateRequest,
  BrandCreateResponse,
} from '../../models/brand.model';
import { BrandsService } from '../../services/brands.service';
import { 
  OfficeDropdownItem, 
  OfficesListRequest 
} from '../../../officies/models/office.model';

@Component({
  selector: 'app-brand-creation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './brand-creation-modal.component.html',
  styles: [],
})
export class BrandCreationModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @ViewChild('countryDropdownContainer') countryDropdownContainer?: ElementRef<HTMLElement>;
  @ViewChild('officeDropdownContainer') officeDropdownContainer?: ElementRef<HTMLElement>;

  private fb = inject(FormBuilder);
  private brandsService = inject(BrandsService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private ngZone = inject(NgZone);

  isSubmitting = false;
  brandForm: FormGroup;

  // Office dropdown properties
  officeDropdownOpen = false;
  officeLoading = false;
  officeSearchTerm = '';
  availableOffices: OfficeDropdownItem[] = [];
  selectedOffice: OfficeDropdownItem | null = null;
  currentOfficePage = 0;
  officePageSize = 20;
  hasMoreOffices = false;

  // Keyboard navigation properties
  focusedCountryIndex = -1;
  focusedOfficeIndex = -1;

  // Country dropdown properties
  countryDropdownOpen = false;
  countrySearchTerm = '';
  availableCountries: Country[] = [];
  filteredCountries: Country[] = [];
  selectedCountry: Country | null = null;

  constructor() {
    this.brandForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      country: ['', [Validators.required]],
      officeId: ['', [Validators.required]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadOffices();
    this.loadCountries();

    // Add capture-phase listeners to reliably detect outside clicks
    document.addEventListener('mousedown', this.boundGlobalHandler, true);
    document.addEventListener('touchstart', this.boundGlobalHandler, true);
    document.addEventListener('click', this.boundGlobalHandler, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.boundGlobalHandler, true);
    document.removeEventListener('touchstart', this.boundGlobalHandler, true);
    document.removeEventListener('click', this.boundGlobalHandler, true);
  }

  // Office dropdown methods
  toggleOfficeDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.officeDropdownOpen) {
      this.officeDropdownOpen = false;
      return;
    }
    // Close country dropdown and open office dropdown
    this.countryDropdownOpen = false;
    this.officeDropdownOpen = true;
    this.focusedOfficeIndex = 0; // Start with first item focused
    if (this.availableOffices.length === 0) {
      this.loadOffices();
    }
  }

  loadOffices(reset: boolean = false): void {
    if (this.officeLoading) return;

    if (reset) {
      this.currentOfficePage = 0;
      this.availableOffices = [];
    }

    this.officeLoading = true;

    const request: OfficesListRequest = {
      pageIndex: this.currentOfficePage,
      pageSize: this.officePageSize,
      globalFilter: this.officeSearchTerm || null,
    };

    this.brandsService.getOfficeDropdown(request).subscribe({
      next: (response) => {
        if (reset) {
          this.availableOffices = response.items;
        } else {
          this.availableOffices = [...this.availableOffices, ...response.items];
        }
        this.hasMoreOffices = response.hasNextPage;
        this.officeLoading = false;
      },
      error: (error) => {
        this.officeLoading = false;
        this.alertService.error('Failed to load offices');
      },
    });
  }

  onOfficeSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.officeSearchTerm = target.value;
    this.currentOfficePage = 0;
    this.loadOffices(true);
  }

  onOfficeDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreOffices &&
      !this.officeLoading
    ) {
      this.currentOfficePage++;
      this.loadOffices();
    }
  }

  selectOffice(office: OfficeDropdownItem): void {
    this.selectedOffice = office;
    this.brandForm.patchValue({ officeId: office.id });
    this.officeDropdownOpen = false;
  }

  getSelectedOfficeName(): string {
    if (this.selectedOffice) {
      return `${this.selectedOffice.value}`;
    }
    return 'Select an office...';
  }

  // Country dropdown methods
  loadCountries(): void {
    this.countryService.getCountries().subscribe({
      next: (countries) => {
        this.availableCountries = countries;
        this.filteredCountries = countries;
      },
      error: (error) => {
        this.alertService.error('Failed to load countries');
      },
    });
  }

  toggleCountryDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
      return;
    }
    // Close office dropdown and open country dropdown
    this.officeDropdownOpen = false;
    this.countryDropdownOpen = true;
    this.focusedCountryIndex = 0; // Start with first item focused
  }

  onCountrySearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.countrySearchTerm = target.value.toLowerCase();
    
    this.filteredCountries = this.availableCountries.filter(country =>
      country.name.toLowerCase().includes(this.countrySearchTerm)
    );
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.brandForm.patchValue({ country: country.name });
    this.countryDropdownOpen = false;
    this.countrySearchTerm = '';
    this.filteredCountries = this.availableCountries;
  }

  getSelectedCountryName(): string {
    if (this.selectedCountry) {
      return this.selectedCountry.name;
    }
    return 'Select a country...';
  }

  onSubmit(): void {
    if (this.brandForm.invalid) {
      Object.keys(this.brandForm.controls).forEach((key) => {
        this.brandForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.brandForm.value;

    const brandData: BrandCreateRequest = {
      name: formValue.name.trim(),
      country: formValue.country,
      officeId: formValue.officeId,
      isActive: formValue.isActive,
    };

    this.brandsService.createBrand(brandData).subscribe({
      next: (response: BrandCreateResponse) => {
        this.isSubmitting = false;
        this.alertService.success('Brand created successfully!');
        this.modalRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error('A brand with this name already exists.');
        } else {
          this.alertService.error('Failed to create brand. Please try again.');
        }
      },
    });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  @HostListener('document:touchstart', ['$event'])
  onDocumentTouchStart(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  private handleGlobalPointerEvent(event: Event): void {
    const targetNode = event.target as Node;
    const clickedInsideCountry = this.countryDropdownContainer?.nativeElement.contains(targetNode) ?? false;
    const clickedInsideOffice = this.officeDropdownContainer?.nativeElement.contains(targetNode) ?? false;

    if (!clickedInsideCountry && !clickedInsideOffice) {
      this.closeAllDropdowns();
    }
  }

  private boundGlobalHandler = (event: Event) => this.ngZone.run(() => this.handleGlobalPointerEvent(event));

  // Fallback for cases where document click might be stopped by modal overlay/portals
  onRootClick(event: MouseEvent): void {
    const targetNode = event.target as Node;
    const clickedInsideCountry = this.countryDropdownContainer?.nativeElement.contains(targetNode) ?? false;
    const clickedInsideOffice = this.officeDropdownContainer?.nativeElement.contains(targetNode) ?? false;

    if (!clickedInsideCountry && !clickedInsideOffice) {
      this.closeAllDropdowns();
    }
  }

  private closeAllDropdowns(): void {
    this.officeDropdownOpen = false;
    this.countryDropdownOpen = false;
    
    // Reset focus indices
    this.focusedCountryIndex = -1;
    this.focusedOfficeIndex = -1;
  }

  // Keyboard navigation methods for Country dropdown
  isCountryFocused(index: number): boolean {
    return this.focusedCountryIndex === index;
  }

  setFocusedCountryIndex(index: number): void {
    this.focusedCountryIndex = index;
  }

  onCountryKeydown(event: KeyboardEvent, country: Country, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectCountry(country);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextCountry();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousCountry();
        break;
      case 'Escape':
        this.countryDropdownOpen = false;
        break;
    }
  }

  private focusNextCountry(): void {
    if (this.focusedCountryIndex < this.filteredCountries.length - 1) {
      this.focusedCountryIndex++;
    }
  }

  private focusPreviousCountry(): void {
    if (this.focusedCountryIndex > 0) {
      this.focusedCountryIndex--;
    }
  }

  // Keyboard navigation methods for Office dropdown
  isOfficeFocused(index: number): boolean {
    return this.focusedOfficeIndex === index;
  }

  setFocusedOfficeIndex(index: number): void {
    this.focusedOfficeIndex = index;
  }

  onOfficeKeydown(event: KeyboardEvent, office: OfficeDropdownItem, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectOffice(office);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextOffice();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousOffice();
        break;
      case 'Escape':
        this.officeDropdownOpen = false;
        break;
    }
  }

  private focusNextOffice(): void {
    if (this.focusedOfficeIndex < this.availableOffices.length - 1) {
      this.focusedOfficeIndex++;
    }
  }

  private focusPreviousOffice(): void {
    if (this.focusedOfficeIndex > 0) {
      this.focusedOfficeIndex--;
    }
  }

  // Button keydown handlers for opening dropdowns
  onCountryButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.countryDropdownOpen) {
          this.toggleCountryDropdown();
        }
        break;
    }
  }

  onOfficeButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.officeDropdownOpen) {
          this.toggleOfficeDropdown();
        }
        break;
    }
  }
}
