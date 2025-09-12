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
import { Observable, Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { Country } from '../../../../core/models/country.model';
import {
  LeadCreateResponse,
  LeadCreateRequest,
} from '../../models/leads.model';
import { LeadsService } from '../../services/leads.service';

@Component({
  selector: 'app-lead-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lead-registration-modal.component.html',
  styleUrls: ['./lead-registration-modal.component.scss'],
})
export class LeadRegistrationModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;

  private fb = inject(FormBuilder);
  private leadsService = inject(LeadsService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private ngZone = inject(NgZone);
  private destroy$ = new Subject<void>();

  registrationForm!: FormGroup;
  isSubmitting = false;

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

  ngOnInit(): void {
    this.initForm();
    this.loadCountries();
    this.loadLanguages();
    
    // Set default language to English
    setTimeout(() => {
      const englishLanguage = this.availableLanguages.find(lang => lang.key === 'en');
      if (englishLanguage) {
        this.selectedLanguage = englishLanguage;
      }
    }, 0);

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

  private initForm(): void {
    this.registrationForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      telephone: [
        '',
        [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)],
      ],
      country: ['', [Validators.required]],
      language: ['en', [Validators.required]],
      dateOfBirth: ['', [Validators.required]],
      source: [''],
    });
  }

  private loadCountries(): void {
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (countries) => {
          this.availableCountries = countries;
          this.filteredCountries = countries;
        },
        error: (error) => {
          this.alertService.error('Failed to load countries');
        },
      });
  }

  private loadLanguages(): void {
    this.availableLanguages = this.languageService.getAllLanguages();
    this.filteredLanguages = this.availableLanguages;
  }

  // Country dropdown methods
  toggleCountryDropdown(): void {
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
      return;
    }
    this.languageDropdownOpen = false;
    this.countryDropdownOpen = true;
    this.focusedCountryIndex = 0; // Start with first item focused
  }

  onCountrySearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.countrySearchTerm = target.value.toLowerCase();

    this.filteredCountries = this.availableCountries.filter(
      (country) =>
        country.name.toLowerCase().includes(this.countrySearchTerm) ||
        country.code.toLowerCase().includes(this.countrySearchTerm)
    );
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.registrationForm.patchValue({ country: country.name });
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

  // Language dropdown methods
  toggleLanguageDropdown(): void {
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
      return;
    }
    this.countryDropdownOpen = false;
    this.languageDropdownOpen = true;
    this.focusedLanguageIndex = 0; // Start with first item focused
  }

  onLanguageSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.languageSearchTerm = target.value.toLowerCase();

    this.filteredLanguages = this.availableLanguages.filter(
      (language) =>
        language.value.toLowerCase().includes(this.languageSearchTerm) ||
        language.key.toLowerCase().includes(this.languageSearchTerm)
    );
  }

  selectLanguage(language: { key: string; value: string }): void {
    this.selectedLanguage = language;
    this.registrationForm.patchValue({ language: language.value });
    this.languageDropdownOpen = false;
    this.languageSearchTerm = '';
    this.filteredLanguages = this.availableLanguages;
  }

  getSelectedLanguageName(): string {
    if (this.selectedLanguage) {
      return this.selectedLanguage.value;
    }
    return 'Select a language...';
  }

  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.registrationForm.value;

    // Convert date to ISO format
    const dateOfBirth = formValue.dateOfBirth
      ? new Date(formValue.dateOfBirth).toISOString()
      : '';

    const request: LeadCreateRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      username: formValue.username,
      telephone: formValue.telephone,
      country: formValue.country, // This will now be the country name
      language: formValue.language, // This will now be the language name
      dateOfBirth: dateOfBirth,
      source: formValue.source,
    };

    this.leadsService
      .createLead(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          let errorMessage = 'Failed to register lead. Please try again.';

          if (error.status === 409) {
            errorMessage = 'A user with this email or username already exists.';
          } else if (error.status === 400) {
            errorMessage =
              'Invalid data provided. Please check your input and try again.';
          }

          this.alertService.error(errorMessage);
          return of(null);
        }),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe((result) => {
        if (result) {
          this.alertService.success('Lead registered successfully!');
          this.modalRef.close({ success: true, data: result });
        }
      });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registrationForm.controls).forEach((key) => {
      this.registrationForm.get(key)?.markAsTouched();
    });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }

  getCountryNameByCode(countryName: string): string {
    return countryName;
  }

  getLanguageNameByKey(languageName: string): string {
    return languageName;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  private closeAllDropdowns(): void {
    this.countryDropdownOpen = false;
    this.languageDropdownOpen = false;
    this.focusedCountryIndex = -1;
    this.focusedLanguageIndex = -1;
  }

  private handleGlobalPointerEvent(event: Event): void {
    const target = event.target as HTMLElement;

    const insideAnyDropdown = target.closest('[data-dropdown]');
    if (!insideAnyDropdown) {
      this.closeAllDropdowns();
      return;
    }

    const inCountry = !!target.closest('[data-dropdown="country"]');
    const inLanguage = !!target.closest('[data-dropdown="language"]');

    if (!inCountry) this.countryDropdownOpen = false;
    if (!inLanguage) this.languageDropdownOpen = false;
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
