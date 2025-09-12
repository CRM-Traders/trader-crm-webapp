// src/app/features/leads/components/lead-details-modal/lead-details-modal.component.ts

import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
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
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { Country } from '../../../../core/models/country.model';
import { LeadsService } from '../../services/leads.service';
import {
  Lead,
  LeadUpdateRequest,
  LeadStatus,
  LeadStatusLabels,
  LeadStatusColors,
} from '../../models/leads.model';

@Component({
  selector: 'app-lead-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lead-details-modal.component.html',
})
export class LeadDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() leadId!: string;

  private fb = inject(FormBuilder);
  private leadsService = inject(LeadsService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private ngZone = inject(NgZone);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;
  leadLoading = false;
  lead: Lead | null = null;

  // Country dropdown properties
  countryDropdownOpen = false;
  countrySearchTerm = '';
  availableCountries: Country[] = [];
  filteredCountries: Country[] = [];
  selectedCountry: Country | null = null;

  // Language dropdown properties
  languageDropdownOpen = false;
  languageSearchTerm = '';
  availableLanguages: Array<{ key: string; value: string }> = [];
  filteredLanguages: Array<{ key: string; value: string }> = [];
  selectedLanguage: { key: string; value: string } | null = null;

  // Keyboard navigation properties
  focusedCountryIndex = -1;
  focusedLanguageIndex = -1;

  // Enums for template
  LeadStatus = LeadStatus;
  LeadStatusLabels = LeadStatusLabels;
  LeadStatusColors = LeadStatusColors;

  constructor() {
    this.editForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      country: [''],
      language: ['en'], // Set English as default
      dateOfBirth: [''],
    });
  }

  ngOnInit(): void {
    this.loadLeadData();
    this.loadCountries();
    this.loadLanguages();

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

  private loadLeadData(): void {
    if (!this.leadId) {
      this.alertService.error('Lead ID is required');
      return;
    }

    this.leadLoading = true;
    this.leadsService
      .getClientById(this.leadId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load lead data');
          return of(null);
        }),
        finalize(() => (this.leadLoading = false))
      )
      .subscribe((lead) => {
        if (lead) {
          this.lead = lead;
          this.updateFormWithLeadData();
        }
      });
  }

  private updateFormWithLeadData(): void {
    if (!this.lead) return;

    this.editForm.patchValue({
      firstName: this.lead.firstName || '',
      lastName: this.lead.lastName || '',
      email: this.lead.email || '',
      telephone: this.lead.telephone || '',
      country: this.lead.country || '',
      language: this.lead.language || '',
      dateOfBirth: this.lead.dateOfBirth
        ? this.lead.dateOfBirth.split('T')[0]
        : '',
    });

    // Set selected country and language
    if (this.lead.country) {
      this.selectedCountry =
        this.availableCountries.find((c) => c.code === this.lead?.country) ||
        null;
    }
    if (this.lead.language) {
      this.selectedLanguage =
        this.availableLanguages.find((l) => l.key === this.lead?.language) ||
        null;
    }
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.updateFormWithLeadData();
  }

  saveLead(): void {
    if (this.editForm.invalid || !this.lead) {
      return;
    }

    this.loading = true;
    const formValue = this.editForm.value;

    const updateRequest: LeadUpdateRequest = {
      id: this.lead.id,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      telephone: formValue.telephone || null,
      country: formValue.country || null,
      language: formValue.language || null,
      dateOfBirth: formValue.dateOfBirth || null,
    };

    this.leadsService
      .updateClient(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update lead');
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        // 204 No Content means success
        this.alertService.success('Lead updated successfully');
        this.isEditing = false;
        this.modalRef.close({ success: true, updated: true });
        this.loadLeadData(); // Reload data to get updated information
      });
  }

  onClose(): void {
    this.modalRef.close();
  }

  // Country dropdown methods
  private loadCountries(): void {
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.availableCountries = countries;
        this.filteredCountries = countries;
      });
  }

  toggleCountryDropdown(): void {
    this.countryDropdownOpen = !this.countryDropdownOpen;
    if (this.countryDropdownOpen) {
      this.languageDropdownOpen = false;
      this.focusedCountryIndex = 0; // Start with first item focused
    }
  }

  onCountrySearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.countrySearchTerm = target.value;
    this.filteredCountries = this.availableCountries.filter((country) =>
      country.name.toLowerCase().includes(this.countrySearchTerm.toLowerCase())
    );
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.editForm.patchValue({ country: country.name });
    this.countryDropdownOpen = false;
    this.countrySearchTerm = '';
    this.filteredCountries = this.availableCountries;
  }

  getSelectedCountryName(): string {
    if (this.selectedCountry) {
      return this.selectedCountry.name;
    }
    const formValue = this.editForm.get('country')?.value;
    if (formValue) {
      const country = this.availableCountries.find((c) => c.code === formValue);
      return country ? country.name : formValue;
    }
    return 'Select Country';
  }

  // Language dropdown methods
  private loadLanguages(): void {
    this.availableLanguages = this.languageService.getAllLanguages();
    this.filteredLanguages = this.availableLanguages;
  }

  toggleLanguageDropdown(): void {
    this.languageDropdownOpen = !this.languageDropdownOpen;
    if (this.languageDropdownOpen) {
      this.countryDropdownOpen = false;
      this.focusedLanguageIndex = 0; // Start with first item focused
    }
  }

  onLanguageSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.languageSearchTerm = target.value;
    this.filteredLanguages = this.availableLanguages.filter((language) =>
      language.value
        .toLowerCase()
        .includes(this.languageSearchTerm.toLowerCase())
    );
  }

  selectLanguage(language: { key: string; value: string }): void {
    this.selectedLanguage = language;
    this.editForm.patchValue({ language: language.key });
    this.languageDropdownOpen = false;
    this.languageSearchTerm = '';
    this.filteredLanguages = this.availableLanguages;
  }

  getSelectedLanguageName(): string {
    if (this.selectedLanguage) {
      return this.selectedLanguage.value;
    }
    const formValue = this.editForm.get('language')?.value;
    if (formValue) {
      const language = this.availableLanguages.find((l) => l.key === formValue);
      return language ? language.value : formValue;
    }
    return 'Select Language';
  }

  getCountryNameByCode(countryCode: string | null): string {
    if (!countryCode) return '';
    const country = this.availableCountries.find((c) => c.code === countryCode);
    return country ? country.name : countryCode;
  }

  getLanguageNameByKey(languageKey: string | null): string {
    if (!languageKey) return '';
    const language = this.availableLanguages.find((l) => l.key === languageKey);
    return language ? language.value : languageKey;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  private handleGlobalPointerEvent(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-dropdown]')) {
      this.countryDropdownOpen = false;
      this.languageDropdownOpen = false;
      this.focusedCountryIndex = -1;
      this.focusedLanguageIndex = -1;
    }
  }

  private boundGlobalHandler = (event: Event) => this.ngZone.run(() => this.handleGlobalPointerEvent(event));

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

  // Keyboard navigation methods for Language dropdown
  isLanguageFocused(index: number): boolean {
    return this.focusedLanguageIndex === index;
  }

  setFocusedLanguageIndex(index: number): void {
    this.focusedLanguageIndex = index;
  }

  onLanguageKeydown(event: KeyboardEvent, language: { key: string; value: string }, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectLanguage(language);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextLanguage();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousLanguage();
        break;
      case 'Escape':
        this.languageDropdownOpen = false;
        break;
    }
  }

  private focusNextLanguage(): void {
    if (this.focusedLanguageIndex < this.filteredLanguages.length - 1) {
      this.focusedLanguageIndex++;
    }
  }

  private focusPreviousLanguage(): void {
    if (this.focusedLanguageIndex > 0) {
      this.focusedLanguageIndex--;
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

  onLanguageButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.languageDropdownOpen) {
          this.toggleLanguageDropdown();
        }
        break;
    }
  }
}
