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
import { AlertService } from '../../../../core/services/alert.service';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { Country } from '../../../../core/models/country.model';
import {
  ClientCreateRequest,
  ClientRegistrationResponse,
} from '../../models/clients.model';
import {
  ClientsService,
  AffiliateDropdownItem,
  AffiliateSearchParams,
  AffiliateSearchResponse,
} from '../../services/clients.service';
import { Observable, map, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-client-registration-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-registration-modal.component.html',
  styles: [],
})
export class ClientRegistrationModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;

  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private ngZone = inject(NgZone);
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  showPassword = false;
  registrationForm: FormGroup;
  generatedPassword: string | null = null;
  passwordCopied = false;

  private usernameManuallyEdited = false;
  private generatedUsernameBase = '';

  // Dropdown data
  countries: Country[] = [];
  languages: Array<{ key: string; value: string }> = [];

  // Country dropdown properties
  countryDropdownOpen = false;
  countrySearchTerm = '';
  filteredCountries: Country[] = [];
  selectedCountry: Country | null = null;

  // Language dropdown properties
  languageDropdownOpen = false;
  languageSearchTerm = '';
  filteredLanguages: Array<{ key: string; value: string }> = [];
  selectedLanguage: { key: string; value: string } | null = null;

  // Affiliate dropdown properties
  affiliateDropdownOpen = false;
  affiliateLoading = false;
  affiliateSearchTerm = '';
  availableAffiliates: AffiliateDropdownItem[] = [];
  selectedAffiliate: AffiliateDropdownItem | null = null;
  currentAffiliatePage = 0;
  affiliatePageSize = 20;
  hasMoreAffiliates = false;

  // Keyboard navigation properties
  focusedCountryIndex = -1;
  focusedLanguageIndex = -1;
  focusedAffiliateIndex = -1;

  constructor() {
    this.registrationForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', Validators.required],
      affiliateId: [null], // Changed from required to optional, default to null
      telephone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      country: [''],
      language: ['en'], // Set English as default
      dateOfBirth: [''],
      //source: [''],
    });
  }

  ngOnInit() {
    this.loadCountries();
    this.loadLanguages();
    this.loadAffiliates();

    // Set default language to English
    setTimeout(() => {
      const englishLanguage = this.languages.find((lang) => lang.key === 'en');
      if (englishLanguage) {
        this.selectedLanguage = englishLanguage;
      }
    }, 0);

    this.setupUsernameAutoGeneration();

    // Capture-phase listeners to detect outside clicks reliably
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

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private setupUsernameAutoGeneration(): void {
    // Listen to firstName changes
    this.registrationForm
      .get('firstName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((firstName) => {
        if (!this.usernameManuallyEdited && firstName) {
          this.generateUsername();
        }
      });

    // Listen to lastName changes
    this.registrationForm
      .get('lastName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((lastName) => {
        if (!this.usernameManuallyEdited && lastName) {
          this.generateUsername();
        }
      });

    // Listen to username manual changes
    this.registrationForm
      .get('username')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((username) => {
        // Check if the username was manually edited by the user
        if (
          username &&
          this.generatedUsernameBase &&
          username !== this.generatedUsernameBase
        ) {
          // User has manually edited the username
          this.usernameManuallyEdited = true;
        }
      });
  }
  private generateUsername(): void {
    const firstName = this.registrationForm.get('firstName')?.value || '';
    const lastName = this.registrationForm.get('lastName')?.value || '';

    if (!firstName && !lastName) {
      return;
    }

    // Generate username variations
    const username = this.createUsernameVariation(firstName, lastName);

    this.generatedUsernameBase = username;
    this.registrationForm.patchValue({ username }, { emitEvent: false });
  }

  generatePassword(): void {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one character from each type
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');

    this.registrationForm.patchValue({ password });
    this.showPassword = true; // Show the generated password
  }

  private async generateUniqueUsername(): Promise<void> {
    const firstName = this.registrationForm.get('firstName')?.value || '';
    const lastName = this.registrationForm.get('lastName')?.value || '';

    if (!firstName && !lastName) {
      return;
    }

    let username = '';
    username = this.createUsernameVariation(firstName, lastName);

    this.generatedUsernameBase = username;
    this.registrationForm.patchValue({ username }, { emitEvent: false });
  }

  public regenerateUsername(): void {
    this.usernameManuallyEdited = false;
    this.generateUsername();
  }

  public resetUsernameGeneration(): void {
    this.usernameManuallyEdited = false;
    this.generatedUsernameBase = '';
  }

  private createUsernameVariation(
    firstName: string,
    lastName: string,
    suffix: string = ''
  ): string {
    firstName = this.normalizeString(firstName);
    lastName = this.normalizeString(lastName);

    if (!firstName && !lastName) {
      return '';
    }

    const randomNum =
      suffix || Math.floor(Math.random() * (9999 - 100 + 1) + 100).toString();

    const patterns = [
      () => `${firstName}.${lastName}${randomNum}`,
      () => `${firstName.charAt(0)}.${lastName}${randomNum}`,
      () => `${firstName}_${lastName.charAt(0)}${randomNum}`,
      () => `${firstName.charAt(0)}${lastName}${randomNum}`,
      () => `${firstName}${randomNum}`,
      () => `${lastName}${randomNum}`,
    ];

    let selectedPattern: string;

    if (firstName && lastName) {
      const patternIndex = Math.floor(Math.random() * 4);
      selectedPattern = patterns[patternIndex]();
    } else if (firstName) {
      selectedPattern = patterns[4]();
    } else {
      selectedPattern = patterns[5]();
    }

    return selectedPattern.toLowerCase();
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  private loadCountries(): void {
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (countries) => {
          this.countries = countries;
          this.filteredCountries = countries;
        },
        error: (error) => {},
      });
  }

  private loadLanguages(): void {
    this.languages = this.languageService.getAllLanguages();
    this.filteredLanguages = this.languages;
  }

  private loadAffiliates(reset: boolean = false): void {
    if (this.affiliateLoading) return;

    if (reset) {
      this.currentAffiliatePage = 0;
      this.availableAffiliates = [];
    }

    this.affiliateLoading = true;

    const searchParams: AffiliateSearchParams = {
      globalFilter: this.affiliateSearchTerm || undefined,
      pageIndex: this.currentAffiliatePage,
      pageSize: this.affiliatePageSize,
    };

    this.clientsService.getAffiliatesDropdown(searchParams).subscribe({
      next: (response: AffiliateSearchResponse) => {
        let newAffiliates = response.items;

        if (reset) {
          this.availableAffiliates = newAffiliates;
        } else {
          this.availableAffiliates = [
            ...this.availableAffiliates,
            ...newAffiliates,
          ];
        }

        // Sort affiliates alphabetically by userFullName
        this.availableAffiliates.sort(
          (a: AffiliateDropdownItem, b: AffiliateDropdownItem) =>
            a.userFullName.localeCompare(b.userFullName)
        );

        this.hasMoreAffiliates = response.hasNextPage;
        this.affiliateLoading = false;
      },
      error: (error) => {
        this.affiliateLoading = false;
        this.alertService.error('Failed to load affiliates');
      },
    });
  }

  // Country dropdown methods
  toggleCountryDropdown(): void {
    // Close other dropdowns
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
    }
    if (this.affiliateDropdownOpen) {
      this.affiliateDropdownOpen = false;
    }

    this.countryDropdownOpen = !this.countryDropdownOpen;
    if (this.countryDropdownOpen) {
      this.focusedCountryIndex = 0; // Start with first item focused
    }
  }

  onCountrySearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.countrySearchTerm = target.value.toLowerCase();

    this.filteredCountries = this.countries.filter((country) =>
      country.name.toLowerCase().includes(this.countrySearchTerm)
    );
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.registrationForm.patchValue({ country: country.name });
    this.countryDropdownOpen = false;
    this.countrySearchTerm = '';
    this.filteredCountries = this.countries;
  }

  getSelectedCountryName(): string {
    if (this.selectedCountry) {
      return this.selectedCountry.name;
    }
    return 'Select a country...';
  }

  // Language dropdown methods
  toggleLanguageDropdown(): void {
    // Close other dropdowns
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
    }
    if (this.affiliateDropdownOpen) {
      this.affiliateDropdownOpen = false;
    }

    this.languageDropdownOpen = !this.languageDropdownOpen;
    if (this.languageDropdownOpen) {
      this.focusedLanguageIndex = 0; // Start with first item focused
    }
  }

  onLanguageSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.languageSearchTerm = target.value.toLowerCase();

    this.filteredLanguages = this.languages.filter(
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
    this.filteredLanguages = this.languages;
  }

  getSelectedLanguageName(): string {
    if (this.selectedLanguage) {
      return this.selectedLanguage.value;
    }
    return 'Select a language...';
  }

  // Affiliate dropdown methods
  toggleAffiliateDropdown(): void {
    // Close other dropdowns
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
    }
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
    }

    this.affiliateDropdownOpen = !this.affiliateDropdownOpen;

    if (this.affiliateDropdownOpen) {
      this.focusedAffiliateIndex = 0; // Start with first item focused
      if (this.availableAffiliates.length === 0) {
        this.loadAffiliates();
      }
    }
  }

  onAffiliateSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.affiliateSearchTerm = target.value;
    this.currentAffiliatePage = 0;
    this.loadAffiliates(true);
  }

  onAffiliateDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreAffiliates &&
      !this.affiliateLoading
    ) {
      this.currentAffiliatePage++;
      this.loadAffiliates();
    }
  }

  selectAffiliate(affiliate: AffiliateDropdownItem): void {
    this.selectedAffiliate = affiliate;
    this.registrationForm.patchValue({ affiliateId: affiliate.affiliateId });
    this.affiliateDropdownOpen = false;
  }

  getSelectedAffiliateName(): string {
    if (this.selectedAffiliate) {
      return this.selectedAffiliate.userFullName;
    }
    return 'None';
  }

  onSubmit() {
    if (this.registrationForm.invalid) {
      Object.keys(this.registrationForm.controls).forEach((key) => {
        this.registrationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.registrationForm.value;

    const clientData: ClientCreateRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      username: formValue.username,
      password: formValue.password,
      affiliateId:
        formValue.affiliateId === null ? undefined : formValue.affiliateId,
      telephone: formValue.telephone || null,
      country: formValue.country || null,
      language: formValue.language || null,
      dateOfBirth: formValue.dateOfBirth
        ? new Date(formValue.dateOfBirth).toISOString()
        : null,
      //source: formValue.source || null,
    };

    this.clientsService.createClientForAdmin(clientData).subscribe({
      next: (response: ClientRegistrationResponse) => {
        this.isSubmitting = false;
        this.alertService.success('Client registered successfully!');
        this.modalRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else if (error.status === 409) {
          this.alertService.error(
            'A client with this email or username already exists.'
          );
        } else {
          this.alertService.error(
            'Failed to register client. Please try again.'
          );
        }
      },
    });
  }

  async copyPassword() {
    if (!this.generatedPassword) return;

    try {
      await navigator.clipboard.writeText(this.generatedPassword);
      this.passwordCopied = true;
      this.alertService.success('Password copied to clipboard!');

      // Reset the copied state after 3 seconds
      setTimeout(() => {
        this.passwordCopied = false;
      }, 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this.generatedPassword;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      this.passwordCopied = true;
      this.alertService.success('Password copied to clipboard!');

      setTimeout(() => {
        this.passwordCopied = false;
      }, 3000);
    }
  }

  onCancel() {
    this.modalRef.dismiss();
  }

  onClose() {
    this.modalRef.close(true);
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  private handleGlobalPointerEvent(event: Event): void {
    const target = event.target as HTMLElement;

    const countryDropdown = target.closest('[data-dropdown="country"]');
    const languageDropdown = target.closest('[data-dropdown="language"]');
    const affiliateDropdown = target.closest('[data-dropdown="affiliate"]');

    if (!countryDropdown && !languageDropdown && !affiliateDropdown) {
      this.countryDropdownOpen = false;
      this.languageDropdownOpen = false;
      this.affiliateDropdownOpen = false;
      this.focusedCountryIndex = -1;
      this.focusedLanguageIndex = -1;
      this.focusedAffiliateIndex = -1;
    }
  }

  private boundGlobalHandler = (event: Event) =>
    this.ngZone.run(() => this.handleGlobalPointerEvent(event));

  getCountryNameByCode(countryCode: string): string {
    const country = this.countries.find((c) => c.code === countryCode);
    return country ? country.name : countryCode;
  }

  getLanguageNameByKey(languageKey: string): string {
    const language = this.languages.find((l) => l.key === languageKey);
    return language ? language.value : languageKey;
  }

  // Keyboard navigation methods for Country dropdown
  isCountryFocused(index: number): boolean {
    return this.focusedCountryIndex === index;
  }

  setFocusedCountryIndex(index: number): void {
    this.focusedCountryIndex = index;
  }

  onCountryKeydown(
    event: KeyboardEvent,
    country: Country,
    index: number
  ): void {
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

  onLanguageKeydown(
    event: KeyboardEvent,
    language: { key: string; value: string },
    index: number
  ): void {
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

  // Keyboard navigation methods for Affiliate dropdown
  isAffiliateFocused(index: number): boolean {
    return this.focusedAffiliateIndex === index;
  }

  setFocusedAffiliateIndex(index: number): void {
    this.focusedAffiliateIndex = index;
  }

  onAffiliateKeydown(
    event: KeyboardEvent,
    affiliate: AffiliateDropdownItem,
    index: number
  ): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectAffiliate(affiliate);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextAffiliate();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousAffiliate();
        break;
      case 'Escape':
        this.affiliateDropdownOpen = false;
        break;
    }
  }

  private focusNextAffiliate(): void {
    if (this.focusedAffiliateIndex < this.availableAffiliates.length - 1) {
      this.focusedAffiliateIndex++;
    }
  }

  private focusPreviousAffiliate(): void {
    if (this.focusedAffiliateIndex > 0) {
      this.focusedAffiliateIndex--;
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

  onAffiliateButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.affiliateDropdownOpen) {
          this.toggleAffiliateDropdown();
        }
        break;
    }
  }
}
