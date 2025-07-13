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
import { AffiliatesService } from '../../../affiliates/services/affiliates.service';

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
import { Affiliate } from '../../../affiliates/models/affiliates.model';

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
  private affiliatesService = inject(AffiliatesService);
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

  // Partners (Affiliates)
  availablePartners: Affiliate[] = [];
  filteredPartners: Affiliate[] = [];
  selectedPartners: Affiliate[] = [];
  partnerDropdownOpen = false;
  partnerSearchTerm = '';

  // Affiliate Referrals
  availableAffiliateReferrals: Affiliate[] = [];
  filteredAffiliateReferrals: Affiliate[] = [];
  selectedAffiliateReferrals: Affiliate[] = [];
  affiliateReferralDropdownOpen = false;
  affiliateReferralSearchTerm = '';

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
    this.partnerDropdownOpen = false;
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

    // Load affiliates for partners
    this.affiliatesService
      .getActiveAffiliates()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.availablePartners = response.items || [];
        this.filteredPartners = this.availablePartners;
      });

    // Load affiliates for affiliate referrals (same data for now)
    this.affiliatesService
      .getActiveAffiliates()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.availableAffiliateReferrals = response.items || [];
        this.filteredAffiliateReferrals = this.availableAffiliateReferrals;
      });

    // Load operators
    this.officeRulesService
      .getAvailableOperators(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe((operators) => {
        this.availableOperators = operators;
        this.filteredOperators = operators;
      });
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
    this.selectedPartners = this.availablePartners.filter(p => partners.includes(p.id));
    this.selectedAffiliateReferrals = this.availableAffiliateReferrals.filter(a => affiliateReferrals.includes(a.id));

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

  // Partners methods
  togglePartnerDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.partnerDropdownOpen) {
      this.partnerDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.partnerDropdownOpen = true;
  }

  onPartnerSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.partnerSearchTerm = value;
    this.filteredPartners = this.availablePartners.filter(partner =>
      partner.name.toLowerCase().includes(value)
    );
  }

  togglePartnerSelection(partner: Affiliate): void {
    const index = this.selectedPartners.findIndex(p => p.id === partner.id);
    if (index > -1) {
      this.selectedPartners.splice(index, 1);
    } else {
      this.selectedPartners.push(partner);
    }
    this.updatePartnersFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isPartnerSelected(partner: Affiliate): boolean {
    return this.selectedPartners.some(p => p.id === partner.id);
  }

  getSelectedPartnersText(): string {
    if (this.selectedPartners.length === 0) {
      return 'Select partners...';
    }
    if (this.selectedPartners.length === 1) {
      return this.selectedPartners[0].name;
    }
    return `${this.selectedPartners.length} partners selected`;
  }

  private updatePartnersFormValue(): void {
    const value = this.selectedPartners.map(p => p.id).join(';');
    this.ruleForm.patchValue({ partners: value });
  }

  // Affiliate Referrals methods
  toggleAffiliateReferralDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.affiliateReferralDropdownOpen) {
      this.affiliateReferralDropdownOpen = false;
      return;
    }
    // Close all other dropdowns first, then open this one
    this.closeAllDropdowns();
    this.affiliateReferralDropdownOpen = true;
  }

  onAffiliateReferralSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.affiliateReferralSearchTerm = value;
    this.filteredAffiliateReferrals = this.availableAffiliateReferrals.filter(referral =>
      referral.name.toLowerCase().includes(value)
    );
  }

  toggleAffiliateReferralSelection(referral: Affiliate): void {
    const index = this.selectedAffiliateReferrals.findIndex(r => r.id === referral.id);
    if (index > -1) {
      this.selectedAffiliateReferrals.splice(index, 1);
    } else {
      this.selectedAffiliateReferrals.push(referral);
    }
    this.updateAffiliateReferralsFormValue();
    // Don't close dropdown for multiple selection - let user select multiple items
  }

  isAffiliateReferralSelected(referral: Affiliate): boolean {
    return this.selectedAffiliateReferrals.some(r => r.id === referral.id);
  }

  getSelectedAffiliateReferralsText(): string {
    if (this.selectedAffiliateReferrals.length === 0) {
      return 'Select affiliate referrals...';
    }
    if (this.selectedAffiliateReferrals.length === 1) {
      return this.selectedAffiliateReferrals[0].name;
    }
    return `${this.selectedAffiliateReferrals.length} affiliate referrals selected`;
  }

  private updateAffiliateReferralsFormValue(): void {
    const value = this.selectedAffiliateReferrals.map(r => r.id).join(';');
    this.ruleForm.patchValue({ affiliateReferrals: value });
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
