// src/app/features/officies/components/create-rule-modal/create-rule-modal.component.ts

import { Component, OnInit, OnDestroy, inject, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';

import { OfficeRulesService } from '../../services/office-rules.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { CountryService } from '../../../../core/services/country.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ClientsService, AffiliateDropdownItem, AffiliateSearchParams, AffiliateSearchResponse } from '../../../clients/services/clients.service';

import {
  OfficeRule,
  OfficeRuleCreateRequest,
  OfficeRuleUpdateRequest,
  RuleCategory,
  RuleCategoryOption,
  RulePriority,
  RuleType,
  OperatorDropdownItem,
} from '../../models/office-rules.model';
import { Country } from '../../../../core/models/country.model';

@Component({
  selector: 'app-create-rule-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-rule-modal.component.html',
  styleUrls: ['./create-rule-modal.component.scss'],
})
export class CreateRuleModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() officeId!: string;
  @Input() rule?: OfficeRule;
  @Input() categories: RuleCategoryOption[] = [];
  @Input() priorities: RulePriority[] = [];
  @Input() types: RuleType[] = [];
  @Input() isEditing = false;

  // Make RuleCategory enum available in template
  RuleCategory = RuleCategory;

  private fb = inject(FormBuilder);
  private officeRulesService = inject(OfficeRulesService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private clientsService = inject(ClientsService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  ruleForm: FormGroup;
  isSubmitting = false;

  // Countries
  availableCountries: Country[] = [];
  filteredCountries: Country[] = [];
  selectedCountries: Country[] = [];
  countryDropdownOpen = false;
  countrySearchTerm = '';

  // Languages
  availableLanguages: { key: string; value: string }[] = [];
  filteredLanguages: { key: string; value: string }[] = [];
  selectedLanguages: { key: string; value: string }[] = [];
  languageDropdownOpen = false;
  languageSearchTerm = '';

  // Partners (Affiliates) - Updated to use ClientsService approach
  affiliateDropdownOpen = false;
  affiliateLoading = false;
  affiliateSearchTerm = '';
  availableAffiliates: AffiliateDropdownItem[] = [];
  selectedAffiliates: AffiliateDropdownItem[] = [];
  currentAffiliatePage = 0;
  affiliatePageSize = 20;
  hasMoreAffiliates = false;

  // Affiliate Referrals - Updated to use ClientsService approach
  affiliateReferralDropdownOpen = false;
  affiliateReferralLoading = false;
  affiliateReferralSearchTerm = '';
  availableAffiliateReferrals: AffiliateDropdownItem[] = [];
  selectedAffiliateReferrals: AffiliateDropdownItem[] = [];
  currentAffiliateReferralPage = 0;
  affiliateReferralPageSize = 20;
  hasMoreAffiliateReferrals = false;

  // Operators
  availableOperators: OperatorDropdownItem[] = [];
  filteredOperators: OperatorDropdownItem[] = [];
  selectedOperators: OperatorDropdownItem[] = [];
  operatorDropdownOpen = false;
  operatorSearchTerm = '';

  constructor() {
    this.ruleForm = this.fb.group({
      ruleName: ['', [Validators.required]],
      category: ['', [Validators.required]],
      priority: ['', [Validators.required]],
      type: ['', [Validators.required]],
      countries: [''],
      languages: [''],
      partners: [''],
      affiliateReferrals: [''],
      operators: [''],
      sources: [''],
    });
  }

  ngOnInit(): void {
    this.loadLookupData();

    if (this.isEditing && this.rule) {
      this.populateFormForEdit();
    } else {
      // Set English as default language for new rules
      this.setDefaultLanguage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdowns when clicking outside
    if (!(event.target as Element).closest('.relative')) {
      this.closeAllDropdowns();
    }
  }

  private closeAllDropdowns(): void {
    this.countryDropdownOpen = false;
    this.languageDropdownOpen = false;
    this.affiliateDropdownOpen = false;
    this.affiliateReferralDropdownOpen = false;
    this.operatorDropdownOpen = false;
  }

  private loadLookupData(): void {
    // Load countries
    this.countryService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.availableCountries = countries;
        this.filteredCountries = countries;
      });

    // Load languages
    this.availableLanguages = this.languageService.getAllLanguages();
    this.filteredLanguages = this.availableLanguages;

    // Load operators
    this.officeRulesService
      .getAvailableOperators(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe((operators) => {
        this.availableOperators = operators;
        this.filteredOperators = operators;
      });
  }

  private setDefaultLanguage(): void {
    // Set English as default language
    const englishLanguage = this.availableLanguages.find(lang => lang.key === 'en');
    if (englishLanguage) {
      this.selectedLanguages = [englishLanguage];
      this.updateLanguagesFormValue();
    }
  }

  private populateFormForEdit(): void {
    if (!this.rule) return;

    // Parse semicolon-separated values back to arrays
    const countries = this.rule.country ? this.rule.country.split(';').filter(c => c.trim()) : [];
    const languages = this.rule.language ? this.rule.language.split(';').filter(l => l.trim()) : [];
    const partners = this.rule.partners ? this.rule.partners.split(';').filter(p => p.trim()) : [];
    const affiliateReferrals = this.rule.affiliateReferrals ? this.rule.affiliateReferrals.split(';').filter(a => a.trim()) : [];

    // Set selected items
    this.selectedCountries = this.availableCountries.filter(c => countries.includes(c.code));
    this.selectedLanguages = this.availableLanguages.filter(l => languages.includes(l.key));
    
    // For affiliates, we'll need to load them first and then filter
    this.loadAffiliatesForEdit(partners, 'partners');
    this.loadAffiliatesForEdit(affiliateReferrals, 'referrals');

    // Set selected operators from existing rule
    if (this.rule.operators && this.rule.operators.length > 0) {
      this.selectedOperators = this.rule.operators.map(op => ({
        id: op.userId,
        value: op.operatorName,
        email: op.operatorEmail
      }));
    }

    this.ruleForm.patchValue({
      ruleName: this.rule.name,
      category: this.rule.category,
      priority: this.rule.priority,
      type: this.rule.type,
      sources: this.rule.sources,
    });
  }

  private loadAffiliatesForEdit(affiliateIds: string[], type: 'partners' | 'referrals'): void {
    if (affiliateIds.length === 0) return;

    // Load all affiliates to find the ones we need
    this.clientsService.getAffiliatesDropdown({ pageSize: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: AffiliateSearchResponse) => {
        const allAffiliates = response.items;
        
        if (type === 'partners') {
          this.selectedAffiliates = allAffiliates.filter(aff => affiliateIds.includes(aff.affiliateId));
          this.updateAffiliatesFormValue();
        } else if (type === 'referrals') {
          this.selectedAffiliateReferrals = allAffiliates.filter(aff => affiliateIds.includes(aff.affiliateId));
          this.updateAffiliateReferralsFormValue();
        }
      });
  }

  // Countries methods
  toggleCountryDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.countryDropdownOpen) {
      this.countryDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.countryDropdownOpen = true;
  }

  onCountrySearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.countrySearchTerm = value;
    this.filteredCountries = this.availableCountries.filter(country =>
      country.name.toLowerCase().includes(value)
    );
  }

  toggleCountrySelection(country: Country): void {
    const index = this.selectedCountries.findIndex(c => c.code === country.code);
    if (index > -1) {
      this.selectedCountries.splice(index, 1);
    } else {
      this.selectedCountries.push(country);
    }
    this.updateCountriesFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isCountrySelected(country: Country): boolean {
    return this.selectedCountries.some(c => c.code === country.code);
  }

  getSelectedCountriesText(): string {
    if (this.selectedCountries.length === 0) {
      return 'Select countries...';
    }
    if (this.selectedCountries.length === 1) {
      return this.selectedCountries[0].name;
    }
    return `${this.selectedCountries.length} countries selected`;
  }

  private updateCountriesFormValue(): void {
    const value = this.selectedCountries.map(c => c.code).join(';');
    this.ruleForm.patchValue({ countries: value });
  }

  // Languages methods
  toggleLanguageDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.languageDropdownOpen = true;
  }

  onLanguageSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.languageSearchTerm = value;
    this.filteredLanguages = this.availableLanguages.filter(language =>
      language.value.toLowerCase().includes(value)
    );
  }

  toggleLanguageSelection(language: { key: string; value: string }): void {
    const index = this.selectedLanguages.findIndex(l => l.key === language.key);
    if (index > -1) {
      this.selectedLanguages.splice(index, 1);
    } else {
      this.selectedLanguages.push(language);
    }
    this.updateLanguagesFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isLanguageSelected(language: { key: string; value: string }): boolean {
    return this.selectedLanguages.some(l => l.key === language.key);
  }

  getSelectedLanguagesText(): string {
    if (this.selectedLanguages.length === 0) {
      return 'Select languages...';
    }
    if (this.selectedLanguages.length === 1) {
      return this.selectedLanguages[0].value;
    }
    return `${this.selectedLanguages.length} languages selected`;
  }

  private updateLanguagesFormValue(): void {
    const value = this.selectedLanguages.map(l => l.key).join(';');
    this.ruleForm.patchValue({ languages: value });
  }

  // Partners (Affiliates) methods - Updated to use ClientsService approach
  toggleAffiliateDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.affiliateDropdownOpen) {
      this.affiliateDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.affiliateDropdownOpen = true;

    if (this.availableAffiliates.length === 0) {
      this.loadAffiliates();
    }
  }

  onAffiliateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.affiliateSearchTerm = value;
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

  toggleAffiliateSelection(affiliate: AffiliateDropdownItem): void {
    const index = this.selectedAffiliates.findIndex(a => a.affiliateId === affiliate.affiliateId);
    if (index > -1) {
      this.selectedAffiliates.splice(index, 1);
    } else {
      this.selectedAffiliates.push(affiliate);
    }
    this.updateAffiliatesFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isAffiliateSelected(affiliate: AffiliateDropdownItem): boolean {
    return this.selectedAffiliates.some(a => a.affiliateId === affiliate.affiliateId);
  }

  getSelectedAffiliatesText(): string {
    if (this.selectedAffiliates.length === 0) {
      return 'Select partners...';
    }
    if (this.selectedAffiliates.length === 1) {
      return this.selectedAffiliates[0].userFullName;
    }
    return `${this.selectedAffiliates.length} partners selected`;
  }

  private updateAffiliatesFormValue(): void {
    const value = this.selectedAffiliates.map(a => a.affiliateId).join(';');
    this.ruleForm.patchValue({ partners: value });
  }

  clearAffiliateSelection(): void {
    this.selectedAffiliates = [];
    this.updateAffiliatesFormValue();
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
        this.availableAffiliates.sort((a: AffiliateDropdownItem, b: AffiliateDropdownItem) => 
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

  // Affiliate Referrals methods - Updated to use ClientsService approach
  toggleAffiliateReferralDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.affiliateReferralDropdownOpen) {
      this.affiliateReferralDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.affiliateReferralDropdownOpen = true;

    if (this.availableAffiliateReferrals.length === 0) {
      this.loadAffiliateReferrals();
    }
  }

  onAffiliateReferralSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.affiliateReferralSearchTerm = value;
    this.currentAffiliateReferralPage = 0;
    this.loadAffiliateReferrals(true);
  }

  onAffiliateReferralDropdownScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      this.hasMoreAffiliateReferrals &&
      !this.affiliateReferralLoading
    ) {
      this.currentAffiliateReferralPage++;
      this.loadAffiliateReferrals();
    }
  }

  toggleAffiliateReferralSelection(referral: AffiliateDropdownItem): void {
    const index = this.selectedAffiliateReferrals.findIndex(r => r.affiliateId === referral.affiliateId);
    if (index > -1) {
      this.selectedAffiliateReferrals.splice(index, 1);
    } else {
      this.selectedAffiliateReferrals.push(referral);
    }
    this.updateAffiliateReferralsFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isAffiliateReferralSelected(referral: AffiliateDropdownItem): boolean {
    return this.selectedAffiliateReferrals.some(r => r.affiliateId === referral.affiliateId);
  }

  getSelectedAffiliateReferralsText(): string {
    if (this.selectedAffiliateReferrals.length === 0) {
      return 'Select affiliate referrals...';
    }
    if (this.selectedAffiliateReferrals.length === 1) {
      return this.selectedAffiliateReferrals[0].userFullName;
    }
    return `${this.selectedAffiliateReferrals.length} affiliate referrals selected`;
  }

  private updateAffiliateReferralsFormValue(): void {
    const value = this.selectedAffiliateReferrals.map(r => r.affiliateId).join(';');
    this.ruleForm.patchValue({ affiliateReferrals: value });
  }

  clearAffiliateReferralSelection(): void {
    this.selectedAffiliateReferrals = [];
    this.updateAffiliateReferralsFormValue();
  }

  private loadAffiliateReferrals(reset: boolean = false): void {
    if (this.affiliateReferralLoading) return;

    if (reset) {
      this.currentAffiliateReferralPage = 0;
      this.availableAffiliateReferrals = [];
    }

    this.affiliateReferralLoading = true;

    const searchParams: AffiliateSearchParams = {
      globalFilter: this.affiliateReferralSearchTerm || undefined,
      pageIndex: this.currentAffiliateReferralPage,
      pageSize: this.affiliateReferralPageSize,
    };

    this.clientsService.getAffiliatesDropdown(searchParams).subscribe({
      next: (response: AffiliateSearchResponse) => {
        let newAffiliates = response.items;
        
        if (reset) {
          this.availableAffiliateReferrals = newAffiliates;
        } else {
          this.availableAffiliateReferrals = [
            ...this.availableAffiliateReferrals,
            ...newAffiliates,
          ];
        }
        
        // Sort affiliates alphabetically by userFullName
        this.availableAffiliateReferrals.sort((a: AffiliateDropdownItem, b: AffiliateDropdownItem) => 
          a.userFullName.localeCompare(b.userFullName)
        );
        
        this.hasMoreAffiliateReferrals = response.hasNextPage;
        this.affiliateReferralLoading = false;
      },
      error: (error) => {
        this.affiliateReferralLoading = false;
        this.alertService.error('Failed to load affiliate referrals');
      },
    });
  }

  // Operators methods
  toggleOperatorDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.operatorDropdownOpen) {
      this.operatorDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.operatorDropdownOpen = true;
  }

  onOperatorSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.operatorSearchTerm = value;
    this.filteredOperators = this.availableOperators.filter(operator =>
      operator.value.toLowerCase().includes(value) || 
      operator.email.toLowerCase().includes(value)
    );
  }

  toggleOperatorSelection(operator: OperatorDropdownItem): void {
    const index = this.selectedOperators.findIndex(o => o.id === operator.id);
    if (index > -1) {
      this.selectedOperators.splice(index, 1);
    } else {
      this.selectedOperators.push(operator);
    }
    this.updateOperatorsFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isOperatorSelected(operator: OperatorDropdownItem): boolean {
    return this.selectedOperators.some(o => o.id === operator.id);
  }

  getSelectedOperatorsText(): string {
    if (this.selectedOperators.length === 0) {
      return 'Select operators...';
    }
    if (this.selectedOperators.length === 1) {
      return this.selectedOperators[0].value;
    }
    return `${this.selectedOperators.length} operators selected`;
  }

  private updateOperatorsFormValue(): void {
    const value = this.selectedOperators.map(o => o.id).join(';');
    this.ruleForm.patchValue({ operators: value });
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      Object.keys(this.ruleForm.controls).forEach((key) => {
        this.ruleForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.ruleForm.value;

    if (this.isEditing && this.rule) {
      this.updateRule(formValue);
    } else {
      this.createRule(formValue);
    }
  }

  private createRule(formValue: any): void {
    const request: OfficeRuleCreateRequest = {
      ruleName: formValue.ruleName.trim(),
      category: parseInt(formValue.category),
      priority: parseInt(formValue.priority),
      type: parseInt(formValue.type),
      objectId: this.officeId,
      operators: this.selectedOperators.length > 0 ? this.selectedOperators.map(op => ({
        id: op.id,
        userId: op.id,
        operatorName: op.value,
        operatorEmail: op.email,
        ratio: 100 / this.selectedOperators.length, // Equal distribution
        isValidOperator: true
      })) : null,
      country: formValue.countries || '',
      language: formValue.languages || '',
      partners: formValue.partners || '',
      affiliateReferrals: formValue.affiliateReferrals || '',
      sources: formValue.sources || '',
    };

    this.officeRulesService
      .createRule(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          if (error.status === 400) {
            this.alertService.error(
              'Invalid data provided. Please check your inputs.'
            );
          } else if (error.status === 409) {
            this.alertService.error('A rule with this name already exists.');
          } else {
            this.alertService.error('Failed to create rule. Please try again.');
          }
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSubmitting = false;
        if (response) {
          this.alertService.success('Rule created successfully!');
          this.modalRef.close(true);
        }
      });
  }

  private updateRule(formValue: any): void {
    if (!this.rule) return;

    const request: OfficeRuleUpdateRequest = {
      id: this.rule.id,
      ruleName: formValue.ruleName.trim(),
      priority: parseInt(formValue.priority),
      country: formValue.countries || undefined,
      language: formValue.languages || undefined,
      partners: formValue.partners || undefined,
      affiliateReferrals: formValue.affiliateReferrals || undefined,
      sources: formValue.sources || undefined,
    };

    this.officeRulesService
      .updateRule(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          this.alertService.error('Failed to update rule. Please try again.');
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSubmitting = false;
        if (response !== null) {
          this.alertService.success('Rule updated successfully!');
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
