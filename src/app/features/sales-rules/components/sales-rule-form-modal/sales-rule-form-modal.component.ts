import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { SalesRulesService } from '../../services/sales-rules.service';
import {
  CreateSalesRuleRequest,
  SalesRuleDetails,
  RulePriority,
  RuleType,
  RulePriorityLabels,
  RuleTypeLabels,
  OperatorDropdownRequest,
  OperatorDropdownResponse,
} from '../../models/sales-rules.model';

interface OperatorSelection {
  id: string;
  name: string;
  department: string;
  role: string;
  ratio: number;
}

@Component({
  selector: 'app-sales-rule-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './sales-rule-form-modal.component.html',
})
export class SalesRuleFormModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() rule?: SalesRuleDetails;

  private fb = inject(FormBuilder);
  private salesRulesService = inject(SalesRulesService);
  private alertService = inject(AlertService);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private destroy$ = new Subject<void>();

  ruleForm!: FormGroup;
  isSubmitting = false;

  countries: any[] = [];
  languages: { key: string; value: string }[] = [];

  // Operator dropdown related properties
  availableOperators: any[] = [];
  selectedOperators: OperatorSelection[] = [];
  showOperatorDropdown = false;
  isLoadingOperators = false;

  priorities = Object.keys(RulePriority)
    .filter((k) => !isNaN(Number(k)))
    .map((k) => ({
      value: Number(k),
      label: RulePriorityLabels[Number(k) as RulePriority],
    }));

  types = Object.keys(RuleType)
    .filter((k) => !isNaN(Number(k)))
    .map((k) => ({
      value: Number(k),
      label: RuleTypeLabels[Number(k) as RuleType],
    }));

  ngOnInit(): void {
    this.initForm();
    this.loadCountries();
    this.loadLanguages();

    if (this.rule) {
      this.populateForm();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.ruleForm = this.fb.group({
      ruleName: ['', [Validators.required]],
      priority: ['', [Validators.required]],
      type: ['', [Validators.required]],
      country: [''],
      language: ['en'], // Set English as default
      sources: [''],
    });
  }

  private loadCountries(): void {
    this.countryService.getCountries().subscribe((countries) => {
      this.countries = countries;
    });
  }

  private loadLanguages(): void {
    this.languages = this.languageService.getAllLanguages();
  }

  private populateForm(): void {
    if (!this.rule) return;

    this.ruleForm.patchValue({
      ruleName: this.rule.name,
      priority: this.rule.priority,
      type: this.rule.type,
      country: this.rule.country || '',
      language: this.rule.language || '',
      sources: this.rule.sources || '',
    });

    // Populate existing operators
    if (this.rule.operators && this.rule.operators.length > 0) {
      this.selectedOperators = this.rule.operators.map((op) => ({
        id: op.userId,
        name: op.operatorName,
        department: '', // Will be populated when loading operators
        role: '', // Will be populated when loading operators
        ratio: op.ratio,
      }));
    }
  }

  // Operator dropdown methods
  onTargetingChange(): void {
    // Reset operator selection when targeting changes
    this.selectedOperators = [];
    this.hideOperatorDropdown();
  }

  toggleOperatorDropdown(): void {
    if (this.showOperatorDropdown) {
      this.hideOperatorDropdown();
    } else {
      this.showOperatorDropdown = true;
      this.loadOperators();
    }
  }

  private loadOperators(): void {
    this.isLoadingOperators = true;
    const formValue = this.ruleForm.value;

    this.salesRulesService
      .getOperatorsDropdown({})
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load operators');
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 0,
            pageSize: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          } as OperatorDropdownResponse);
        }),
        finalize(() => (this.isLoadingOperators = false))
      )
      .subscribe((response) => {
        const selectedIds = this.selectedOperators.map((op) => op.id);
        this.availableOperators = response.items.filter(
          (op) => !selectedIds.includes(op.id)
        );
      });
  }

  selectOperator(operator: any): void {
    if (this.selectedOperators.length >= 4) {
      this.alertService.error('Maximum 4 operators allowed');
      return;
    }

    // Add the new operator
    this.selectedOperators.push({
      id: operator.id,
      name: operator.value,
      department: operator.department,
      role: operator.role,
      ratio: 0, // will be set below
    });

    // Distribute ratio equally among all selected operators
    const count = this.selectedOperators.length;
    const equalRatio = 100 / count;

    // Set all but last to floor, last to remainder for exact 100
    let total = 0;
    for (let i = 0; i < count - 1; i++) {
      this.selectedOperators[i].ratio =
        Math.floor(equalRatio * 1000000) / 1000000;
      total += this.selectedOperators[i].ratio;
    }
    this.selectedOperators[count - 1].ratio =
      Math.round((100 - total) * 1000000) / 1000000;

    this.hideOperatorDropdown();
  }

  hideOperatorDropdown(): void {
    this.showOperatorDropdown = false;
    this.availableOperators = [];
  }

  removeOperator(index: number): void {
    this.selectedOperators.splice(index, 1);
  }

  getTotalRatio(): number {
    return this.selectedOperators.reduce(
      (total, op) => total + (op.ratio || 0),
      0
    );
  }

  updateOperatorRatio(index: number, value: number): void {
    this.selectedOperators[index].ratio = value;
  }

  onRatioChange(): void {
    // Optional: Auto-adjust ratios or show warnings
  }

  getOperatorInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  isFormValid(): boolean {
    const formValid = this.ruleForm.valid;
    const operatorsValid =
      this.selectedOperators.length > 0 && this.getTotalRatio() === 100;
    return formValid && operatorsValid && !this.isSubmitting;
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    if (this.selectedOperators.length === 0) {
      this.alertService.error('At least one operator must be assigned');
      return;
    }

    if (this.getTotalRatio() !== 100) {
      this.alertService.error('Total operator ratio must equal 100%');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.ruleForm.value;

    const request: CreateSalesRuleRequest = {
      ruleName: formValue.ruleName,
      priority: Number(formValue.priority),
      type: Number(formValue.type),
      country: formValue.country || '',
      language: formValue.language || '',
      sources: formValue.sources || '',
      operators: this.selectedOperators.map((op) => ({
        userId: op.id,
        ratio: op.ratio,
      })),
      partners: '',
      affiliateReferrals: '',
    };

    if (this.rule) {
      // Update existing rule - use batch operator update for better consistency
      this.salesRulesService
        .updateSalesRule(this.rule.id, request)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to update sales rule');
            return of(null);
          }),
          finalize(() => (this.isSubmitting = false))
        )
        .subscribe((result) => {
          if (result !== null) {
            const operatorRequests = this.selectedOperators.map((op) => ({
              userId: op.id,
              ratio: op.ratio,
            }));

            this.salesRulesService
              .batchUpdateOperators(this.rule!.id, operatorRequests)
              .pipe(
                takeUntil(this.destroy$),
                catchError((error) => {
                  this.alertService.error(
                    'Rule updated but failed to update operators'
                  );
                  return of(null);
                })
              )
              .subscribe((operatorResult) => {
                if (operatorResult !== null) {
                  this.alertService.success(
                    'Sales rule and operators updated successfully!'
                  );
                }
                this.modalRef.close({
                  id: this.rule!.id,
                  ...request,
                  operators: operatorRequests,
                });
              });
          }
        });
    } else {
      // Create new rule
      this.salesRulesService
        .createSalesRule(request)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.alertService.error('Failed to create sales rule');
            return of(null);
          }),
          finalize(() => (this.isSubmitting = false))
        )
        .subscribe((result) => {
          if (result !== null) {
            this.alertService.success('Sales rule created successfully!');
            this.modalRef.close(result);
          }
        });
    }
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.ruleForm.controls).forEach((key) => {
      this.ruleForm.get(key)?.markAsTouched();
    });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
